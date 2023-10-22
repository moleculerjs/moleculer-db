"use strict";

const { ServiceBroker, Context } = require("moleculer");
const DbService = require("../../src");
const _ = require("lodash");

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
		afterConnected,
		settings: {
			fields: [
				"id",
				"foo"
			]
		}
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
			const p = {};
			service.beforeEntityChange = jest.fn(() => Promise.resolve(p));
			service.entityChanged = jest.fn(() => Promise.resolve());
			service.validateEntity = jest.fn(entity => Promise.resolve(entity));


			return service._create(Context, p).catch(protectReject).then(res => {
				expect(res).toEqual(doc);

				expect(adapter.insert).toHaveBeenCalledTimes(1);
				expect(adapter.insert).toHaveBeenCalledWith(p);

				expect(service.validateEntity).toHaveBeenCalledTimes(1);
				expect(service.validateEntity).toHaveBeenCalledWith(p);

				expect(service.transformDocuments).toHaveBeenCalledTimes(1);
				expect(service.transformDocuments).toHaveBeenCalledWith(Context, p, doc);

				expect(service.beforeEntityChange).toHaveBeenCalledTimes(1);
				expect(service.beforeEntityChange).toHaveBeenCalledWith("create", p, Context);

				expect(service.entityChanged).toHaveBeenCalledTimes(1);
				expect(service.entityChanged).toHaveBeenCalledWith("created", doc, Context, doc);
			});
		});
	});

	describe("Test `_insert` method", () => {

		it("should call adapter.insert", () => {
			adapter.insert.mockClear();
			service.transformDocuments.mockClear();

			const p = {
				entity: {id: 1}
			};

			service.beforeEntityChange = jest.fn(() => Promise.resolve(p.entity));
			service.entityChanged = jest.fn(() => Promise.resolve());
			service.validateEntity = jest.fn(entity => Promise.resolve(entity));


			return service._insert(Context, p).catch(protectReject).then(res => {
				expect(res).toEqual(doc);

				expect(adapter.insert).toHaveBeenCalledTimes(1);
				expect(adapter.insert).toHaveBeenCalledWith(p.entity);

				expect(service.validateEntity).toHaveBeenCalledTimes(1);
				expect(service.validateEntity).toHaveBeenCalledWith(p.entity);

				expect(service.transformDocuments).toHaveBeenCalledTimes(1);
				expect(service.transformDocuments).toHaveBeenCalledWith(Context, {}, doc);

				expect(service.beforeEntityChange).toHaveBeenCalledTimes(1);
				expect(service.beforeEntityChange).toHaveBeenCalledWith("create", { id: 1}, Context);

				expect(service.entityChanged).toHaveBeenCalledTimes(1);
				expect(service.entityChanged).toHaveBeenCalledWith("created", doc, Context, doc);
			});
		});

		it("should call adapter.insertMany", () => {
			adapter.insertMany.mockClear();
			service.transformDocuments.mockClear();
			const p = {
				entities: []
			};
			service.beforeEntityChange = jest.fn();
			service.entityChanged = jest.fn(() => Promise.resolve());
			service.validateEntity = jest.fn(entity => Promise.resolve(entity));


			return service._insert(Context, p).catch(protectReject).then(res => {
				expect(res).toEqual(docs);

				expect(adapter.insertMany).toHaveBeenCalledTimes(1);
				expect(adapter.insertMany).toHaveBeenCalledWith(p.entities);

				expect(service.validateEntity).toHaveBeenCalledTimes(1);
				expect(service.validateEntity).toHaveBeenCalledWith(p.entities);

				expect(service.transformDocuments).toHaveBeenCalledTimes(1);
				expect(service.transformDocuments).toHaveBeenCalledWith(Context, {}, docs);

				expect(service.beforeEntityChange).toHaveBeenCalledTimes(0); //since entities array is empty

				expect(service.entityChanged).toHaveBeenCalledTimes(1);
				expect(service.entityChanged).toHaveBeenCalledWith("created", docs, Context, docs);
			});
		});

		it("should call adapter.insertMany with many entities", () => {
			adapter.insertMany.mockClear();
			service.transformDocuments.mockClear();
			const p = {
				entities: [{ id: 1}, { id: 2}, { id: 3}]
			};
			service.beforeEntityChange = jest.fn((type, entity) => Promise.resolve(entity));
			service.entityChanged = jest.fn(() => Promise.resolve());
			service.validateEntity = jest.fn(entity => Promise.resolve(entity));


			return service._insert(Context, p).catch(protectReject).then(res => {
				expect(res).toEqual(docs);

				expect(service.beforeEntityChange).toHaveBeenCalledTimes(3);

				expect(service.validateEntity).toHaveBeenCalledTimes(1);
				expect(service.validateEntity).toHaveBeenCalledWith(p.entities);

				expect(adapter.insertMany).toHaveBeenCalledTimes(1);
				expect(adapter.insertMany).toHaveBeenCalledWith(p.entities);

				expect(service.transformDocuments).toHaveBeenCalledTimes(1);
				expect(service.transformDocuments).toHaveBeenCalledWith(Context, {}, docs);

				expect(service.entityChanged).toHaveBeenCalledTimes(1);
				expect(service.entityChanged).toHaveBeenCalledWith("created", docs, Context, docs);
			});
		});
	});

	describe("Test `_update` method", () => {

		it("should call adapter.updateById", () => {
			adapter.updateById.mockClear();
			service.transformDocuments.mockClear();
			const p = {
				_id: 123,
				name: "John",
				age: 45
			};
			service.beforeEntityChange = jest.fn(() => Promise.resolve(p));
			service.entityChanged = jest.fn(() => Promise.resolve());
			service.decodeID = jest.fn(id => id);


			return service._update(Context, p).catch(protectReject).then(res => {
				expect(res).toEqual(doc);

				expect(service.decodeID).toHaveBeenCalledTimes(1);
				expect(service.decodeID).toHaveBeenCalledWith(123);

				expect(adapter.updateById).toHaveBeenCalledTimes(1);
				expect(adapter.updateById).toHaveBeenCalledWith(123, { "$set": { name: "John", age: 45 }});

				expect(service.transformDocuments).toHaveBeenCalledTimes(1);
				expect(service.transformDocuments).toHaveBeenCalledWith(Context, {}, doc);

				expect(service.beforeEntityChange).toHaveBeenCalledTimes(1);
				expect(service.beforeEntityChange).toHaveBeenCalledWith("update", p, Context);

				expect(service.entityChanged).toHaveBeenCalledTimes(1);
				expect(service.entityChanged).toHaveBeenCalledWith("updated", doc, Context, doc);
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

			service.beforeEntityChange = jest.fn(() => Promise.resolve(p));

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
		});
	});

	describe("Test `_remove` method", () => {

		it("should call adapter.remove", () => {
			adapter.removeById.mockClear();
			service.transformDocuments.mockClear();
			const p = { id: 3 };
			service.beforeEntityChange = jest.fn(() => Promise.resolve(p));
			service.entityChanged = jest.fn(() => Promise.resolve());
			service.decodeID = jest.fn(id => id);


			return service._remove(Context, p).catch(protectReject).then(res => {
				expect(res).toEqual(3);

				expect(service.decodeID).toHaveBeenCalledTimes(1);
				expect(service.decodeID).toHaveBeenCalledWith(3);

				expect(adapter.removeById).toHaveBeenCalledTimes(1);
				expect(adapter.removeById).toHaveBeenCalledWith(3);

				expect(service.transformDocuments).toHaveBeenCalledTimes(1);
				expect(service.transformDocuments).toHaveBeenCalledWith(Context, {}, 3);

				expect(service.beforeEntityChange).toHaveBeenCalledTimes(1);
				expect(service.beforeEntityChange).toHaveBeenCalledWith("remove", p, Context);

				expect(service.entityChanged).toHaveBeenCalledTimes(1);
				expect(service.entityChanged).toHaveBeenCalledWith("removed", 3, Context, 3);
			});
		});
	});
});

