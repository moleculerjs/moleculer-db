"use strict";

const { ServiceBroker } = require("moleculer");
const StoreService = require("../../../moleculer-db/index");
const SequelizeAdapter = require("../../index");
const ModuleChecker = require("../../../moleculer-db/test/checker");
const Sequelize = require("sequelize");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Create broker
const broker = new ServiceBroker({
	logger: console,
	logLevel: "debug"
});

/*
	Test environments:

		MySQL:
			Server:
				docker run --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=mysql -d mysql

			CLI:
				docker run -it --link mysql:mysql --rm mysql sh -c 'exec mysql -h"$MYSQL_PORT_3306_TCP_ADDR" -P"$MYSQL_PORT_3306_TCP_PORT" -uroot -p"$MYSQL_ENV_MYSQL_ROOT_PASSWORD"'

				CREATE DATABASE moleculer_test;
				SHOW DATABASES;

		PostgreSQL:
			Server:
				docker run --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres -d postgres

			CLI:
				docker run -it --rm --link postgres:postgres postgres psql -h postgres -U postgres

				CREATE DATABASE moleculer_test;
				\list

*/

// Load my service
broker.createService(StoreService, {
	name: "posts",
	adapter: new SequelizeAdapter("sqlite://:memory:"),
	//adapter: new SequelizeAdapter({ dialect: "sqlite", storage: "d:\\moleculer-test.db"}),
	//adapter: new SequelizeAdapter("mssql://sa:<password>@localhost/moleculer-test"),
	//adapter: new SequelizeAdapter("mysql://root:mysql@192.168.51.29/moleculer_test"),
	//adapter: new SequelizeAdapter("postgres://postgres:postgres@192.168.51.29/moleculer_test"),
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
	settings: {
		fields: ["id", "title", "content", "votes", "status", "updatedAt"]
	},

	actions: {
		vote(ctx) {
			return this.adapter.findById(ctx.params.id)
				.then(post => post.increment({ votes: 1 }))
				.then(() => this.adapter.findById(ctx.params.id))
				.then(doc => this.transformDocuments(ctx, ctx.params, doc));
		},

		unvote(ctx) {
			return this.adapter.findById(ctx.params.id)
				.then(post => post.decrement({ votes: 1 }))
				.then(() => this.adapter.findById(ctx.params.id))
				.then(doc => this.transformDocuments(ctx, ctx.params, doc));
		},

		findRaw() {
			return this.adapter.db.query("SELECT * FROM posts WHERE title = 'Hello 2' LIMIT 1").then(([res]) => res);
		}
	},

	afterConnected() {
		this.logger.info("Connected successfully");
		return this.adapter.clear();
	}
});

const checker = new ModuleChecker(12);

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

let id =[];

// Count of posts
checker.add("COUNT", () => broker.call("posts.count"), res => {
	console.log(res);
	return res == 0;
});

// Create new Posts
checker.add("--- CREATE ---", () => broker.call("posts.create", { title: "Hello", content: "Post content", votes: 2, status: true }), doc => {
	id = doc.id;
	console.log("Saved: ", doc);
	return doc.id && doc.title === "Hello" && doc.content === "Post content" && doc.votes === 2 && doc.status === true;
});

// List posts
checker.add("--- FIND ---", () => broker.call("posts.find"), res => {
	console.log(res);
	return res.length == 1 && res[0].id == id;
});

// Get a post
checker.add("--- GET ---", () => broker.call("posts.get", { id }), res => {
	console.log(res);
	return res.id == id;
});

// Vote a post
checker.add("--- VOTE ---", () => broker.call("posts.vote", {
	id
}), res => {
	console.log(res);
	return res.id == id && res.votes === 3;
});

// Update a posts
checker.add("--- UPDATE ---", () => broker.call("posts.update", {
	id,
	title: "Hello 2",
	content: "Post content 2",
	updatedAt: new Date()
}), doc => {
	console.log(doc);
	return doc.id && doc.title === "Hello 2" && doc.content === "Post content 2" && doc.votes === 3 && doc.status === true && doc.updatedAt;
});

// Find a post by RAW query
checker.add("--- FIND RAW ---", () => broker.call("posts.findRaw"), res => {
	console.log(res);
	return res.length == 1 && res[0].id == id;
});

// Get a post
checker.add("--- GET ---", () => broker.call("posts.get", { id }), doc => {
	console.log(doc);
	return doc.id == id && doc.title == "Hello 2" && doc.votes === 3;
});

// Unvote a post
checker.add("--- UNVOTE ---", () => broker.call("posts.unvote", {
	id
}), res => {
	console.log(res);
	return res.id == id && res.votes === 2;
});

// Count of posts
checker.add("--- COUNT ---", () => broker.call("posts.count"), res => {
	console.log(res);
	return res == 1;
});

// Remove a post
checker.add("--- REMOVE ---", () => broker.call("posts.remove", { id }), res => {
	console.log(res);
	return res.id == id;
});

// Count of posts
checker.add("--- COUNT ---", () => broker.call("posts.count"), res => {
	console.log(res);
	return res == 0;
});


start();
