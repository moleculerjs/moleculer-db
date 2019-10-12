"use strict";

const kleur = require("kleur");
const { ServiceBroker } = require("moleculer");
const DbService = require("../../index");
const ModuleChecker = require("../../test/checker");
const Promise = require("bluebird");

// Create broker
const broker = new ServiceBroker({
	logger: console,
	logLevel: "debug"
});

// Load my service
broker.createService(DbService, {
	name: "posts",
	settings: {
		fields: ["_id", "title", "content", "votes", "createdAt", "updatedAt"]
	},

	actions: {
		vote(ctx) {
			return this.adapter.updateById(ctx.params.id, { $inc: { votes: 1 } });
		},

		unvote(ctx) {
			return this.adapter.updateById(ctx.params.id, { $inc: { votes: -1 } });
		}
	},

	afterConnected() {
		this.logger.info(kleur.green().bold("Connected successfully"));
		this.adapter.clear();
	},

	entityCreated(json) {
		this.logger.info(kleur.cyan().bold("Entity lifecycle event: CREATED")/*, json*/);
	},

	entityUpdated(json) {
		this.logger.info(kleur.cyan().bold("Entity lifecycle event: UPDATED")/*, json*/);
	},

	entityRemoved(json) {
		this.logger.info(kleur.cyan().bold("Entity lifecycle event: REMOVED")/*, json*/);
	}
});


const checker = new ModuleChecker(15);

// Start checks
function start() {
	return Promise.resolve()
		.delay(500)
		.then(() => checker.execute())
		.catch(console.error)
		.then(() => broker.stop())
		.then(() => checker.printTotal());
}

// --- TEST CASES ---

let id;
let date = new Date();

// Count of posts
checker.add("COUNT", () => broker.call("posts.count"), res => {
	console.log(res);
	return res == 0;
});

// Create new Posts
checker.add("--- CREATE ---", () => broker.call("posts.create", { title: "Hello", content: "Post content", votes: 2, createdAt: date, status: true }), doc => {
	id = doc._id;
	console.log("Saved: ", doc);
	return doc._id && doc.title === "Hello" && doc.content === "Post content" && doc.votes === 2 && doc.createdAt.getTime() === date.getTime();
});

// Find posts
checker.add("--- FIND ---", () => broker.call("posts.find"), res => {
	console.log(res);
	return res.length == 1 && res[0]._id == id;
});

// List posts
checker.add("--- LIST ---", () => broker.call("posts.list"), res => {
	console.log(res);
	let rows = res.rows;
	return [
		res.total === 1 && res.page === 1 && res.pageSize === 10 && res.totalPages === 1,
		rows.length == 1,
		rows[0]._id == id
	];
});

// Get a post
checker.add("--- GET ---", () => broker.call("posts.get", { id }), res => {
	console.log(res);
	return res._id == id;
});

// Vote a post
checker.add("--- VOTE ---", () => broker.call("posts.vote", {
	id
}), res => {
	console.log(res);
	return res._id == id && res.votes === 3;
});

// Update a posts
checker.add("--- UPDATE ---", () => broker.call("posts.update", {
	id,
	title: "Hello 2",
	content: "Post content 2",
	updatedAt: new Date()
}), doc => {
	console.log(doc);
	return doc._id && doc.title === "Hello 2" && doc.content === "Post content 2" && doc.votes === 3 && doc.updatedAt;
});

// Get a post
checker.add("--- GET ---", () => broker.call("posts.get", { id }), doc => {
	console.log(doc);
	return doc._id == id && doc.title == "Hello 2" && doc.votes === 3;
});

// Get a post
checker.add("--- GET[] mapping ---", () => broker.call("posts.get", { id: [id], mapping: true }), res => {
	console.log(res);
	let doc = res[id];
	return doc && doc._id == id && doc.title == "Hello 2" && doc.votes === 3;
});

// Unvote a post
checker.add("--- UNVOTE ---", () => broker.call("posts.unvote", {
	id
}), res => {
	console.log(res);
	return res._id == id && res.votes === 2;
});

// Count of posts
checker.add("--- COUNT ---", () => broker.call("posts.count"), res => {
	console.log(res);
	return res == 1;
});

// Remove a post
checker.add("--- REMOVE ---", () => broker.call("posts.remove", { id }), res => {
	console.log(res);
	return res == 1;
});

// Count of posts
checker.add("--- COUNT ---", () => broker.call("posts.count"), res => {
	console.log(res);
	return res == 0;
});

broker.start().then(() => start());
