/// Processes blocks, turning them into code referencing functions provided by wrapper.html.

const { sanitizeString } = require("./utils.js");
const { debug, info, warn, error, fatal } = require("./logging.js");

const ANY_TYPE = 1;
const ENSURE_NUMERIC = 2;

function processValueBlock(block, blocks) {
    const inputs = block.inputs;
    const fields = block.fields;

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
        case "operator_mod":
            {
                const lht = getValueFromInput(inputs.NUM1, blocks, ENSURE_NUMERIC);
                const rht = getValueFromInput(inputs.NUM2, blocks, ENSURE_NUMERIC);
                return "(" + lht + " % " + rht + ")";
            }
        case "operator_multiply":
            {
                const lht = getValueFromInput(inputs.NUM1, blocks, ENSURE_NUMERIC);
                const rht = getValueFromInput(inputs.NUM2, blocks, ENSURE_NUMERIC);
                return "(" + lht + " * " + rht + ")";
            }
        case "operator_subtract":
            {
                const lht = getValueFromInput(inputs.NUM1, blocks, ENSURE_NUMERIC);
                const rht = getValueFromInput(inputs.NUM2, blocks, ENSURE_NUMERIC);
                return "(" + lht + " - " + rht + ")";
            }

        case "operator_round":
            {
                const operand = getValueFromInput(inputs.NUM, blocks, ENSURE_NUMERIC);
                return "Math.round(" + operand + ")";
            }

        case "operator_random":
            {
                const from = parseFloat(getValueFromInput(inputs.FROM, blocks, ENSURE_NUMERIC));
                const to = parseFloat(getValueFromInput(inputs.TO, blocks, ENSURE_NUMERIC));

                const toMinusFrom = to - from;

                if (Math.floor(from) !== from || Math.floor(to) !== to) {
                    return `Math.random() * ${toMinusFrom} + ${from}`;
                } else {
                    return `Math.floor(Math.random() * (${toMinusFrom} + 1) + ${from})`;
                }
            }

        case "operator_mathop":
            {
                if (!fields.OPERATOR) {
                    warn("operator_mathop missing OPERATOR field");
                    return "0";
                }

                const operator = fields.OPERATOR[0];
                const operand = getValueFromInput(inputs.NUM, blocks, ENSURE_NUMERIC);
                switch(operator) {
                    case "abs":
                        return "Math.abs(" + operand + ")";
                    case "atan":
                        return "Math.atan(" + operand + ") * (180 / Math.PI)";
                    case "ceiling":
                        return "Math.ceil(" + operand + ")";
                    case "cos":
                        return "Math.cos((Math.PI / 180) * " + operand + ")";
                    case "floor":
                        return "Math.floor(" + operand + ")";
                    case "sin":
                        return "Math.sin((Math.PI / 180) * " + operand + ")";
                    case "sqrt":
                        return "Math.sqrt(" + operand + ")";
                    case "tan":
                        return "Math.tan((Math.PI / 180) * " + operand + ")";

                    default:
                        fatal("Unimplemented mathop \"" + operator + "\"");
                }
            }

        case "operator_join":
            {
                const lht = getValueFromInput(inputs.STRING1, blocks, ANY_TYPE);
                const rht = getValueFromInput(inputs.STRING2, blocks, ANY_TYPE);
                return "(" + lht + ".toString() + " + rht + ".toString())";
            }

        case "operator_contains":
            {
                const lht = getValueFromInput(inputs.STRING1, blocks, ANY_TYPE);
                const rht = getValueFromInput(inputs.STRING2, blocks, ANY_TYPE);
                return "(" + lht + ".toString().includes(" + rht + ".toString()))";
            }

        case "operator_length":
            {
                const operand = getValueFromInput(inputs.STRING, blocks, ANY_TYPE);
                return "(" + operand + ".toString().length)";
            }

        case "operator_letter_of":
            {
                const index = getValueFromInput(inputs.LETTER, blocks, ENSURE_NUMERIC);
                const string = getValueFromInput(inputs.STRING, blocks, ANY_TYPE);
                return "(" + string + ".toString().charAt(" + index + " - 1))";
            }

        case "looks_size":
            {
                return "this.size";
            }

        case "looks_costumenumbername":
            {
                const frontOrBack = fields.NUMBER_NAME[0];
                switch(frontOrBack) {
                    case "name":
                        return "(this.costumes[this.currentCostume].name)";
                    case "number":
                        return "(this.currentCostume + 1)";
                    default:
                        fatal("Invalid NUMBER_NAME field; should be either 'number' or 'name'");
                }
            }

        case "motion_xposition":
            {
                return "(this.x - 240)";
            }
        case "motion_yposition":
            {
                return "(180 - this.y)";
            }
        case "motion_direction":
            {
                return "((90 - this.direction <= -180) ? (450 - this.direction) : (90 - this.direction))";
            }

        case "sensing_mousex":
            {
                return "(mouseX - 240)";
            }
        case "sensing_mousey":
            {
                return "(180 - mouseY)";
            }
        case "sensing_mousedown":
            {
                return "mouseBeingPressed";
            }

        case "sensing_keypressed":
            {
                let testedKey = blocks[inputs.KEY_OPTION[1]].fields.KEY_OPTION;
                if (testedKey === undefined) {
                    warn("Unimplemented sensing_keypressed inputs");
                    return "false";
                }

                testedKey = testedKey[0];

                if (testedKey === "any") {
                    return "isAnyKeyDown()";
                } else {
                    if (testedKey.length === 1) {
                        return "(!!(pressedKeys.get(\"" + sanitizeString(testedKey) + "\")))";
                    } else {
                        switch (testedKey) {
                            case "up arrow":
                                return "(!!(pressedKeys.get(\"ArrowUp\")))";
                            case "down arrow":
                                return "(!!(pressedKeys.get(\"ArrowDown\")))";
                            case "left arrow":
                                return "(!!(pressedKeys.get(\"ArrowLeft\")))";
                            case "right arrow":
                                return "(!!(pressedKeys.get(\"ArrowRight\")))";

                            case "enter":
                                return "(!!(pressedKeys.get(\"Enter\")))";

                            case "space":
                                return "(!!(pressedKeys.get(\" \")))";

                            default:
                                fatal("Unknown key: " + testedKey);
                        }
                    }
                }
            }
            break;

        case "sensing_touchingobject":
            const menuBlock = blocks[block.inputs.TOUCHINGOBJECTMENU[1]];
            if (menuBlock.opcode !== "sensing_touchingobjectmenu") {
                error("Unknown or unimplemented sensing_touchingobject menu");
                return "false";
            }

            const touchingInfo = menuBlock.fields.TOUCHINGOBJECTMENU[0];
            if (touchingInfo === "_mouse_") {
                return "(await this.intersectsPoint(mouseX, mouseY))";
            } else {
                error("Unknown or unimplemented object specified in sensing_touchingobjectmenu");
                return "false";
            }
            break;

        // Is there a difference between these two outside of the IDE?
        case "argument_reporter_boolean":
        case "argument_reporter_string_number":
            {
                // `argsMethodArgs` and `argsArgMapping` are only available within a defined method;
                // this block will error if used outside of a method definition. You actually can do so
                // in Scratch (the block will simply always return 0), and this is actually used.
                const argName = block.fields.VALUE[0];
                return "argsMethodArgs[argsArgMapping.indexOf(\"" + sanitizeString(argName) + "\")]";
            }

        case "data_itemoflist":
            {
                const listName = "\"" + sanitizeString(fields.LIST[1]) + "\"";
                const index = getValueFromInput(inputs.INDEX, blocks, ENSURE_NUMERIC);

                return "this.getListReference(" + listName + ")[" + index + " - 1]";
            }
            break;

        case "data_itemnumoflist":
            {
                const listName = "\"" + sanitizeString(fields.LIST[1]) + "\"";
                const value = getValueFromInput(inputs.ITEM, blocks, ANY_TYPE);

                return "(this.getListReference(" + listName + ").indexOf(" + value + ") + 1)";
            }
            break;

        case "data_listcontainsitem":
            {
                const listName = "\"" + sanitizeString(fields.LIST[1]) + "\"";
                const value = getValueFromInput(inputs.ITEM, blocks, ANY_TYPE);

                return "this.getListReference(" + listName + ").includes(" + value + ")";
            }
            break;

        case "data_lengthoflist":
            {
                const listName = "\"" + sanitizeString(fields.LIST[1]) + "\"";

                return "this.getListReference(" + listName + ").length";
            }
            break;

        default:
            debug(block);
            error("Unknown or unimplemented value block '" + block.opcode + "'");
            return "(/*Unimplemented value " + block.opcode + "*/ null)";
    }
}

