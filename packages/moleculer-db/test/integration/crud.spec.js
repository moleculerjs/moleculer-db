"use strict";

const { ServiceBroker } = require("moleculer");
const DbService = require("../../src");
const { EntityNotFoundError } = require("../../src/errors");
const Adapter = require("../../src/memory-adapter");

function protectReject(err) {
	if (err && err.stack)
		console.error(err.stack);
	expect(err).toBe(true);
}

function equalAtLeast(test, orig) {
	Object.keys(orig).forEach(key => {
		expect(test[key]).toEqual(orig[key]);
	});
}

function equalID(test, orig) {
	expect(test._id).toEqual(orig._id);
}

describe("Test CRUD methods", () => {
	// Create broker
	let broker = new ServiceBroker({
		logger: console,
		logLevel: "error"
	});

	// Load my service
	broker.createService(DbService, Object.assign({
		name: "posts",
		adapter: new Adapter(),
	}));

	beforeAll(() => {
		return broker.start().delay(1000);
	});

	afterAll(() => {
		return broker.stop();
	});

	const posts = [
		{ title: "My first post", content: "This is the content", votes: 2},
		{ title: "Second post", content: "Waiting for the next...", votes: 5},
		{ title: "My last post", content: "This is the end! Good bye!", votes: 0}
	];

	it("should create a new entity", () => {
		return broker.call("posts.create", posts[0]).catch(protectReject).then(res => {
			expect(res).toBeDefined();
			expect(res._id).toBeDefined();
			posts[0]._id = res._id;

			equalAtLeast(res, posts[0]);
		});
	});


	it("should create multiple entities", () => {
		return broker.call("posts.insert", { entities: [posts[1], posts[2] ] }).catch(protectReject).then(res => {
			expect(res.length).toBe(2);

			posts[1]._id = res[0]._id;
			posts[2]._id = res[1]._id;

			equalAtLeast(res[0], posts[1]);
			equalAtLeast(res[1], posts[2]);
		});
	});

	it("should throw error is params is empty", () => {
		return broker.call("posts.insert", { }).then(protectReject).catch(res => {
			expect(res).toBeInstanceOf(Error);
			expect(res.name).toBe("MoleculerClientError");
			expect(res.code).toBe(400);
			expect(res.message).toBe("Invalid request! The 'params' must contain 'entity' or 'entities'!");
			expect(res.data).toBeUndefined();

		});
	});

	it("should return with count of entities", () => {
		return broker.call("posts.count").catch(protectReject).then(res => {
			expect(res).toBe(3);
		});
	});

	it("should return with the entity by ID", () => {
		return broker.call("posts.get", { id: posts[1]._id }).catch(protectReject).then(res => {
			equalAtLeast(res, posts[1]);
		});
	});

	it("should throw error if entity not found", () => {
		return broker.call("posts.get", { id: 123123 }).then(protectReject).catch(res => {
			expect(res).toBeInstanceOf(EntityNotFoundError);
			expect(res.name).toBe("EntityNotFoundError");
			expect(res.code).toBe(404);
			expect(res.message).toBe("Entity not found");
			expect(res.data.id).toBe(123123);
		});
	});

	it("should return with multiple entity by IDs", () => {
		return broker.call("posts.get", { id: [posts[2]._id, posts[0]._id] }).catch(protectReject).then(res => {
			expect(res.length).toBe(2);
			expect(res[0]._id == posts[0]._id || res[0]._id == posts[2]._id);
			expect(res[1]._id == posts[0]._id || res[1]._id == posts[2]._id);
		});
	});

	it("should find filtered entities (search)", () => {
		return broker.call("posts.find", { search: "first" }).catch(protectReject).then(res => {
			expect(res.length).toBe(1);
			equalID(res[0], posts[0]);
		});
	});

	it("should update an entity", () => {
		return broker.call("posts.update", {
			id: posts[1]._id,
			title: "Other title",
			content: "Modify my content",
			votes: 8
		}).catch(protectReject).then(res => {
			expect(res._id).toEqual(posts[1]._id);
			expect(res.title).toEqual("Other title");
			expect(res.content).toEqual("Modify my content");
			expect(res.votes).toEqual(8);
			posts[1] = res;
		});
	});

	it("should find filtered entities (sort)", () => {
		return broker.call("posts.find", { sort: "-votes" }).catch(protectReject).then(res => {
			expect(res.length).toBe(3);

			equalID(res[0], posts[1]);
			equalID(res[1], posts[0]);
			equalID(res[2], posts[2]);
		});
	});

	it("should find filtered entities (limit, offset)", () => {
		return broker.call("posts.find", { sort: "votes", limit: "2", offset: 1 }).catch(protectReject).then(res => {
			expect(res.length).toBe(2);
			equalID(res[0], posts[0]);
			equalID(res[1], posts[1]);
		});
	});

	it("should find filtered entities (max limit)", () => {
		return broker.call("posts.find", { sort: "votes", limit: 999 }).catch(protectReject).then(res => {
			expect(res.length).toBe(3);
		});
	});

	it("should find filtered entities (search)", () => {
		return broker.call("posts.find", { search: "post", sort: "-votes" }).catch(protectReject).then(res => {
			expect(res.length).toBe(2);
			equalID(res[0], posts[0]);
			equalID(res[1], posts[2]);
		});
	});

	it("should find filtered entities (search)", () => {
		return broker.call("posts.find", { search: "post", searchFields: ["title"], sort: "-votes" }).catch(protectReject).then(res => {
			expect(res.length).toBe(2);
			equalID(res[0], posts[0]);
			equalID(res[1], posts[2]);
		});
	});

	it("should list paginated entities", () => {
		return broker.call("posts.list", { sort: "-votes" }).catch(protectReject).then(res => {
			expect(res.page).toBe(1);
			expect(res.pageSize).toBe(10);
			expect(res.total).toBe(3);
			expect(res.totalPages).toBe(1);

			expect(res.rows.length).toBe(3);
			equalID(res.rows[0], posts[1]);
			equalID(res.rows[1], posts[0]);
			equalID(res.rows[2], posts[2]);
		});
	});

	it("should list paginated entities (page 2 & search)", () => {
		return broker.call("posts.list", { page: 2, search: "post", searchFields: ["title"] }).catch(protectReject).then(res => {
			expect(res.page).toBe(2);
			expect(res.pageSize).toBe(10);
			expect(res.total).toBe(2);
			expect(res.totalPages).toBe(1);

			expect(res.rows.length).toBe(0);
		});
	});

	it("should list paginated entities (page, pageSize as strings)", () => {
		return broker.call("posts.list", { page: "1", pageSize: "2", }).catch(protectReject).then(res => {
			expect(res.page).toBe(1);
			expect(res.pageSize).toBe(2);
			expect(res.total).toBe(3);
			expect(res.totalPages).toBe(2);

			expect(res.rows.length).toBe(2);
		});
	});

	it("should remove entity by ID", () => {
		return broker.call("posts.remove", { id: posts[2]._id }).catch(protectReject).then(res => {
			expect(res).toBe(1);
		});
	});

	it("should throw 404 because entity is not exist (remove)", () => {
		return broker.call("posts.remove", { id: posts[2]._id }).then(protectReject).catch(res => {
			expect(res).toBeInstanceOf(EntityNotFoundError);
			expect(res.name).toBe("EntityNotFoundError");
			expect(res.code).toBe(404);
			expect(res.message).toBe("Entity not found");
			expect(res.data.id).toBe(posts[2]._id);
		});
	});

	it("should throw 404 because entity is not exist (update)", () => {
		return broker.call("posts.update", { id: posts[2]._id, name: "Adam" }).then(protectReject).catch(res => {
			expect(res).toBeInstanceOf(EntityNotFoundError);
			expect(res.name).toBe("EntityNotFoundError");
			expect(res.code).toBe(404);
			expect(res.message).toBe("Entity not found");
			expect(res.data.id).toBe(posts[2]._id);
		});
	});

	it("should return with count of entities", () => {
		return broker.call("posts.count").catch(protectReject).then(res => {
			expect(res).toBe(2);
		});
	});
	/*
	it("should remove all entities", () => {
		return broker.call("posts.clear").catch(protectReject).then(res => {
			expect(res).toBe(2);
		});
	});

	it("should return with count of entities", () => {
		return broker.call("posts.count").catch(protectReject).then(res => {
			expect(res).toBe(0);
		});
	});
	*/
});
