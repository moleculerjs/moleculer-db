"use strict";

const { ServiceBroker } = require("moleculer");

jest.mock("mongodb");

const MongoDbAdapter = require("../../src");
const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;

function protectReject(err) {
	if (err && err.stack) {
		console.error(err);
		console.error(err.stack);
	}
	expect(err).toBe(true);
}

const doc = {
	toJSON: jest.fn(() => ({})),
	_id: {
		toHexString: jest.fn(() => "123")
	}
};

const toArrayCB = jest.fn(() => Promise.resolve());
const query = jest.fn(() => ({ toArray: toArrayCB }));

const fakeCollection = {
	count: jest.fn(() => Promise.resolve(7)),
	find: jest.fn(() => query()),
	findOne: jest.fn(() => Promise.resolve(doc)),
	insertOne: jest.fn(doc => Promise.resolve({ insertedCount: 1, ops: [doc] })),
	insertMany: jest.fn(arr => Promise.resolve({ insertedCount: arr.length, ops: arr })),
	updateMany: jest.fn(() => Promise.resolve({ modifiedCount: 2 })),
	findOneAndUpdate: jest.fn(() => Promise.resolve({ value: doc })),
	deleteMany: jest.fn(() => Promise.resolve({ deletedCount: 2 })),
	findOneAndDelete: jest.fn(() => Promise.resolve({ value: doc })),
};


let fakeConn = {
	on: jest.fn(),
	close: jest.fn(),
	collection: jest.fn(() => fakeCollection)
};

