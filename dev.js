"use strict";

const moduleName = process.argv[2];
const example = process.argv[3] || "simple";
process.argv.splice(2, 2);

require("./packages/" + moduleName + "/examples/" + example);