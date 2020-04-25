"use strict";

const { ServiceBroker, Service, Context } = require("moleculer");
const DbService = require("../../src");

function protectReject(err) {
	if (err && err.stack) {
		console.error(err);
		console.error(err.stack);
	}
	expect(err).toBe(true);
}

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
		entityToObject: jest.fn(obj => obj),
		beforeSaveTransformID: jest.fn(obj => obj)
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

	describe("Test `_find` method", () => {

		it("should call adapter.find & transformDocuments", () => {
			adapter.find.mockClear();
			service.transformDocuments.mockClear();

			let ctx = { id: "ctx" };
			let p = { a: 5 };

			return service._find(ctx, p).catch(protectReject).then(res => {
				expect(res).toBe(docs);

				expect(adapter.find).toHaveBeenCalledTimes(1);
				expect(adapter.find).toHaveBeenCalledWith(p);

				expect(service.transformDocuments).toHaveBeenCalledTimes(1);
				expect(service.transformDocuments).toHaveBeenCalledWith(ctx, p, docs);
			});
		});
	});

	describe("Test `_count` method", () => {

		it("should call adapter.count without params", () => {
			adapter.count.mockClear();
			service.transformDocuments.mockClear();

			let ctx = { id: "ctx" };
			let p = { a: 5, limit: 5, offset: 10 };

			return service._count(ctx, p).catch(protectReject).then(res => {
				expect(res).toBe(3);

				expect(adapter.count).toHaveBeenCalledTimes(1);
				expect(adapter.count).toHaveBeenCalledWith({ a: 5, limit: null, offset: null });

				expect(service.transformDocuments).toHaveBeenCalledTimes(0);
			});
		});
	});

	describe("Test `_list` method", () => {

		it("should call adapter.find, count & transformDocuments", () => {
			adapter.find.mockClear();
			adapter.count.mockClear();
			service.transformDocuments.mockClear();

			let ctx = { id: "ctx" };
			let p = { page: 2, pageSize: 10, limit: 5, offset: 15 };

			return service._list(ctx, p).catch(protectReject).then(res => {
				expect(res).toEqual({
					page: 2,
					pageSize: 10,
					rows: docs,
					total: 3,
					totalPages: 1
				});

				expect(adapter.find).toHaveBeenCalledTimes(1);
				expect(adapter.find).toHaveBeenCalledWith({ page: 2, pageSize: 10, limit: 5, offset: 15 });

				expect(adapter.count).toHaveBeenCalledTimes(1);
				expect(adapter.count).toHaveBeenCalledWith({ page: 2, pageSize: 10, limit: null, offset: null });

				expect(service.transformDocuments).toHaveBeenCalledTimes(1);
				expect(service.transformDocuments).toHaveBeenCalledWith(ctx, p, docs);
			});
		});
	});

	describe("Test `_create` method", () => {

		it("should call adapter.insert", () => {
			adapter.insert.mockClear();
			service.transformDocuments.mockClear();
			service.entityChanged = jest.fn(() => Promise.resolve());
			service.validateEntity = jest.fn(entity => Promise.resolve(entity));

			const p = {};

			return service._create(Context, p).catch(protectReject).then(res => {
				expect(res).toEqual(doc);

				expect(adapter.insert).toHaveBeenCalledTimes(1);
				expect(adapter.insert).toHaveBeenCalledWith(p);

				expect(service.validateEntity).toHaveBeenCalledTimes(1);
				expect(service.validateEntity).toHaveBeenCalledWith(p);

				expect(service.transformDocuments).toHaveBeenCalledTimes(1);
				expect(service.transformDocuments).toHaveBeenCalledWith(Context, p, doc);

				expect(service.entityChanged).toHaveBeenCalledTimes(1);
				expect(service.entityChanged).toHaveBeenCalledWith("created", doc, Context);
			});
		});
	});

	describe("Test `_insert` method", () => {

		it("should call adapter.insert", () => {
			adapter.insert.mockClear();
			service.transformDocuments.mockClear();
			service.entityChanged = jest.fn(() => Promise.resolve());
			service.validateEntity = jest.fn(entity => Promise.resolve(entity));

			const p = {
				entity: {}
			};

			return service._insert(Context, p).catch(protectReject).then(res => {
				expect(res).toEqual(doc);

				expect(adapter.insert).toHaveBeenCalledTimes(1);
				expect(adapter.insert).toHaveBeenCalledWith(p.entity);

				expect(service.validateEntity).toHaveBeenCalledTimes(1);
				expect(service.validateEntity).toHaveBeenCalledWith(p.entity);

				expect(service.transformDocuments).toHaveBeenCalledTimes(1);
				expect(service.transformDocuments).toHaveBeenCalledWith(Context, {}, doc);

				expect(service.entityChanged).toHaveBeenCalledTimes(1);
				expect(service.entityChanged).toHaveBeenCalledWith("created", doc, Context);
			});
		});

		it("should call adapter.insertMany", () => {
			adapter.insert.mockClear();
			service.transformDocuments.mockClear();
			service.entityChanged = jest.fn(() => Promise.resolve());
			service.validateEntity = jest.fn(entity => Promise.resolve(entity));

			const p = {
				entities: []
			};

			return service._insert(Context, p).catch(protectReject).then(res => {
				expect(res).toEqual(docs);

				expect(adapter.insertMany).toHaveBeenCalledTimes(1);
				expect(adapter.insertMany).toHaveBeenCalledWith(p.entities);

				expect(service.validateEntity).toHaveBeenCalledTimes(1);
				expect(service.validateEntity).toHaveBeenCalledWith(p.entities);

				expect(service.transformDocuments).toHaveBeenCalledTimes(1);
				expect(service.transformDocuments).toHaveBeenCalledWith(Context, {}, docs);

				expect(service.entityChanged).toHaveBeenCalledTimes(1);
				expect(service.entityChanged).toHaveBeenCalledWith("created", docs, Context);
			});
		});
	});

	describe("Test `_update` method", () => {

		it("should call adapter.updateById", () => {
			adapter.updateById.mockClear();
			service.transformDocuments.mockClear();
			service.entityChanged = jest.fn(() => Promise.resolve());
			service.decodeID = jest.fn(id => id);

			const p = {
				_id: 123,
				name: "John",
				age: 45
			};

			return service._update(Context, p).catch(protectReject).then(res => {
				expect(res).toEqual(doc);

				expect(service.decodeID).toHaveBeenCalledTimes(1);
				expect(service.decodeID).toHaveBeenCalledWith(123);

				expect(adapter.updateById).toHaveBeenCalledTimes(1);
				expect(adapter.updateById).toHaveBeenCalledWith(123, { "$set": { name: "John", age: 45 }});

				expect(service.transformDocuments).toHaveBeenCalledTimes(1);
				expect(service.transformDocuments).toHaveBeenCalledWith(Context, {}, doc);

				expect(service.entityChanged).toHaveBeenCalledTimes(1);
				expect(service.entityChanged).toHaveBeenCalledWith("updated", doc, Context);
			});
		});

		it("should use dot notation if specified", () => {
			adapter.updateById.mockClear();
			service.transformDocuments.mockClear();
			service.entityChanged = jest.fn(() => Promise.resolve());
			service.decodeID = jest.fn(id => id);

			service.settings.useDotNotation = true;

			const p = {
				_id: 123,
				colors: [{ name:"red" }, { name:"blue" }],
				name: { first: "John", last: "Doe" }
			};

			return service._update(Context, p).catch(protectReject).then(res => {
				expect(res).toEqual(doc);

				expect(adapter.updateById).toHaveBeenCalledTimes(1);
				expect(adapter.updateById).toHaveBeenCalledWith(123, {
					"$set": {
						"colors": [{ name:"red" }, { name:"blue" }],
						"name.first": "John",
						"name.last": "Doe",
					},
				});
			});
		})
	});

	describe("Test `_remove` method", () => {

		it("should call adapter.remove", () => {
			adapter.removeById.mockClear();
			service.transformDocuments.mockClear();
			service.entityChanged = jest.fn(() => Promise.resolve());
			service.decodeID = jest.fn(id => id);

			const p = { id: 3 };

			return service._remove(Context, p).catch(protectReject).then(res => {
				expect(res).toEqual(3);

				expect(service.decodeID).toHaveBeenCalledTimes(1);
				expect(service.decodeID).toHaveBeenCalledWith(3);

				expect(adapter.removeById).toHaveBeenCalledTimes(1);
				expect(adapter.removeById).toHaveBeenCalledWith(3);

				expect(service.transformDocuments).toHaveBeenCalledTimes(1);
				expect(service.transformDocuments).toHaveBeenCalledWith(Context, {}, 3);

				expect(service.entityChanged).toHaveBeenCalledTimes(1);
				expect(service.entityChanged).toHaveBeenCalledWith("removed", 3, Context);
			});
		});
	});
});
