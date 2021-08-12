"use strict";

const { ServiceBroker } = require("moleculer");
const Adapter = require("../../src/memory-adapter");

const Datastore = require('@seald-io/nedb');

function protectReject(err) {
	if (err && err.stack) {
		console.error(err);
		console.error(err.stack);
	}
	expect(err).toBe(true);
}

describe("Test Adapter constructor", () => {
	it("should be created", () => {
		const adapter = new Adapter();
		expect(adapter).toBeDefined();
	});

	it("should be created with opts", () => {
		const opts = {};
		const adapter = new Adapter(opts);
		expect(adapter).toBeDefined();
		expect(adapter.opts).toBe(opts);
	});

	it('should use preconfigured Datastore', () => {
		const ds = new Datastore();
		const adapter = new Adapter(ds);
		adapter.connect();
		expect(adapter).toBeDefined();
		expect(adapter.db).toBe(ds);
	});

});

describe("Test Adapter methods", () => {
	const broker = new ServiceBroker({ logger: false });
	const service = broker.createService({
		name: "test"
	});

	const opts = {};

	const adapter = new Adapter(opts);
	adapter.init(broker, service);

	it("should connect", () => {
		return expect(adapter.connect()).resolves.toBeUndefined();
	});

	const doc = {
		name: "Walter White",
		age: 48,
		email: "heisenberg@gmail.com"
	};

	let savedDoc;

	it("should insert a document", () => {
		return adapter.insert(doc)
			.then(res => {
				expect(res).toEqual(Object.assign({}, doc, { _id: expect.any(String) }));
				savedDoc = res;
			})
			.catch(protectReject);
	});

	let multipleDocs;
	it("should insert multiple document", () => {
		return adapter.insertMany([{ name: "John Doe", c: true, age: 41 }, { name: "Jane Doe", b: "Hello", age: 35 }, { name: "Adam Smith", email: "adam.smith@gmail.com", age: 35 }])
			.then(res => {
				expect(res.length).toBe(3);
				expect(res[0]._id).toBeDefined();
				expect(res[0].name).toBe("John Doe");
				expect(res[0].age).toBe(41);

				expect(res[1]._id).toBeDefined();
				expect(res[1].name).toBe("Jane Doe");
				expect(res[1].age).toBe(35);

				expect(res[2]._id).toBeDefined();
				expect(res[2].name).toBe("Adam Smith");
				expect(res[2].email).toBe("adam.smith@gmail.com");
				expect(res[2].age).toBe(35);

				multipleDocs = res;
			})
			.catch(protectReject);
	});

	it("should find by ID", () => {
		return expect(adapter.findById(savedDoc._id)).resolves.toEqual(savedDoc);
	});

	it("should find one", () => {
		return expect(adapter.findOne({ age: 48 })).resolves.toEqual(savedDoc);
	});

	it("should find by multiple ID", () => {
		return expect(adapter.findByIds([multipleDocs[0]._id, multipleDocs[1]._id, ])).resolves.toEqual([multipleDocs[0], multipleDocs[1]]);
	});

	it("should find all without filter", () => {
		return adapter.find().then(res => {
			expect(res.length).toBe(4);
		}).catch(protectReject);
	});

	it("should find all 'name' with raw query", () => {
		return expect(adapter.find({ query: { name: "John Doe" }})).resolves.toEqual([multipleDocs[0]]);
	});

	it("should find all 'age: 35'", () => {
		return adapter.find({ query: { age: 35 }}).then(res => {
			expect(res.length).toBe(2);
			expect(res[0].age).toEqual(35);
			expect(res[1].age).toEqual(35);

		}).catch(protectReject);
	});

	it("should find all 'Doe'", () => {
		return adapter.find({ search: "Doe" }).then(res => {
			expect(res.length).toBe(2);
			expect(res[0].name).toMatch("Doe");
			expect(res[1].name).toMatch("Doe");

		}).catch(protectReject);
	});

	it("should find all 'Doe' in filtered fields", () => {
		return adapter.find({ search: "Doe", searchFields: ["email"] }).then(res => {
			expect(res.length).toBe(0);
		}).catch(protectReject);
	});

	it("should find all 'walter' in filtered fields", () => {
		return adapter.find({ search: "walter", searchFields: "email name" }).then(res => {
			expect(res.length).toBe(1);
			expect(res[0]).toEqual(savedDoc);

		}).catch(protectReject);
	});

	it("should count all 'walter' in filtered fields", () => {
		return expect(adapter.count({ search: "walter", searchFields: "email name" })).resolves.toBe(1);
	});

	it("should sort the result", () => {
		return expect(adapter.find({ sort: ["name"] })).resolves.toEqual([
			multipleDocs[2],
			multipleDocs[1],
			multipleDocs[0],
			savedDoc,
		]);
	});

	it("should sort by two fields in array", () => {
		return expect(adapter.find({ sort: ["-age", "-name"] })).resolves.toEqual([
			savedDoc,
			multipleDocs[0],
			multipleDocs[1],
			multipleDocs[2],
		]);
	});

	it("should limit & skip the result", () => {
		return expect(adapter.find({ sort: ["-age", "-name"], limit: 2, offset: 1 })).resolves.toEqual([
			multipleDocs[0],
			multipleDocs[1],
		]);
	});

	it("should count all entities", () => {
		return expect(adapter.count()).resolves.toBe(4);
	});

	it("should count filtered entities", () => {
		return expect(adapter.count({ query: { email: { $exists: true } }})).resolves.toBe(2);
	});

	it("should update a document", () => {
		return expect(adapter.updateById(savedDoc._id, { $set: { e: 1234 } })).resolves.toEqual(Object.assign({}, savedDoc, { e: 1234 }));
	});

	it("should update many documents", () => {
		return expect(adapter.updateMany({ age: 35 }, { $set: { gender: "male" } })).resolves.toBe(2);
	});

	it("should remove by ID", () => {
		return expect(adapter.removeById(multipleDocs[0]._id)).resolves.toBe(1);
	});

	it("should remove many documents", () => {
		return expect(adapter.removeMany({ name: { $regex: /Doe/ } })).resolves.toBe(1);
	});

	it("should count all entities", () => {
		return expect(adapter.count()).resolves.toBe(2);
	});

	it("should clear all documents", () => {
		return expect(adapter.clear()).resolves.toBe(2);
	});

	it("should disconnect", () => {
		return expect(adapter.disconnect()).resolves.toBeUndefined();
	});
});
