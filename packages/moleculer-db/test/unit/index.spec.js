"use strict";

const { ServiceBroker, Service, Context } = require("moleculer");
const { ValidationError } = require("moleculer").Errors;
const DbService = require("../../src");
//const lolex = require("lolex");

function protectReject(err) {
	if (err && err.stack) {
		console.error(err);
		console.error(err.stack);
	}
	expect(err).toBe(true);
}

describe("Test DbService actions", () => {
	const doc = { id : 1 };
	const docs = [doc];

	const adapter = {
		init: jest.fn(() => Promise.resolve()),
		connect: jest.fn(() => Promise.resolve()),
		disconnect: jest.fn(() => Promise.resolve()),
		find: jest.fn(() => Promise.resolve(docs)),
		findById: jest.fn(() => Promise.resolve(doc)),
		findByIds: jest.fn(() => Promise.resolve(docs)),
		count: jest.fn(() => Promise.resolve(3)),
		insert: jest.fn(() => Promise.resolve(doc)),
		insertMany: jest.fn(() => Promise.resolve(docs)),
		updateMany: jest.fn(() => Promise.resolve(docs)),
		updateById: jest.fn(() => Promise.resolve(doc)),
		removeMany: jest.fn(() => Promise.resolve(5)),
		removeById: jest.fn(() => Promise.resolve(3)),
		clear: jest.fn(() => Promise.resolve(3)),
		entityToObject: jest.fn(obj => obj),
		beforeSaveTransformID: jest.fn(obj => obj),
		afterRetrieveTransformID: jest.fn(obj => obj)
	};

	const broker = new ServiceBroker({ logger: false, validation: false });
	const service = broker.createService(DbService, {
		name: "store",
		adapter,
	});

	service.sanitizeParams = jest.fn((ctx, p) => p);
	service.transformDocuments = jest.fn((ctx, params, docs) => Promise.resolve(docs));

	it("should set default settings", () => {
		expect(service.adapter).toEqual(adapter);
		expect(service.settings).toEqual({
			entityValidator: null,
			fields: null,
			excludeFields: null,
			idField: "_id",
			maxLimit: -1,
			maxPageSize: 100,
			pageSize: 10,
			populates: null,
			useDotNotation: false,
			cacheCleanEventType: "broadcast"
		});
	});

	it("should called the 'init' method of adapter", () => {
		expect(adapter.init).toHaveBeenCalledTimes(1);
		expect(adapter.init).toHaveBeenCalledWith(broker, service);
	});

	it("should call the 'connect' method", () => {
		service.connect = jest.fn(() => Promise.resolve());

		return broker.start().then(() => {
			expect(service.connect).toHaveBeenCalledTimes(1);
		}).catch(protectReject);
	});

	it("should call the 'getById' method", () => {
		service.sanitizeParams.mockClear();
		service.transformDocuments.mockClear();
		service.getById = jest.fn(() => Promise.resolve(doc));
		const p = { id: 5 };

		return broker.call("store.get", p).then(() => {
			expect(service.sanitizeParams).toHaveBeenCalledTimes(1);
			expect(service.sanitizeParams).toHaveBeenCalledWith(expect.any(Context), p);

			expect(service.getById).toHaveBeenCalledTimes(1);
			expect(service.getById).toHaveBeenCalledWith(5, true);

			expect(service.transformDocuments).toHaveBeenCalledTimes(1);
			expect(service.transformDocuments).toHaveBeenCalledWith(expect.any(Context), p, doc);

		}).catch(protectReject);
	});

	it("should call the 'getById' method with multi IDs, and should convert the result to object", () => {
		service.transformDocuments.mockClear();
		service.adapter.afterRetrieveTransformID.mockClear();
		const p = { id: [5, 3, 8], mapping: true };

		let docs = [
			{ _id: 5, name: "John" },
			{ _id: 3, name: "Walter" },
			{ _id: 8, name: "Jane" }
		];
		service.getById = jest.fn(() => Promise.resolve(docs));

		return broker.call("store.get", p).then(res => {
			expect(res).toEqual({
				"3": {
					"_id": 3,
					"name": "Walter"
				},
				"5": {
					"_id": 5,
					"name": "John"
				},
				"8": {
					"_id": 8,
					"name": "Jane"
				}
			});

			expect(service.getById).toHaveBeenCalledTimes(1);
			expect(service.getById).toHaveBeenCalledWith([5, 3, 8], true);

			expect(service.transformDocuments).toHaveBeenCalledTimes(1);
			expect(service.transformDocuments).toHaveBeenCalledWith(expect.any(Context), p, docs);

			expect(service.adapter.afterRetrieveTransformID).toHaveBeenCalledTimes(3);
			expect(service.adapter.afterRetrieveTransformID).toHaveBeenCalledWith(docs[0], "_id");
			expect(service.adapter.afterRetrieveTransformID).toHaveBeenCalledWith(docs[1], "_id");
			expect(service.adapter.afterRetrieveTransformID).toHaveBeenCalledWith(docs[2], "_id");

		}).catch(protectReject);
	});

	it("should call the 'getById' method with single ID, and should convert the result to object", () => {
		service.transformDocuments.mockClear();
		service.adapter.afterRetrieveTransformID.mockClear();
		const p = { id: 5, mapping: true };

		let docs = { _id: 5, name: "John" };
		service.getById = jest.fn(() => Promise.resolve(docs));

		return broker.call("store.get", p).then(res => {
			expect(res).toEqual({
				"5": {
					"_id": 5,
					"name": "John"
				}
			});

			expect(service.getById).toHaveBeenCalledTimes(1);
			expect(service.getById).toHaveBeenCalledWith(5, true);

			expect(service.transformDocuments).toHaveBeenCalledTimes(1);
			expect(service.transformDocuments).toHaveBeenCalledWith(expect.any(Context), p, docs);

			expect(service.adapter.afterRetrieveTransformID).toHaveBeenCalledTimes(1);
			expect(service.adapter.afterRetrieveTransformID).toHaveBeenCalledWith(docs, "_id");

		}).catch(protectReject);
	});

	it("should call the 'disconnect' method", () => {
		service.disconnect = jest.fn();

		return broker.stop().then(() => {
			expect(service.disconnect).toHaveBeenCalledTimes(1);
		}).catch(protectReject);
	});
});

