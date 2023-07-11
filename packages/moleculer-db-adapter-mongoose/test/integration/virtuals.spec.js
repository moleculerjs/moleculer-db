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

	describe("Test virtuals population feature", () => {
	// Create broker
		const broker = new ServiceBroker({
			logger: console,
			logLevel: "error",
		});

		beforeAll(async () => {
		// Load posts service
			broker.createService(DbService, {
				name: "posts",
				adapter: new MongooseStoreAdapter("mongodb://localhost:27017"),
				model: Post.Model,
				settings: {
					populates: {
						author: "users.get",
					},
				},
			});

			// Load users service
			broker.createService(DbService, {
				name: "users",
				adapter: new MongooseStoreAdapter("mongodb://localhost:27017"),
				model: User.Model,
				settings: {
					populates: {
						posts: "posts.get",
						lastPost: "posts.get",
					},
				},
			});

			await broker.start();
		});

		afterAll(async () => {
			await broker.stop();
		});

		beforeEach(async () => {
		// clean collection for replayability
			await Post.Model.deleteMany({});
			await User.Model.deleteMany({});
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
			});

			const user = await broker.call("users.get", {
				id: _user.id,
				populate: ["posts", "lastPost", "postCount"],
			});

			expect(user).toHaveProperty("firstName", "John");
			expect(user).toHaveProperty("lastName", "Doe");
			// virtual function without populate
			expect(user).toHaveProperty("fullName", "John Doe");
			// virtual populate with ref and count option
			expect(user).toHaveProperty("postCount", 2);
			// virtual populate with ref
			expect(user).toHaveProperty("posts");
			expect(user.posts).toHaveLength(2);
			expect(user.posts.map((p) => p._id)).toEqual([_post2.id, _post1.id]);
			// virtual populate with justOne option set to "true"
			expect(user).toHaveProperty("lastPost");
			expect(user.lastPost).toHaveProperty("_id", _post2.id);
		});
	});
}
