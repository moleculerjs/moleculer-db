"use strict";

const { ServiceBroker } = require("moleculer");
const MongooseStoreAdapter = require("../../src");
const mongoose = require("mongoose");

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
		toHexString: jest.fn()
	}
};

const docIdString = {
	toJSON: jest.fn(() => ({})),
	_id: {
		toString: jest.fn()
	}
};

const execCB = jest.fn(() => Promise.resolve());
const saveCB = jest.fn(() => Promise.resolve());
const leanCB = jest.fn(() => ({ exec: execCB }));
const countCB = jest.fn(() => ({ exec: execCB }));
const query = jest.fn(() => ({ lean: leanCB, exec: execCB, count: countCB }));

const fakeModel = Object.assign(jest.fn(() => ({ save: saveCB })), {
	find: jest.fn(() => query()),
	findOne: jest.fn(() => query()),
	findById: jest.fn(() => query()),
	create: jest.fn(() => Promise.resolve()),
	update: jest.fn(() => Promise.resolve({ n: 2 })),
	findByIdAndUpdate: jest.fn(() => Promise.resolve(doc)),
	remove: jest.fn(() => Promise.resolve({ result: { n: 2 }})),
	findByIdAndRemove: jest.fn(() => Promise.resolve()),
});


let fakeConn = Promise.resolve();
fakeConn.connection = {
	on: jest.fn(),
	close: jest.fn()
};

