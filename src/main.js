/*
TODO

Loops should only call screenRefresh if there is at least one motion/looks block
in the loop body (even if it's a no-op)

Procedures

Stop (all/this sprite)

sprite-sprite/point-sprite intersections
*/

const fs = require("fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const path = require('path');

const { sanitizeString } = require("./utils.js");
const { debug, info, warn, error, fatal } = require("./logging.js");
const { processBlock, processToplevelBlocks } = require("./blockProcessor.js");

const assetPath = path.join(__dirname, "assets/");

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

    // Finally, create stage constructor
    code += `
        targets.push({
            ctor: createSpriteConstructor(
                "${sanitizeString(targetInfo.name)}",
                240,
                180,
                100,
                0,
                ${JSON.stringify(targetInfo.costumes)},
                ${targetInfo.currentCostume},
                "all around",
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

    // Create sprite constructor
    let code = `
        targets.push({
            ctor: createSpriteConstructor(
                "${sanitizeString(targetInfo.name)}",
                ${240 + targetInfo.x},
                ${180 - targetInfo.y},
                ${targetInfo.size},
                ${targetInfo.direction - 90},
                ${JSON.stringify(targetInfo.costumes)},
                ${targetInfo.currentCostume},
                "${sanitizeString(targetInfo.rotationStyle)}",
                ${JSON.stringify(resultVariables)},
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

function convertProject(projectData) {
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

    return fs.readFileSync(assetPath + "wrapper.html").toString().replace("##code##", code);
}

async function main() {
    if (process.argv.length === 2) {
        debug("Pass file.");
        return;
    }
    const sb3file = process.argv.slice(2)[0];

    info("Making temp directory...");
    fs.mkdirSync("/tmp/scratch-extraction/");

    info("Copying sb3 file...");
    fs.copyFileSync(sb3file, "/tmp/scratch-extraction/file.sb3");

    info("Extracting files...");
    await exec("unzip -o /tmp/scratch-extraction/file.sb3 -d " + "/tmp/scratch-extraction/");

    info("Removing original sb3 file from temp directory...");
    fs.unlinkSync("/tmp/scratch-extraction/file.sb3");

    info("Creating extraction directory...");
    if (fs.existsSync("./output/")) {
        fs.rmSync("./output/", {recursive: true});
    }
    fs.mkdirSync("./output/");

    try {
        info("Reading extracted files from temp directory...");
        let files = fs.readdirSync("/tmp/scratch-extraction/");
        for (let i in files) {
            const file = files[i];
            const readData = fs.readFileSync("/tmp/scratch-extraction/" + file);
            if (file === "project.json") {
                const result = convertProject(readData.toString("utf8"));
                fs.writeFileSync("./output/index.html", result);
            } else {
                if (file.endsWith(".svg") || file.endsWith(".png") || file.endsWith(".wav")) {
                    fs.writeFileSync("./output/" + file.replaceAll("/", "_"), readData);
                } else {
                    warn("Not handling other file '" + file + "'");
                }
            }
        }
    } catch(e) {
        console.log(e);
    }

    info("Done!");

    info("Cleaning up...");
    fs.rmSync("/tmp/scratch-extraction/", {recursive: true});
}

main();
