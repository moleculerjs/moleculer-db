"use strict";

const { ServiceBroker, Service, Context } = require("moleculer");
const { ValidationError } = require("moleculer").Errors;
const DbService = require("../../src");

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
		beforeSaveTransformID: jest.fn(obj => obj)
	};

	const broker = new ServiceBroker({ logger: false, validation: false });
	const service = broker.createService(DbService, {
		name: "store",
		adapter,
	});

	service.sanitizeParams = jest.fn((ctx, p) => p);
	service.transformDocuments = jest.fn((ctx, params, docs) => Promise.resolve(docs));

	service._find = jest.fn((ctx, p) => ctx);
	service._count = jest.fn((ctx, p) => ctx);
	service._list = jest.fn((ctx, p) => ctx);
	service._create = jest.fn((ctx, p) => ctx);
	service._insert = jest.fn((ctx, p) => ctx);
	service._get = jest.fn((ctx, p) => ctx);
	service._update = jest.fn((ctx, p) => ctx);
	service._remove = jest.fn((ctx, p) => ctx);

	it("should set default settings", () => {
		expect(service.adapter).toEqual(adapter);
		expect(service.settings).toEqual({
			entityValidator: null,
			fields: null,
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

	it("should call the '_find' method", () => {
		service.sanitizeParams.mockClear();
		service._find.mockClear();
		const p = {};

		return broker.call("store.find", p).catch(protectReject).then(ctx => {
			expect(service.sanitizeParams).toHaveBeenCalledTimes(1);
			expect(service.sanitizeParams).toHaveBeenCalledWith(ctx, p);

			expect(service._find).toHaveBeenCalledTimes(1);
			expect(service._find).toHaveBeenCalledWith(ctx, p);
		});
	});

	it("should call the '_find' method with params", () => {
		service._find.mockClear();
		service.sanitizeParams.mockClear();
		const p = {
			limit: 5,
			offset: "3"
		};

		return broker.call("store.find", p).catch(protectReject).then(ctx => {
			expect(service.sanitizeParams).toHaveBeenCalledTimes(1);
			expect(service.sanitizeParams).toHaveBeenCalledWith(ctx, p);

			expect(service._find).toHaveBeenCalledTimes(1);
			expect(service._find).toHaveBeenCalledWith(ctx, p);

		});
	});

	it("should call the 'list' method", () => {
		service.sanitizeParams.mockClear();
		service._list.mockClear();
		const p = {};

		return broker.call("store.list", p).catch(protectReject).then(ctx => {
			expect(service.sanitizeParams).toHaveBeenCalledTimes(1);
			expect(service.sanitizeParams).toHaveBeenCalledWith(ctx, p);

			expect(service._list).toHaveBeenCalledTimes(1);
			expect(service._list).toHaveBeenCalledWith(ctx, p);
		});
	});

	it("should call the 'count' method", () => {
		service.sanitizeParams.mockClear();
		service._count.mockClear();
		const p = {};

		return broker.call("store.count", p).catch(protectReject).then(ctx => {
			expect(service.sanitizeParams).toHaveBeenCalledTimes(1);
			expect(service.sanitizeParams).toHaveBeenCalledWith(ctx, p);

			expect(service._count).toHaveBeenCalledTimes(1);
			expect(service._count).toHaveBeenCalledWith(ctx, p);
		});
	});

	it("should call the 'count' method with pagination params", () => {
		service.sanitizeParams.mockClear();
		service._count.mockClear();
		const p = { limit: 5, offset: 10 };

		return broker.call("store.count", p).catch(protectReject).then(ctx => {
			expect(service.sanitizeParams).toHaveBeenCalledTimes(1);
			expect(service.sanitizeParams).toHaveBeenCalledWith(ctx, p);

			expect(service._count).toHaveBeenCalledTimes(1);
			expect(service._count).toHaveBeenCalledWith(ctx, p);
		});
	});

	it("should call the 'create' method", () => {
		service._create.mockClear();
		const p = { name: "John Smith", age: 45 };

		return broker.call("store.create", p).catch(protectReject).then(ctx => {
			expect(service._create).toHaveBeenCalledTimes(1);
			expect(service._create).toHaveBeenCalledWith(ctx, p);
		});
	});

	it("should call the 'insert' method", () => {
		service.sanitizeParams.mockClear();
		service._insert.mockClear();
		const p = { name: "John Smith", age: 45 };

		return broker.call("store.insert", p).catch(protectReject).then(ctx => {
			// expect(service.sanitizeParams).toHaveBeenCalledTimes(1);
			// expect(service.sanitizeParams).toHaveBeenCalledWith(ctx, p);

			expect(service._insert).toHaveBeenCalledTimes(1);
			expect(service._insert).toHaveBeenCalledWith(ctx, p);
		});
	});

	it("should call the 'get' method", () => {
		service.sanitizeParams.mockClear();
		service._get.mockClear();
		const p = { id: 5 };

		return broker.call("store.get", p).catch(protectReject).then(ctx => {
			expect(service.sanitizeParams).toHaveBeenCalledTimes(1);
			expect(service.sanitizeParams).toHaveBeenCalledWith(ctx, p);

			expect(service._get).toHaveBeenCalledTimes(1);
			expect(service._get).toHaveBeenCalledWith(ctx, p);
		});
	});

	it("should call the 'update' method", () => {
		service._update.mockClear();
		const p = { _id: 1, name: "John Smith", age: 45 };

		return broker.call("store.update", p).catch(protectReject).then(ctx => {
			expect(service._update).toHaveBeenCalledTimes(1);
			expect(service._update).toHaveBeenCalledWith(ctx, p);
		});
	});

	it("should call the 'remove' method", () => {
		service.sanitizeParams.mockClear();
		service._remove.mockClear();
		const p = { id: 1 };

		return broker.call("store.remove", p).catch(protectReject).then(ctx => {
			// expect(service.sanitizeParams).toHaveBeenCalledTimes(1);
			// expect(service.sanitizeParams).toHaveBeenCalledWith(ctx, p);

			expect(service._remove).toHaveBeenCalledTimes(1);
			expect(service._remove).toHaveBeenCalledWith(ctx, p);
		});
	});
});
