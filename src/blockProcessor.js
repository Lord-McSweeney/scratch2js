const { sanitizeString } = require("./utils.js");
const { debug, info, warn, error, fatal } = require("./logging.js");

const ANY_TYPE = 1;
const ENSURE_NUMERIC = 2;

function processValueBlock(block, blocks) {
    const inputs = block.inputs;

    switch (block.opcode) {
        case "operator_and":
            {
                const lht = getValueFromInput(inputs.OPERAND1, blocks, ANY_TYPE);
                const rht = getValueFromInput(inputs.OPERAND2, blocks, ANY_TYPE);
                return "(" + lht + " && " + rht + ")";
            }
        case "operator_or":
            {
                const lht = getValueFromInput(inputs.OPERAND1, blocks, ANY_TYPE);
                const rht = getValueFromInput(inputs.OPERAND2, blocks, ANY_TYPE);
                return "(" + lht + " || " + rht + ")";
            }
        case "operator_not":
            {
                const operand = getValueFromInput(inputs.OPERAND, blocks, ANY_TYPE);
                return "(!" + operand + ")";
            }

        case "operator_equals":
            {
                const lht = getValueFromInput(inputs.OPERAND1, blocks, ANY_TYPE);
                const rht = getValueFromInput(inputs.OPERAND2, blocks, ANY_TYPE);
                return "(" + lht + " == " + rht + ")";
            }
        case "operator_gt":
            {
                const lht = getValueFromInput(inputs.OPERAND1, blocks, ANY_TYPE);
                const rht = getValueFromInput(inputs.OPERAND2, blocks, ANY_TYPE);
                return "(" + lht + " > " + rht + ")";
            }
        case "operator_lt":
            {
                const lht = getValueFromInput(inputs.OPERAND1, blocks, ANY_TYPE);
                const rht = getValueFromInput(inputs.OPERAND2, blocks, ANY_TYPE);
                return "(" + lht + " < " + rht + ")";
            }

        case "operator_add":
            {
                const lht = getValueFromInput(inputs.NUM1, blocks, ENSURE_NUMERIC);
                const rht = getValueFromInput(inputs.NUM2, blocks, ENSURE_NUMERIC);
                return "(" + lht + " + " + rht + ")";
            }
        case "operator_divide":
            {
                const lht = getValueFromInput(inputs.NUM1, blocks, ENSURE_NUMERIC);
                const rht = getValueFromInput(inputs.NUM2, blocks, ENSURE_NUMERIC);
                return "(" + lht + " / " + rht + ")";
            }
        case "operator_subtract":
            {
                const lht = getValueFromInput(inputs.NUM1, blocks, ENSURE_NUMERIC);
                const rht = getValueFromInput(inputs.NUM2, blocks, ENSURE_NUMERIC);
                return "(" + lht + " - " + rht + ")";
            }

        case "operator_random":
            {
                const from = parseFloat(getValueFromInput(inputs.FROM, blocks, ENSURE_NUMERIC));
                const to = parseFloat(getValueFromInput(inputs.TO, blocks, ENSURE_NUMERIC));
                if (Math.floor(from) !== from || Math.floor(to) !== to) {
                    fatal("operator_random with non-integral operands not implemented");
                }

                const toMinusFrom = to - from;

                return `Math.floor(Math.random() * (${toMinusFrom} + 1) + ${from})`;
            }

        case "looks_size":
            {
                return "this.size";
            }

        case "motion_xposition":
            {
                return "(this.x - 240)";
            }
        default:
            debug(block);
            error("Unknown or implemented value block " + block.opcode);
            return "null";
    }
}

