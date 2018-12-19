"use strict";

const {ServiceBroker} = require("moleculer");

const db = {
	get: jest.fn(() => Promise.resolve()),
	find: jest.fn(() => Promise.resolve([])),
	fetch: jest.fn(() => Promise.resolve({rows: []})),
	insert: jest.fn(() => Promise.resolve({})),
	destroy: jest.fn(() => Promise.resolve({})),
	bulk: jest.fn(() => Promise.resolve([])),
	use: jest.fn(() => db)
};

jest.mock("nano");
let Nano = require("nano");
Nano.mockImplementation(() => {
	return {
		db
	};
});

const NanoAdapter = require("../../src");

function protectReject(err) {
	if (err && err.stack) {
		console.error(err);
		console.error(err.stack);
	}
	expect(err).toBe(true);
}

const fakeModel = {
	name: "posts",
	define: {
		a: 5
	},
	options: {
		b: 10
	}
};

const fakeConn = Promise.resolve();
fakeConn.connection = {
	on: jest.fn(),
	close: jest.fn()
};

describe("Test NanoAdapter", () => {

	beforeEach(() => {
		Nano.mockClear();
	});

	const url = "couchdb://localhost:5984";
	const opts = {};
	const adapter = new NanoAdapter(url, opts);

	const broker = new ServiceBroker({logger: false});
	const service = broker.createService({
		name: "store",
		model: fakeModel
	});

	beforeEach(() => {
		adapter.init(broker, service);
	});

	it("should be created", () => {
		expect(adapter).toBeDefined();
		expect(adapter.url).toEqual(url);
		expect(adapter.opts).toEqual(opts);
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
		expect(adapter.beforeSaveTransformID).toBeInstanceOf(Function);
		expect(adapter.afterRetrieveTransformID).toBeInstanceOf(Function);
	});

	it("call init", () => {
		expect(adapter.broker).toBe(broker);
		expect(adapter.service).toBe(service);
	});

	it("call connect with uri", () => {
		return adapter.connect("couchdb://127.0.0.1:5984").catch(protectReject).then(() => {
			expect(Nano).toHaveBeenCalledTimes(1);
			expect(adapter.db).toBe(db);
			expect(adapter.db.get).toHaveBeenCalledTimes(1);
			expect(adapter.db.get).toHaveBeenCalledWith(fakeModel.name);
			expect(adapter.db.use).toHaveBeenCalledTimes(1);
			expect(adapter.db.use).toHaveBeenCalledWith(fakeModel.name);
			expect(adapter.service.schema.model).toBe(fakeModel);
		});
	});

	it("call find", () => {
		adapter.db.find.mockClear();
		const params = {};
		return adapter.find(params).catch(protectReject).then(() => {
			expect(adapter.db.find).toHaveBeenCalledTimes(1);
			expect(adapter.db.find).toHaveBeenCalledWith({selector: params});
		});
	});

	it("call findOne", () => {
		adapter.find = jest.fn(() => Promise.resolve([{}]));
		return adapter.findOne({age: 25}).catch(protectReject).then(() => {
			expect(adapter.find).toHaveBeenCalledTimes(1);
			expect(adapter.find).toHaveBeenCalledWith({age: 25, limit: 1});
		});
	});

	it("call findById", () => {
		adapter.db.get.mockClear();
		return adapter.findById(5).catch(protectReject).then(() => {
			expect(adapter.db.get).toHaveBeenCalledTimes(1);
			expect(adapter.db.get).toHaveBeenCalledWith(5);
		});
	});

	it("call findByIds", () => {
		adapter.db.fetch.mockClear();
		adapter.find = jest.fn(() => Promise.resolve([]));
		return adapter.findByIds([5]).catch(protectReject).then(() => {
			expect(adapter.db.fetch).toHaveBeenCalledTimes(1);
			expect(adapter.db.fetch).toHaveBeenCalledWith({"keys": [5]});
		});
	});

	it("call count", () => {
		adapter.find = jest.fn(() => Promise.resolve([{}]));
		const params = {};
		return adapter.count(params).catch(protectReject).then(() => {
			expect(adapter.find).toHaveBeenCalledTimes(1);
			expect(adapter.find).toHaveBeenCalledWith({});
		});
	});

	it("call insert", () => {
		adapter.db.insert.mockClear();
		const entity = {};
		return adapter.insert(entity).catch(protectReject).then(() => {
			expect(adapter.db.insert).toHaveBeenCalledTimes(1);
			expect(adapter.db.insert).toHaveBeenCalledWith(entity);
		});
	});

	it("call insertMany", () => {
		adapter.db.bulk.mockClear();
		const entities = [{name: "John"}, {name: "Jane"}];
		return adapter.insertMany(entities).catch(protectReject).then(() => {
			expect(adapter.db.bulk).toHaveBeenCalledTimes(1);
			expect(adapter.db.bulk).toHaveBeenCalledWith({docs: entities});
		});
	});

	it("call updateMany", () => {
		adapter.db.bulk.mockClear();
		adapter.find = jest.fn(() => Promise.resolve([]));
		const where = {};
		const update = {};
		return adapter.updateMany(where, update).catch(protectReject).then(() => {
			expect(adapter.db.bulk).toHaveBeenCalledTimes(1);
			expect(adapter.db.bulk).toHaveBeenCalledWith({docs: []});
		});
	});

	it("call updateById", () => {
		adapter.db.insert.mockClear();
		adapter.findById = jest.fn(() => Promise.resolve({}));
		const toUpdate = {title: "Test"};
		return adapter.updateById(5, toUpdate).catch(protectReject).then(() => {
			expect(adapter.findById).toHaveBeenCalledTimes(2);
			expect(adapter.findById).toHaveBeenCalledWith(5);
			expect(adapter.db.insert).toHaveBeenCalledTimes(1);
			expect(adapter.db.insert).toHaveBeenCalledWith(toUpdate);
		});
	});

	it("call removeById", () => {
		adapter.db.destroy.mockClear();
		adapter.findById = jest.fn(() => Promise.resolve({_id: 5, _rev: "123"}));
		return adapter.removeById(5).catch(protectReject).then(() => {
			expect(adapter.findById).toHaveBeenCalledTimes(1);
			expect(adapter.findById).toHaveBeenCalledWith(5);
			expect(adapter.db.destroy).toHaveBeenCalledTimes(1);
			expect(adapter.db.destroy).toHaveBeenCalledWith(5, "123");
		});
	});

	it("call removeMany", () => {
		adapter.find.mockClear();
		adapter.db.bulk.mockClear();
		adapter.findById = jest.fn(() => Promise.resolve([]));
		return adapter.removeMany({}).catch(protectReject).then(() => {
			expect(adapter.find).toHaveBeenCalledTimes(1);
			expect(adapter.find).toHaveBeenCalledWith({selector: {}});
			expect(adapter.db.bulk).toHaveBeenCalledTimes(1);
			expect(adapter.db.bulk).toHaveBeenCalledWith({docs: []});
		});
	});

	it("call clear", () => {
		adapter.removeMany = jest.fn(() => Promise.resolve([]));
		return adapter.clear().catch(protectReject).then(() => {
			expect(adapter.removeMany).toHaveBeenCalledTimes(1);
			expect(adapter.removeMany).toHaveBeenCalledWith({});
		});
	});

	it("call beforeSaveTransformID", () => {
		const entity = {id: "123"};
		const entityTransformed = adapter.beforeSaveTransformID(entity, "id");
		return expect(entityTransformed).toMatchObject({_id: "123"});
	});

	it("should transform idField into _id", () => {
		const entity = {id: "123"};
		const entityTransformed = adapter.beforeSaveTransformID(entity, "id");
		return expect(entityTransformed).toMatchObject({_id: "123"});
	});

	it("should NOT transform idField into _id", () => {
		const entity = {hello: "123"};
		const entityTransformed = adapter.beforeSaveTransformID(entity, "id");
		return expect(entityTransformed).toMatchObject(entity);
	});

	it("should transform _id into idField", () => {
		const entity = {_id: "123"};
		const entityTransformed = adapter.afterRetrieveTransformID(entity, "id");
		return expect(entityTransformed).toMatchObject({id: "123"});
	});

	it("should NOT transform _id into idField", () => {
		const entity = {hello: "123"};
		const entityTransformed = adapter.afterRetrieveTransformID(entity, "id");
		return expect(entityTransformed).toMatchObject(entity);
	});

	it("call disconnect", () => {
		return adapter.disconnect().catch(protectReject).then(() => {
			expect(adapter.db).toBe(null);
		});
	});
});

