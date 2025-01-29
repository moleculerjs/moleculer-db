"use strict";
if (process.versions.node.split(".")[0] < 14) {
	console.log("Skipping Mongoose tests because node version is too low");
	it("Skipping Mongoose tests because node version is too low", () => {});
} else {

	const { ServiceBroker } = require("moleculer");
	const DbService = require("../../../moleculer-db/src");
	const MongooseStoreAdapter = require("../../src");
	const User = require("../models/users");
	const Post = require("../models/posts");

	describe("Test virtual population feature", () => {

		beforeEach(async () => {
			// clean collection for replayability
			await Post.Model.deleteMany({});
			await User.Model.deleteMany({});
		});

		describe("Test mongoose native virtual population", () => {

			// Create broker
			const broker = new ServiceBroker({
				logger: console,
				logLevel: "error",
			});

			beforeAll(async () => {
				// Load posts service
				broker.createService(DbService, {
					name: "posts",
					adapter: new MongooseStoreAdapter("mongodb://127.0.0.1:27017"),
					model: Post.Model,
					settings: {
						useNativeMongooseVirtuals: true,
						populates: {
							author: "users.get",
						},
					},
				});

				// Load users service
				broker.createService(DbService, {
					name: "users",
					adapter: new MongooseStoreAdapter("mongodb://127.0.0.1:27017"),
					model: User.Model,
					settings: {
						useNativeMongooseVirtuals: true,
						populates: {
							posts: "posts.get",
							lastPost: "posts.get",
							lastPostWithVotes: "posts.get",
						},
					},
				});

				await broker.start();
			});

			afterAll(async () => {
				await broker.stop();
			});

			it("Should populate virtuals", async () => {
				const _user = await User.Model.create({
					firstName: "John",
					lastName: "Doe",
				});

				const _post1 = await Post.Model.create({
					title: "post_1",
					content: "content 1",
					author: _user._id,
				});

				const _post2 = await Post.Model.create({
					title: "post_2",
					content: "content 2",
					author: _user._id,
					votes: 2,
				});

				const user = await broker.call("users.get", {
					id: _user.id,
					populate: ["posts", "postCount", "lastPost", "lastPostWithVotes"],
				});

				expect(user).toHaveProperty("firstName", "John");
				expect(user).toHaveProperty("lastName", "Doe");
				// virtual function without populate
				expect(user).toHaveProperty("fullName", "John Doe");
				// virtual populate with refPath and count option
				expect(user).toHaveProperty("postCount", 2);
				// virtual populate with ref
				expect(user).toHaveProperty("posts");
				expect(user.posts).toHaveLength(2);
				expect(user.posts.map((p) => p._id)).toEqual([_post2.id, _post1.id]);
				// virtual populate with justOne option set to "true"
				expect(user).toHaveProperty("lastPost");
				expect(user.lastPost).toHaveProperty("_id", _post2.id);
				// virtual populate with match clause
				expect(user).toHaveProperty("lastPostWithVotes");
				expect(user.lastPostWithVotes).toHaveProperty("_id", _post2.id);
			});

			it("Should populate virtuals using populate string param", async () => {
				const _user = await User.Model.create({
					firstName: "John",
					lastName: "Doe",
				});

				const _post1 = await Post.Model.create({
					title: "post_1",
					content: "content 1",
					author: _user._id,
				});

				const _post2 = await Post.Model.create({
					title: "post_2",
					content: "content 2",
					author: _user._id,
					votes: 2,
				});

				const user = await broker.call("users.get", {
					id: _user.id,
					populate: "posts, postCount, lastPost, lastPostWithVotes",
				});

				expect(user).toHaveProperty("firstName", "John");
				expect(user).toHaveProperty("lastName", "Doe");
				// virtual function without populate
				expect(user).toHaveProperty("fullName", "John Doe");
				// virtual populate with refPath and count option
				expect(user).toHaveProperty("postCount", 2);
				// virtual populate with ref
				expect(user).toHaveProperty("posts");
				expect(user.posts).toHaveLength(2);
				expect(user.posts.map((p) => p._id)).toEqual([_post2.id, _post1.id]);
				// virtual populate with justOne option set to "true"
				expect(user).toHaveProperty("lastPost");
				expect(user.lastPost).toHaveProperty("_id", _post2.id);
				// virtual populate with match clause
				expect(user).toHaveProperty("lastPostWithVotes");
				expect(user.lastPostWithVotes).toHaveProperty("_id", _post2.id);
			});
		});

		describe("Test moleculer basic virtual population", () => {

			// Create broker
			const broker = new ServiceBroker({
				logger: console,
				logLevel: "error",
			});

			beforeAll(async () => {
				// Load posts service
				broker.createService(DbService, {
					name: "posts",
					adapter: new MongooseStoreAdapter("mongodb://127.0.0.1:27017"),
					model: Post.Model,
					settings: {
						populates: {
							author: "users.get",
						},
					},
					actions: {
						countFromUser:{
							params: {id: {type: "array", items: "string"}},
							async handler(ctx) {
								const author = ctx.params.id[0];
								ctx.params = { query: { author } };
								const res = await this._count(ctx, ctx.params);
								return {[author]: res};
							}
						},
						allFromUser:{
							params: {id: {type: "array", items: "string"}},
							async handler(ctx) {
								const author = ctx.params.id[0];
								ctx.params = { query: { author }, sort: "-createdAt" };
								const res = await this._find(ctx, ctx.params);
								return {[author]: res};
							}
						},
						lastFromUser:{
							params: {
								id: {type: "array", items: "string"},
								minVoteCount: {type: "number", min: 0, optional: true}
							},
							async handler(ctx) {
								const {id, minVoteCount} = ctx.params;
								const query = { author: id };
								if (minVoteCount) query.votes = {$gte: minVoteCount};
								ctx.params = { query, sort: "-createdAt", limit: 1 };
								const res = await this._find(ctx, ctx.params);
								return {[id]: res[0]};
							}
						},
					}
				});

				// Load users service
				broker.createService(DbService, {
					name: "users",
					adapter: new MongooseStoreAdapter("mongodb://127.0.0.1:27017"),
					model: User.Model,
					settings: {
						populates: {
							posts: "posts.allFromUser",
							postCount: "posts.countFromUser",
							lastPost: "posts.lastFromUser",
							lastPostWithVotes: {
								action: "posts.lastFromUser",
								params: {
									minVoteCount: 1
								}
							},
						},
						virtuals: false,
					},
				});

				await broker.start();
			});

			afterAll(async () => {
				await broker.stop();
			});

			it("Should populate virtuals", async () => {
				const _user = await User.Model.create({
					firstName: "John",
					lastName: "Doe",
				});

				const _post1 = await Post.Model.create({
					title: "post_1",
					content: "content 1",
					author: _user._id,
				});

				const _post2 = await Post.Model.create({
					title: "post_2",
					content: "content 2",
					author: _user._id,
					votes: 2,
				});

				const user = await broker.call("users.get", {
					id: _user.id,
					populate: ["posts", "postCount", "lastPost", "lastPostWithVotes"],
				});

				expect(user).toHaveProperty("firstName", "John");
				expect(user).toHaveProperty("lastName", "Doe");
				// virtual function without populate
				expect(user).toHaveProperty("fullName", "John Doe");
				// virtual populate with refPath and count option
				expect(user).toHaveProperty("postCount", 2);
				// virtual populate with ref
				expect(user).toHaveProperty("posts");
				expect(user.posts).toHaveLength(2);
				expect(user.posts.map((p) => p._id)).toEqual([_post2.id, _post1.id]);
				// virtual populate with justOne option set to "true"
				expect(user).toHaveProperty("lastPost");
				expect(user.lastPost).toHaveProperty("_id", _post2.id);
				// virtual populate with match clause
				expect(user).toHaveProperty("lastPostWithVotes");
				expect(user.lastPostWithVotes).toHaveProperty("_id", _post2.id);
			});
		});
	});
}
