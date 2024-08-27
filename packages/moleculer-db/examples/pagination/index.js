"use strict";

const _ = require("lodash");
const kleur = require("kleur");
const { ServiceBroker } = require("moleculer");
const DbService = require("../../index");
const ModuleChecker = require("../../test/checker");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Create broker
const broker = new ServiceBroker({
	logger: console,
	logLevel: "debug"
});

// Load my service
broker.createService(DbService, {
	name: "posts",
	settings: {
		fields: ["title"]
	},

	methods: {
		seedDB() {
			return this.adapter.clear()
				.then(() => this.adapter.insertMany(_.times(28, i => {
					return {
						title: `Post #${_.padStart(i + 1, 2, "0")}`
					};
				})));
		}
	},

	afterConnected() {
		this.logger.info(kleur.green().bold("Connected successfully"));
		return this.seedDB();
	}
});

const checker = new ModuleChecker(14);

// Start checks
function start() {
	return Promise.resolve()
		.then(()=> delay(500))
		.then(() => checker.execute())
		.catch(console.error)
		.then(() => broker.stop())
		.then(() => checker.printTotal());
}

// --- TEST CASES ---

// Count of posts
checker.add("COUNT", () => broker.call("posts.count"), res => {
	console.log(res);
	return res == 28;
});

// Find posts
checker.add("FIND", () => broker.call("posts.find", { sort: "title" }), res => {
	console.log(res);
	return res.length == 28;
});

// List posts
checker.add("LIST FIRST 10", () => broker.call("posts.list", { sort: "title" }), res => {
	console.log(res);
	const rows = res.rows;
	return [
		res.total === 28 && res.page === 1 && res.pageSize === 10 && res.totalPages === 3,
		rows.length === 10 && rows[0].title == "Post #01" && rows[9].title === "Post #10"
	];
});

// List posts
checker.add("LIST LAST 10", () => broker.call("posts.list", { sort: "-title" }), res => {
	console.log(res);
	const rows = res.rows;
	return [
		res.total === 28 && res.page === 1 && res.pageSize === 10 && res.totalPages === 3,
		rows.length === 10 && rows[0].title == "Post #28" && rows[9].title === "Post #19"
	];
});

// List posts
checker.add("LIST FIRST 25", () => broker.call("posts.list", { page: 1, pageSize: 25, sort: "title" }), res => {
	console.log(res);
	const rows = res.rows;
	return [
		res.total === 28 && res.page === 1 && res.pageSize === 25 && res.totalPages === 2,
		rows.length === 25 && rows[0].title == "Post #01" && rows[24].title === "Post #25"
	];
});

// List posts
checker.add("LIST NEXT 25", () => broker.call("posts.list", { page: 2, pageSize: 25, sort: "title" }), res => {
	console.log(res);
	const rows = res.rows;
	return [
		res.total === 28 && res.page === 2 && res.pageSize === 25 && res.totalPages === 2,
		rows.length === 3 && rows[0].title == "Post #26" && rows[2].title === "Post #28"
	];
});

// List posts
checker.add("LIST NEXT2 25", () => broker.call("posts.list", { page: 3, pageSize: 25, sort: "title" }), res => {
	console.log(res);
	const rows = res.rows;
	return [
		res.total === 28 && res.page === 3 && res.pageSize === 25 && res.totalPages === 2,
		rows.length === 0
	];
});

// List posts with search
checker.add("LIST SEARCH 5", () => broker.call("posts.list", { page: 1, pageSize: 5, search: "#2" }), res => {
	console.log(res);
	const rows = res.rows;
	return [
		res.total === 9 && res.page === 1 && res.pageSize === 5 && res.totalPages === 2,
		rows.length === 5
	];
});

broker.start().then(() => start());
