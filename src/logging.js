function debug(t) {
    console.log(t);
}

function info(t) {
    console.log("[INFO] " + t);
}

function warn(t) {
    console.log("[WARN] " + t);
}

function error(t) {
    console.log("[ERROR] " + t);
}

function fatal(t) {
    console.log("[FATAL] " + t);
    throw new Error("STOP");
}

module.exports = { debug, info, warn, error, fatal };
