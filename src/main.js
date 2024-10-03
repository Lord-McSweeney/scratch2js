/// Reads and unzips an SB3 file, passing it to convertProject.

/*
TODO

Loops should only call screenRefresh if there is at least one motion/looks block
in the loop body (even if it's a no-op)

Procedure argument defaults

Advanced list usage

Stop (all/this script)

sprite-sprite intersections

procInfo outside of function, should simply return 0 for all values (used to detect TurboWarp, which returns 1 for all values instead)
*/

const fs = require("fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const path = require('path');

const { debug, info, warn, error, fatal } = require("./logging.js");
const { convertProject } = require("./convert.js");

async function main() {
    if (process.argv.length === 2) {
        debug("Pass file.");
        return;
    }
    const sb3file = process.argv.slice(2)[0];

    info("Making temp directory...");
    fs.mkdirSync("/tmp/scratch-extraction/");

    function cleanup() {
        info("Cleaning up...");
        fs.rmSync("/tmp/scratch-extraction/", {recursive: true});
    }

    try {
        info("Copying sb3 file...");
        fs.copyFileSync(sb3file, "/tmp/scratch-extraction/file.sb3");

        info("Extracting files...");
        await exec("unzip -o /tmp/scratch-extraction/file.sb3 -d " + "/tmp/scratch-extraction/");
    } catch(e) {
        console.log(e);
        cleanup();
        return;
    }

    info("Removing original sb3 file from temp directory...");
    fs.unlinkSync("/tmp/scratch-extraction/file.sb3");

    info("Creating extraction directory...");
    if (fs.existsSync("./output/")) {
        fs.rmSync("./output/", {recursive: true});
    }
    fs.mkdirSync("./output/");

    try {
        // This operation shouldn't fail unless the asset file is missing
        const assetPath = path.join(__dirname, "assets/");
        const wrapperFile = fs.readFileSync(assetPath + "wrapper.html");

        info("Reading extracted files from temp directory and converting project...");
        let files = fs.readdirSync("/tmp/scratch-extraction/");
        for (let i in files) {
            const file = files[i];
            const readData = fs.readFileSync("/tmp/scratch-extraction/" + file);
            if (file === "project.json") {
                const result = convertProject(readData.toString("utf8"), wrapperFile);
                fs.writeFileSync("./output/index.html", result);
            } else {
                if (file.endsWith(".svg") || file.endsWith(".png") || file.endsWith(".wav")) {
                    fs.writeFileSync("./output/" + file.replaceAll("/", "_"), readData);
                } else {
                    warn("Not handling other file '" + file + "'");
                }
            }
        }

        info("Done!");
    } catch(e) {
        console.log(e);
    }

    cleanup();
}

main();
