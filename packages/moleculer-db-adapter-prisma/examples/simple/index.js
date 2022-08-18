"use strict";

const { ServiceBroker } = require("moleculer");
const Service = require("../../../moleculer-db/index");
const ModuleChecker = require("../../../moleculer-db/test/checker");
const PrismaAdapter = require("../../index");
const { PrismaClient } = require("@prisma/client");

process.env.DB_CONNECTION_URL = "mysql://user:password@localhost/prisma";
process.on("warning", e => console.warn(e.stack));

// Create broker
const broker = new ServiceBroker({
	logger: console,
	logLevel: "debug",
});

let adapter;

// Load my service
broker.createService(Service, {
	name: "service",
	adapter: new PrismaAdapter(),
	model: "post",
	settings: {},

	async afterConnected() {
		adapter = this.adapter;
		await this.adapter.clear();
	}
});

const checker = new ModuleChecker(19);

// Start checks
async function start() {
	const client = new PrismaClient();
	await client.$executeRaw`DROP TABLE IF EXISTS Post`;
	await client.$executeRaw`
    CREATE TABLE Post (
      id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content VARCHAR(191) NULL DEFAULT NULL,
      votes INT(10) NOT NULL,
      status TINYINT(1) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id) USING BTREE
    );
  `;

	await broker.start()
		.delay(500)
		.then(() => checker.execute())
		.catch(console.error)
		.then(() => broker.stop())
		.then(() => checker.printTotal());
}

// --- TEST CASES ---

const ids =[];
const date = new Date();

// Count of posts
checker.add("COUNT", () => adapter.count(), res => {
	console.log("COUNT: ", res);
	return res === 0;
});

// Insert a new Post
checker.add("INSERT", () => adapter.insert({ title: "Hello", content: "Post content", votes: 3, status: true, createdAt: date }), doc => {
	ids[0] = doc.id;
	console.log("Saved: ", adapter.entityToObject(doc));
	return doc.id && doc.title === "Hello" && doc.content === "Post content" && doc.votes === 3 && doc.status === true && doc.createdAt.getTime() === date.getTime();
});

// Find
checker.add("FIND", () => adapter.find({}), res => {
	console.log(res.map(adapter.entityToObject));
	return res.length === 1 && res[0].id === ids[0];
});

// Find by ID
checker.add("GET", () => adapter.findById(ids[0]), res => {
	console.log(adapter.entityToObject(res));
	return res.id === ids[0];
});

// Count of posts
checker.add("COUNT", () => adapter.count(), res => {
	console.log(res);
	return res === 1;
});

// Insert many new Posts
checker.add("INSERT MANY", () => adapter.insertMany([
	{ title: "Second", content: "Second post content", votes: 8, status: true, createdAt: new Date() },
	{ title: "Last", content: "Last document", votes: 1, status: false, createdAt: new Date() }
]), count => {
	console.log("Saved: ", count);

	return count === 2;
});

// Count of posts
checker.add("COUNT", () => adapter.count(), res => {
	console.log(res);
	return res === 3;
});

// Find
checker.add("FIND by query", () => adapter.find({ query: { title: "Last" } }), res => {
	console.log(res.map(adapter.entityToObject));
	return res.length == 1 && res[0].title === "Last";
});

// Find
checker.add("FIND by limit, sort, query", () => adapter.find({ limit: 1, sort: ["votes", "-title"], offset: 1 }), res => {
	console.log(res.map(adapter.entityToObject));
	return res.length == 1 && res[0].id == ids[0];
});

// Find
checker.add("FIND by query (Op.gt)", () => adapter.find({ query: { votes: { gt: 2 } } }), res => {
	console.log(res.map(adapter.entityToObject));
	return res.length === 2;
});

// Find
checker.add("COUNT by query (Op.gt)", () => adapter.count({ query: { votes: { gt: 2 } } }), res => {
	console.log(res);
	return res === 2;
});

// Find
checker.add("FIND by text search", () => adapter.find({ search: "content", searchFields: ["title", "content"] }), res => {
	console.log(res.map(adapter.entityToObject));
	return res.length === 2;
});

// Find by IDs
checker.add("GET BY IDS", () => adapter.findByIds([ids[0]]), res => {
	console.log(res.map(adapter.entityToObject));
	return res.length === 1;
});

// Update a posts
checker.add("UPDATE", () => adapter.updateById(ids[0], { $set: {
	title: "Last 2",
	status: true,
}}), doc => {
	console.log("Updated: ", adapter.entityToObject(doc));
	return doc.id && doc.title === "Last 2" && doc.content === "Post content" && doc.votes === 3 && doc.status === true;
});

// Update by query
checker.add("UPDATE BY QUERY", () => adapter.updateMany({ votes: { lt: 5 }}, {
	$set: { status: false }
}), count => {
	console.log("Updated: ", count);
	return count === 2;
});

// Remove by query
checker.add("REMOVE BY QUERY", () => adapter.removeMany({ votes: { lt: 5 }}), count => {
	console.log("Removed: ", count);
	return count === 2;
});

// Count of posts
checker.add("COUNT", () => adapter.count(), res => {
	console.log("Count: ", res);
	return res === 1;
});

// Clear
checker.add("CLEAR", () => adapter.clear(), res => {
	console.log("Removed: ", res);

	return res === 1;
});

// Count of posts
checker.add("COUNT", () => adapter.count(), res => {
	console.log("Count: ", res);
	return res === 0;
});

start();
