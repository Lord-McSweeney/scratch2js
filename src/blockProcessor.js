const { sanitizeString } = require("./utils.js");
const { debug, info, warn, error, fatal } = require("./logging.js");

function processBlock(block, blocks, tabLevel) {
    let result = "    ".repeat(tabLevel) + "{\n";
    tabLevel ++;
    const inputs = block.inputs;

    let getValueFromInput = function(input) {
        if (!input || input.length !== 2) {
            fatal("Unknown or unimplemented input info");
        } else if (input[0] !== 1) {
            fatal("Unknown or unimplemented inputs magics");
        } else {
            switch(input[1][0]) {
                case 4:
                    return parseInt(input[1][1]);
                case 5:
                    return parseFloat(input[1][1]);
                case 6:
                    return parseInt(input[1][1]);
                case 11:
                    return input[1][1];
                default:
                    fatal("Unknown or unimplemented input magic: " + input[1][0]);
            }
        }
    }

    let emitStatement = function(statement) {
        result += "    ".repeat(tabLevel);
        result += statement;
        result += "\n";
    };

    switch (block.opcode) {
        case "motion_movesteps":
            {
                let moveAmount = getValueFromInput(inputs.STEPS);

                emitStatement("this.changeXBy(Math.cos(this.direction * Math.PI/180) * " + moveAmount + ");");
                emitStatement("this.changeYBy(Math.sin(this.direction * Math.PI/180) * " + moveAmount + ");");
            }
            break;

        case "motion_gotoxy":
            {
                let xPos = getValueFromInput(inputs.X);
                let yPos = getValueFromInput(inputs.Y);

                emitStatement("this.moveTo(" + xPos + ", " + yPos + ");");
            }
            break;

        case "motion_turnleft":
        case "motion_turnright":
            {
                let turnAmount = getValueFromInput(inputs.DEGREES);

                if (block.opcode === "motion_turnright") {
                    turnAmount = -turnAmount;
                }

                emitStatement("this.turn(" + turnAmount + ");");
            }
            break;

        case "motion_pointtowards":
            {
                let towards = inputs.TOWARDS;
                if (!towards || towards.length !== 2) {
                    fatal("Unknown or unimplemented inputs.TOWARDS info");
                } else {
                    let block = blocks[towards[1]];
                    if (!block || block.opcode !== "motion_pointtowards_menu") {
                        fatal("Unknown or unimplemented inputs.TOWARDS child op");
                    } else {
                        let towardsData = block.fields.TOWARDS;
                        if (!towardsData || towardsData.length !== 2 || towardsData[1] !== null) {
                            fatal("Unknown or unimplemented motion_pointtowards_menu TOWARDS magics");
                        } else {
                            if (towardsData[0] === "_mouse_") {
                                emitStatement("this.pointTowardsMouse();");
                            } else {
                                fatal("Unknown motion_pointtowards_menu TOWARDS: " + towardsData[0]);
                            }
                        }
                    }
                }
            }
            break;

        case "looks_switchcostumeto":
            {
                let costume = inputs.COSTUME;
                if (!costume) {
                    fatal("Unknown or unimplemented inputs.COSTUME info" + JSON.stringify(costume));
                } else {
                    if (costume.length === 2) {
                        let block = blocks[costume[1]];
                        if (!block || block.opcode !== "looks_costume") {
                            fatal("Unknown or unimplemented inputs.COSTUME child op");
                        } else {
                            let costumeData = block.fields.COSTUME;
                            if (!costumeData || costumeData.length !== 2 || costumeData[1] !== null) {
                                fatal("Unknown or unimplemented looks_costume COSTUME magics");
                            } else {
                                let realCostume = costumeData[0];
                                emitStatement("await this.changeCostume(\"" + sanitizeString(realCostume) + "\");");
                            }
                        }
                    } else if (costume.length === 3 && costume[0] === 3) {
                        warn("Unimplemented expression parsing");
                        emitStatement("// Unimplemented expression parsing");
                    }
                }
            }
            break;

        case "motion_glidesecstoxy":
            {
                let secs = getValueFromInput(inputs.SECS);
                let xPos = getValueFromInput(inputs.X);
                let yPos = getValueFromInput(inputs.Y);

                emitStatement("await this.glideXYSecs(" + secs + ", " + xPos + ", " + yPos + ");");
            }
            break;

        case "looks_nextcostume":
            {
                emitStatement("await this.nextCostume();");
            }
            break;

        case "looks_setsizeto":
            {
                let size = getValueFromInput(inputs.SIZE);
                emitStatement("this.size = " + size + ";");
            }
            break;

        case "looks_changeeffectby":
            {
                let change = getValueFromInput(inputs.CHANGE);
                let effect = block.fields.EFFECT;
                if (!effect || effect.length !== 2 || effect[1] !== null) {
                    fatal("Unknown or unimplemented looks_changeeffectby EFFECT magics");
                } else {
                    let realEffect = effect[0];
                    emitStatement("this.effects['" + realEffect.toLowerCase() + "'] += " + change);
                }
            }
            break;

        case "looks_hide":
            {
                emitStatement("this.visible = false;");
            }
            break;

        case "looks_show":
            {
                emitStatement("this.visible = true;");
            }
            break;

        case "control_wait":
            {
                let duration = getValueFromInput(inputs.DURATION);
                emitStatement("await new Promise((resolve) => setTimeout(resolve, " + (duration * 1000) + "));");
            }
            break;

        case "control_forever":
            {
                let substack = inputs.SUBSTACK;
                if (!substack || substack.length !== 2) {
                    fatal("Unknown or unimplemented inputs.SUBSTACK info");
                } else if (substack[0] !== 2) {
                    fatal("Unknown or unimplemented inputs.SUBSTACK magics");
                }

                emitStatement("while (true) {");
                tabLevel ++;

                let block = blocks[substack[1]];
                while (true) {
                    result += processBlock(block, blocks, tabLevel);
                    result += "\n";
                    if (block.next === null) {
                        break;
                    } else {
                        block = blocks[block.next];
                    }
                }

                emitStatement("await this.screenRefresh();");
                tabLevel --;
                emitStatement("}");
            }
            break;

        case "control_repeat":
            {
                let repeatCount = getValueFromInput(inputs.TIMES);
                let substack = inputs.SUBSTACK;
                if (!substack || substack.length !== 2) {
                    fatal("Unknown or unimplemented inputs.SUBSTACK info");
                } else if (substack[0] !== 2) {
                    fatal("Unknown or unimplemented inputs.SUBSTACK magics");
                }

                emitStatement("let _i = 0;");
                emitStatement("while (_i < " + repeatCount + ") {");
                tabLevel ++;

                let block = blocks[substack[1]];
                while (true) {
                    result += processBlock(block, blocks, tabLevel);
                    result += "\n";
                    if (block.next === null) {
                        break;
                    } else {
                        block = blocks[block.next];
                    }
                }
                emitStatement("_i ++;");

                emitStatement("await this.screenRefresh();");
                tabLevel --;
                emitStatement("}");
            }
            break;

        case "control_create_clone_of":
            {
                let towards = inputs.CLONE_OPTION;
                if (!towards || towards.length !== 2) {
                    fatal("Unknown or unimplemented inputs.CLONE_OPTION info");
                } else {
                    let block = blocks[towards[1]];
                    if (!block || block.opcode !== "control_create_clone_of_menu") {
                        fatal("Unknown or unimplemented inputs.CLONE_OPTION child op");
                    } else {
                        let towardsData = block.fields.CLONE_OPTION;
                        if (!towardsData || towardsData.length !== 2 || towardsData[1] !== null) {
                            fatal("Unknown or unimplemented control_create_clone_of_menu TOWARDS magics");
                        } else {
                            if (towardsData[0] === "_myself_") {
                                emitStatement("const sprite = new (this.createSelf)(true, this.visible);");
                                emitStatement("await sprite.waitForInit();");
                                emitStatement("existingSprites.push(sprite);");
                            } else {
                                fatal("Unknown or nuimplemented control_create_clone_of_menu CLONE_OPTION: " + towardsData[0]);
                            }
                        }
                    }
                }
            }
            break;

        case "event_broadcast":
            {
                let broadcastName = getValueFromInput(inputs.BROADCAST_INPUT);
                emitStatement("pendingBroadcasts.add(\"" + sanitizeString(broadcastName) + "\");");
            }
            break;

        default:
            warn("Unknown or unimplemented block '" + block.opcode + "'");
            debug(block);
            emitStatement("// Unknown block " + block.opcode);
            break;
    }
    tabLevel --;
    result += "    ".repeat(tabLevel);
    result += "}\n";
    
    return result;
}