describe("Test MongoDbAdapter", () => {
	const broker = new ServiceBroker();
	const service = broker.createService({
		name: "store",
		collection: "posts"
	});

	const uri = "mongodb://localhost";
	const opts = {};
	const adapter = new MongoDbAdapter(uri, opts);

	it("should be created", () => {
		expect(adapter).toBeDefined();
		expect(adapter.uri).toBe(uri);
		expect(adapter.opts).toBe(opts);
		expect(adapter.init).toBeInstanceOf(Function);
		expect(adapter.connect).toBeInstanceOf(Function);
		expect(adapter.disconnect).toBeInstanceOf(Function);
		expect(adapter.find).toBeInstanceOf(Function);
		expect(adapter.findOne).toBeInstanceOf(Function);
		expect(adapter.findById).toBeInstanceOf(Function);
		expect(adapter.findByIds).toBeInstanceOf(Function);
		expect(adapter.count).toBeInstanceOf(Function);
		expect(adapter.insert).toBeInstanceOf(Function);
		expect(adapter.insertMany).toBeInstanceOf(Function);
		expect(adapter.updateMany).toBeInstanceOf(Function);
		expect(adapter.updateById).toBeInstanceOf(Function);
		expect(adapter.removeMany).toBeInstanceOf(Function);
		expect(adapter.removeById).toBeInstanceOf(Function);
		expect(adapter.clear).toBeInstanceOf(Function);
	});

	it("throw error in init if 'collection' is not defined", () => {
		expect(() => {
			service.schema.collection = undefined;
			adapter.init(broker, service);
			service.schema.collection = "posts";
		}).toThrow("Missing `collection` definition in schema of service!");
	});

	it("call init", () => {
		service.schema.collection = "posts";
		adapter.init(broker, service);
		expect(adapter.broker).toBe(broker);
		expect(adapter.service).toBe(service);
	});

	it("call connect with uri", () => {
		fakeConn.on.mockClear();
		fakeConn.collection.mockClear();

		MongoClient.connect = jest.fn(() => Promise.resolve(fakeConn));
		adapter.opts = undefined;
		return adapter.connect().catch(protectReject).then(() => {
			expect(MongoClient.connect).toHaveBeenCalledTimes(1);
			expect(MongoClient.connect).toHaveBeenCalledWith("mongodb://localhost", undefined);

			expect(adapter.db).toBe(fakeConn);
			expect(adapter.db.on).toHaveBeenCalledTimes(1);
			expect(adapter.db.on).toHaveBeenCalledWith("disconnected", jasmine.any(Function));

			expect(adapter.db.collection).toHaveBeenCalledTimes(1);
			expect(adapter.db.collection).toHaveBeenCalledWith("posts");
		});
	});

	it("call connect with uri & opts", () => {
		fakeConn.on.mockClear();
		fakeConn.collection.mockClear();

		MongoClient.connect = jest.fn(() => Promise.resolve(fakeConn));
		adapter.opts = {
			user: "admin",
			pass: "123456"
		};

		return adapter.connect().catch(protectReject).then(() => {
			expect(MongoClient.connect).toHaveBeenCalledTimes(1);
			expect(MongoClient.connect).toHaveBeenCalledWith(adapter.uri, Object.assign(adapter.opts, { promiseLibrary: jasmine.any(Function) }));

			expect(adapter.db.collection).toHaveBeenCalledTimes(1);
			expect(adapter.db.collection).toHaveBeenCalledWith("posts");
		});
	});

	it("call disconnect", () => {
		fakeConn.close.mockClear();

		return adapter.disconnect().catch(protectReject).then(() => {
			expect(fakeConn.close).toHaveBeenCalledTimes(1);
		});
	});

	it("call stringToObjectID", () => {
		mongodb.ObjectID.createFromHexString = jest.fn();

		adapter.stringToObjectID({});
		expect(mongodb.ObjectID.createFromHexString).toHaveBeenCalledTimes(0);

		adapter.stringToObjectID("123");
		expect(mongodb.ObjectID.createFromHexString).toHaveBeenCalledTimes(1);
		expect(mongodb.ObjectID.createFromHexString).toHaveBeenCalledWith("123");
	});

	it("call objectIDToString", () => {
		let id = {
			toHexString: jest.fn()
		};

		adapter.objectIDToString(id);
		expect(id.toHexString).toHaveBeenCalledTimes(1);
	});

	describe("Test createCursor", () => {
		adapter.collection = fakeCollection;

		it("init", () => {
			adapter.collection.find = jest.fn(() => ({
				sort: jest.fn(),
				project: jest.fn(),
				skip: jest.fn(),
				limit: jest.fn(),
				toArray: toArrayCB
			}));
		});

		it("call without params", () => {
			adapter.collection.find.mockClear();
			adapter.createCursor();
			expect(adapter.collection.find).toHaveBeenCalledTimes(1);
			expect(adapter.collection.find).toHaveBeenCalledWith({});
		});

		it("call without params & count", () => {
			adapter.collection.count.mockClear();
			adapter.collection.find.mockClear();

			adapter.createCursor(null, true);

			expect(adapter.collection.find).toHaveBeenCalledTimes(0);
			expect(adapter.collection.count).toHaveBeenCalledTimes(1);
			expect(adapter.collection.count).toHaveBeenCalledWith({});
		});

		it("call with query", () => {
			adapter.collection.find.mockClear();
			let query = {};
			adapter.createCursor({ query });
			expect(adapter.collection.find).toHaveBeenCalledTimes(1);
			expect(adapter.collection.find).toHaveBeenCalledWith(query);
		});

		it("call with query & count", () => {
			adapter.collection.count.mockClear();
			let query = {};
			adapter.createCursor({ query }, true);
			expect(adapter.collection.count).toHaveBeenCalledTimes(1);
			expect(adapter.collection.count).toHaveBeenCalledWith(query);
		});

		it("call with sort string", () => {
			adapter.collection.find.mockClear();
			let query = {};
			let q = adapter.createCursor({ query, sort: "-votes title" });
			expect(adapter.collection.find).toHaveBeenCalledTimes(1);
			expect(adapter.collection.find).toHaveBeenCalledWith(query);

			expect(q.sort).toHaveBeenCalledTimes(1);
			expect(q.sort).toHaveBeenCalledWith({ votes: -1, title: 1 });
		});

		it("call with sort array", () => {
			adapter.collection.find.mockClear();
			let query = {};
			let q = adapter.createCursor({ query, sort: ["createdAt", "title"] });
			expect(adapter.collection.find).toHaveBeenCalledTimes(1);
			expect(adapter.collection.find).toHaveBeenCalledWith(query);

			expect(q.sort).toHaveBeenCalledTimes(1);
			expect(q.sort).toHaveBeenCalledWith({ createdAt: 1, title : 1 });
		});

		it("call with sort object", () => {
			adapter.collection.find.mockClear();
			let query = {};
			let q = adapter.createCursor({ query, sort: { createdAt: 1, title: -1 } });
			expect(adapter.collection.find).toHaveBeenCalledTimes(1);
			expect(adapter.collection.find).toHaveBeenCalledWith(query);

			expect(q.sort).toHaveBeenCalledTimes(1);
			expect(q.sort).toHaveBeenCalledWith({ createdAt: 1, title: -1 });
		});

		it("call with limit & offset", () => {
			adapter.collection.find.mockClear();
			let q = adapter.createCursor({ limit: 5, offset: 10 });
			expect(adapter.collection.find).toHaveBeenCalledTimes(1);
			expect(adapter.collection.find).toHaveBeenCalledWith(undefined);

			expect(q.limit).toHaveBeenCalledTimes(1);
			expect(q.limit).toHaveBeenCalledWith(5);
			expect(q.skip).toHaveBeenCalledTimes(1);
			expect(q.skip).toHaveBeenCalledWith(10);
		});

		it("call with full-text search", () => {
			adapter.collection.find.mockClear();
			let q = adapter.createCursor({ search: "walter" });
			expect(adapter.collection.find).toHaveBeenCalledTimes(2);
			expect(adapter.collection.find).toHaveBeenCalledWith({
				"$text": { "$search": "walter" }
			});
			expect(q.project).toHaveBeenCalledTimes(1);
			expect(q.project).toHaveBeenCalledWith({
				"_score": { "$meta": "textScore" }
			});

			expect(q.sort).toHaveBeenCalledTimes(1);
			expect(q.sort).toHaveBeenCalledWith({"_score": {"$meta": "textScore"}});
		});

	});

	it("call find", () => {
		adapter.createCursor = jest.fn(() => query());

		let params = {};
		return adapter.find(params).catch(protectReject).then(() => {
			expect(adapter.createCursor).toHaveBeenCalledTimes(1);
			expect(adapter.createCursor).toHaveBeenCalledWith(params, false);

			expect(toArrayCB).toHaveBeenCalledTimes(1);
		});
	});

	it("call findOne", () => {
		let query = { age: 22 };
		return adapter.findOne(query).catch(protectReject).then(() => {
			expect(adapter.collection.findOne).toHaveBeenCalledTimes(1);
			expect(adapter.collection.findOne).toHaveBeenCalledWith(query);
		});
	});

	it("call findById", () => {
		adapter.collection.findOne.mockClear();
		return adapter.findById(5).catch(protectReject).then(() => {
			expect(adapter.collection.findOne).toHaveBeenCalledTimes(1);
			expect(adapter.collection.findOne).toHaveBeenCalledWith({ _id: 5 });
		});
	});

	it("call findByIds", () => {
		toArrayCB.mockClear();
		adapter.collection.find.mockClear();

		return adapter.findByIds([5, 8, 10]).catch(protectReject).then(() => {
			expect(adapter.collection.find).toHaveBeenCalledTimes(1);
			expect(adapter.collection.find).toHaveBeenCalledWith({"_id": {"$in": [5, 8, 10] }});

			expect(toArrayCB).toHaveBeenCalledTimes(1);
		});
	});

	it("call count", () => {
		adapter.createCursor = jest.fn(() => Promise.resolve(8));

		let params = {};
		return adapter.count(params).catch(protectReject).then(() => {
			expect(adapter.createCursor).toHaveBeenCalledTimes(1);
			expect(adapter.createCursor).toHaveBeenCalledWith(params, true);
		});
	});

	it("call insert", () => {
		let entity = { a: 5 };
		return adapter.insert(entity).catch(protectReject).then(res => {
			expect(res).toEqual(entity);
			expect(adapter.collection.insertOne).toHaveBeenCalledTimes(1);
			expect(adapter.collection.insertOne).toHaveBeenCalledWith(entity);
		});
	});


	it("call insertMany", () => {
		let entities = [
			{ a: 5 },
			{ a: 10 }
		];
		return adapter.insertMany(entities).catch(protectReject).then(res => {
			expect(res).toEqual(entities);
			expect(adapter.collection.insertMany).toHaveBeenCalledTimes(1);
			expect(adapter.collection.insertMany).toHaveBeenCalledWith(entities);
		});
	});

	it("call updateMany", () => {
		let query = {};
		let update = {};

		return adapter.updateMany(query, update).catch(protectReject).then(res => {
			expect(res).toEqual(2);
			expect(adapter.collection.updateMany).toHaveBeenCalledTimes(1);
			expect(adapter.collection.updateMany).toHaveBeenCalledWith(query, update);
		});
	});

	it("call updateById", () => {
		doc.toJSON.mockClear();

		let update = {};
		return adapter.updateById(5, update).catch(protectReject).then(res => {
			expect(res).toEqual(doc);
			expect(adapter.collection.findOneAndUpdate).toHaveBeenCalledTimes(1);
			expect(adapter.collection.findOneAndUpdate).toHaveBeenCalledWith({ _id: 5 }, update, { returnOriginal: false });
		});
	});

	it("call removeMany", () => {
		let query = {};

		return adapter.removeMany(query).catch(protectReject).then(() => {
			expect(adapter.collection.deleteMany).toHaveBeenCalledTimes(1);
			expect(adapter.collection.deleteMany).toHaveBeenCalledWith(query);
		});
	});

	it("call removeById", () => {
		return adapter.removeById(5).catch(protectReject).then(() => {
			expect(adapter.collection.findOneAndDelete).toHaveBeenCalledTimes(1);
			expect(adapter.collection.findOneAndDelete).toHaveBeenCalledWith({ _id: 5 });
		});
	});

	it("call clear", () => {
		adapter.collection.deleteMany.mockClear();
		return adapter.clear().catch(protectReject).then(() => {
			expect(adapter.collection.deleteMany).toHaveBeenCalledTimes(1);
			expect(adapter.collection.deleteMany).toHaveBeenCalledWith({});
		});
	});

	it("call entityToObject", () => {
		doc._id.toHexString.mockClear();
		let res = adapter.entityToObject(doc);
		expect(doc._id.toHexString).toHaveBeenCalledTimes(1);
		expect(res._id).toBe("123");
	});

});

