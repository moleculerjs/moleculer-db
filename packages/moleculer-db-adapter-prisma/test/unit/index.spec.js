"use strict";

function protectReject(err) {
	if (err && err.stack) {
		console.error(err);
		console.error(err.stack);
	}
	expect(err).toBe(true);
}

if (process.versions.node.split(".")[0] < 14) {
	console.log("Skipping Prisma tests because node version is too low");
	it("Skipping Prisma tests because node version is too low", () => {});
} else {

	const { ServiceBroker } = require("moleculer");
	const PrismaAdapter = require("../../src");

	const fakeModel = {
		id: "FAKE_ID",
		title: "value",
		votes: 3,
		status: true,
	};

	const dbMock = {
		$connect: jest.fn(() => Promise.resolve()),
		$disconnect: jest.fn(() => Promise.resolve()),
		$queryRawUnsafe: jest.fn(() => Promise.resolve()),

		post: {
			findFirst: jest.fn(() => Promise.resolve(fakeModel)),
			findUnique: jest.fn(() => Promise.resolve(fakeModel)),
			findMany: jest.fn(() => Promise.resolve([fakeModel])),

			count: jest.fn(() => Promise.resolve(1)),

			create: jest.fn(() => Promise.resolve(fakeModel)),
			createMany: jest.fn(() => Promise.resolve({ count: 1 })),

			update: jest.fn(() => Promise.resolve(fakeModel)),
			updateMany: jest.fn(() => Promise.resolve({ count: 1 })),

			deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
		},
	};

	describe("Test PrismaAdapter", () => {
		describe("model definition as description", () => {
			const adapter = new PrismaAdapter();
			adapter.db = dbMock;

			const broker = new ServiceBroker({ logger: false });
			const service = broker.createService({
				name: "service",
				model: "post",
			});

			beforeEach(async () => {
				adapter.init(broker, service);
				await adapter.connect();
			});

			it("should be created", () => {
				expect(adapter).toBeDefined();
				expect(adapter.opts).toEqual({});
				expect(adapter.db).toBe(dbMock);
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


			it("call connect", () => {
				expect(adapter.model).toBe(dbMock.post);
			});

			it("call disconnect", () => {
				return adapter.disconnect().catch(protectReject).then(() => {
					expect(adapter.db.$disconnect).toHaveBeenCalledTimes(1);
				});
			});


			describe("Test createCursor", () => {
				it("call without params", () => {
					adapter.model.findMany.mockClear();
					adapter.createCursor();
					expect(adapter.model.findMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.findMany).toHaveBeenCalledWith();
				});

				it("call without params as counting", () => {
					adapter.model.findMany.mockClear();
					adapter.createCursor(null, true);
					expect(adapter.model.count).toHaveBeenCalledTimes(1);
					expect(adapter.model.count).toHaveBeenCalledWith();
				});

				it("call with query", () => {
					adapter.model.findMany.mockClear();

					const query = {};
					adapter.createCursor({ query });
					expect(adapter.model.findMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.findMany).toHaveBeenCalledWith({ where: query });
				});

				it("call with query & counting", () => {
					adapter.model.count.mockClear();

					const query = {};
					adapter.createCursor({ query }, true);
					expect(adapter.model.count).toHaveBeenCalledTimes(1);
					expect(adapter.model.count).toHaveBeenCalledWith({ where: query });
				});

				it("call with sort string", () => {
					adapter.model.findMany.mockClear();

					const query = {};
					adapter.createCursor({ query, sort: "-votes title" });
					expect(adapter.model.findMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.findMany).toHaveBeenCalledWith({
						where: query,
						orderBy: [{ votes: "desc" }, { title: "asc" }],
					});
				});

				it("call with sort array", () => {
					adapter.model.findMany.mockClear();

					const query = {};
					adapter.createCursor({ query, sort: ["createdAt", "title"] });
					expect(adapter.model.findMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.findMany).toHaveBeenCalledWith({
						where: query,
						orderBy: [{ createdAt: "asc" }, { title: "asc" }],
					});
				});

				it("call with sort object", () => {
					adapter.model.findMany.mockClear();

					const query = {};
					adapter.createCursor({ query, sort: { createdAt: 1, title: -1 } });
					expect(adapter.model.findMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.findMany).toHaveBeenCalledWith({
						where: query,
						orderBy: [
							["createdAt", "asc"],
							["title", "desc"],
						],
					});
				});

				it("call with limit & offset", () => {
					adapter.model.findMany.mockClear();
					adapter.createCursor({ limit: 5, offset: 10 });
					expect(adapter.model.findMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.findMany).toHaveBeenCalledWith({
						skip: 10,
						take: 5,
						where: {}
					});
				});

				it("call with full-text search without query", () => {
					adapter.model.findMany.mockClear();
					adapter.createCursor({
						search: "walter",
						searchFields: ["title", "content"]
					});
					expect(adapter.model.findMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.findMany).toHaveBeenCalledWith({
						where: {
							OR: [
								{ title: { contains: "walter" } },
								{ content: { contains: "walter" } },
							],
						},
					});
				});

				it("call with full-text search with query", () => {
					adapter.model.findMany.mockClear();
					adapter.createCursor({
						query: { status: 1 },
						search: "walter",
						searchFields: ["title", "content"]
					});
					expect(adapter.model.findMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.findMany).toHaveBeenCalledWith({
						where: {
							OR: [
								{ title: { contains: "walter" } },
								{ content: { contains: "walter" } },
							],
							status: 1,
						},
					});
				});
			});


			it("call find", () => {
				adapter.createCursor = jest.fn(() => Promise.resolve());

				const params = {};
				return adapter.find(params).catch(protectReject).then(() => {
					expect(adapter.createCursor).toHaveBeenCalledTimes(1);
					expect(adapter.createCursor).toHaveBeenCalledWith({});
				});
			});

			it("call findOne", () => {
				adapter.model.findFirst.mockClear();
				const params = { age: 25 };

				return adapter.findOne(params).catch(protectReject).then(() => {
					expect(adapter.model.findFirst).toHaveBeenCalledTimes(1);
					expect(adapter.model.findFirst).toHaveBeenCalledWith({ where: params });
				});
			});

			it("call findById", () => {
				adapter.model.findUnique.mockClear();

				return adapter.findById(5).catch(protectReject).then(() => {
					expect(adapter.model.findUnique).toHaveBeenCalledTimes(1);
					expect(adapter.model.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
				});
			});

			it("call findByIds", () => {
				adapter.model.findMany.mockClear();

				return adapter.findByIds([5]).catch(protectReject).then(() => {
					expect(adapter.model.findMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.findMany).toHaveBeenCalledWith({ where: { id: { in: [5] } } });
				});
			});

			it("call count", () => {
				adapter.createCursor = jest.fn(() => Promise.resolve());

				const params = {};
				return adapter.count(params).catch(protectReject).then(() => {
					expect(adapter.createCursor).toHaveBeenCalledTimes(1);
					expect(adapter.createCursor).toHaveBeenCalledWith(params, true);
				});
			});

			it("call insert", () => {
				const entity = {};
				return adapter.insert(entity).catch(protectReject).then(() => {
					expect(adapter.model.create).toHaveBeenCalledTimes(1);
					expect(adapter.model.create).toHaveBeenCalledWith({ data: entity });
				});
			});

			it("call inserts", () => {
				adapter.model.create.mockClear();
				const entities = [{ name: "John" }, { name: "Jane" }];

				return adapter.insertMany(entities).catch(protectReject).then(() => {
					expect(adapter.model.createMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.createMany).toHaveBeenCalledWith({ data: entities });
				});
			});

			it("call updateMany", () => {
				adapter.model.updateMany.mockClear();

				const where = {};
				const update = {
					$set: { title: "Test" }
				};

				return adapter.updateMany(where, update).catch(protectReject).then(res => {
					expect(res).toBe(1);
					expect(adapter.model.updateMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.updateMany).toHaveBeenCalledWith({ where, data: update.$set });
				});
			});

			it("call updateById", () => {
				adapter.model.update.mockClear();

				const update = {
					$set: { title: "Test" }
				};

				return adapter.updateById(5, update).catch(protectReject).then(() => {
					expect(adapter.model.update).toHaveBeenCalledTimes(1);
					expect(adapter.model.update).toHaveBeenCalledWith({ where: { id: 5 } , data: update.$set });
				});
			});

			it("call removeMany", () => {
				adapter.model.deleteMany.mockClear();

				const where = {};

				return adapter.removeMany(where).catch(protectReject).then(() => {
					expect(adapter.model.deleteMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.deleteMany).toHaveBeenCalledWith({ where });
				});
			});

			it("call removeById", () => {
				adapter.model.deleteMany.mockClear();

				return adapter.removeById(5).catch(protectReject).then(() => {
					expect(adapter.model.deleteMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.deleteMany).toHaveBeenCalledWith({ where: { id: 5 } });
				});
			});

			it("call clear", () => {
				adapter.model.deleteMany.mockClear();

				return adapter.clear().catch(protectReject).then(() => {
					expect(adapter.model.deleteMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.deleteMany).toHaveBeenCalledWith({ where: {} });
				});
			});

			it("call entityToObject", () => {
				const object = adapter.entityToObject(fakeModel);
				expect(object).toBe(fakeModel);
			});

			it("call beforeSaveTransformID", () => {
				const object = adapter.beforeSaveTransformID(fakeModel);
				expect(object).toBe(fakeModel);
			});

			it("call afterRetrieveTransformID", () => {
				const object = adapter.afterRetrieveTransformID(fakeModel);
				expect(object).toBe(fakeModel);
			});
		});
	});
}
