"use strict";
const {ServiceBroker} = require("moleculer");
const CouchDbNanoAdapter = require("../../src");

function protectReject(err) {
	if (err && err.stack) {
		console.error(err);
		console.error(err.stack);
	}
	expect(err).toBeDefined();
}

describe("Test CouchDbNanoAdapter", () => {
	const broker = new ServiceBroker({logger: false});
	const service = broker.createService({
		name: "store",
		collection: "posts"
	});
	const uri = "";
	const opts = {};
	const adapter = new CouchDbNanoAdapter(uri, opts);

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
		expect(adapter.beforeSaveTransformID).toBeInstanceOf(Function);
		expect(adapter.afterRetrieveTransformID).toBeInstanceOf(Function);
	});

	it("throw error in init if collection is not defined", () => {
		expect(() => {
			service.schema.collection = undefined;
			adapter.init(broker, service);
		}).toThrow("Missing `collection` definition in schema of service!");
	});

	it("call init", () => {
		service.schema.collection = "posts";
		adapter.init(broker, service);
		expect(adapter.broker).toBe(broker);
		expect(adapter.service).toBe(service);
	});

	it("call connect with default params", () => {
		adapter.init(broker, service);
		return adapter.connect()
			.then(() => {
				expect(adapter.collection).toBeInstanceOf(Object);
			})
			.catch(protectReject);
	});

	it("call connect with uri", () => {
		adapter.init(broker, service);
		adapter.uri = "couchdb://localhost:5984";
		return adapter.connect(uri)
			.then(() => {
				expect(adapter.collection).toBeInstanceOf(Object);
			})
			.catch(protectReject);
	});

	it("call connect with uri & opts", () => {
		adapter.init(broker, service);
		adapter.uri = "couchdb://localhost:5984";
		adapter.opts = {};
		return adapter.connect(uri)
			.then(() => {
				expect(adapter.collection).toBeInstanceOf(Object);
			})
			.catch(protectReject);
	});

	it("call insert", () => {
		return adapter.insert({_id: "1", a: 1, b: 2})
			.then(res => expect(res._id).toBe("1"))
			.catch(protectReject);
	});

	it("call findById", () => {
		return adapter.findById("1")
			.then(res => expect(res._id).toBe("1"))
			.catch(protectReject);
	});

	it("call find", () => {
		return adapter.find({selector: {a: 1}})
			.then(res => {
				expect(res).toBeInstanceOf(Array);
				expect(res[0].a).toBe(1);
			})
			.catch(protectReject);
	});

	it("call findOne", () => {
		return adapter.find({selector: {a: 1}})
			.then(res => {
				expect(res).toBeInstanceOf(Array);
				expect(res).toHaveLength(1);
				expect(res[0]).toMatchObject({a: 1});
			})
			.catch(protectReject);
	});

	it("call updateById", () => {
		return adapter.updateById("1", {b: 2})
			.then(res => expect(res.b).toBe(2))
			.catch(protectReject);
	});

	it("call removeById", () => {
		return adapter.removeById("1")
			.then(res => expect(res._id).toBe("1"))
			.catch(protectReject);
	});

	it("call insertMany", () => {
		let entities = [
			{_id: "2", a: 2, b: 20},
			{_id: "3", a: 3, b: 20},
			{_id: "4", a: 4, b: 20},
			{_id: "5", a: 5, b: 30},
			{_id: "6", a: 6, b: 30}
		];
		return adapter.insertMany(entities)
			.then(res => {
				expect(res).toBeInstanceOf(Array);
				expect(res).toHaveLength(5);
			})
			.catch(protectReject);
	});

	it("call updateMany", () => {
		let selector = {b: 20};
		let update = {c: 100};
		return adapter.updateMany(selector, update)
			.then(res => {
				expect(res).toBeGreaterThanOrEqual(3);
			})
			.catch(protectReject);
	});

	it("call count", () => {
		let selector = {b: 20};
		return adapter.count({selector})
			.then(res => {
				expect(res).toBeGreaterThanOrEqual(3);
			})
			.catch(protectReject);
	});

	it("call findByIds", () => {
		return adapter.findByIds(["2", "3", "4"])
			.then(res => {
				expect(res).toBeInstanceOf(Array);
				expect(res).toHaveLength(3);
			})
			.catch(protectReject);
	});

	it("call removeMany", () => {
		let selector = {b: 20};
		return adapter.removeMany(selector)
			.then(res => {
				expect(res).toBeGreaterThanOrEqual(3);
			})
			.catch(protectReject);
	});

	it("call clear", () => {
		return adapter.clear()
			.then(res => {
				expect(res).toBeGreaterThanOrEqual(2);
			})
			.catch(protectReject);
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
		return adapter.disconnect()
			.then(() => {
				expect(adapter.collection).toBe(null);
			})
			.catch(protectReject);
	});
});

