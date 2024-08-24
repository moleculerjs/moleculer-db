"use strict";

const { ServiceBroker } = require("moleculer");
const StoreService = require("../../../moleculer-db/index");
const MongoAdapter = require("../../index");
const ModuleChecker = require("../../../moleculer-db/test/checker");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Create broker
const broker = new ServiceBroker({
	logger: console,
	logLevel: "debug"
});

// Load my service
broker.createService(StoreService, {
	name: "posts",
	adapter: new MongoAdapter("mongodb://127.0.0.1/moleculer-db-demo", { useNewUrlParser: true }),
	collection: "posts",
	settings: {
		fields: ["_id", "title", "content", "votes", "status", "updatedAt"]
	},

	actions: {
		vote(ctx) {
			return this.Promise.resolve(ctx)
				.then(ctx => this.adapter.updateById(ctx.params.id, { $inc: { votes: 1 } }));
		},

		unvote(ctx) {
			return this.Promise.resolve(ctx)
				.then(ctx => this.adapter.updateById(ctx.params.id, { $inc: { votes: -1 } }));
		}
	},

	afterConnected() {
		return this.adapter.clear().then(() => {
			this.adapter.collection.createIndex( { title: "text", content: "text" } );
		}).then(() => start());
	}
});

const checker = new ModuleChecker(11);

// Start checks
function start() {
	Promise.resolve()
		.then(() => delay(500))
		.then(() => checker.execute())
		.catch(console.error)
		.then(() => broker.stop())
		.then(() => checker.printTotal());
}

// --- TEST CASES ---

let id =[];

// Count of posts
checker.add("COUNT", () => broker.call("posts.count"), res => {
	console.log(res);
	return res == 0;
});

// Create new Posts
checker.add("--- CREATE ---", () => broker.call("posts.create", { title: "Hello", content: "Post content", votes: 2, status: true }), doc => {
	id = doc._id;
	console.log("Saved: ", doc);
	return doc._id && doc.title === "Hello" && doc.content === "Post content" && doc.votes === 2 && doc.status === true;
});

// List posts
checker.add("--- FIND ---", () => broker.call("posts.find", { fields: ["_id", "title"]}), res => {
	console.log(res);
	return res.length == 1 && res[0]._id == id && res[0].content == null && res[0].votes == null && res[0].status == null;
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
	return doc._id && doc.title === "Hello 2" && doc.content === "Post content 2" && doc.votes === 3 && doc.status === true && doc.updatedAt;
});

// Get a post
checker.add("--- GET ---", () => broker.call("posts.get", { id }), doc => {
	console.log(doc);
	return doc._id == id && doc.title == "Hello 2" && doc.votes === 3;
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
	return res._id == id;
});

// Count of posts
checker.add("--- COUNT ---", () => broker.call("posts.count"), res => {
	console.log(res);
	return res == 0;
});


broker.start();