describe("Test reconnecting", () => {
	const adapter = {
		init: jest.fn(() => Promise.resolve()),
		connect: jest.fn()
			.mockImplementationOnce(() => Promise.reject("Error"))
			.mockImplementationOnce(() => Promise.resolve()),
		disconnect: jest.fn(() => Promise.resolve())
	};
	const broker = new ServiceBroker({ logger: false });
	const service = broker.createService(DbService, {
		name: "store",
		adapter,
	});

	it("should connect after error", () => {
		return service.schema.started.call(service).catch(protectReject).then(() => {
			expect(adapter.connect).toHaveBeenCalledTimes(2);
		});
	});

});


describe("Test DbService methods", () => {
	const doc = { id : 1 };
	const docs = [doc];

	const adapter = {
		init: jest.fn(() => Promise.resolve()),
		connect: jest.fn(() => Promise.resolve()),
		disconnect: jest.fn(() => Promise.resolve()),
		find: jest.fn(() => Promise.resolve(docs)),
		findById: jest.fn(() => Promise.resolve(doc)),
		findByIds: jest.fn(() => Promise.resolve(docs)),
		count: jest.fn(() => Promise.resolve(3)),
		insert: jest.fn(() => Promise.resolve(doc)),
		insertMany: jest.fn(() => Promise.resolve(docs)),
		updateMany: jest.fn(() => Promise.resolve(docs)),
		updateById: jest.fn(() => Promise.resolve(doc)),
		removeMany: jest.fn(() => Promise.resolve(5)),
		removeById: jest.fn(() => Promise.resolve(3)),
		clear: jest.fn(() => Promise.resolve(3)),
		entityToObject: jest.fn(obj => obj)
	};

	const afterConnected = jest.fn();

	const broker = new ServiceBroker({ logger: false, validation: false, cacher: true });
	const service = broker.createService(DbService, {
		name: "store",
		version: 1,
		adapter,
		afterConnected
	});

	service.transformDocuments = jest.fn((ctx, params, docs) => Promise.resolve(docs));

	it("should call 'afterConnected' of schema", () => {
		return broker.start().delay(100).then(() => {
			expect(afterConnected).toHaveBeenCalledTimes(1);
			expect(adapter.connect).toHaveBeenCalledTimes(1);
		}).catch(protectReject);
	});

	it("should call broker.broadcast to clear the cache", () => {
		broker.broadcast = jest.fn();
		broker.emit = jest.fn();
		broker.cacher.clean = jest.fn(() => Promise.resolve());

		return service.clearCache().then(() => {
			expect(broker.emit).toHaveBeenCalledTimes(0);
			expect(broker.broadcast).toHaveBeenCalledTimes(1);
			expect(broker.broadcast).toHaveBeenCalledWith("cache.clean.v1.store");

			expect(broker.cacher.clean).toHaveBeenCalledTimes(1);
			expect(broker.cacher.clean).toHaveBeenCalledWith("v1.store.**");
		}).catch(protectReject);
	});

	it("should call broker.emit to clear the cache", () => {
		service.settings.cacheCleanEventType = "emit";
		broker.broadcast = jest.fn();
		broker.emit = jest.fn();
		broker.cacher.clean = jest.fn(() => Promise.resolve());

		return service.clearCache().then(() => {
			expect(broker.broadcast).toHaveBeenCalledTimes(0);
			expect(broker.emit).toHaveBeenCalledTimes(1);
			expect(broker.emit).toHaveBeenCalledWith("cache.clean.v1.store");

			expect(broker.cacher.clean).toHaveBeenCalledTimes(1);
			expect(broker.cacher.clean).toHaveBeenCalledWith("v1.store.**");
		}).catch(protectReject);
	});

	describe("Test `this.getById` method", () => {
		service.encodeID = jest.fn(id => id);
		service.decodeID = jest.fn(id => id);

		it("call with one ID without encoding", () => {
			adapter.findById.mockClear();

			return service.getById(5).then(res => {
				expect(res).toBe(doc);

				expect(service.decodeID).toHaveBeenCalledTimes(0);

				expect(adapter.findById).toHaveBeenCalledTimes(1);
				expect(adapter.findById).toHaveBeenCalledWith(5);
			}).catch(protectReject);
		});

		it("call with one ID and encoding", () => {
			adapter.findById.mockClear();

			return service.getById(5, true).then(res => {
				expect(res).toBe(doc);

				expect(service.decodeID).toHaveBeenCalledTimes(1);
				expect(service.decodeID).toHaveBeenCalledWith(5);

				expect(adapter.findById).toHaveBeenCalledTimes(1);
				expect(adapter.findById).toHaveBeenCalledWith(5);
			}).catch(protectReject);
		});

		it("call with multi IDs", () => {
			service.encodeID.mockClear();
			service.decodeID.mockClear();
			adapter.findByIds.mockClear();

			return service.getById([5, 3, 8], true).then(res => {
				expect(res).toBe(docs);

				expect(service.decodeID).toHaveBeenCalledTimes(3);
				expect(service.decodeID).toHaveBeenCalledWith(5);
				expect(service.decodeID).toHaveBeenCalledWith(3);
				expect(service.decodeID).toHaveBeenCalledWith(8);

				expect(adapter.findByIds).toHaveBeenCalledTimes(1);
				expect(adapter.findByIds).toHaveBeenCalledWith([5, 3, 8]);

			}).catch(protectReject);
		});

	});

	it("should call 'disconnect' of adapter", () => {
		return broker.stop().delay(100).then(() => {
			expect(adapter.disconnect).toHaveBeenCalledTimes(1);
		}).catch(protectReject);
	});
});


