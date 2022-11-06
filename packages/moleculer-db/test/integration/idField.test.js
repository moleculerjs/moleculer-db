"use strict";

const { ServiceBroker } = require("moleculer");
const DbService = require("../../src");
const Adapter = require("../../src/memory-adapter");

describe("Test CRUD methods with idField", () => {
	// Create broker
	let broker = new ServiceBroker({
		logger: console,
		logLevel: "error"
	});

	// Load my service
	broker.createService(DbService, Object.assign({
		name: "posts",
		settings: {
			idField: "myID"
		},
		adapter: new Adapter()
	}));

	beforeAll(() => {
		return broker.start().delay(1000);
	});

	afterAll(() => {
		return broker.stop();
	});

	const posts = [
		{ myID: "0000000", title: "My first post", content: "This is the content", votes: 2 },
		{ myID: "0000001", title: "Second post", content: "Waiting for the next...", votes: 5 },
		{ myID: "0000002", title: "My post", content: "This is the end! Good bye!", votes: 0 },
		{ myID: "0000003", title: "Final post", content: "A final good bye!", votes: 123 }
	];

	it("should create a new entity", () => {
		return broker.call("posts.create", posts[0]).then(res => {
			expect(typeof res).toBe("object");
			expect(res._id).toEqual(undefined);
			expect(typeof res.myID).toEqual("string");
			expect(res.myID).toEqual(posts[0].myID);
		});
	});

	it("should throw an error", () => {
		expect.assertions(1);
		return broker.call("posts.create", posts[0]).catch(err => {
			expect(err).toEqual(new Error("Can't insert key 0000000, it violates the unique constraint"));
		});
	});

	it("should create multiple entities", () => {
		return broker.call("posts.insert", { entities: [ posts[1], posts[2]] })
			.then(res => {
				expect(res.length).toBe(2);

				expect(res[0]._id).toEqual(undefined);
				expect(typeof res[0].myID).toEqual("string");
				expect(res[0].myID).toEqual(posts[1].myID);

				expect(res[1]._id).toEqual(undefined);
				expect(typeof res[1].myID).toEqual("string");
				expect(res[1].myID).toEqual(posts[2].myID);
			});
	});

	it("should throw an error", () => {
		expect.assertions(1);
		return broker.call("posts.insert", { entities: [ posts[1], posts[2]] })
			.catch(err => {
				expect(err).toEqual(new Error("Can't insert key 0000001, it violates the unique constraint"));
			});
	});

	it("should return with the entity by ID", () => {
		return broker.call("posts.get", { id: posts[1].myID })
			.then(res => expect(res).toEqual(posts[1]));
	});

	it("should return with the entity mapped by ID", () => {
		return broker.call("posts.get", { id: posts[1].myID, mapping:true })
			.then(res => expect(res[posts[1].myID]).toEqual(posts[1]));
	});

	it("should return with multiple entity by IDs", () => {
		return broker.call("posts.get", { id: [posts[2].myID, posts[0].myID] })
			.then(res => {
				expect(res[0]).toEqual(posts[2]);
				expect(res[1]).toEqual(posts[0]);
			});
	});

	it("should return with multiple entities mapped by IDs", () => {
		return broker.call("posts.get", { id: [posts[2].myID, posts[0].myID], mapping: true })
			.then(res => {
				expect(res[posts[2].myID]).toEqual(posts[2]);
				expect(res[posts[0].myID]).toEqual(posts[0]);
			});
	});

	it("should find filtered entities (search)", () => {
		return broker.call("posts.find", { search: "first" })
			.then(res => {
				expect(res[0]).toEqual(posts[0]);
			});
	});

	it("should update an entity", () => {
		return broker.call("posts.update", {
			id: posts[1].myID,
			title: "Other title",
			content: "Modify my content",
			votes: 8
		}).then(res => {
			expect(res.myID).toEqual(posts[1].myID);
			expect(res.title).toEqual("Other title");
			expect(res.content).toEqual("Modify my content");
			expect(res.votes).toEqual(8);
		});
	});

	it("should find filtered entities (sort)", () => {
		return broker.call("posts.find", { sort: "-votes" })
			.then(res => {
				expect(res.length).toBe(3);

				expect(res[0].myID).toEqual(posts[1].myID);
				expect(res[1].myID).toEqual(posts[0].myID);
				expect(res[2].myID).toEqual(posts[2].myID);
			});
	});

	it("should find filtered entities (limit, offset)", () => {
		return broker.call("posts.find", { sort: "votes", limit: "2", offset: 1 })
			.then(res => {
				expect(res.length).toBe(2);
				expect(res[0].myID).toEqual(posts[0].myID);
				expect(res[1].myID).toEqual(posts[1].myID);
			});
	});

	it("should find filtered entities (search)", () => {
		return broker.call("posts.find", { search: "post", sort: "-votes" })
			.then(res => {
				expect(res.length).toBe(2);
				expect(res[0].myID).toEqual(posts[0].myID);
				expect(res[1].myID).toEqual(posts[2].myID);
			});
	});

	it("should find filtered entities (search)", () => {
		return broker.call("posts.find", { search: "post", searchFields: ["title"], sort: "-votes" })
			.then(res => {
				expect(res.length).toBe(2);
				expect(res[0].myID).toEqual(posts[0].myID);
				expect(res[1].myID).toEqual(posts[2].myID);
			});
	});

	it("should list paginated entities", () => {
		return broker.call("posts.list", { sort: "-votes" })
			.then(res => {
				expect(res.page).toBe(1);
				expect(res.pageSize).toBe(10);
				expect(res.total).toBe(3);
				expect(res.totalPages).toBe(1);

				expect(res.rows.length).toBe(3);
				expect(res.rows[0].myID).toEqual(posts[1].myID);
				expect(res.rows[1].myID).toEqual(posts[0].myID);
				expect(res.rows[2].myID).toEqual(posts[2].myID);
			});
	});

	it("should create single entity", () => {
		return broker.call("posts.insert", { entity: posts[3] })
			.then(res => {
				expect(res).toBeInstanceOf(Object);
				expect(res._id).toEqual(undefined);
				expect(typeof res.myID).toEqual("string");
			});
	});

	test("should throw an error", () => {
		expect.assertions(1);
		return broker.call("posts.insert", { entity: posts[3] })
			.catch(err => {
				expect(err).toEqual(new Error("Can't insert key 0000003, it violates the unique constraint"));
			});
	});

	it("should remove entity by ID", () => {
		return broker.call("posts.remove", { id: posts[2].myID })
			.then(res => {
				expect(res).toBe(1);
			});
	});
});

