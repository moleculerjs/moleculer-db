"use strict";

const path = require("path");
const glob = require("glob");
const markdownMagic = require("markdown-magic");

const readmePath = path.join(__dirname, "README.md");
console.log(readmePath);
markdownMagic(readmePath, {

	transforms: {
		RENDERLIST: function(content, opts) {
			const folders = glob.sync(path.join(opts.folder, "*"));
			//console.log(folders);
			if (folders.length == 0) return " ";

			let table = [
				"## " + opts.title,
				"| Name | Version | Description |",
				"| ---- | ------- | ----------- |"
				
			];
			folders.forEach(folder => {
				let name = path.basename(folder);
				let pkg = require(path.resolve(folder, "package.json"));

				let line = `| [${name}](/${opts.folder}/${name}#readme) | [![NPM version](https://img.shields.io/npm/v/${name}.svg)](https://www.npmjs.com/package/${name}) | ${pkg.description} |`;

				table.push(line);
			});

			return table.join("\n");
		}
	},
	DEBUG: false

}, () => {
	console.log("README.md generated!");
});