describe("Test entityChanged method", () => {
	const broker = new ServiceBroker({ logger: false, validation: false });
	const service = broker.createService(DbService, {
		name: "store",
		settings: {},
		beforeEntityCreate: jest.fn(() => Promise.resolve()),
		beforeEntityUpdate: jest.fn(() => Promise.resolve()),
		beforeEntityRemove: jest.fn(() => Promise.resolve()),
		entityCreated: jest.fn(),
		entityUpdated: jest.fn(),
		entityRemoved: jest.fn(),
	});

	service.clearCache = jest.fn(() => Promise.resolve());

	let ctx = {};
	let doc = { id: 5 };
	let docRaw = { id: 5, foo: "bar" };

	it("should call `beforeEntityCreate` event", () => {
		return service.beforeEntityChange("create", {}, ctx).catch(protectReject).then(() => {
			expect(service.schema.beforeEntityCreate).toHaveBeenCalledTimes(1);
			expect(service.schema.beforeEntityCreate).toHaveBeenCalledWith({}, ctx);
		});
	});

	it("should call `beforeEntityUpdate` event", () => {
		return service.beforeEntityChange("update",  {}, ctx).catch(protectReject).then(() => {
			expect(service.schema.beforeEntityUpdate).toHaveBeenCalledTimes(1);
			expect(service.schema.beforeEntityUpdate).toHaveBeenCalledWith({}, ctx);
		});
	});

	it("should call `beforeEntityRemove` event", () => {
		return service.beforeEntityChange("remove",{}, ctx).catch(protectReject).then(() => {
			expect(service.schema.beforeEntityRemove).toHaveBeenCalledTimes(1);
			expect(service.schema.beforeEntityRemove).toHaveBeenCalledWith({}, ctx);
		});
	});

	it("should call `entityCreated` event", () => {
		return service.entityChanged("created", doc, ctx, docRaw).catch(protectReject).then(() => {
			expect(service.clearCache).toHaveBeenCalledTimes(1);

			expect(service.schema.entityCreated).toHaveBeenCalledTimes(1);
			expect(service.schema.entityCreated).toHaveBeenCalledWith(doc, ctx, docRaw);
		});
	});

	it("should call `entityUpdated` event", () => {
		service.clearCache.mockClear();
		return service.entityChanged("updated", doc, ctx, docRaw).catch(protectReject).then(() => {
			expect(service.clearCache).toHaveBeenCalledTimes(1);

			expect(service.schema.entityUpdated).toHaveBeenCalledTimes(1);
			expect(service.schema.entityUpdated).toHaveBeenCalledWith(doc, ctx, docRaw);
		});
	});

	it("should call `entityRemoved` event", () => {
		service.clearCache.mockClear();
		return service.entityChanged("removed", doc, ctx, docRaw).catch(protectReject).then(() => {
			expect(service.clearCache).toHaveBeenCalledTimes(1);

			expect(service.schema.entityRemoved).toHaveBeenCalledTimes(1);
			expect(service.schema.entityRemoved).toHaveBeenCalledWith(doc, ctx, docRaw);
		});
	});

});

describe("Test sanitizeParams method", () => {
	const broker = new ServiceBroker({ logger: false, validation: false });
	const service = broker.createService(DbService, {
		name: "store",
		settings: {
			maxPageSize: 50,
			maxLimit: 200,
			pageSize: 25
		}
	});

	let ctx = {
		action: {
			name: "greeter.hello"
		}
	};

	let ctxList = {
		action: {
			name: "greeter.list"
		}
	};

	it("should not touch the params", () => {
		const res = service.sanitizeParams(ctx, {});
		expect(res).toEqual({});
	});

	it("should convert limit & offset to number", () => {
		const res = service.sanitizeParams(ctx, { limit: "5", offset: "10" });
		expect(res).toEqual({ limit: 5, offset: 10 });
	});

	it("should convert page & pageSize to number", () => {
		const res = service.sanitizeParams(ctx, { page: "5", pageSize: "10" });
		expect(res).toEqual({ page: 5, pageSize: 10 });
	});

	it("should convert sort to array", () => {
		const res = service.sanitizeParams(ctx, { sort: "name,createdAt votes" });
		expect(res).toEqual({ sort: ["name", "createdAt", "votes"] });
	});

	it("should convert fields to array", () => {
		const res = service.sanitizeParams(ctx, { fields: "name votes author" });
		expect(res).toEqual({ fields: ["name", "votes", "author"] });
	});

	it("should convert excludeFields to array", () => {
		const res = service.sanitizeParams(ctx, { excludeFields: "name votes author" });
		expect(res).toEqual({ excludeFields: ["name", "votes", "author"] });
	});

	it("should convert populate to array", () => {
		const res = service.sanitizeParams(ctx, { populate: "author voters" });
		expect(res).toEqual({ populate: ["author", "voters"] });
	});

	it("should convert searchFields to array", () => {
		const res = service.sanitizeParams(ctx, { searchFields: "name votes author" });
		expect(res).toEqual({ searchFields: ["name", "votes", "author"] });
	});

	it("should parse query to object", () => {
		const res = service.sanitizeParams(ctx, { query: "{\"name\": \"moleculer\" }" });
		expect(res).toEqual({ query: { name: "moleculer"} });
	});

	it("should fill pagination fields", () => {
		const res = service.sanitizeParams(ctxList, {});
		expect(res).toEqual({ limit: 25, offset: 0, page: 1, pageSize: 25});
	});

	it("should calc limit & offset from pagination fields", () => {
		const res = service.sanitizeParams(ctxList, { page: 3, pageSize: 20 });
		expect(res).toEqual({ limit: 20, offset: 40, page: 3, pageSize: 20});
	});

	it("should limit the pageSize", () => {
		const res = service.sanitizeParams(ctxList, { page: 1, pageSize: 100 });
		expect(res).toEqual({ limit: 50, offset: 0, page: 1, pageSize: 50});
	});

	it("should limit the limit", () => {
		const res = service.sanitizeParams({ action: {	name: "greeter.find" } }, { limit: 400 });
		expect(res).toEqual({ limit: 200 });
	});


});