describe("Test 'entityChanged' method", () => {
	const fields = ["id"];
	const doc = { id : 1 };
	const docRaw = { id : 1, foo: "bar" };
	const p = {
		foo: "bar"
	};
	const docs = [doc];
	const docsRaw = [docRaw];

	const adapter = {
		init: jest.fn(() => Promise.resolve()),
		insert: jest.fn((params) => Promise.resolve({ ...params,...doc })),
		insertMany: jest.fn((docs) => Promise.resolve(docs.map((doc, i) => ({...doc, id: i + 1})))),
		updateMany: jest.fn((docs) => Promise.resolve(docs.map((doc, i) => ({...doc, id: i + 1})))),
		updateById: jest.fn((id, { $set: params }) => Promise.resolve({ ...params,...doc, id })),
		removeMany: jest.fn(() => Promise.resolve(5)),
		removeById: jest.fn((id) => Promise.resolve({ ...docRaw, id })),
		beforeSaveTransformID: jest.fn(obj => obj)
	};

	const afterConnected = jest.fn();

	const broker = new ServiceBroker({ logger: false, validation: false, cacher: true });
	const service = broker.createService(DbService, {
		name: "store",
		version: 1,
		adapter,
		afterConnected,
		settings: {
			fields
		}
	});

	service.transformDocuments = jest.fn((ctx, params, docs) => Promise.resolve(typeof docs !== "object"
		? docs
		: Array.isArray(docs)
			? docs.map(doc => _.pick(doc, fields))
			: _.pick(docs, fields)));

	describe("should call entityChanged with docRaw", () => {

		describe("Test `_create` method", () => {

			it("should call adapter.insert", () => {
				adapter.insert.mockClear();
				service.transformDocuments.mockClear();
				service.entityChanged = jest.fn(() => Promise.resolve());
				service.validateEntity = jest.fn(entity => Promise.resolve(entity));

				return service._create(Context, p).catch(protectReject).then(res => {
					expect(res).toEqual(doc);

					expect(adapter.insert).toHaveBeenCalledTimes(1);
					expect(adapter.insert).toHaveBeenCalledWith(p);

					expect(service.validateEntity).toHaveBeenCalledTimes(1);
					expect(service.validateEntity).toHaveBeenCalledWith(p);

					expect(service.transformDocuments).toHaveBeenCalledTimes(1);
					expect(service.transformDocuments).toHaveBeenCalledWith(Context, {}, docRaw);

					expect(service.entityChanged).toHaveBeenCalledTimes(1);
					expect(service.entityChanged).toHaveBeenCalledWith("created", doc, Context, docRaw);
				});
			});
		});

		describe("Test `_insert` method", () => {

			it("should call adapter.insert", () => {
				adapter.insert.mockClear();
				service.transformDocuments.mockClear();
				service.entityChanged = jest.fn(() => Promise.resolve());
				service.validateEntity = jest.fn(entity => Promise.resolve(entity));

				const params = {
					entity: p
				};

				return service._insert(Context, params).catch(protectReject).then(res => {
					expect(res).toEqual(doc);

					expect(adapter.insert).toHaveBeenCalledTimes(1);
					expect(adapter.insert).toHaveBeenCalledWith(params.entity);

					expect(service.validateEntity).toHaveBeenCalledTimes(1);
					expect(service.validateEntity).toHaveBeenCalledWith(params.entity);

					expect(service.transformDocuments).toHaveBeenCalledTimes(1);
					expect(service.transformDocuments).toHaveBeenCalledWith(Context, {}, docRaw);

					expect(service.entityChanged).toHaveBeenCalledTimes(1);
					expect(service.entityChanged).toHaveBeenCalledWith("created", doc, Context, docRaw);
				});
			});

			it("should call adapter.insertMany", () => {
				adapter.insert.mockClear();
				service.transformDocuments.mockClear();
				service.entityChanged = jest.fn(() => Promise.resolve());
				service.validateEntity = jest.fn(entity => Promise.resolve(entity));

				const params = {
					entities: [p]
				};

				return service._insert(Context, params).catch(protectReject).then(res => {
					expect(res).toEqual(docs);

					expect(adapter.insertMany).toHaveBeenCalledTimes(1);
					expect(adapter.insertMany).toHaveBeenCalledWith(params.entities);

					expect(service.validateEntity).toHaveBeenCalledTimes(1);
					expect(service.validateEntity).toHaveBeenCalledWith(params.entities);

					expect(service.transformDocuments).toHaveBeenCalledTimes(1);
					expect(service.transformDocuments).toHaveBeenCalledWith(Context, {}, docsRaw);

					expect(service.entityChanged).toHaveBeenCalledTimes(1);
					expect(service.entityChanged).toHaveBeenCalledWith("created", docs, Context, docsRaw);
				});
			});
		});

		describe("Test `_update` method", () => {

			it("should call adapter.updateById", () => {
				adapter.updateById.mockClear();
				service.transformDocuments.mockClear();
				service.entityChanged = jest.fn(() => Promise.resolve());
				service.decodeID = jest.fn(id => id);

				const id = 123;
				const p = {
					_id: id,
					foo: "John",
					age: 45
				};

				return service._update(Context, p).catch(protectReject).then(res => {
					expect(res).toEqual({ id });

					expect(service.decodeID).toHaveBeenCalledTimes(1);
					expect(service.decodeID).toHaveBeenCalledWith(id);

					expect(adapter.updateById).toHaveBeenCalledTimes(1);
					expect(adapter.updateById).toHaveBeenCalledWith(id, { "$set": {
						foo: "John",
						age: 45
					}});

					expect(service.transformDocuments).toHaveBeenCalledTimes(1);
					expect(service.transformDocuments).toHaveBeenCalledWith(Context, {}, {
						id: 123,
						foo: "John",
						age: 45
					});

					expect(service.entityChanged).toHaveBeenCalledTimes(1);
					expect(service.entityChanged).toHaveBeenCalledWith("updated", { id }, Context, {
						id: 123,
						foo: "John",
						age: 45
					});
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
					expect(res).toEqual({ id: 123 });

					expect(adapter.updateById).toHaveBeenCalledTimes(1);
					expect(adapter.updateById).toHaveBeenCalledWith(123, {
						"$set": {
							"colors": [{ name:"red" }, { name:"blue" }],
							"name.first": "John",
							"name.last": "Doe",
						},
					});
				});
			});
		});

		describe("Test `_remove` method", () => {

			it("should call adapter.remove", () => {
				adapter.removeById.mockClear();
				service.transformDocuments.mockClear();
				service.entityChanged = jest.fn(() => Promise.resolve());
				service.decodeID = jest.fn(id => id);

				const p = { id: 3 };

				return service._remove(Context, p).catch(protectReject).then(res => {
					expect(res).toEqual(p);

					expect(service.decodeID).toHaveBeenCalledTimes(1);
					expect(service.decodeID).toHaveBeenCalledWith(3);

					expect(adapter.removeById).toHaveBeenCalledTimes(1);
					expect(adapter.removeById).toHaveBeenCalledWith(3);

					expect(service.transformDocuments).toHaveBeenCalledTimes(1);
					expect(service.transformDocuments).toHaveBeenCalledWith(Context, {}, {
						id: 3,
						foo: "bar"
					});

					expect(service.entityChanged).toHaveBeenCalledTimes(1);
					expect(service.entityChanged).toHaveBeenCalledWith("removed", p, Context, {
						id: 3,
						foo: "bar"
					});
				});
			});
		});

	});
});
