"use strict";

const { ServiceBroker } = require("moleculer");
const StoreService = require("../../../moleculer-db/index");
const ModuleChecker = require("../../../moleculer-db/test/checker");
const SequelizeAdapter = require("../../index");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

process.on("warning", e => console.warn(e.stack));

// Create broker
const broker = new ServiceBroker({
	logger: console,
	logLevel: "debug"
});
let adapter;

// Load my service
broker.createService(StoreService, {
	name: "posts",
	adapter: new SequelizeAdapter("sqlite://:memory:"),
	model: {
		name: "post",
		define: {
			title: Sequelize.STRING,
			content: Sequelize.TEXT,
			votes: Sequelize.INTEGER,
			author: Sequelize.INTEGER,
			status: Sequelize.BOOLEAN
		},
		options: {

		}
	},
	settings: {},

	afterConnected() {
		adapter = this.adapter;
		return this.adapter.clear();
	}
});

const checker = new ModuleChecker(22);

// Start checks
function start() {
	broker.start()
		.then(() => delay(500))
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
	ids[0] = doc.id;
	console.log("Saved: ", adapter.entityToObject(doc));
	return doc.id && doc.title === "Hello" && doc.content === "Post content" && doc.votes === 3 && doc.status === true && doc.createdAt === date;
});

// Find
checker.add("FIND", () => adapter.find({}), res => {
	console.log(res.map(adapter.entityToObject));
	return res.length == 1 && res[0].id == ids[0];
});

// Find by ID
checker.add("GET", () => adapter.findById(ids[0]), res => {
	console.log(adapter.entityToObject(res));
	return res.id == ids[0];
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
	console.log("Saved: ", docs.map(adapter.entityToObject));
	ids[1] = docs[0].id;
	ids[2] = docs[1].id;

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
	console.log(res.map(adapter.entityToObject));
	return res.length == 1 && res[0].id == ids[2];
});

// Find
checker.add("FIND by limit, sort, query", () => adapter.find({ limit: 1, sort: ["votes", "-title"], offset: 1 }), res => {
	console.log(res.map(adapter.entityToObject));
	return res.length == 1 && res[0].id == ids[0];
});

// Find
checker.add("FIND by query (Op.gt)", () => adapter.find({ query: { votes: { [Op.gt]: 2 } } }), res => {
	console.log(res.map(adapter.entityToObject));
	return res.length == 2;
});

// Find
checker.add("COUNT by query (Op.gt)", () => adapter.count({ query: { votes: { [Op.gt]: 2 } } }), res => {
	console.log(res);
	return res == 2;
});

// Find
checker.add("FIND by text search", () => adapter.find({ search: "content", searchFields: ["title", "content"] }), res => {
	console.log(res.map(adapter.entityToObject));
	return [
		res.length == 2
	];
});

// Find by IDs
checker.add("GET BY IDS", () => adapter.findByIds([ids[2], ids[0]]), res => {
	console.log(res.map(adapter.entityToObject));
	return res.length == 2;
});

// Update a posts
checker.add("UPDATE", () => adapter.updateById(ids[2], { $set: {
	title: "Last 2",
	updatedAt: new Date(),
	status: true
}}), doc => {
	console.log("Updated: ", adapter.entityToObject(doc));
	return doc.id && doc.title === "Last 2" && doc.content === "Last document" && doc.votes === 1 && doc.status === true && doc.updatedAt;
});

// Update by query
checker.add("UPDATE BY QUERY", () => adapter.updateMany({ votes: { [Op.lt]: 5 }}, {
	$set: { status: false }
}), count => {
	console.log("Updated: ", count);
	return count == 2;
});

// Remove by query
checker.add("REMOVE BY QUERY", () => adapter.removeMany({ votes: { [Op.lt]: 5 }}), count => {
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
	console.log("Removed: ", adapter.entityToObject(doc));
	return doc && doc.id == ids[1];
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

start();