const mockAdapter = {
	init: jest.fn(() => Promise.resolve()),
	connect: jest.fn(() => Promise.resolve()),
	disconnect: jest.fn(() => Promise.resolve()),
	entityToObject: jest.fn(obj => obj),
	afterRetrieveTransformID: jest.fn(obj => obj)
};

describe("Test transformDocuments method", () => {

	describe("Test with object", () => {
		const doc = { _id : 1 };

		const broker = new ServiceBroker({ logger: false, validation: false });
		const service = broker.createService(DbService, {
			name: "store",
			adapter: mockAdapter
		});

		service.encodeID = jest.fn(id => id);
		service.decodeID = jest.fn(id => id);
		service.populateDocs = jest.fn((ctx, docs) => Promise.resolve(docs));
		service.filterFields = jest.fn(docs => Promise.resolve(docs));

		it("should not call anything if the docs is null", () => {
			const ctx = { params: {} };
			return service.transformDocuments(ctx, ctx.params, null).then(res => {
				expect(res).toBe(null);
				expect(mockAdapter.entityToObject).toHaveBeenCalledTimes(0);
				expect(service.populateDocs).toHaveBeenCalledTimes(0);
				expect(service.filterFields).toHaveBeenCalledTimes(0);
			}).catch(protectReject);
		});

		it("should not call anything if the docs is a Number", () => {
			const ctx = { params: {} };
			return service.transformDocuments(ctx, ctx.params, 100).then(res => {
				expect(res).toBe(100);
				expect(mockAdapter.entityToObject).toHaveBeenCalledTimes(0);
				expect(service.populateDocs).toHaveBeenCalledTimes(0);
				expect(service.filterFields).toHaveBeenCalledTimes(0);
			}).catch(protectReject);
		});

		it("should call 'populateDocs' & filterFields methods", () => {
			service.populateDocs.mockClear();
			mockAdapter.entityToObject.mockClear();
			const ctx = { params: { populate: ["author"] } };
			return service.transformDocuments(ctx, ctx.params, doc).then(res => {
				expect(res).toBe(doc);

				expect(mockAdapter.entityToObject).toHaveBeenCalledTimes(1);
				expect(mockAdapter.entityToObject).toHaveBeenCalledWith(doc, ctx, ctx.params);

				expect(service.encodeID).toHaveBeenCalledTimes(1);
				expect(service.encodeID).toHaveBeenCalledWith(doc._id);

				expect(service.populateDocs).toHaveBeenCalledTimes(1);
				expect(service.populateDocs).toHaveBeenCalledWith(ctx, [doc], ["author"]);

				expect(service.filterFields).toHaveBeenCalledTimes(1);
				expect(service.filterFields).toHaveBeenCalledWith(doc, service.settings.fields);
			}).catch(protectReject);
		});

		it("should not call 'populateDocs' but filterFields methods", () => {
			service.filterFields.mockClear();
			service.populateDocs.mockClear();
			service.encodeID.mockClear();
			mockAdapter.entityToObject.mockClear();

			const ctx = { params: { fields: ["name"] } };
			return service.transformDocuments(ctx, ctx.params, doc).then(res => {
				expect(res).toBe(doc);

				expect(mockAdapter.entityToObject).toHaveBeenCalledTimes(1);
				expect(mockAdapter.entityToObject).toHaveBeenCalledWith(doc, ctx, ctx.params);

				expect(service.encodeID).toHaveBeenCalledTimes(1);
				expect(service.encodeID).toHaveBeenCalledWith(doc._id);

				expect(service.populateDocs).toHaveBeenCalledTimes(0);

				expect(service.filterFields).toHaveBeenCalledTimes(1);
				expect(service.filterFields).toHaveBeenCalledWith(doc, ["name"]);
			}).catch(protectReject);
		});
	});

	describe("Test with array of object", () => {
		const docs = [
			{ _id : 2 },
			{ _id : 5 }
		];

		const broker = new ServiceBroker({ logger: false, validation: false });
		const service = broker.createService(DbService, {
			name: "store",
			adapter: mockAdapter
		});

		service.encodeID = jest.fn(id => id);
		service.decodeID = jest.fn(id => id);
		service.populateDocs = jest.fn((ctx, docs) => Promise.resolve(docs));
		service.filterFields = jest.fn(docs => docs);

		it("should call 'populateDocs' & filterFields methods", () => {
			mockAdapter.entityToObject.mockClear();
			const ctx = { params: { populate: ["author"] } };
			return service.transformDocuments(ctx, ctx.params, docs).then(res => {
				expect(res).toEqual(docs);

				expect(mockAdapter.entityToObject).toHaveBeenCalledTimes(2);
				expect(mockAdapter.entityToObject).toHaveBeenCalledWith(docs[0], ctx, ctx.params);
				expect(mockAdapter.entityToObject).toHaveBeenCalledWith(docs[1], ctx, ctx.params);

				expect(service.encodeID).toHaveBeenCalledTimes(2);
				expect(service.encodeID).toHaveBeenCalledWith(docs[0]._id);
				expect(service.encodeID).toHaveBeenCalledWith(docs[1]._id);

				expect(service.populateDocs).toHaveBeenCalledTimes(1);
				expect(service.populateDocs).toHaveBeenCalledWith(ctx, docs, ["author"]);

				expect(service.filterFields).toHaveBeenCalledTimes(2);
				expect(service.filterFields).toHaveBeenCalledWith(docs[0], service.settings.fields);
				expect(service.filterFields).toHaveBeenCalledWith(docs[1], service.settings.fields);
			}).catch(protectReject);
		});
	});

	describe("Test excludeFields", () => {
		describe("Test with object", function () {
			const docs = { _id : 2, a: { b: 6, c: 7, d: { e: { f: 8 }, g: 9} } };

			const broker = new ServiceBroker({ logger: false, validation: false });
			const service = broker.createService(DbService, {
				name: "store",
				adapter: mockAdapter
			});

			it("should return expected - fields", () => {
				const ctx = { params: { fields: ["a.c"] } };
				return service.transformDocuments(ctx, ctx.params, docs).then(res => {
					expect(res).toStrictEqual({a: { c: 7 }});
				});
			});

			it("should return expected - excludeFields", () => {
				const ctx = { params: { excludeFields: ["a.c"] } };
				return service.transformDocuments(ctx, ctx.params, docs).then(res => {
					expect(res).toStrictEqual({
						"_id": 2,
						"a": {
							"b": 6,
							"d": {
								"e": {
									"f": 8
								},
								"g": 9
							}
						}
					});
				});
			});

			it("should return expected - fields & excludeFields", () => {
				const ctx = { params: { fields: ["a"], excludeFields: ["a.c"] } };
				return service.transformDocuments(ctx, ctx.params, docs).then(res => {
					expect(res).toStrictEqual({
						"a": {
							"b": 6,
							"d": {
								"e": {
									"f": 8
								},
								"g": 9
							}
						}
					});
				});
			});

			it("should return expected - fields & excludeFields - deep", () => {
				const ctx = { params: { fields: ["a"], excludeFields: ["a.d.e.f"] } };
				return service.transformDocuments(ctx, ctx.params, docs).then(res => {
					expect(res).toStrictEqual({
						"a": {
							"b": 6,
							"c": 7,
							"d": {
								"e": {},
								"g": 9
							}
						}
					});
				});
			});
		});
	});

});

