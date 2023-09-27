"use strict";
if (process.versions.node.split(".")[0] < 14) {
	console.log("Skipping Mongoose tests because node version is too low");
	it("Skipping Mongoose tests because node version is too low", () => {});
} else {

	const { ServiceBroker } = require("moleculer");
	const DbService = require("../../../moleculer-db/src");
	const MongooseStoreAdapter = require("../../src");
	const UserModel = require("../models/users");
	const PostModel = require("../models/posts");

	describe("Test virtuals population feature", () => {
	// Create broker
		const broker = new ServiceBroker({
			logger: console,
			logLevel: "error",
		});

		const getAdapter = () => new MongooseStoreAdapter("mongodb://127.0.0.1:27017", {}, { replaceVirtualsRefById: true })
		let Post;
		let User;


		beforeAll(async () => {
			//initialize models
			const adapter = getAdapter();
			adapter.service = {
				logger: {
					info: jest.fn()
				}
			}
			await adapter.connect();
			Post = PostModel.getModel(adapter.conn);
			User = UserModel.getModel(adapter.conn);

			// Load posts service
			broker.createService(DbService, {
				name: "posts",
				adapter: getAdapter(),
				model: PostModel.Model,
				settings: {
					populates: {
						author: "users.get",
					},
				},
			});

			// Load users service
			broker.createService(DbService, {
				name: "users",
				adapter: getAdapter(),
				model: UserModel.Model,
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
			await Post.deleteMany({});
			await User.deleteMany({});
		});

		it("Should populate virtuals", async () => {
			const _user = await User.create({
				firstName: "John",
				lastName: "Doe"
			});

			const _post1 = await Post.create({
				title: "post_1",
				content: "content 1",
				author: _user._id,
			});

			const _post2 = await Post.create({
				title: "post_2",
				content: "content 2",
				author: _user._id
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