function getValueFromInput(input, blocks, type) {
    if (!input) {
        warn("getValueFromInput passed empty input");
        return "null";
    } else if (input[0] === 1) {
        if (input[1] === null) {
            return "null";
        }

        switch(input[1][0]) {
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
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
            if (type === ENSURE_NUMERIC) {
                return "parseFloat(this.getVariable(\"" + sanitizeString(input[1][2]) + "\"))";
            } else {
                return "this.getVariable(\"" + sanitizeString(input[1][2]) + "\")";
            }
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
    const fields = block.fields;

    let emitStatement = function(statement) {
        result += "    ".repeat(tabLevel);
        result += statement;
        result += "\n";
    };

    switch (block.opcode) {
        case "motion_movesteps":
            {
                const moveAmount = getValueFromInput(inputs.STEPS, blocks, ENSURE_NUMERIC);

                emitStatement("this.changeXBy(Math.cos(this.direction * Math.PI/180) * " + moveAmount + ");");
                emitStatement("this.changeYBy(Math.sin(this.direction * Math.PI/180) * " + moveAmount + ");");
            }
            break;

        case "motion_gotoxy":
            {
                const xPos = getValueFromInput(inputs.X, blocks, ENSURE_NUMERIC);
                const yPos = getValueFromInput(inputs.Y, blocks, ENSURE_NUMERIC);
                emitStatement("this.moveTo(" + xPos + ", " + yPos + ");");
            }
            break;

        case "motion_goto":
            {
                let to = inputs.TO;
                if (!to || to.length !== 2) {
                    fatal("Unknown or unimplemented inputs.TO info");
                } else {
                    let block = blocks[to[1]];
                    if (!block || block.opcode !== "motion_goto_menu") {
                        fatal("Unknown or unimplemented inputs.TO child op");
                    } else {
                        let toData = block.fields.TO;
                        if (!toData || toData.length !== 2 || toData[1] !== null) {
                            fatal("Unknown or unimplemented motion_goto_menu TO magics");
                        } else {
                            if (toData[0] === "_random_") {
                                emitStatement("this.moveTo(Math.floor(Math.random() * 480 - 240), Math.floor(Math.random() * 360 - 180));");
                            } else {
                                error("Unknown or unimplemented motion_goto_menu TOWARDS: " + toData[0]);
                            }
                        }
                    }
                }
            }
            break;

        case "motion_changexby":
            {
                const xChange = getValueFromInput(inputs.DX, blocks, ENSURE_NUMERIC);
                emitStatement("this.changeXBy(" + xChange + ");");
            }
            break;
        case "motion_changeyby":
            {
                const yChange = getValueFromInput(inputs.DY, blocks, ENSURE_NUMERIC);
                emitStatement("this.changeYBy(" + yChange + ");");
            }
            break;

        case "motion_setx":
            {
                let newX = getValueFromInput(inputs.X, blocks, ENSURE_NUMERIC);
                emitStatement("this.moveTo(" + newX + ", 180 - this.y);");
            }
            break;
        case "motion_sety":
            {
                const newY = getValueFromInput(inputs.Y, blocks, ENSURE_NUMERIC);
                emitStatement("this.moveTo(this.x - 240, " + newY + ");");
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
                                error("Unknown or unimplemented motion_pointtowards_menu TOWARDS: " + towardsData[0]);
                            }
                        }
                    }
                }
            }
            break;

        case "motion_pointindirection":
            {
                const direction = getValueFromInput(inputs.DIRECTION, blocks, ENSURE_NUMERIC);
                emitStatement("const direction = " + direction + ";");
                emitStatement("this.direction = (90 - direction > 0) ? (90 - direction) : (450 - direction);");
            }
            break;

        case "motion_setrotationstyle":
            {
                const rotationStyle = "\"" + sanitizeString(fields.STYLE[0]) + "\"";
                emitStatement("this.rotationStyle = " + rotationStyle + ";");
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
                            if (!costumeData) {
                                fatal("Invalid looks_costume COSTUME magics");
                            } else {
                                let realCostume = costumeData[0];
                                emitStatement("this.changeCostume(\"" + sanitizeString(realCostume) + "\");");
                            }
                        }
                    } else if (costume.length === 3 && costume[0] === 3) {
                        const data = getValueFromInput(costume, blocks, ANY_TYPE);
                        emitStatement("this.changeCostume(" + data + ");");
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
                emitStatement("this.nextCostume();");
            }
            break;

        case "looks_changesizeby":
            {
                let change = getValueFromInput(inputs.CHANGE, blocks, ENSURE_NUMERIC);
                emitStatement("this.size += " + change + ";");
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
                let effect = fields.EFFECT;
                if (!effect || effect.length !== 2 || effect[1] !== null) {
                    fatal("Unknown or unimplemented looks_changeeffectby EFFECT magics");
                } else {
                    let realEffect = effect[0];
                    emitStatement("this.effects['" + realEffect.toLowerCase() + "'] += " + change + ";");
                }
            }
            break;

        case "looks_seteffectto":
            {
                let change = getValueFromInput(inputs.VALUE, blocks, ENSURE_NUMERIC);
                let effect = fields.EFFECT;
                if (!effect) {
                    fatal("Invalid looks_seteffectto EFFECT");
                } else {
                    let realEffect = effect[0];
                    emitStatement("this.effects['" + realEffect.toLowerCase() + "'] = " + change + ";");
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

        case "looks_gotofrontback":
            {
                const frontOrBack = fields.FRONT_BACK[0];
                switch(frontOrBack) {
                    case "front":
                        emitStatement("if (renderList.includes(this)) {");
                        emitStatement("    renderList.push(renderList.splice(renderList.indexOf(this), 1)[0]);");
                        emitStatement("}");
                        break;
                    case "back":
                        emitStatement("if (renderList.includes(this)) {");
                        emitStatement("    renderList.unshift(renderList.splice(renderList.indexOf(this), 1)[0]);");
                        emitStatement("}");
                        break;
                    default:
                        fatal("Invalid FRONT_BACK field; should be either 'front' or 'back'");
                }
            }
            break;

        case "looks_switchbackdropto":
            {
                let backdrop = inputs.BACKDROP;
                if (!backdrop) {
                    fatal("Unknown or unimplemented inputs.BACKDROP info" + JSON.stringify(backdrop));
                } else {
                    if (backdrop.length === 2) {
                        let block = blocks[backdrop[1]];
                        if (!block || block.opcode !== "looks_backdrops") {
                            fatal("Unknown or unimplemented inputs.BACKDROP child op");
                        } else {
                            let backdropData = block.fields.BACKDROP;
                            if (!backdropData) {
                                fatal("Invalid looks_backdrops BACKDROP magics");
                            } else {
                                let realBackdrop = backdropData[0];
                                emitStatement("stageSprite.changeCostume(\"" + sanitizeString(realBackdrop) + "\");");
                            }
                        }
                    } else if (backdrop.length === 3 && backdrop[0] === 3) {
                        const data = getValueFromInput(backdrop, blocks, ANY_TYPE);
                        emitStatement("stageSprite.changeCostume(" + data + ");");
                    } else {
                        fatal("Unknown or unimplemented inputs.BACKDROP handling");
                    }
                }
            }
            break;

        case "looks_sayforsecs":
            {
                let message = getValueFromInput(inputs.MESSAGE, blocks, ANY_TYPE);
                let duration = getValueFromInput(inputs.SECS, blocks, ENSURE_NUMERIC);
                emitStatement("await this.sayAndWait(" + message + ", " + duration + " * 1000);");
            }
            break;

        case "control_wait":
            {
                let duration = getValueFromInput(inputs.DURATION, blocks, ENSURE_NUMERIC);
                emitStatement("await new Promise((resolve) => setTimeout(resolve, " + duration + " * 1000));");
            }
            break;

        case "control_wait_until":
            {
                let condition = inputs.CONDITION;
                if (!condition || (condition[0] === 1 && condition[1] === null)) {
                    break;
                }

                if (condition.length !== 2) {
                    fatal("Unknown or unimplemented inputs.CONDITION info");
                } else if (condition[0] !== 2) {
                    fatal("Unknown or unimplemented inputs.CONDITION magics");
                }

                let serializedCondition = processValueBlock(blocks[condition[1]], blocks);

                emitStatement("while (!(" + serializedCondition + ")) {");
                emitStatement("    await this.screenRefresh();");
                emitStatement("}");
            }
            break;
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
                if (!substack) {
                    break;
                } else if (substack.length !== 2) {
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
                if (!condition || (condition[0] === 1 && condition[1] === null)) {
                    break;
                }

                if (condition.length !== 2) {
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
                if (!condition) {
                    break;
                } else if(condition.length !== 2) {
                    fatal("Unknown or unimplemented inputs.CONDITION info");
                }

                if (condition[1] === null) {
                    break;
                }

                let serializedCondition = processValueBlock(blocks[condition[1]], blocks);

                // Handle If
                {
                    let substack = inputs.SUBSTACK;
                    if (!substack) {
                        break;
                    } else if (substack.length !== 2) {
                        fatal("Unknown or unimplemented inputs.SUBSTACK info");
                    }

                    if (substack[1] === null) {
                        break;
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
                    if (!substack) {
                        emitStatement("   // (empty)");
                        emitStatement("}");
                        break;
                    } else if (substack.length !== 2) {
                        fatal("Unknown or unimplemented inputs.SUBSTACK2 info");
                    } else if (substack[1] === null) {
                        emitStatement("   // (empty)");
                        emitStatement("}");
                        break;
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
                                emitStatement("renderList.push(sprite);");
                            } else {
                                warn("Unknown or unimplemented control_create_clone_of_menu CLONE_OPTION: " + towardsData[0]);
                            }
                        }
                    }
                }
            }
            break;

        case "control_delete_this_clone":
            {
                emitStatement("if (renderList.includes(this) && this.isClone) {");
                emitStatement("    renderList.splice(renderList.indexOf(this), 1);");
                emitStatement("}");
                emitStatement("return;");
            }
            break;

        case "data_setvariableto":
            {
                const variableName = "\"" + sanitizeString(fields.VARIABLE[1]) + "\"";
                const value = getValueFromInput(inputs.VALUE, blocks, ANY_TYPE);

                emitStatement("this.setVariable(" + variableName + ", " + value + ");");
            }
            break;

        case "data_changevariableby":
            {
                const variableName = "\"" + sanitizeString(fields.VARIABLE[1]) + "\"";
                const value = getValueFromInput(inputs.VALUE, blocks, ENSURE_NUMERIC);

                emitStatement("this.changeVariableBy(" + variableName + ", " + value + ");");
            }
            break;

        case "data_addtolist":
            {
                const listName = "\"" + sanitizeString(fields.LIST[1]) + "\"";
                const value = getValueFromInput(inputs.ITEM, blocks, ANY_TYPE);

                emitStatement("this.getListReference(" + listName + ").push(" + value + ");");
            }
            break;

        case "data_deletealloflist":
            {
                const listName = "\"" + sanitizeString(fields.LIST[1]) + "\"";

                emitStatement("this.getListReference(" + listName + ").length = 0;");
            }
            break;

        case "data_insertatlist":
            {
                const listName = "\"" + sanitizeString(fields.LIST[1]) + "\"";
                const value = getValueFromInput(inputs.ITEM, blocks, ANY_TYPE);
                const index = getValueFromInput(inputs.INDEX, blocks, ENSURE_NUMERIC);

                emitStatement("const listRef = this.getListReference(" + listName + ");");
                emitStatement("const index = " + index + " - 1;");
                emitStatement("if (index >= 0 && index <= listRef.length) {");
                emitStatement("    listRef.splice(index, 0, " + value + ");");
                emitStatement("}");
            }
            break;

        case "data_replaceitemoflist":
            {
                const listName = "\"" + sanitizeString(fields.LIST[1]) + "\"";
                const value = getValueFromInput(inputs.ITEM, blocks, ANY_TYPE);
                const index = getValueFromInput(inputs.INDEX, blocks, ENSURE_NUMERIC);

                emitStatement("const listRef = this.getListReference(" + listName + ");");
                emitStatement("const index = " + index + " - 1;");
                emitStatement("if (index >= 0 && index < listRef.length) {");
                emitStatement("    listRef[index] = " + value + ";");
                emitStatement("}");
            }
            break;

        case "data_deleteoflist":
            {
                const listName = "\"" + sanitizeString(fields.LIST[1]) + "\"";
                const index = getValueFromInput(inputs.INDEX, blocks, ENSURE_NUMERIC);

                emitStatement("const listRef = this.getListReference(" + listName + ");");
                emitStatement("const index = " + index + " - 1;");
                emitStatement("if (index >= 0 && index < listRef.length) {");
                emitStatement("    listRef.splice(index, 1);");
                emitStatement("}");
            }
            break;

        case "event_broadcast":
            {
                const broadcastName = getValueFromInput(inputs.BROADCAST_INPUT, blocks, ANY_TYPE);
                emitStatement("pendingBroadcasts.add(" + broadcastName + ");");
            }
            break;
        case "event_broadcastandwait":
            {
                const broadcastName = getValueFromInput(inputs.BROADCAST_INPUT, blocks, ANY_TYPE);
                // We don't even need to go through the pendingBroadcast machinery.
                emitStatement("await handleBroadcastSync(" + broadcastName + ");");
            }
            break;

        case "procedures_call":
            {
                const mutationInfo = block.mutation;
                const argumentIds = JSON.parse(mutationInfo.argumentids);
                const procName = "\"" + sanitizeString(mutationInfo.proccode) + "\"";
                emitStatement("const procInfo = this.definedProcedures.get(" + procName + ");");
                emitStatement("const methodArgs = [");
                for (let i in argumentIds) {
                    const value = getValueFromInput(inputs[argumentIds[i]], blocks, ANY_TYPE);
                    emitStatement("    " + value + ",");
                }
                emitStatement("];");

                // The IDE allows using the backpack feature to reference undefined methods
                emitStatement("if (procInfo) {");
                emitStatement("    await (procInfo.method)(methodArgs, procInfo.argumentnames);");
                emitStatement("}");
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
        let tabLevel = 7;
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

            case "procedures_definition":
                const mutationInfo = allBlocks[block.inputs.custom_block[1]].mutation;
                const procName = "\"" + sanitizeString(mutationInfo.proccode) + "\"";

                currentBlockCode += "    ".repeat(tabLevel) + "this.definedProcedures.set(" + procName + ", {\n";
                tabLevel ++;

                currentBlockCode += "    ".repeat(tabLevel) + "method: (async function(argsMethodArgs, argsArgMapping) {\n";
                tabLevel ++;

                if (block.next !== null) {
                    do {
                        block = allBlocks[block.next];
                        currentBlockCode += processBlock(block, allBlocks, tabLevel);
                        currentBlockCode += "\n";
                    } while (block.next !== null)
                }

                tabLevel --;
                currentBlockCode += "    ".repeat(tabLevel) + "}).bind(this),\n";

                // The format stores both of these in JSON form, so we can just copy it into here.
                currentBlockCode += "    ".repeat(tabLevel) + "argumentids: " + mutationInfo.argumentids + ",\n";
                currentBlockCode += "    ".repeat(tabLevel) + "argumentnames: " + mutationInfo.argumentnames + ",\n";

                tabLevel --;
                currentBlockCode += "    ".repeat(tabLevel) + "});\n";
                break;

            default:
                if (
                    !block.opcode.startsWith("motion_") &&
                    !block.opcode.startsWith("looks_") &&
                    !block.opcode.startsWith("sound_") &&
                    !block.opcode.startsWith("control_") &&
                    !block.opcode.startsWith("sensing_") &&
                    !block.opcode.startsWith("operator_") &&
                    !block.opcode.startsWith("data_") &&
                    !block.opcode.startsWith("procedures_") &&
                    !block.opcode.startsWith("argument_")
                ) {
                    warn("Unknown or unimplemented toplevel block '" + block.opcode + "'");
                }
                break;
        }

        resultingCode += currentBlockCode;
    }

    return resultingCode;
}

module.exports = { processToplevelBlocks };
