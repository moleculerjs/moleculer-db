/*
 * moleculer-db
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer-db)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const Promise = require("bluebird");
const chalk = require("chalk");

class ModuleChecker {

	constructor(okCount) {
		this.tests = [];
		this.okCount = okCount;
		this.ok = 0;
		this.fail = 0;
	}

	add(title, fn, cb) {
		this.tests.push(() => Promise.resolve(this.printTitle(title)).then(() => fn()).then(rsp => {
			let res = cb(rsp);
			if (Array.isArray(res))
				res.map(r => this.checkValid(r));
			else if (res != null)
				this.checkValid(res);
		}));
	}

	execute() {
		return Promise.each(this.tests, fn => fn());
	}

	printTitle(text) {
		console.log();
		console.log(chalk.yellow.bold(`--- ${text} ---`));
	}

	checkValid(cond) {
		let res = cond;
		if (_.isFunction(cond))
			res = cond();

		if (res) {
			this.ok++;
			console.log(chalk.bgGreen.yellow.bold("--- OK ---"));
		} else {
			this.fail++;
			console.log(chalk.bgRed.yellow.bold("!!! FAIL !!!"));
		}
	}

	printTotal() {
		console.log();
		console.log(chalk.bgGreen.yellow.bold(`--- OK: ${this.ok} of ${this.okCount} ---`), this.fail > 0 ? " | " + chalk.bgRed.yellow.bold(`!!! FAIL: ${this.fail} !!!`) : "");
		console.log();
	}
}


module.exports = ModuleChecker;