describe("Test CRUD methods with idField and encoding", () => {
	// Create broker
	let broker = new ServiceBroker({
		logger: console,
		logLevel: "error"
	});

	// Load my service
	broker.createService(DbService, Object.assign({
		name: "posts",
		settings: {
			idField: "myID"
		},
		adapter: new Adapter(),
		methods: {
			encodeID(id) {
				return "enc:" + id;
			},
			decodeID(id) {
				return id.substring(4);
			}
		}
	}));

	beforeAll(() => {
		return broker.start().delay(1000);
	});

	afterAll(() => {
		return broker.stop();
	});

	const posts = [
		{ title: "My first post", content: "This is the content", votes: 2 },
		{ title: "Second post", content: "Waiting for the next...", votes: 5 },
		{ title: "My post", content: "This is the end! Good bye!", votes: 0 },
		{ title: "Final post", content: "A final good bye!", votes: 123 }
	];

	it("should create a new entity", () => {
		return broker.call("posts.create", posts[0]).then(res => {
			expect(typeof res).toBe("object");
			expect(res._id).toEqual(undefined);
			expect(typeof res.myID).toEqual("string");
			posts[0].myID = res.myID;
		});
	});

	it("should create multiple entities", () => {
		return broker.call("posts.insert", { entities: [ posts[1], posts[2]] })
			.then(res => {
				expect(res.length).toBe(2);

				expect(res[0]._id).toEqual(undefined);
				expect(typeof res[0].myID).toEqual("string");
				posts[1].myID = res[0].myID;

				expect(res[1]._id).toEqual(undefined);
				expect(typeof res[1].myID).toEqual("string");
				posts[2].myID = res[1].myID;
			});
	});

	it("should return with the entity by ID", () => {
		return broker.call("posts.get", { id: posts[1].myID })
			.then(res => expect(res).toEqual(posts[1]));
	});

	it("should return with the entity mapped by ID", () => {
		return broker.call("posts.get", { id: posts[1].myID, mapping:true })
			.then(res => expect(res[posts[1].myID]).toEqual(posts[1]));
	});

	it("should return with multiple entity by IDs", () => {
		return broker.call("posts.get", { id: [posts[2].myID, posts[0].myID] })
			.then(res => {
				expect(res[0]).toEqual(posts[2]);
				expect(res[1]).toEqual(posts[0]);
			});
	});

	it("should return with multiple entities mapped by IDs", () => {
		return broker.call("posts.get", { id: [posts[2].myID, posts[0].myID], mapping: true })
			.then(res => {
				expect(res[posts[2].myID]).toEqual(posts[2]);
				expect(res[posts[0].myID]).toEqual(posts[0]);
			});
	});

	it("should find filtered entities (search)", () => {
		return broker.call("posts.find", { search: "first" })
			.then(res => {
				expect(res[0]).toEqual(posts[0]);
			});
	});

	it("should update an entity", () => {
		return broker.call("posts.update", {
			id: posts[1].myID,
			title: "Other title",
			content: "Modify my content",
			votes: 8
		}).then(res => {
			expect(res.myID).toEqual(posts[1].myID);
			expect(res.title).toEqual("Other title");
			expect(res.content).toEqual("Modify my content");
			expect(res.votes).toEqual(8);
		});
	});

	it("should find filtered entities (sort)", () => {
		return broker.call("posts.find", { sort: "-votes" })
			.then(res => {
				expect(res.length).toBe(3);

				expect(res[0].myID).toEqual(posts[1].myID);
				expect(res[1].myID).toEqual(posts[0].myID);
				expect(res[2].myID).toEqual(posts[2].myID);
			});
	});

	it("should find filtered entities (limit, offset)", () => {
		return broker.call("posts.find", { sort: "votes", limit: "2", offset: 1 })
			.then(res => {
				expect(res.length).toBe(2);
				expect(res[0].myID).toEqual(posts[0].myID);
				expect(res[1].myID).toEqual(posts[1].myID);
			});
	});

	it("should find filtered entities (search)", () => {
		return broker.call("posts.find", { search: "post", sort: "-votes" })
			.then(res => {
				expect(res.length).toBe(2);
				expect(res[0].myID).toEqual(posts[0].myID);
				expect(res[1].myID).toEqual(posts[2].myID);
			});
	});

	it("should find filtered entities (search)", () => {
		return broker.call("posts.find", { search: "post", searchFields: ["title"], sort: "-votes" })
			.then(res => {
				expect(res.length).toBe(2);
				expect(res[0].myID).toEqual(posts[0].myID);
				expect(res[1].myID).toEqual(posts[2].myID);
			});
	});

	it("should list paginated entities", () => {
		return broker.call("posts.list", { sort: "-votes" })
			.then(res => {
				expect(res.page).toBe(1);
				expect(res.pageSize).toBe(10);
				expect(res.total).toBe(3);
				expect(res.totalPages).toBe(1);

				expect(res.rows.length).toBe(3);
				expect(res.rows[0].myID).toEqual(posts[1].myID);
				expect(res.rows[1].myID).toEqual(posts[0].myID);
				expect(res.rows[2].myID).toEqual(posts[2].myID);
			});
	});

	it("should create single entity", () => {
		return broker.call("posts.insert", { entity: posts[3] })
			.then(res => {
				expect(res).toBeInstanceOf(Object);
				expect(res._id).toEqual(undefined);
				expect(typeof res.myID).toEqual("string");
				posts[3].myID = res.myID;
			});
	});

	it("should remove entity by ID", () => {
		return broker.call("posts.remove", { id: posts[2].myID })
			.then(res => {
				expect(res).toBe(1);
			});
	});
});