describe("Test authorizeFields method", () => {
	/*const doc = {
		id : 1,
		name: "Walter",
		address: {
			street: "3828 Piermont Dr",
			city: "Albuquerque",
			state: "NM",
			zip: "87112",
			country: "USA"
		},
		email: "walter.white@heisenberg.com",
		password: "H3153n83rg"
	};*/

	describe("Test with nested fields", () => {
		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService(DbService, {
			name: "store",
			adapter: mockAdapter,
			settings: {
				fields: ["id", "name", "address", "bio.body", "mobile.carrier.name"]
			}
		});

		it("should remove the email & password", () => {
			const res = service.authorizeFields(["id", "name", "address", "email", "password", "otherProp"]);
			expect(res).toEqual(["id", "name", "address"]);
		});

		it("should remove the email", () => {
			const res = service.authorizeFields(["id", "name", "address.city", "address.state", "email"]);
			expect(res).toEqual(["id", "name", "address.city", "address.state"]);
		});

		it("should remove the disabled bio fields", () => {
			const res = service.authorizeFields(["id", "name", "bio.body.height", "bio.male", "bio.dob.year", "bio.body.hair.color"]);
			expect(res).toEqual(["id", "name", "bio.body.height", "bio.body.hair.color"]);
		});

		it("should return empty", () => {
			const res = service.authorizeFields(["carrier"]);
			expect(res).toEqual([]);
		});
	});

	describe("Test with enabled nested fields", () => {
		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService(DbService, {
			name: "store",
			adapter: mockAdapter,
			settings: {
				fields: ["id", "name", "address.city", "address.state", "address.country", "bio.body.height", "bio.male", "bio.body.hair.color"]
			}
		});

		it("should fill the nested enabled fields", () => {
			let res = service.authorizeFields(["id", "name", "address"]);
			expect(res).toEqual(["id", "name", "address.city", "address.state", "address.country"]);

			res = service.authorizeFields(["id", "name", "bio.male", "bio.body"]);
			expect(res).toEqual(["id", "name", "bio.male", "bio.body.height", "bio.body.hair.color"]);
		});

	});

});