function processToplevelBlocks(allBlocks, toplevelBlocks) {
    let resultingCode = "";
    for (let i in toplevelBlocks) {
        let currentBlockCode = "";
        let block = toplevelBlocks[i];
        let tabLevel = 4;
        switch (block.opcode) {
            case "event_whenflagclicked":
                currentBlockCode += "    ".repeat(tabLevel) + "onStartListeners.push((async function() {\n";

                tabLevel ++;
                currentBlockCode += "    ".repeat(tabLevel) + "if (!isClone) {\n";
                tabLevel ++;
                if (block.next !== null) {
                    do {
                        block = allBlocks[block.next];
                        currentBlockCode += processBlock(block, allBlocks, tabLevel);
                        currentBlockCode += "\n";
                    } while (block.next !== null)
                }

                currentBlockCode += "    ".repeat(tabLevel);
                currentBlockCode += "await this.screenRefresh();\n";

                tabLevel --;
                currentBlockCode += "    ".repeat(tabLevel) + "}\n";
                tabLevel --;
                currentBlockCode += "    ".repeat(tabLevel) + "}).bind(this));\n";
                break;

            case "event_whenbroadcastreceived":
                const broadcastName = block.fields.BROADCAST_OPTION[0];
                currentBlockCode += "    ".repeat(tabLevel) + "broadcastListeners.push({\n";
                tabLevel ++;
                currentBlockCode += "    ".repeat(tabLevel) + "\"name\": \"" + sanitizeString(broadcastName) + "\",\n";
                currentBlockCode += "    ".repeat(tabLevel) + "\"callback\": (async function() {\n";

                tabLevel ++;
                if (block.next !== null) {
                    do {
                        block = allBlocks[block.next];
                        currentBlockCode += processBlock(block, allBlocks, tabLevel);
                        currentBlockCode += "\n";
                    } while (block.next !== null)
                }

                currentBlockCode += "    ".repeat(tabLevel);
                currentBlockCode += "await this.screenRefresh();\n";

                tabLevel --;
                currentBlockCode += "    ".repeat(tabLevel) + "}).bind(this)\n";
                tabLevel --;
                currentBlockCode += "    ".repeat(tabLevel) + "});\n";
                break;

            case "control_start_as_clone":
                currentBlockCode += "    ".repeat(tabLevel) + "this.onStartAsClone.push((async function() {\n";

                tabLevel ++;
                if (block.next !== null) {
                    do {
                        block = allBlocks[block.next];
                        currentBlockCode += processBlock(block, allBlocks, tabLevel);
                        currentBlockCode += "\n";
                    } while (block.next !== null)
                }

                currentBlockCode += "    ".repeat(tabLevel);
                currentBlockCode += "await this.screenRefresh();\n";

                tabLevel --;
                currentBlockCode += "    ".repeat(tabLevel) + "}).bind(this));\n";
                break;

            default:
                warn("Unknown or unimplemented toplevel block '" + block.opcode + "'");
                break;
        }
        
        resultingCode += currentBlockCode;
    }

    return resultingCode;
}

module.exports = { processBlock, processToplevelBlocks };
