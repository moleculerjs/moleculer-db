"use strict";

let { ServiceBroker } = require("moleculer");
let StoreService = require("../../../moleculer-db/index");
let ModuleChecker = require("../../../moleculer-db/test/checker");
let MongoAdapter = require("../../index");
let Promise = require("bluebird");

// Create broker
let broker = new ServiceBroker({
	logger: console,
	logLevel: "debug"
});
let adapter;

// Load my service
broker.createService(StoreService, {
	name: "posts",
	adapter: new MongoAdapter("mongodb://localhost", { useNewUrlParser: true }, "moleculer-db-demo"),
	collection: "posts",
	settings: {},

	afterConnected() {
		adapter = this.adapter;
		return this.adapter.clear().then(() => {
			this.adapter.collection.createIndex( { title: "text", content: "text" } );
		}).then(() => start());
	}
});

const checker = new ModuleChecker(24);

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

let ids =[];
let date = new Date();

// Count of posts
checker.add("COUNT", () => adapter.count(), res => {
	console.log(res);
	return res == 0;
});

// Insert a new Post
checker.add("INSERT", () => adapter.insert({ title: "Hello", content: "Post content", votes: 3, status: true, createdAt: date }), doc => {
	ids[0] = doc._id.toHexString();
	console.log("Saved: ", doc);
	return doc._id && doc.title === "Hello" && doc.content === "Post content" && doc.votes === 3 && doc.status === true && doc.createdAt === date;
});

// Find
checker.add("FIND", () => adapter.find({}), res => {
	console.log(res);
	return res.length == 1 && res[0]._id.toHexString() == ids[0];
});

// Find by ID
checker.add("GET", () => adapter.findById(ids[0]), res => {
	console.log(res);
	return res._id.toHexString() == ids[0];
});

// Count of posts
checker.add("COUNT", () => adapter.count(), res => {
	console.log(res);
	return res == 1;
});

// Insert many new Posts
checker.add("INSERT MANY", () => adapter.insertMany([
	{ title: "Second", content: "Second post content", votes: 8, status: true, createdAt: new Date() },
	{ title: "Last", content: "Last document", votes: 1, status: false, createdAt: new Date() }
]), docs => {
	console.log("Saved: ", docs);
	ids[1] = docs[0]._id.toHexString();
	ids[2] = docs[1]._id.toHexString();

	return [
		docs.length == 2,
		ids[1] && docs[0].title === "Second" && docs[0].votes === 8,
		ids[1] && docs[1].title === "Last" && docs[1].votes === 1 && docs[1].status === false
	];
});

// Count of posts
checker.add("COUNT", () => adapter.count(), res => {
	console.log(res);
	return res == 3;
});

// Find
checker.add("FIND by query", () => adapter.find({ query: { title: "Last" } }), res => {
	console.log(res);
	return res.length == 1 && res[0]._id.toHexString() == ids[2];
});

// Find
checker.add("FIND by limit, sort, query", () => adapter.find({ limit: 1, sort: ["votes", "-title"], offset: 1 }), res => {
	console.log(res);
	return res.length == 1 && res[0]._id.toHexString() == ids[0];
});

// Find
checker.add("FIND by query ($gt)", () => adapter.find({ query: { votes: { $gt: 2 } } }), res => {
	console.log(res);
	return res.length == 2;
});

// Find
checker.add("COUNT by query ($gt)", () => adapter.count({ query: { votes: { $gt: 2 } } }), res => {
	console.log(res);
	return res == 2;
});

// Find
checker.add("FIND by text search", () => adapter.find({ search: "content" }), res => {
	console.log(res);
	return [
		res.length == 2,
		res[0]._score < 1 && res[0].title === "Hello",
		res[1]._score < 1 && res[1].title === "Second"
	];
});

// Find by IDs
checker.add("GET BY IDS", () => adapter.findByIds([ids[2], ids[0]]), res => {
	console.log(res);
	return res.length == 2;
});

// Update a posts
checker.add("UPDATE", () => adapter.updateById(ids[2], { $set: {
	title: "Last 2",
	updatedAt: new Date(),
	status: true
}}), doc => {
	console.log("Updated: ", doc);
	return doc._id && doc.title === "Last 2" && doc.content === "Last document" && doc.votes === 1 && doc.status === true && doc.updatedAt;
});

// Update by query
checker.add("UPDATE BY QUERY", () => adapter.updateMany({ votes: { $lt: 5 }}, {
	$set: { status: false }
}), count => {
	console.log("Updated: ", count);
	return count == 2;
});

// Remove by query
checker.add("REMOVE BY QUERY", () => adapter.removeMany({ votes: { $lt: 5 }}), count => {
	console.log("Removed: ", count);
	return count == 2;
});

// Count of posts
checker.add("COUNT", () => adapter.count(), res => {
	console.log(res);
	return res == 1;
});

// Remove by ID
checker.add("REMOVE BY ID", () => adapter.removeById(ids[1]), doc => {
	console.log("Removed: ", doc);
	return doc && doc._id.toHexString() == ids[1];
});

// Count of posts
checker.add("COUNT", () => adapter.count(), res => {
	console.log(res);
	return res == 0;
});

// Clear
checker.add("CLEAR", () => adapter.clear(), res => {
	console.log(res);
	return res == 0;
});

broker.start();