describe("Test MongooseStoreAdapter", () => {
	const broker = new ServiceBroker();
	const service = broker.createService({
		name: "store",
		model: fakeModel
	});

	const opts = {};
	const adapter = new MongooseStoreAdapter(opts);

	it("should be created", () => {
		expect(adapter).toBeDefined();
		expect(adapter.opts).toBe(opts);
		expect(adapter.init).toBeDefined();
		expect(adapter.connect).toBeDefined();
		expect(adapter.disconnect).toBeDefined();
		expect(adapter.find).toBeDefined();
		expect(adapter.findOne).toBeDefined();
		expect(adapter.findById).toBeDefined();
		expect(adapter.findByIds).toBeDefined();
		expect(adapter.count).toBeDefined();
		expect(adapter.insert).toBeDefined();
		expect(adapter.insertMany).toBeDefined();
		expect(adapter.updateMany).toBeDefined();
		expect(adapter.updateById).toBeDefined();
		expect(adapter.removeMany).toBeDefined();
		expect(adapter.removeById).toBeDefined();
		expect(adapter.clear).toBeDefined();
	});

	it("call init", () => {
		adapter.init(broker, service);
		expect(adapter.broker).toBe(broker);
		expect(adapter.service).toBe(service);
		expect(adapter.model).toBe(fakeModel);
	});

	it("call connect with uri", () => {
		fakeConn.connection.on.mockClear();

		mongoose.connect = jest.fn(() => fakeConn);
		adapter.opts = "mongodb://server";
		return adapter.connect().catch(protectReject).then(() => {
			expect(mongoose.connect).toHaveBeenCalledTimes(1);
			expect(mongoose.connect).toHaveBeenCalledWith("mongodb://server", undefined);

			expect(adapter.db).toBe(fakeConn.connection);
			expect(adapter.db.on).toHaveBeenCalledTimes(1);
			expect(adapter.db.on).toHaveBeenCalledWith("disconnected", jasmine.any(Function));
		});
	});

	it("call connect with uri & opts", () => {
		fakeConn.connection.on.mockClear();

		mongoose.connect = jest.fn(() => fakeConn);
		adapter.opts = {
			uri: "mongodb://server",
			opts: {
				user: "admin",
				pass: "123456"
			}
		};

		return adapter.connect().catch(protectReject).then(() => {
			expect(mongoose.connect).toHaveBeenCalledTimes(1);
			expect(mongoose.connect).toHaveBeenCalledWith(adapter.opts.uri, adapter.opts.opts);
		});
	});

	it("call disconnect", () => {
		fakeConn.connection.close.mockClear();

		return adapter.disconnect().catch(protectReject).then(() => {
			expect(fakeConn.connection.close).toHaveBeenCalledTimes(1);
		});
	});


	describe("Test createCursor", () => {
		it("init", () => {
			adapter.model.find = jest.fn(() => ({
				find: jest.fn(),
				sort: jest.fn(),
				skip: jest.fn(),
				limit: jest.fn(),
				lean: leanCB,
				exec: execCB,
				count: countCB
			}));
		});

		it("call without params", () => {
			adapter.model.find.mockClear();
			adapter.createCursor();
			expect(adapter.model.find).toHaveBeenCalledTimes(1);
			expect(adapter.model.find).toHaveBeenCalledWith();
		});

		it("call with query", () => {
			adapter.model.find.mockClear();
			let query = {};
			adapter.createCursor({ query });
			expect(adapter.model.find).toHaveBeenCalledTimes(1);
			expect(adapter.model.find).toHaveBeenCalledWith(query);
		});

		it("call with sort string", () => {
			adapter.model.find.mockClear();
			let query = {};
			let q = adapter.createCursor({ query, sort: "-votes title" });
			expect(adapter.model.find).toHaveBeenCalledTimes(1);
			expect(adapter.model.find).toHaveBeenCalledWith(query);

			expect(q.sort).toHaveBeenCalledTimes(1);
			expect(q.sort).toHaveBeenCalledWith("-votes title");
		});

		it("call with sort array", () => {
			adapter.model.find.mockClear();
			let query = {};
			let q = adapter.createCursor({ query, sort: ["createdAt", "title"] });
			expect(adapter.model.find).toHaveBeenCalledTimes(1);
			expect(adapter.model.find).toHaveBeenCalledWith(query);

			expect(q.sort).toHaveBeenCalledTimes(1);
			expect(q.sort).toHaveBeenCalledWith("createdAt title");
		});

		it("call with limit & offset", () => {
			adapter.model.find.mockClear();
			let q = adapter.createCursor({ limit: 5, offset: 10 });
			expect(adapter.model.find).toHaveBeenCalledTimes(1);
			expect(adapter.model.find).toHaveBeenCalledWith(undefined);

			expect(q.limit).toHaveBeenCalledTimes(1);
			expect(q.limit).toHaveBeenCalledWith(5);
			expect(q.skip).toHaveBeenCalledTimes(1);
			expect(q.skip).toHaveBeenCalledWith(10);
		});

		it("call with full-text search", () => {
			adapter.model.find.mockClear();
			let q = adapter.createCursor({ search: "walter" });
			expect(adapter.model.find).toHaveBeenCalledTimes(1);
			expect(adapter.model.find).toHaveBeenCalledWith(undefined);

			expect(q.find).toHaveBeenCalledTimes(1);
			expect(q.find).toHaveBeenCalledWith({"$text": {"$search": "walter"}});
			expect(q.sort).toHaveBeenCalledTimes(1);
			expect(q.sort).toHaveBeenCalledWith({"_score": {"$meta": "textScore"}});
			expect(q._fields).toEqual({"_score": {"$meta": "textScore"}});
		});

	});


	it("call find", () => {
		adapter.createCursor = jest.fn(() => query());

		let params = {};
		return adapter.find(params).catch(protectReject).then(() => {
			expect(adapter.createCursor).toHaveBeenCalledTimes(1);
			expect(adapter.createCursor).toHaveBeenCalledWith(params);

			expect(execCB).toHaveBeenCalledTimes(1);
		});
	});

	it("call findOne", () => {
		leanCB.mockClear();
		execCB.mockClear();
		let query = { age: 23 };

		return adapter.findOne(query).catch(protectReject).then(() => {
			expect(adapter.model.findOne).toHaveBeenCalledTimes(1);
			expect(adapter.model.findOne).toHaveBeenCalledWith(query);

			expect(execCB).toHaveBeenCalledTimes(1);
		});
	});

	it("call findById", () => {
		leanCB.mockClear();
		execCB.mockClear();

		return adapter.findById(5).catch(protectReject).then(() => {
			expect(adapter.model.findById).toHaveBeenCalledTimes(1);
			expect(adapter.model.findById).toHaveBeenCalledWith(5);

			expect(execCB).toHaveBeenCalledTimes(1);
		});
	});

	it("call findByIds", () => {
		adapter.model.find.mockClear();
		leanCB.mockClear();
		execCB.mockClear();

		return adapter.findByIds(5).catch(protectReject).then(() => {
			expect(adapter.model.find).toHaveBeenCalledTimes(1);
			expect(adapter.model.find).toHaveBeenCalledWith({"_id": {"$in": 5}});

			expect(execCB).toHaveBeenCalledTimes(1);
		});
	});

	it("call count", () => {
		adapter.createCursor = jest.fn(() => query());
		leanCB.mockClear();
		execCB.mockClear();

		let params = {};
		return adapter.count(params).catch(protectReject).then(() => {
			expect(adapter.createCursor).toHaveBeenCalledTimes(1);
			expect(adapter.createCursor).toHaveBeenCalledWith(params);

			expect(countCB).toHaveBeenCalledTimes(1);
			expect(execCB).toHaveBeenCalledTimes(1);
		});
	});

	it("call insert", () => {
		let entity = {};
		return adapter.insert(entity).catch(protectReject).then(() => {
			expect(fakeModel).toHaveBeenCalledTimes(1);
			expect(fakeModel).toHaveBeenCalledWith(entity);

			expect(saveCB).toHaveBeenCalledTimes(1);
		});
	});


	it("call create", () => {
		let entities = [];
		return adapter.insertMany(entities).catch(protectReject).then(() => {
			expect(adapter.model.create).toHaveBeenCalledTimes(1);
			expect(adapter.model.create).toHaveBeenCalledWith(entities);
		});
	});

	it("call updateMany", () => {
		let query = {};
		let update = {};

		return adapter.updateMany(query, update).catch(protectReject).then(() => {
			expect(adapter.model.update).toHaveBeenCalledTimes(1);
			expect(adapter.model.update).toHaveBeenCalledWith(query, update, { multi: true, "new": true });
		});
	});

	it("call updateById", () => {
		doc.toJSON.mockClear();

		let update = {};
		return adapter.updateById(5, update).catch(protectReject).then(() => {
			expect(adapter.model.findByIdAndUpdate).toHaveBeenCalledTimes(1);
			expect(adapter.model.findByIdAndUpdate).toHaveBeenCalledWith(5, update, { "new": true });
		});
	});

	it("call removeMany", () => {
		let query = {};

		return adapter.removeMany(query).catch(protectReject).then(() => {
			expect(adapter.model.remove).toHaveBeenCalledTimes(1);
			expect(adapter.model.remove).toHaveBeenCalledWith(query);
		});
	});

	it("call removeById", () => {
		return adapter.removeById(5).catch(protectReject).then(() => {
			expect(adapter.model.findByIdAndRemove).toHaveBeenCalledTimes(1);
			expect(adapter.model.findByIdAndRemove).toHaveBeenCalledWith(5);
		});
	});

	it("call clear", () => {
		adapter.model.remove.mockClear();
		return adapter.clear().catch(protectReject).then(() => {
			expect(adapter.model.remove).toHaveBeenCalledTimes(1);
			expect(adapter.model.remove).toHaveBeenCalledWith({});
		});
	});

	it("call doc.toJSON", () => {
		doc.toJSON.mockClear();
		doc._id.toHexString.mockClear();
		adapter.entityToObject(doc);
		expect(doc.toJSON).toHaveBeenCalledTimes(1);
		expect(doc._id.toHexString).toHaveBeenCalledTimes(1);
	});

	it("call entityToObject on doc without ObjectID", () => {
		docIdString.toJSON.mockClear();
		docIdString._id.toString.mockClear();
		adapter.entityToObject(docIdString);
		expect(docIdString.toJSON).toHaveBeenCalledTimes(1);
		expect(docIdString._id.toString).toHaveBeenCalledTimes(1);
	});
});

