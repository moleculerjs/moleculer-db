"use strict";

const { ServiceBroker } = require("moleculer");

jest.mock("sequelize");

const model = {
	sync: jest.fn(() => Promise.resolve()),
	findAll: jest.fn(() => Promise.resolve()),
	count: jest.fn(() => Promise.resolve()),
	findOne: jest.fn(() => Promise.resolve()),
	findByPk: jest.fn(() => Promise.resolve()),
	create: jest.fn(() => Promise.resolve()),
	bulkCreate: jest.fn(() => Promise.resolve()),
	update: jest.fn(() => Promise.resolve([1, 2])),
	destroy: jest.fn(() => Promise.resolve()),
};

const db = {
	authenticate: jest.fn(() => Promise.resolve()),
	define: jest.fn(() => model),
	close: jest.fn(() => Promise.resolve()),
};

let Sequelize = require("sequelize");
const Op = Sequelize.Op;

Sequelize.mockImplementation(() => db);

const SequelizeAdapter = require("../../src");

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
const initiatedModel = {
	attributes: {}
};


let fakeConn = Promise.resolve();
fakeConn.connection = {
	on: jest.fn(),
	close: jest.fn()
};

describe("Test SequelizeAdapter", () => {

	beforeEach(() => {
		Sequelize.mockClear();
		db.authenticate.mockClear();
		db.define.mockClear();
		model.sync.mockClear();
	});

	describe("model definition as description", () => {
		const opts = {
			dialect: "sqlite"
		};
		const adapter = new SequelizeAdapter(opts);

		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService({
			name: "store",
			model: fakeModel
		});

		beforeEach(() => {
			adapter.init(broker, service);
		});

		it("should be created", () => {
			expect(adapter).toBeDefined();
			expect(adapter.opts).toEqual([opts]);
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
			return adapter.connect().catch(protectReject).then(() => {
				expect(Sequelize).toHaveBeenCalledTimes(1);
				expect(Sequelize).toHaveBeenCalledWith(opts);

				expect(adapter.db).toBe(db);
				expect(adapter.db.authenticate).toHaveBeenCalledTimes(1);
				expect(adapter.db.define).toHaveBeenCalledTimes(1);
				expect(adapter.db.define).toHaveBeenCalledWith(fakeModel.name, fakeModel.define, fakeModel.options);

				expect(adapter.model).toBe(model);
				expect(adapter.service.model).toBe(model);

				expect(adapter.model.sync).toHaveBeenCalledTimes(1);

			});
		});

		it("should disconnect after connection error", () => {
			let hasThrown = true;
			model.sync.mockImplementationOnce(() => Promise.reject());
			return adapter.connect()
				.then(() => {
					hasThrown = false;
				})
				.catch(() => {
					expect(hasThrown).toBe(true);
					expect(adapter.db.close).toBeCalledTimes(1);
				});
		});

		it("call disconnect", () => {
			adapter.db.close.mockClear();

			return adapter.disconnect().catch(protectReject).then(() => {
				expect(adapter.db.close).toHaveBeenCalledTimes(1);
			});
		});


		describe("Test createCursor", () => {

			it("call without params", () => {
				adapter.model.findAll.mockClear();
				adapter.createCursor();
				expect(adapter.model.findAll).toHaveBeenCalledTimes(1);
				expect(adapter.model.findAll).toHaveBeenCalledWith();
			});

			it("call without params as counting", () => {
				adapter.model.findAll.mockClear();
				adapter.createCursor(null, true);
				expect(adapter.model.count).toHaveBeenCalledTimes(1);
				expect(adapter.model.count).toHaveBeenCalledWith();
			});

			it("call with query", () => {
				adapter.model.findAll.mockClear();
				let query = {};
				adapter.createCursor({ query });
				expect(adapter.model.findAll).toHaveBeenCalledTimes(1);
				expect(adapter.model.findAll).toHaveBeenCalledWith({ where: query });
			});

			it("call with query & counting", () => {
				adapter.model.count.mockClear();
				let query = {};
				adapter.createCursor({ query }, true);
				expect(adapter.model.count).toHaveBeenCalledTimes(1);
				expect(adapter.model.count).toHaveBeenCalledWith({ where: query });
			});

			it("call with sort string", () => {
				adapter.model.findAll.mockClear();
				let query = {};
				adapter.createCursor({ query, sort: "-votes title" });
				expect(adapter.model.findAll).toHaveBeenCalledTimes(1);
				expect(adapter.model.findAll).toHaveBeenCalledWith({
					where: query,
					order: [["votes", "DESC"], ["title", "ASC"]]
				});
			});

			it("call with sort array", () => {
				adapter.model.findAll.mockClear();
				let query = {};
				adapter.createCursor({ query, sort: ["createdAt", "title"] });
				expect(adapter.model.findAll).toHaveBeenCalledTimes(1);
				expect(adapter.model.findAll).toHaveBeenCalledWith({
					where: query,
					order: [["createdAt", "ASC"], ["title", "ASC"]]
				});
			});

			it("call with sort object", () => {
				adapter.model.findAll.mockClear();
				let query = {};
				adapter.createCursor({ query, sort: { createdAt: 1, title: -1 } });
				expect(adapter.model.findAll).toHaveBeenCalledTimes(1);
				expect(adapter.model.findAll).toHaveBeenCalledWith({
					where: query,
					order: [["createdAt", "ASC"], ["title", "DESC"]]
				});
			});

			it("call with limit & offset", () => {
				adapter.model.findAll.mockClear();
				adapter.createCursor({ limit: 5, offset: 10 });
				expect(adapter.model.findAll).toHaveBeenCalledTimes(1);
				expect(adapter.model.findAll).toHaveBeenCalledWith({
					offset: 10,
					limit: 5,
					where: {}
				});
			});

			it("call with full-text search without query", () => {
				adapter.model.findAll.mockClear();
				adapter.createCursor({
					search: "WaLtEr",
					searchFields: ["title", "content"]
				});
				expect(adapter.model.findAll).toHaveBeenCalledTimes(1);
				expect(adapter.model.findAll).toHaveBeenCalledWith({
					where: {
						[Op.or]: [
							{ "title": { [Op.like]: "%WaLtEr%" } },
							{ "content": { [Op.like]: "%WaLtEr%" } }
						]
					}
				});
			});

			it("call with full-text search (insensitive case) without query", () => {
				adapter.model.findAll.mockClear();
				adapter.createCursor({
					iSearch: "WaLtEr",
					searchFields: ["title", "content"]
				});
				expect(adapter.model.findAll).toHaveBeenCalledTimes(1);
				expect(adapter.model.findAll).toHaveBeenCalledWith({
					where: {
						[Op.or]: [
							Sequelize.where(
								Sequelize.fn("lower", Sequelize.col("title")),
								Op.like,
								"%walter%"
							),
							Sequelize.where(
								Sequelize.fn("lower", Sequelize.col("content")),
								Op.like,
								"%walter%"
							)
						]
					}
				});
			});

			it("call with full-text search and full-text insensitive case search without query", () => {
				adapter.model.findAll.mockClear();
				adapter.createCursor({
					search: "WaLtEr",
					iSearch: "WaLtEr",
					searchFields: ["title", "content"]
				});
				expect(adapter.model.findAll).toHaveBeenCalledTimes(1);
				expect(adapter.model.findAll).toHaveBeenCalledWith({
					where: {
						[Op.or]: [
							{ "title": { [Op.like]: "%WaLtEr%" } },
							{ "content": { [Op.like]: "%WaLtEr%" } }
						]
					}
				});
			});

			it("call with full-text search with query", () => {
				adapter.model.findAll.mockClear();
				adapter.createCursor({
					query: { status: 1 },
					search: "wAlTeR",
					searchFields: ["title", "content"]
				});
				expect(adapter.model.findAll).toHaveBeenCalledTimes(1);
				expect(adapter.model.findAll).toHaveBeenCalledWith({
					where: {
						[Op.and]: [
							{ status: 1 },
							{ [Op.or]: [
								{ "title": { [Op.like]: "%wAlTeR%" } },
								{ "content": { [Op.like]: "%wAlTeR%" } }
							] }
						]
					}
				});
			});

			it("call with full-text search (insensitive case) with query", () => {
				adapter.model.findAll.mockClear();
				adapter.createCursor({
					query: { status: 1 },
					iSearch: "wAlTeR",
					searchFields: ["title", "content"]
				});
				expect(adapter.model.findAll).toHaveBeenCalledTimes(1);
				expect(adapter.model.findAll).toHaveBeenCalledWith({
					where: {
						[Op.and]: [
							{ status: 1 },
							{ [Op.or]: [
								Sequelize.where(
									Sequelize.fn("lower", Sequelize.col("title")),
									Op.like,
									"%walter%"
								),
								Sequelize.where(
									Sequelize.fn("lower", Sequelize.col("content")),
									Op.like,
									"%walter%"
								)
							] }
						]
					}
				});
			});

			it("call with full-text search and full-text insensitive case search with query", () => {
				adapter.model.findAll.mockClear();
				adapter.createCursor({
					query: { status: 1 },
					search: "wAlTeR",
					iSearch: "wAlTeR",
					searchFields: ["title", "content"]
				});
				expect(adapter.model.findAll).toHaveBeenCalledTimes(1);
				expect(adapter.model.findAll).toHaveBeenCalledWith({
					where: {
						[Op.and]: [
							{ status: 1 },
							{ [Op.or]: [
								{ "title": { [Op.like]: "%wAlTeR%" } },
								{ "content": { [Op.like]: "%wAlTeR%" } }
							] }
						]
					}
				});
			});

			it("call with full-text search & advanced query", () => {
				adapter.model.findAll.mockClear();
				adapter.createCursor({
					query: {
						[Op.or]: [
							{ status: 1 },
							{ deleted: 0 }
						]
					},
					search: "WALTER",
					searchFields: ["title", "content"]
				});
				expect(adapter.model.findAll).toHaveBeenCalledTimes(1);
				expect(adapter.model.findAll).toHaveBeenCalledWith({
					where: {
						[Op.and]: [
							{ [Op.or]: [
								{ status: 1 },
								{ deleted: 0 },
							] },
							{ [Op.or]: [
								{ "title": { [Op.like]: "%WALTER%" } },
								{ "content": { [Op.like]: "%WALTER%" } }
							] }
						]
					}
				});
			});

			it("call with full-text search (insensitive case) & advanced query", () => {
				adapter.model.findAll.mockClear();
				adapter.createCursor({
					query: {
						[Op.or]: [
							{ status: 1 },
							{ deleted: 0 }
						]
					},
					iSearch: "WALTER",
					searchFields: ["title", "content"]
				});
				expect(adapter.model.findAll).toHaveBeenCalledTimes(1);
				expect(adapter.model.findAll).toHaveBeenCalledWith({
					where: {
						[Op.and]: [
							{ [Op.or]: [
								{ status: 1 },
								{ deleted: 0 },
							] },
							{ [Op.or]: [
								Sequelize.where(
									Sequelize.fn("lower", Sequelize.col("title")),
									Op.like,
									"%walter%"
								),
								Sequelize.where(
									Sequelize.fn("lower", Sequelize.col("content")),
									Op.like,
									"%walter%"
								)
							] }
						]
					}
				});
			});

			it("call with full-text search and full-text insensitive case search & advanced query", () => {
				adapter.model.findAll.mockClear();
				adapter.createCursor({
					query: {
						[Op.or]: [
							{ status: 1 },
							{ deleted: 0 }
						]
					},
					search: "WALTER",
					iSearch: "WALTER",
					searchFields: ["title", "content"]
				});
				expect(adapter.model.findAll).toHaveBeenCalledTimes(1);
				expect(adapter.model.findAll).toHaveBeenCalledWith({
					where: {
						[Op.and]: [
							{ [Op.or]: [
								{ status: 1 },
								{ deleted: 0 },
							] },
							{ [Op.or]: [
								{ "title": { [Op.like]: "%WALTER%" } },
								{ "content": { [Op.like]: "%WALTER%" } }
							] }
						]
					}
				});
			});
		});


		it("call find", () => {
			adapter.createCursor = jest.fn(() => Promise.resolve());

			let params = {};
			return adapter.find(params).catch(protectReject).then(() => {
				expect(adapter.createCursor).toHaveBeenCalledTimes(1);
				expect(adapter.createCursor).toHaveBeenCalledWith(params);
			});
		});

		it("call findOne", () => {
			adapter.model.findOne.mockClear();
			let age = { age: 25 };

			return adapter.findOne(age).catch(protectReject).then(() => {
				expect(adapter.model.findOne).toHaveBeenCalledTimes(1);
				expect(adapter.model.findOne).toHaveBeenCalledWith(age);
			});
		});

		it("call findByPk", () => {
			adapter.model.findByPk.mockClear();

			return adapter.findById(5).catch(protectReject).then(() => {
				expect(adapter.model.findByPk).toHaveBeenCalledTimes(1);
				expect(adapter.model.findByPk).toHaveBeenCalledWith(5);
			});
		});

		it("call findByIds", () => {
			adapter.model.findAll.mockClear();

			return adapter.findByIds([5]).catch(protectReject).then(() => {
				expect(adapter.model.findAll).toHaveBeenCalledTimes(1);
				expect(adapter.model.findAll).toHaveBeenCalledWith({ "where": { "id": { [Op.in]: [5] } } });
			});
		});

		it("call count", () => {
			adapter.createCursor = jest.fn(() => Promise.resolve());

			let params = {};
			return adapter.count(params).catch(protectReject).then(() => {
				expect(adapter.createCursor).toHaveBeenCalledTimes(1);
				expect(adapter.createCursor).toHaveBeenCalledWith(params, true);
			});
		});

		it("call insert", () => {
			let entity = {};
			return adapter.insert(entity).catch(protectReject).then(() => {
				expect(adapter.model.create).toHaveBeenCalledTimes(1);
				expect(adapter.model.create).toHaveBeenCalledWith(entity);
			});
		});

		it("call inserts", () => {
			adapter.model.create.mockClear();
			let entities = [{ name: "John" }, { name: "Jane" }];

			return adapter.insertMany(entities).catch(protectReject).then(() => {
				expect(adapter.model.bulkCreate).toHaveBeenCalledTimes(1);
				expect(adapter.model.bulkCreate).toHaveBeenCalledWith(entities, { returning: true });
			});
		});
		
		it("call inserts with option param", () => {
			adapter.model.create.mockClear();
			let entities = [{ name: "John" }, { name: "Jane" }];
			let opts = { ignoreDuplicates: true, returning: false };
			
			return adapter.insertMany(entities, opts).catch(protectReject).then(() => {
				expect(adapter.model.bulkCreate).toHaveBeenCalledTimes(2);
				expect(adapter.model.bulkCreate).toHaveBeenCalledWith(entities, opts);
			});
		});

		it("call updateMany", () => {
			let where = {};
			let update = {};

			return adapter.updateMany(where, update).catch(protectReject).then(res => {
				expect(res).toBe(1);
				expect(adapter.model.update).toHaveBeenCalledTimes(1);
				expect(adapter.model.update).toHaveBeenCalledWith(update, { where });
			});
		});

		it("call updateById", () => {
			let updateCB = jest.fn();
			adapter.findById = jest.fn(() => Promise.resolve({
				update: updateCB
			}));

			let update = {
				$set: { title: "Test" }
			};
			return adapter.updateById(5, update).catch(protectReject).then(() => {
				expect(adapter.findById).toHaveBeenCalledTimes(1);
				expect(adapter.findById).toHaveBeenCalledWith(5);

				expect(updateCB).toHaveBeenCalledTimes(1);
				expect(updateCB).toHaveBeenCalledWith(update["$set"]);
			});
		});

		it("call destroy", () => {
			let where = {};

			return adapter.removeMany(where).catch(protectReject).then(() => {
				expect(adapter.model.destroy).toHaveBeenCalledTimes(1);
				expect(adapter.model.destroy).toHaveBeenCalledWith({ where });
			});
		});

		it("call entity.destroy", () => {
			let destroyCB = jest.fn(() => Promise.resolve());
			adapter.findById = jest.fn(() => Promise.resolve({
				id: 2,
				destroy: destroyCB
			}));
			return adapter.removeById(5).catch(protectReject).then(res => {
				expect(res.id).toBe(2);
				expect(adapter.findById).toHaveBeenCalledTimes(1);
				expect(adapter.findById).toHaveBeenCalledWith(5);

				expect(destroyCB).toHaveBeenCalledTimes(1);
			});
		});

		it("call clear", () => {
			adapter.model.destroy.mockClear();
			return adapter.clear().catch(protectReject).then(() => {
				expect(adapter.model.destroy).toHaveBeenCalledTimes(1);
				expect(adapter.model.destroy).toHaveBeenCalledWith({ where: {} });
			});
		});

		it("call doc.toJSON", () => {
			let doc = {
				get: jest.fn()
			};
			adapter.entityToObject(doc);
			expect(doc.get).toHaveBeenCalledTimes(1);
			expect(doc.get).toHaveBeenCalledWith({ plain: true });
		});


		it("should transform idField into _id", () => {
			let entry = {
				myID: "123456789",
				title: "My first post"
			};
			let idField = "myID";
			let res = adapter.beforeSaveTransformID(entry, idField);
			expect(res).toEqual(entry);
		});

		it("should transform _id into idField", () => {
			let entry = {
				_id: "123456789",
				title: "My first post"
			};
			let idField = "myID";
			let res = adapter.afterRetrieveTransformID(entry, idField);
			expect(res).toEqual(entry);
		});
	});

	describe("model passed as an initiated model ", () => {
		const opts = {
			dialect: "sqlite"
		};
		const adapter = new SequelizeAdapter(opts);

		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService({
			name: "store",
			model: initiatedModel
		});
		beforeEach(() => {
			adapter.init(broker, service);
		});

		it("do not call define if initiated model passed", () => {
			return adapter.connect().catch(protectReject).then(() => {
				expect(Sequelize).toHaveBeenCalledTimes(1);
				expect(Sequelize).toHaveBeenCalledWith(opts);
				expect(adapter.db).toBe(db);
				expect(adapter.db.authenticate).toHaveBeenCalledTimes(1);
				expect(adapter.db.define).toHaveBeenCalledTimes(0);
				expect(adapter.model).toBe(initiatedModel);
				expect(adapter.service.model).toBe(initiatedModel);
			});
		});
	});

	describe("options as sequelize instance", () => {
		const opts = new Sequelize({
			dialect: "sqlite"
		});
		const adapter = new SequelizeAdapter(opts);

		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService({
			name: "store",
			model: initiatedModel
		});
		beforeEach(() => {
			adapter.init(broker, service);
		});

		it("do not call define if initiated model passed", () => {
			return adapter.connect().catch(protectReject).then(() => {
				expect(Sequelize).toHaveBeenCalledTimes(1);
				expect(Sequelize).toHaveBeenCalledWith(opts);
				expect(adapter.db).toBe(opts);
				expect(adapter.db).toBe(db);
				expect(adapter.db.authenticate).toHaveBeenCalledTimes(1);
				expect(adapter.db.define).toHaveBeenCalledTimes(0);
				expect(adapter.model).toBe(initiatedModel);
				expect(adapter.service.model).toBe(initiatedModel);
			});
		});
	});

	describe("noSync/sequelize config sync option", () => {
		const initAndGetAdapter = (...args) => {
			const adapter = new SequelizeAdapter(...args);

			const broker = new ServiceBroker({ logger: false });
			const service = broker.createService({
				name: "store",
				model: fakeModel
			});
			adapter.init(broker, service);

			return adapter;
		};

		it("do not sync the model with database", () => {
			const opts = {
				dialect: "sqlite",
				noSync: true
			};
			const adapter = initAndGetAdapter(opts);

			return adapter.connect().catch(protectReject).then(() => {
				expect(Sequelize).toHaveBeenCalledTimes(1);
				expect(Sequelize).toHaveBeenCalledWith(opts);
				expect(adapter.db).toBe(db);
				expect(adapter.db.authenticate).toHaveBeenCalledTimes(1);
				expect(adapter.db.define).toHaveBeenCalledTimes(1);
				expect(adapter.model).toBe(model);
				expect(adapter.service.model).toBe(model);

				expect(adapter.model.sync).toHaveBeenCalledTimes(0);
			});
		});

		it("sequelize config sync false", () => {
			const adapter = initAndGetAdapter({
				dialect: "postgres",
				sync: false
			});

			return adapter.connect().catch(protectReject).then(() => {
				expect(adapter.db).toBe(db);
				expect(adapter.db.authenticate).toHaveBeenCalledTimes(1);
				expect(adapter.db.define).toHaveBeenCalledTimes(1);

				expect(adapter.model.sync).toHaveBeenCalledTimes(0);
			});
		});


		it("sequelize config sync true", () => {
			const adapter = initAndGetAdapter({
				dialect: "postgres",
				sync: { force: true }
			});

			return adapter.connect().catch(protectReject).then(() => {
				expect(adapter.db).toBe(db);
				expect(adapter.db.authenticate).toHaveBeenCalledTimes(1);
				expect(adapter.db.define).toHaveBeenCalledTimes(1);

				expect(adapter.model.sync).toHaveBeenCalledTimes(1);
			});
		});

		it("sequelize config as 4rd arg, sync true", () => {
			const adapter = initAndGetAdapter("db", "user", "pass", {
				dialect: "postgres",
				sync: { force: true }
			});

			return adapter.connect().catch(protectReject).then(() => {
				expect(adapter.db).toBe(db);
				expect(adapter.db.authenticate).toHaveBeenCalledTimes(1);
				expect(adapter.db.define).toHaveBeenCalledTimes(1);

				expect(adapter.model.sync).toHaveBeenCalledTimes(1);
			});
		});

		it("sequelize config in 4rd arg, sync false", () => {
			const adapter = initAndGetAdapter("db", "user", "pass", {
				dialect: "postgres",
				sync: false
			});

			return adapter.connect().catch(protectReject).then(() => {
				expect(adapter.db).toBe(db);
				expect(adapter.db.authenticate).toHaveBeenCalledTimes(1);
				expect(adapter.db.define).toHaveBeenCalledTimes(1);

				expect(adapter.model.sync).toHaveBeenCalledTimes(0);
			});
		});

		it("noSync in 4rd arg, sync false", () => {
			const adapter = initAndGetAdapter("db", "user", "pass", {
				dialect: "postgres",
				noSync: true
			});

			return adapter.connect().catch(protectReject).then(() => {
				expect(adapter.db).toBe(db);
				expect(adapter.db.authenticate).toHaveBeenCalledTimes(1);
				expect(adapter.db.define).toHaveBeenCalledTimes(1);

				expect(adapter.model.sync).toHaveBeenCalledTimes(0);
			});
		});
	});
});