describe("Test filterFields method", () => {
	const broker = new ServiceBroker({ logger: false, validation: false });
	const service = broker.createService(DbService, {
		name: "store"
	});

	describe("Object test", () => {
		const doc = {
			id : 1,
			name: "Walter",
			address: {
				city: "Albuquerque",
				state: "NM",
				zip: 87111
			}
		};

		it("should not touch the doc", () => {
			const res = service.filterFields(doc);
			expect(res).toBe(doc);
		});

		it("should filter the fields", () => {
			const res = service.filterFields(doc, ["name", "address"]);
			expect(res).toEqual({
				name: "Walter",
				address: doc.address
			});
		});

		it("should filter with nested fields", () => {
			const res = service.filterFields(doc, ["name", "address.city", "address.zip"]);
			expect(res).toEqual({
				name: "Walter",
				address: {
					city: "Albuquerque",
					zip: 87111
				}
			});
		});
	});

	describe("Array test", () => {
		describe("common case", () => {
			const doc = {
				id : 1,
				name: "Walter",
				cars: [
					{id: 1, name: "BMW", model: "320i", wheels: [
						{ placement: "front-left", id: 1},
						{ placement: "front-right", id: 2},
						{ placement: "behind-left", id: 3},
						{ placement: "behind-right", id: 4},
					]},
					{id: 2, name: "BMW", model: "520i", wheels: [
						{ placement: "front-left", id: 1},
						{ placement: "front-right", id: 2},
						{ placement: "behind-left", id: 3},
						{ placement: "behind-right", id: 4},
					]},
					{id: 3, name: "AUDI", model: "Q7", wheels: [
						{ placement: "front-left", id: 1, histories: []},
						{ placement: "front-right", id: 2, histories: [
							{date: "11/11/2011", message: "replace new 2011"}
						]},
						{ placement: "behind-left", id: 3, histories: []},
						{ placement: "behind-right", id: 4, histories: [
							{date: "12/12/2012", message: "replace new 2012"}
						]},
					]},
				],
				models: {
					id: 1,
					desc: "not an array",
					items: [
						{id: 0, desc: "0 desc", name: "0 name"},
						{id: 1, desc: "1 desc", name: "1 name"},
						{id: 2, desc: "2 desc", name: "2 name"},
					]
				}
			};
			it("should pass", () => {
				const res = service.filterFields(doc, ["name", "cars.$.id", "cars.$.name", "cars.$.wheels.$.placement", "cars.$.wheels.$.histories.$.date", "cars.$.wheels.$.histories.$.non-existed"]);
				expect(res).toEqual({
					name: "Walter",
					cars: [
						{id: 1, name: "BMW", wheels: [
							{ placement: "front-left" },
							{ placement: "front-right" },
							{ placement: "behind-left" },
							{ placement: "behind-right" },
						]},
						{id: 2, name: "BMW", wheels: [
							{ placement: "front-left" },
							{ placement: "front-right" },
							{ placement: "behind-left" },
							{ placement: "behind-right" },
						]},
						{id: 3, name: "AUDI", wheels: [
							{ placement: "front-left" },
							{ placement: "front-right", histories: [{date: "11/11/2011"}] },
							{ placement: "behind-left" },
							{ placement: "behind-right", histories: [{date: "12/12/2012"}] },
						]},
					]
				});
			});

			it("test .$. with object", () => {
				const res = service.filterFields(doc, ["models.$.desc", "name"]);
				expect(res).toEqual({
					name: "Walter",
				});
			});

			describe("doc.models test", function () {
				it("test .$", () => {
					const res = service.filterFields(doc, ["name", "models.items.$.id"]);
					expect(res).toEqual({
						name: "Walter",
						models: {
							items: [
								{id: 0},
								{id: 1},
								{id: 2},
							]
						},
					});
				});
				it("test .0", () => {
					const res = service.filterFields(doc, ["name", "models.items.0.id"]);
					expect(res).toEqual({
						name: "Walter",
						models: {
							items: [
								{id: 0},
							]
						},
					});
				});
				it("test .1", () => {
					const res = service.filterFields(doc, ["name", "models.items.1.id"]);
					expect(res).toEqual({
						name: "Walter",
						models: {
							items: [
								undefined,
								{id: 1},
							]
						},
					});
				});
				it("test multiple array indexes", () => {
					const res = service.filterFields(doc, ["name", "models.items.0.id", "models.items.1.desc", "models.items.2.name", "models.items.3.invalid"]);
					expect(res).toEqual({
						name: "Walter",
						models: {
							items: [
								{ id:0 },
								{ desc: "1 desc" },
								{ name: "2 name"},
							]
						},
					});
				});
			});
		});

		describe("array-index vs object key", function () {
			const doc = {
				a: {
					2: {
						b: [
							{
								c: [
									{ d: 3, e: 4 },
									{ d: 5, e: 6 },
								]
							}
						]
					}
				}
			};
			it("object key", () => {
				const res = service.filterFields(doc, ["a.2.b.$.c.$.e"]);
				expect(res).toEqual({a: { 2: { b: [{c: [{e: 4}, {e: 6}]}] } }});
			});
			it("asked array but got object key", () => {
				const res = service.filterFields(doc, ["a.$.b.$.c.2.e"]);
				expect(res).toEqual({});
			});
			it("array index", () => {
				const res = service.filterFields(doc, ["a.2.b.$.c.1.e"]);
				expect(res).toEqual({a: { 2: { b: [{c: [undefined, {e: 6}]}] } }});
			});
			describe("multiple fields", function () {
				it("should overwrite", () => {
					const res = service.filterFields(doc, ["a.2.b", "a.2.b.$.c.1.e"]);
					expect(res).toEqual({a: { 2: { b: doc.a["2"].b } }});
				});
				it("should merge", () => {
					const res = service.filterFields(doc, ["a.2.b.$.c.1.d", "a.2.b.$.c.1.e"]);
					expect(res).toEqual({a: { 2: { b: [{c: [undefined, {d: 5, e: 6}]}] } }});
				});
				it("should pass", () => {
					const res = service.filterFields(doc, ["a.2.b.$.c.$.d", "a.2.b.$.c.1.e"]);
					expect(res).toEqual({a: { 2: { b: [{c: [{d: 3}, {d: 5, e: 6}]}] } }});
				});
			});
		});
		describe("Object with key '$'", function () {
			const doc = {
				$: [
					{
						a: {
							$: {
								b: [
									{c: 1, d: 2},
									{c: 3, d: 4},
								]
							}
						}
					},
					{
						a: {
							$: {
								b: [
									{c: 5, d: 6},
									{c: 7, d: 8},
								]
							}
						}
					},
				]
			};
			it("should handleable $", () => {
				const res = service.filterFields(doc, ["$.$.a.$.b.$.c"]);
				expect(res).toEqual({
					$: [
						{a: { $: { b: [
							{ c: 1 },
							{ c: 3 },
						]}}},
						{a: { $: { b: [
							{ c: 5 },
							{ c: 7 },
						]}}}
					]
				});
			});
		});
	});
});

