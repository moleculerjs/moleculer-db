"use strict";

const { ServiceBroker } = require("moleculer");
const DbService = require("../../index");
const path = require("node:path");
const ModuleChecker = require("../../test/checker");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Create broker
const broker = new ServiceBroker({
	logger: console,
	logLevel: "debug"
});

let posts = [];
let users = [];

// Load my service

broker.createService(DbService, {
	name: "posts",
	adapter: new DbService.MemoryAdapter({ filename: path.join(__dirname, "posts.db") }),
	settings: {
		fields: ["_id", "title", "content", "votes", "author"],

		populates: {
			"author": {
				action: "users.get",
				params: {
					fields: ["username", "fullName"]
				}
			}
		}
	},

	methods: {

		encodeID(id) {
			return "post-" + id;
		},

		decodeID(id) {
			if (id.startsWith("post-"))
				return id.slice(5);
		}

	},

	afterConnected() {
		this.logger.info("Connected successfully");
		return this.adapter.clear().delay(1000).then(() => {
			if (users.length == 0) return;

			this.logger.info("Seed Posts collection...");
			return this.adapter.insertMany([
				{ title: "1st post", content: "First post content.", votes: 3, author: users[2]._id },
				{ title: "2nd post", content: "Labore eum veritatis ut.", votes: 8, author: users[1]._id },
				{ title: "3rd post", content: "Rerum deleniti repellendus error ea.", votes: 0, author: users[4]._id },
				{ title: "4th post", content: "Normal post content.", votes: 4, author: users[3]._id },
				{ title: "5th post", content: "Voluptatum praesentium voluptatibus est nesciunt fugiat.", votes: 6, author: users[1]._id }
			]).then(docs => this.transformDocuments(null, {}, docs))
				.then(docs => posts = docs);
		});
	}
});

// Load my service
broker.createService(DbService, {
	name: "users",
	adapter: new DbService.MemoryAdapter({ filename: path.join(__dirname, "users.db") }),
	settings: {
		fields: ["_id", "username", "fullName", "email"]
	},

	methods: {

		encodeID(id) {
			return "user-" + id;
		},

		decodeID(id) {
			if (id.startsWith("user-"))
				return id.slice(5);
		}

	},

	afterConnected() {
		this.logger.info("Connected successfully");
		return this.adapter.clear().then(() => {
			this.logger.info("Seed Users collection...");
			return this.adapter.insertMany([
				{ username: "John", fullName: "John Doe", email: "john.doe@gmail.com", status: 1 },
				{ username: "Adam", fullName: "Adam Doe", email: "adam.doe@gmail.com", status: 1 },
				{ username: "Jane", fullName: "Jane Doe", email: "jane.doe@gmail.com", status: 0 },
				{ username: "Susan", fullName: "Susan Doe", email: "susan.doe@gmail.com", status: 1 },
				{ username: "Bill", fullName: "Bill Doe", email: "bill.doe@gmail.com", status: 1 }
			]).then(docs => this.transformDocuments(null, {}, docs))
				.then(docs => {
					users = docs;
				});
		});
	}
});

const checker = new ModuleChecker(13);

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

checker.add("FIND POSTS (search: 'content')", () => broker.call("posts.find", { limit: 0, offset: 0, sort: "-votes title", search: "content", populate: ["author"], fields: ["_id", "title", "author"] }), res => {
	console.log(res);
	return [
		res.length == 2 && res[0]._id == posts[3]._id && res[1]._id == posts[0]._id,
		res[0].title && res[0].author && res[0].author.username == "Susan" && res[0].votes == null && res[0].author.email == null,
		res[1].title && res[1].author && res[1].author.username == "Jane" && res[1].votes == null && res[1].author.email == null
	];
});

checker.add("COUNT POSTS (search: 'content')", () => broker.call("posts.count", { search: "content" }), res => {
	console.log(res);
	return res == 2;
});

checker.add("FIND POSTS (limit: 3, offset: 2, sort: title, no author)", () => broker.call("posts.find", { limit: 3, offset: 2, sort: "title", fields: ["title", "votes"] }), res => {
	console.log(res);
	return [
		res.length == 3,
		res[0].title && res[0].author == null && res[0].votes == 0,
		res[1].title && res[1].author == null && res[1].votes == 4,
		res[2].title && res[2].author == null && res[2].votes == 6
	];
});

checker.add("GET POST (page: 2, pageSize: 5, sort: -votes)", () => broker.call("posts.get", { id: posts[2]._id, populate: ["author"], fields: ["title", "author"] }), res => {
	console.log(res);
	return res.title === "3rd post" && res.author.username === "Bill" && res.author.fullName === "Bill Doe" && res.author.email == null && res.votes == null;
});

checker.add("LIST POSTS (page: 2, pageSize: 5, sort: -votes)", () => broker.call("posts.list", { page: 2, pageSize: 2, sort: "-votes", populate: ["author"], fields: ["_id", "title", "votes", "author"] }), res => {
	console.log(res);
	const rows = res.rows;
	return [
		res.total === 5 && res.page === 2 && res.pageSize === 2 && res.totalPages === 3,
		rows.length == 2,
		rows[0]._id == posts[3]._id && rows[0].title && rows[0].author.username == "Susan" && rows[0].votes == 4,
		rows[1]._id == posts[0]._id && rows[1].title && rows[1].author.username == "Jane" && rows[1].votes == 3
	];
});

broker.start().then(() => start());
