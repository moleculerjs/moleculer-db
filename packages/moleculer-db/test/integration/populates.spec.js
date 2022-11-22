"use strict";

const { ServiceBroker } = require("moleculer");
const DbService = require("../../src");
const Adapter = require("../../src/memory-adapter");

function protectReject(err) {
	if (err && err.stack) {
		console.error(err);
		console.error(err.stack);
	}
	expect(err).toBe(true);
}

describe("Test populates feature", () => {
	// Create broker
	let broker = new ServiceBroker({
		logger: console,
		logLevel: "error"
	});

	// Load my service
	broker.createService(DbService, {
		name: "posts",
		adapter: new Adapter(),
		settings: {
			fields: ["_id", "title", "content", "author", "reviewer", "reviewerId", "liked"],
			populates: {
				"liked.by": "users.get",
				author: {
					action: "users.get"
				},
				reviewer: {
					field: "reviewerId",
					action: "users.get"
				}
			}
		}
	});

	// Load my service
	broker.createService(DbService, {
		name: "users",
		settings: {
			fields: ["_id", "group", "username", "name"],
			populates: {
				group: {
					action: "groups.get"
				},
			}
		}
	});

	// Load my service
	broker.createService(DbService, {
		name: "groups",
		settings: {
			fields: ["_id", "name"],
		}
	});

	let posts = [
		{ title: "My first post", content: "This is the content", votes: 2},
		{ title: "Second post", content: "Waiting for the next...", votes: 0},
		{ title: "My last post", content: "This is the end! Good bye!", votes: 5}
	];

	let users = [
		{ username: "john", name: "John", password: "123456" },
		{ username: "jane", name: "Jane", password: "password" },
		{ username: "walter", name: "Walter", password: "H31s3nb3rg" }
	];

	let groups = [
		{ name: "groupA" },
		{ name: "groupB" },
		{ name: "groupC" }
	];

	beforeAll(() => {
		return broker.start().then(() => {
			return broker.call("groups.insert", { entities: groups }).then(res => {
				res.forEach((e, i) => groups[i]._id = e._id);

				users[0].group = res[0]._id;
				users[1].group = res[1]._id;
				users[2].group = res[2]._id;

				return broker.call("users.insert", { entities: users }).then(res => {
					res.forEach((e, i) => users[i]._id = e._id);
	
					posts[0].author = res[2]._id;
					posts[0].reviewerId = res[0]._id;
					posts[0].liked = {by: res[0]._id};
					posts[1].author = res[0]._id;
					posts[1].reviewerId = res[0]._id;
					posts[1].liked = {by: res[0]._id};
					posts[2].author = res[1]._id;
					posts[2].reviewerId = res[0]._id;
					posts[2].liked = {by: res[0]._id};
	
	
					return broker.call("posts.insert", { entities: posts }).then(res => {
						res.forEach((e, i) => posts[i]._id = e._id);
					});
				});
			});
		});
	});

	it("should return with count of entities", () => {
		return broker.call("posts.count").catch(protectReject).then(res => {
			expect(res).toBe(3);
		});
	});

	it("should return with the entity and populate the author, reviewerId", () => {
		return broker.call("posts.get", { id: posts[0]._id, populate: ["author"] }).catch(protectReject).then(res => {
			expect(res).toEqual({
				"_id": posts[0]._id,
				"author": {"_id": users[2]._id, "name": "Walter", group:groups[2]._id, "username": "walter"},
				"content": "This is the content",
				"title": "My first post",
				"reviewerId": users[0]._id,
				"liked": {by: users[0]._id}
			});
		});
	});

	it("should return with multiple entities by IDs", () => {
		return broker.call("posts.get", {
			id: [posts[2]._id, posts[0]._id],
			populate: ["author"],
			fields: ["title", "author.name"]
		}).catch(protectReject).then(res => {
			expect(res).toEqual([
				{"author": {"name": "Jane"}, "title": "My last post"},
				{"author": {"name": "Walter"}, "title": "My first post"}
			]);
		});
	});

	it("should return with multiple entities as Object", () => {
		return broker.call("posts.get", {
			id: [posts[2]._id, posts[0]._id],
			fields: ["title", "votes"],
			mapping: true
		}).catch(protectReject).then(res => {
			expect(res[posts[0]._id]).toEqual({"title": "My first post"});
			expect(res[posts[2]._id]).toEqual({"title": "My last post"});
		});
	});

	it("should return with the entity and populate the review instead of reviewerId", () => {
		return broker.call("posts.get", { id: posts[0]._id, populate: ["author","reviewer"] }).catch(protectReject).then(res => {
			expect(res).toEqual({
				"_id": posts[0]._id,
				"author": {"_id": users[2]._id, group:groups[2]._id, "name": "Walter", "username": "walter"},
				"reviewerId":users[0]._id,
				"reviewer": {"_id": users[0]._id, group:groups[0]._id, "name": users[0].name, "username":users[0].username},
				"content": "This is the content",
				"title": "My first post",
				"liked": {by: users[0]._id}
			});
		});
	});

	it("should deeply populate all groups", () => {
		return broker
			.call(
				"posts.get",
				{
					id: posts[0]._id,
					populate: ["author.group","reviewer.group", "liked.by.group", "title.invalid"] 
				})
			.catch(protectReject)
			.then(res => {
				expect(res).toEqual({
					"_id": posts[0]._id,
					"author": {"_id": users[2]._id, "name": "Walter", "username": "walter", group:{"_id": groups[2]._id, "name": "groupC"}},
					"reviewerId":users[0]._id,
					"reviewer": {"_id": users[0]._id, "name": users[0].name, "username":users[0].username, group:{"_id": groups[0]._id, "name": "groupA"}},
					"content": "This is the content",
					"title": "My first post",
					"liked": {by: {"_id": users[0]._id, "name": users[0].name, "username":users[0].username, group:{"_id": groups[0]._id, "name": "groupA"}}}
				});
			});
	});

	it("should deeply populate one group", () => {
		return broker.call("posts.get", { id: posts[0]._id, populate: ["author.invalid","reviewer.group", "title.invalid"] }).catch(protectReject).then(res => {
			expect(res).toEqual({
				"_id": posts[0]._id,
				"author": {"_id": users[2]._id, "name": "Walter", "username": "walter", group:groups[2]._id},
				"reviewerId":users[0]._id,
				"reviewer": {"_id": users[0]._id, "name": users[0].name, "username":users[0].username, group:{"_id": groups[0]._id, "name": "groupA"}},
				"content": "This is the content",
				"title": "My first post",
				"liked": {by: users[0]._id}
			});
		});
	});
});