describe("Test excludeFields method", () => {
	const doc = {
		id : 1,
		name: "Walter",
		address: {
			city: "Albuquerque",
			state: "NM",
			zip: 87111
		}
	};

	const broker = new ServiceBroker({ logger: false, validation: false });
	const service = broker.createService(DbService, {
		name: "store",
	});

	it("should not touch the doc", () => {
		const res = service.excludeFields(doc);
		expect(res).toBe(doc);
	});

	it("should exclude fields", () => {
		const res = service.excludeFields(doc, ["address"]);
		expect(res).toEqual({
			id: 1,
			name: "Walter",
		});
	});

	it("should work with nested fields", () => {
		const res = service.excludeFields(doc, ["name", "address.city", "address.zip"]);
		expect(res).toEqual({
			id : 1,
			address: {
				state: "NM",
			}
		});
	});

});

describe("Test populateDocs method", () => {
	const RATES = ["No rate", "Poor", "Acceptable", "Average", "Good", "Excellent"];
	const docs = [{ id: 1, author: 3, rate: 4 }, { id: 2, author: 5, comments: [8, 3, 8], rate: 0 }, { id: 3, author: 8, rate: 5 }];

	const broker = new ServiceBroker({ logger: false, validation: false });
	const service = broker.createService(DbService, {
		name: "store",
		adapter: mockAdapter,
		settings: {
			populates: {
				"likes.users": "users.get",
				"comments": "comments.get",
				"author": {
					action: "users.get",
					params: {
						fields: "username fullName"
					}
				},
				"rate": jest.fn(function(ids, docs) {
					docs.forEach(doc => doc.rate = RATES[doc.rate]);
					return this.Promise.resolve();
				})
			}
		}
	});

	it("should call 'populateDocs' with rules from settings", () => {
		const ctx = { params: {} };
		ctx.call = jest.fn(() => Promise.resolve({
			"3": {
				"fullName": "Walter"
			},
			"5": {
				"fullName": "John"
			},
			"8": {
				"fullName": "Jane"
			}
		})).mockImplementationOnce(() => Promise.resolve({
			"8": { id: 8, title: "Lorem" },
			"3": { id: 3, title: "ipsum" }
		}));

		return service.populateDocs(ctx, docs, ["author", "comments", "rate"]).then(res => {
			expect(ctx.call).toHaveBeenCalledTimes(2);
			expect(ctx.call).toHaveBeenCalledWith("users.get", {
				fields: "username fullName",
				id: [3, 5, 8],
				mapping: true
			});
			expect(ctx.call).toHaveBeenCalledWith("comments.get", {
				id: [8, 3],
				mapping: true
			});

			expect(service.settings.populates.rate).toHaveBeenCalledTimes(1);
			expect(service.settings.populates.rate).toHaveBeenCalledWith([4, 5], docs, {
				field: "rate",
				handler: expect.any(Function)
			}, ctx);

			expect(res).toEqual([
				{
					"author": {
						"fullName": "Walter"
					},
					"comments": undefined,
					"id": 1,
					"rate": "Good"
				},
				{
					"author": {
						"fullName": "John"
					},
					"comments": [
						{
							"id": 8,
							"title": "Lorem"
						},
						{
							"id": 3,
							"title": "ipsum"
						},
						{
							"id": 8,
							"title": "Lorem"
						}
					],
					"id": 2,
					"rate": "No rate"
				},
				{
					"author": {
						"fullName": "Jane"
					},
					"comments": undefined,
					"id": 3,
					"rate": "Excellent"
				}
			]);

		}).catch(protectReject);
	});

	it("should call 'populateDocs' with multiple doc & only author population", () => {
		const ctx = { params: {} };
		ctx.call = jest.fn(() => Promise.resolve({
			"3": {
				"name": "Walter"
			},
			"5": {
				"name": "John"
			},
			"8": {
				"name": "Jane"
			}
		}));
		const docs = [
			{ author: 8 },
			{ author: 5 },
			{ author: 8 },
			{ author: 13 }
		];

		return service.populateDocs(ctx, docs, ["author", "voters"]).then(res => {

			expect(res).toEqual([
				{ author: { name: "Jane" } },
				{ author: { name: "John" } },
				{ author: { name: "Jane" } },
				{ author: undefined },
			]);

		}).catch(protectReject);
	});

	it("should call 'populateDocs' with single doc & only author population", () => {
		const ctx = { params: {} };
		ctx.call = jest.fn(() => Promise.resolve({
			"3": {
				"name": "Walter"
			},
			"5": {
				"name": "John"
			},
			"8": {
				"name": "Jane"
			}
		}));
		const doc = { author: 8 };

		return service.populateDocs(ctx, doc, ["author", "voters"]).then(res => {

			expect(res).toEqual({ author: { name: "Jane" } });

		}).catch(protectReject);
	});

	it("should call 'populateDocs' with single doc & only likes.users population", () => {
		const ctx = { params: {} };
		ctx.call = jest.fn(() => Promise.resolve({
			"3": {
				"name": "Walter"
			},
			"5": {
				"name": "John"
			},
			"8": {
				"name": "Jane"
			}
		}));
		const doc = { id: 4, likes: { users: [8, 3], shared: 4 } };

		return service.populateDocs(ctx, doc, ["likes.users"]).then(res => {
			expect(res).toEqual({
				id: 4,
				likes: {
					users: [{ name: "Jane" }, { name: "Walter" }],
					shared: 4,
				},
			});
		}).catch(protectReject);
	});

	it("should return docs if no populate list", () => {
		const docs = [];
		const ctx = { params: {} };

		return service.populateDocs(ctx, docs).then(res => {
			expect(res).toBe(docs);

		}).catch(protectReject);
	});

	it("should return docs if docs is not array or object", () => {
		const docs = 5;
		const ctx = { params: {} };

		return service.populateDocs(ctx, docs, ["author"]).then(res => {
			expect(res).toBe(docs);

		}).catch(protectReject);
	});

});

