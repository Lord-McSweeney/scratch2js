/// Converts an SB3 project.json to JS using processToplevelBlocks and creating sprite constructors.

const { sanitizeString } = require("./utils.js");
const { debug, info, warn, error, fatal } = require("./logging.js");
const { processToplevelBlocks } = require("./blockProcessor.js");

function convertStageTarget(targetInfo) {
    let runnableCode = "";

    let toplevelBlocks = [];
    for (let i in targetInfo.blocks) {
        if (targetInfo.blocks[i].topLevel) {
            toplevelBlocks.push(targetInfo.blocks[i]);
        }
    }

    // Parse top-level blocks
    runnableCode += processToplevelBlocks(targetInfo.blocks, toplevelBlocks);

    let code = "";

    // Initialize global variables
    const variables = targetInfo.variables;
    for (let i in variables) {
        const variable = variables[i];

        // TODO does this even matter? Are all variables just strings?
        let realString = null;
        if (typeof variable[1] === "number") {
            realString = variable[1].toString();
        } else {
            realString = "\"" + sanitizeString(variable[1]) + "\"";
        }

        code += `
                globalVariables.set("${sanitizeString(i)}", ${realString});
`;
    }

    // Initialize global lists
    const lists = targetInfo.lists;
    for (let i in lists) {
        const list = lists[i];

        code += `
                globalLists.set("${sanitizeString(i)}", ${JSON.stringify(list[1])});
`;
    }

    // Finally, create stage constructor
    code += `
                targets.push({
                    ctor: await createSpriteConstructor(
                        "${sanitizeString(targetInfo.name)}",
                        240,
                        180,
                        100,
                        0,
                        ${JSON.stringify(targetInfo.costumes)},
                        ${targetInfo.currentCostume},
                        "all around",
                        {},
                        {},
                        true,
                        function(isClone) {
${runnableCode}
                        }
                    ),
                    visible: true,
                });
`;

    return code;
}

function convertTarget(targetInfo) {
    let runnableCode = "";

    let toplevelBlocks = [];
    for (let i in targetInfo.blocks) {
        if (targetInfo.blocks[i].topLevel) {
            toplevelBlocks.push(targetInfo.blocks[i]);
        }
    }

    // Parse top-level blocks
    runnableCode += processToplevelBlocks(targetInfo.blocks, toplevelBlocks);

    // Initialize local variables
    const variables = targetInfo.variables;
    const resultVariables = {};
    for (let i in variables) {
        resultVariables[i] = variables[i][1];
    }

    // Initialize local lists
    const lists = targetInfo.lists;
    const resultLists = {};
    for (let i in lists) {
        resultLists[i] = lists[i][1];
    }

    // Create sprite constructor
    let code = `
                targets.push({
                    ctor: await createSpriteConstructor(
                        "${sanitizeString(targetInfo.name)}",
                        ${240 + targetInfo.x},
                        ${180 - targetInfo.y},
                        ${targetInfo.size},
                        ${targetInfo.direction - 90},
                        ${JSON.stringify(targetInfo.costumes)},
                        ${targetInfo.currentCostume},
                        "${sanitizeString(targetInfo.rotationStyle)}",
                        ${JSON.stringify(resultVariables)},
                        ${JSON.stringify(resultLists)},
                        false,
                        function(isClone) {
${runnableCode}
                        }
                    ),
                    visible: ${targetInfo.visible},
                });
`;

    return code;
}

function convertProject(projectData, wrapperFile) {
    const data = JSON.parse(projectData);

    let code = "";
    let targets = data.targets;
    let encounteredStageTarget = false;
    for (let i in targets) {
        if (targets[i].isStage) {
            if (encounteredStageTarget) {
                fatal("Duplicate stage target");
                return "";
            }

            code += convertStageTarget(targets[i]);
            encounteredStageTarget = true;
        } else {
            code += convertTarget(targets[i]);
        }
    }

    // DO NOT USE String.prototype.replace HERE- SPECIAL $ REPLACEMENT CHARACTERS IN `code` MUST BE SANITIZED
    return wrapperFile.toString().split("##code##").join(code);
}

module.exports = { convertProject };