function getValueFromInput(input, blocks, type) {
        if (!input) {
            fatal("Invalid input info");
        } else if (input[0] === 1) {
            switch(input[1][0]) {
                case 4:
                case 5:
                case 6:
                case 10:
                    if (type === ENSURE_NUMERIC) {
                        return "" + parseFloat(input[1][1]);
                    } else {
                        return "\"" + sanitizeString(input[1][1]) + "\"";
                    }

                case 11:
                    if (type === ENSURE_NUMERIC) {
                        error("Encountered non-numeric type but caller passed ENSURE_NUMERIC");
                    }
                    return "\"" + sanitizeString(input[1][1]) + "\"";

                default:
                    fatal("Unknown or unimplemented input magic: " + input[1][0]);
            }
        } else if (input[0] === 2 || input[0] === 3) {
            let block = null;
            if (Array.isArray(input[1])) {
                warn("Unimplemented variables");
                return "null";
            } else {
                block = blocks[input[1]];
                if (block === undefined) {
                    fatal("Expression referred to invalid block");
                } else {
                    return processValueBlock(block, blocks);
                }
            }
        } else {
            fatal("Unknown or unimplemented inputs magics");
        }
    }

function processBlock(block, blocks, tabLevel) {
    let result = "    ".repeat(tabLevel) + "{\n";
    tabLevel ++;
    const inputs = block.inputs;

    let emitStatement = function(statement) {
        result += "    ".repeat(tabLevel);
        result += statement;
        result += "\n";
    };

    switch (block.opcode) {
        case "motion_movesteps":
            {
                let moveAmount = getValueFromInput(inputs.STEPS, blocks, ENSURE_NUMERIC);

                emitStatement("this.changeXBy(Math.cos(this.direction * Math.PI/180) * " + moveAmount + ");");
                emitStatement("this.changeYBy(Math.sin(this.direction * Math.PI/180) * " + moveAmount + ");");
            }
            break;

        case "motion_gotoxy":
            {
                let xPos = getValueFromInput(inputs.X, blocks, ENSURE_NUMERIC);
                let yPos = getValueFromInput(inputs.Y, blocks, ENSURE_NUMERIC);

                emitStatement("this.moveTo(" + xPos + ", " + yPos + ");");
            }
            break;

        case "motion_changexby":
            {
                let xChange = getValueFromInput(inputs.DX, blocks, ENSURE_NUMERIC);

                emitStatement("this.changeXBy(" + xChange + ");");
            }
            break;
        case "motion_changeyby":
            {
                let yChange = getValueFromInput(inputs.DY, blocks, ENSURE_NUMERIC);

                emitStatement("this.changeYBy(" + yChange + ");");
            }
            break;

        case "motion_setx":
            {
                let newX = getValueFromInput(inputs.X, blocks, ENSURE_NUMERIC);

                emitStatement("this.moveTo(" + newX + ", this.y);");
            }
            break;
        case "motion_sety":
            {
                let newY = getValueFromInput(inputs.Y, blocks, ENSURE_NUMERIC);

                emitStatement("this.moveTo(this.x, " + newY + ");");
            }
            break;

        case "motion_turnleft":
        case "motion_turnright":
            {
                let turnAmount = getValueFromInput(inputs.DEGREES, blocks, ENSURE_NUMERIC);

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
                        const block = blocks[costume[1]];
                        if (block === undefined) {
                            fatal("Expression referred to invalid block");
                        } else {
                            const data = processValueBlock(block, blocks);
                            emitStatement("await this.changeCostume(" + data + ");");
                        }
                    } else {
                        fatal("Unknown or unimplemented inputs.COSTUME handling");
                    }
                }
            }
            break;

        case "motion_glidesecstoxy":
            {
                let secs = getValueFromInput(inputs.SECS, blocks, ENSURE_NUMERIC);
                let xPos = getValueFromInput(inputs.X, blocks, ENSURE_NUMERIC);
                let yPos = getValueFromInput(inputs.Y, blocks, ENSURE_NUMERIC);

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
                let size = getValueFromInput(inputs.SIZE, blocks, ENSURE_NUMERIC);
                emitStatement("this.size = " + size + ";");
            }
            break;

        case "looks_changeeffectby":
            {
                let change = getValueFromInput(inputs.CHANGE, blocks, ENSURE_NUMERIC);
                let effect = block.fields.EFFECT;
                if (!effect || effect.length !== 2 || effect[1] !== null) {
                    fatal("Unknown or unimplemented looks_changeeffectby EFFECT magics");
                } else {
                    let realEffect = effect[0];
                    emitStatement("this.effects['" + realEffect.toLowerCase() + "'] += " + change + ";");
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
                let duration = getValueFromInput(inputs.DURATION, blocks, ENSURE_NUMERIC);
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
                let repeatCount = getValueFromInput(inputs.TIMES, blocks, ENSURE_NUMERIC);
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

        case "control_repeat_until":
            {
                let condition = inputs.CONDITION;
                if (!condition || condition.length !== 2) {
                    fatal("Unknown or unimplemented inputs.CONDITION info");
                } else if (condition[0] !== 2) {
                    fatal("Unknown or unimplemented inputs.CONDITION magics");
                }

                let serializedCondition = processValueBlock(blocks[condition[1]], blocks);

                let substack = inputs.SUBSTACK;
                if (!substack || substack.length !== 2) {
                    fatal("Unknown or unimplemented inputs.SUBSTACK info");
                } else if (substack[0] !== 2) {
                    fatal("Unknown or unimplemented inputs.SUBSTACK magics");
                }

                emitStatement("while (!(" + serializedCondition + ")) {");
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

        case "control_if":
        case "control_if_else":
            {
                // Condition
                let condition = inputs.CONDITION;
                if (!condition || condition.length !== 2) {
                    fatal("Unknown or unimplemented inputs.CONDITION info");
                } else if (condition[0] !== 2) {
                    fatal("Unknown or unimplemented inputs.CONDITION magics");
                }

                let serializedCondition = processValueBlock(blocks[condition[1]], blocks);

                // Handle If
                {
                    let substack = inputs.SUBSTACK;
                    if (!substack || substack.length !== 2) {
                        fatal("Unknown or unimplemented inputs.SUBSTACK info");
                    } else if (substack[0] !== 2) {
                        fatal("Unknown or unimplemented inputs.SUBSTACK magics");
                    }

                    emitStatement("if (" + serializedCondition + ") {");
                    tabLevel ++;

                    let childBlock = blocks[substack[1]];
                    while (true) {
                        result += processBlock(childBlock, blocks, tabLevel);
                        result += "\n";
                        if (childBlock.next === null) {
                            break;
                        } else {
                            childBlock = blocks[childBlock.next];
                        }
                    }

                    tabLevel --;
                    if (block.opcode === "control_if_else") {
                        emitStatement("} else {");
                    } else {
                        emitStatement("}");
                    }
                }

                // Handle Else
                if (block.opcode === "control_if_else") {
                    let substack = inputs.SUBSTACK2;
                    if (!substack || substack.length !== 2) {
                        fatal("Unknown or unimplemented inputs.SUBSTACK2 info");
                    } else if (substack[0] !== 2) {
                        fatal("Unknown or unimplemented inputs.SUBSTACK2 magics");
                    }

                    tabLevel ++;

                    let childBlock = blocks[substack[1]];
                    while (true) {
                        result += processBlock(childBlock, blocks, tabLevel);
                        result += "\n";
                        if (childBlock.next === null) {
                            break;
                        } else {
                            childBlock = blocks[childBlock.next];
                        }
                    }

                    tabLevel --;
                    emitStatement("}");
                }
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

        case "control_delete_this_clone":
            emitStatement("if (existingSprites.includes(this) && this.isClone) {");
            emitStatement("    existingSprites.splice(existingSprites.indexOf(this), 1);");
            emitStatement("}");
            emitStatement("return;");
            break;

        case "event_broadcast":
            {
                let broadcastName = getValueFromInput(inputs.BROADCAST_INPUT, blocks, ANY_TYPE);
                emitStatement("pendingBroadcasts.add(" + broadcastName + ");");
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