describe("Test validateEntity method", () => {

	describe("Test with custom validator function", () => {

		const validator = jest.fn();

		const broker = new ServiceBroker({ logger: false, validation: false });
		const service = broker.createService(DbService, {
			name: "store",
			adapter: mockAdapter,
			settings: {
				entityValidator: validator
			}
		});

		it("should call 'entityValidator'", () => {
			let entity = { param1: "value1", param2: "value2" };
			return service.validateEntity(entity).catch(protectReject).then(() => {
				expect(validator).toHaveBeenCalledTimes(1);
				expect(validator).toHaveBeenCalledWith(entity);
				expect(validator.mock.instances[0]).toBeInstanceOf(Service);
			});
		});

		it("should call 'entityValidator' multiple times", () => {
			validator.mockClear();
			let entities = [{}, { param: "value" }];
			return service.validateEntity(entities).catch(protectReject).then(() => {
				expect(validator).toHaveBeenCalledTimes(2);
				expect(validator).toHaveBeenCalledWith(entities[0]);
				expect(validator).toHaveBeenCalledWith(entities[1]);
				expect(validator.mock.instances[0]).toBeInstanceOf(Service);
				expect(validator.mock.instances[1]).toBeInstanceOf(Service);
			});
		});
	});

	describe("Test with built-in validator function", () => {

		const broker = new ServiceBroker({ logger: false, validation: {
			options: { useNewCustomCheckerFunction: true } // Enable async validations
		} });
		const service = broker.createService(DbService, {
			name: "store",
			adapter: mockAdapter,
			settings: {
				entityValidator: {
					id: "number",
					name: "string"
				}
			}
		});

		// Service with async validation
		const otherService = broker.createService(DbService, {
			name: "shop",
			adapter: mockAdapter,
			settings: {
				entityValidator: {
					$$async: true,
					id: "number",
					name: { type: "string", custom: async (value) => {
						return await new Promise(resolve => { setTimeout(() => {
							resolve(value);
						}, 10); });
					} }
				}
			}
		});

		it("should call validator with correct entity", () => {
			let entity = { id: 5, name: "John" };
			return service.validateEntity(entity).catch(protectReject).then(res => {
				expect(res).toBe(entity);
			});
		});

		it("should call validator with incorrect entity", () => {
			let entities = [{ id: 5, name: "John" }, { name: "Jane" }];
			return service.validateEntity(entities).then(protectReject).catch(err => {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(ValidationError);
				expect(err.code).toBe(422);
				expect(err.message).toBe("Entity validation error!");

				expect(err.data[0].type).toBe("required");
				expect(err.data[0].field).toBe("id");
			});
		});

		// Async validator
		it("should call async validator with correct entity", () => {
			let entity = { id: 5, name: "Mario" };
			return otherService.validateEntity(entity).catch(protectReject).then(res => {
				expect(res).toBe(entity);
			});
		});

		it("should call async validator with incorrect entity", () => {
			let entity = { name: "Luigi" };
			return otherService.validateEntity(entity).then(protectReject).catch(err => {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(ValidationError);
				expect(err.code).toBe(422);
				expect(err.message).toBe("Entity validation error!");

				expect(err.data[0].type).toBe("required");
				expect(err.data[0].field).toBe("id");
			});
		});

	});

});


describe("Test encodeID/decodeID method", () => {

	const broker = new ServiceBroker({ logger: false, validation: false });
	const service = broker.createService(DbService, {
		name: "store",
		adapter: mockAdapter,
		settings: {}
	});

	it("should return with the same ID", () => {
		expect(service.encodeID(5)).toBe(5);
	});

	it("should return with the same ID", () => {
		expect(service.decodeID(5)).toBe(5);
	});

});
