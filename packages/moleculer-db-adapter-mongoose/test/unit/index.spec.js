"use strict";
if (process.versions.node.split(".")[0] < 14) {
	console.log("Skipping Mongoose tests because node version is too low");
	it("Skipping Mongoose tests because node version is too low", () => {});
} else {
	const { ServiceBroker } = require("moleculer");
	const MongooseStoreAdapter = require("../../src");
	const mongoose = require("mongoose");

	// eslint-disable-next-line no-inner-declarations
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
			toHexString: jest.fn(),
		},
	};

	const docIdString = {
		toJSON: jest.fn(() => ({})),
		_id: {
			toString: jest.fn(),
		},
	};

	const execCB = jest.fn(() => Promise.resolve());
	const saveCB = jest.fn(() => Promise.resolve());
	const leanCB = jest.fn(() => ({ exec: execCB }));
	const countCB = jest.fn(() => ({ exec: execCB }));
	const query = jest.fn(() => ({
		lean: leanCB,
		exec: execCB,
		countDocuments: countCB,
	}));

	const fakeModel = Object.assign(
		jest.fn(() => ({ save: saveCB })),
		{
			find: jest.fn(() => query()),
			findOne: jest.fn(() => query()),
			findById: jest.fn(() => query()),
			create: jest.fn(() => Promise.resolve()),
			updateMany: jest.fn(() => Promise.resolve({ modifiedCount: 2 })),
			findByIdAndUpdate: jest.fn(() => Promise.resolve(doc)),
			deleteMany: jest.fn(() => Promise.resolve({ deletedCount: 2 })),
			findByIdAndDelete: jest.fn(() => Promise.resolve()),
		}
	);

	const fakeSchema = {};

	let fakeDb = {
		on: jest.fn(),
		close: jest.fn((fn) => fn()),
		model: jest.fn(() => fakeModel),
	};

	describe("Test MongooseStoreAdapter", () => {
		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService({
			name: "store",
			model: fakeModel,
		});

		const uri = "mongodb://127.0.0.1";
		const opts = {};
		const adapter = new MongooseStoreAdapter(uri, opts);

		it("should be created", () => {
			expect(adapter).toBeDefined();
			expect(adapter.uri).toBe(uri);
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
			expect(adapter.beforeSaveTransformID).toBeInstanceOf(Function);
			expect(adapter.afterRetrieveTransformID).toBeInstanceOf(Function);
		});

		describe("Test init", () => {
			it("call init", () => {
				adapter.init(broker, service);
				expect(adapter.broker).toBe(broker);
				expect(adapter.service).toBe(service);
				expect(adapter.model).toBe(fakeModel);
			});

			it("call without model and schema", () => {
				const service = broker.createService({
					name: "store",
				});
				const adapter = new MongooseStoreAdapter(opts);
				expect(() => adapter.init(broker, service)).toThrow();
			});

			it("call with schema and no modelName", () => {
				const service = broker.createService({
					name: "store",
					schema: fakeSchema,
				});
				const adapter = new MongooseStoreAdapter(opts);
				expect(() => adapter.init(broker, service)).toThrow();
			});

			it("call with schema and modelName", () => {
				const service = broker.createService({
					name: "store",
					schema: fakeSchema,
					modelName: "fakeModel",
				});
				const adapter = new MongooseStoreAdapter(opts);
				adapter.init(broker, service);
				expect(adapter.model).toBeUndefined();
				expect(adapter.modelName).toBe("fakeModel");
				expect(adapter.schema).toBe(fakeSchema);
			});
		});

		describe("Test connect", () => {
			beforeEach(() => {
				mongoose.connection.readyState =
					mongoose.connection.states.disconnected;
				mongoose.connect = jest.fn(() => {
					mongoose.connection.readyState =
						mongoose.connection.states.connected;
					return Promise.resolve();
				});

				mongoose.model = jest.fn(() => fakeModel);

				Object.entries(fakeDb).forEach(([k, v]) => {
					mongoose.connection[k] = v;
				});
				mongoose.connection.db = fakeDb;
			});

			it("call connect with uri", () => {
				fakeDb.on.mockClear();

				adapter.opts = undefined;
				adapter.model = jest.fn(() => fakeModel);

				return adapter
					.connect()
					.catch(protectReject)
					.then(() => {
						expect(mongoose.connect).toHaveBeenCalledTimes(1);
						expect(mongoose.connect).toHaveBeenCalledWith(
							"mongodb://127.0.0.1",
							undefined
						);

						expect(adapter.db).toBe(fakeDb);
						expect(adapter.db.on).toHaveBeenCalledTimes(3);
						expect(adapter.db.on).toHaveBeenCalledWith(
							"disconnected",
							expect.any(Function)
						);
						expect(adapter.db.on).toHaveBeenCalledWith(
							"reconnect",
							expect.any(Function)
						);
					});
			});

			it("call connect with uri & opts", () => {
				fakeDb.on.mockClear();

				adapter.opts = {
					user: "admin",
					pass: "123456",
				};

				return adapter
					.connect()
					.catch(protectReject)
					.then(() => {
						expect(mongoose.connect).toHaveBeenCalledTimes(1);
						expect(mongoose.connect).toHaveBeenCalledWith(
							adapter.uri,
							adapter.opts
						);
					});
			});

			it("call disconnect", () => {
				fakeDb.close.mockClear();

				return adapter
					.disconnect()
					.catch(protectReject)
					.then(() => {
						expect(fakeDb.close).toHaveBeenCalledTimes(1);
					});
			});

			it("call stringToObjectID", () => {
				mongoose.Types.ObjectId.isValid = jest.fn(() => true);
				mongoose.Schema.Types.ObjectId = jest.fn();

				adapter.stringToObjectID({});
				expect(mongoose.Schema.Types.ObjectId).toHaveBeenCalledTimes(0);

				adapter.stringToObjectID("123");
				expect(mongoose.Schema.Types.ObjectId).toHaveBeenCalledTimes(1);
				expect(mongoose.Schema.Types.ObjectId).toHaveBeenCalledWith(
					"123"
				);
			});

			it("call objectIDToString with not ObjectID", () => {
				expect(adapter.objectIDToString("123")).toBe("123");
			});

			it("call objectIDToString with ObjectID", () => {
				let id = {
					toString: jest.fn(),
				};

				adapter.objectIDToString(id);
				expect(id.toString).toHaveBeenCalledTimes(1);
			});

			it("call connect with schema and modelName", () => {
				fakeDb.on.mockClear();
				const service = broker.createService({
					name: "store",
					schema: fakeSchema,
					modelName: "fakeModel",
				});
				const adapter = new MongooseStoreAdapter(opts);
				adapter.init(broker, service);

				mongoose.createConnection = jest.fn(() => {
					mongoose.connection.readyState =
						mongoose.connection.states.connected;
					return mongoose.connection;
				});

				adapter.opts = {
					user: "admin",
					pass: "123456",
				};

				return adapter
					.connect()
					.catch(protectReject)
					.then(() => {
						expect(mongoose.createConnection).toHaveBeenCalledTimes(
							1
						);
						expect(mongoose.createConnection).toHaveBeenCalledWith(
							adapter.uri,
							adapter.opts
						);
						expect(adapter.model).toBe(fakeModel);
					});
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
					count: countCB,
					getQuery: jest.fn(() => ({})),
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
				let q = adapter.createCursor({
					query,
					sort: ["createdAt", "title"],
				});
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
				expect(q.find).toHaveBeenCalledWith({
					$text: { $search: "walter" },
				});
				expect(q.sort).toHaveBeenCalledTimes(1);
				expect(q.sort).toHaveBeenCalledWith({
					_score: { $meta: "textScore" },
				});
				expect(q._fields).toEqual({ _score: { $meta: "textScore" } });
			});

			it("call with searchFields", () => {
				adapter.model.find.mockClear();
				let q = adapter.createCursor({
					search: "walter",
					searchFields: ["name", "lastname"],
				});
				expect(adapter.model.find).toHaveBeenCalledTimes(1);
				expect(adapter.model.find).toHaveBeenCalledWith(undefined);

				expect(q.find).toHaveBeenCalledTimes(1);
				expect(q.find).toHaveBeenCalledWith({
					$or: [{ name: /walter/i }, { lastname: /walter/i }],
				});
			});

			it("call with query.$or & searchFields", () => {
				const fakeQuery = {
					$or: [{ breaking: "bad" }],
				};
				const getQueryCB = jest.fn(() => fakeQuery);
				const setQueryCB = jest.fn();
				adapter.model.find = jest.fn(() => ({
					find: jest.fn(),
					sort: jest.fn(),
					skip: jest.fn(),
					limit: jest.fn(),
					lean: leanCB,
					exec: execCB,
					count: countCB,
					getQuery: getQueryCB,
					setQuery: setQueryCB,
				}));

				let q = adapter.createCursor({
					search: "walter",
					searchFields: ["name", "lastname"],
				});
				expect(adapter.model.find).toHaveBeenCalledTimes(1);
				expect(adapter.model.find).toHaveBeenCalledWith(undefined);

				expect(q.find).toHaveBeenCalledTimes(0);
				expect(setQueryCB).toHaveBeenCalledWith({
					$and: [
						{
							$or: [
								{
									breaking: "bad",
								},
							],
						},
						{
							$or: [
								{
									name: /walter/i,
								},
								{
									lastname: /walter/i,
								},
							],
						},
					],
				});
			});

			it("call with query.$or, $query.$and & searchFields", () => {
				const fakeQuery = {
					$or: [{ breaking: "bad" }],
					$and: [{ prison: "break" }],
				};
				const getQueryCB = jest.fn(() => fakeQuery);
				const setQueryCB = jest.fn();
				adapter.model.find = jest.fn(() => ({
					find: jest.fn(),
					sort: jest.fn(),
					skip: jest.fn(),
					limit: jest.fn(),
					lean: leanCB,
					exec: execCB,
					count: countCB,
					getQuery: getQueryCB,
					setQuery: setQueryCB,
				}));

				let q = adapter.createCursor({
					search: "walter",
					searchFields: ["name", "lastname"],
				});
				expect(adapter.model.find).toHaveBeenCalledTimes(1);
				expect(adapter.model.find).toHaveBeenCalledWith(undefined);

				expect(q.find).toHaveBeenCalledTimes(0);
				expect(setQueryCB).toHaveBeenCalledWith({
					$and: [
						{
							prison: "break",
						},
						{
							$or: [
								{
									breaking: "bad",
								},
							],
						},
						{
							$or: [
								{
									name: /walter/i,
								},
								{
									lastname: /walter/i,
								},
							],
						},
					],
				});
			});
		});

		it("call find", () => {
			adapter.createCursor = jest.fn(() => query());

			let params = {};
			return adapter
				.find(params)
				.catch(protectReject)
				.then(() => {
					expect(adapter.createCursor).toHaveBeenCalledTimes(1);
					expect(adapter.createCursor).toHaveBeenCalledWith(params);

					expect(execCB).toHaveBeenCalledTimes(1);
				});
		});

		it("call findOne", () => {
			leanCB.mockClear();
			execCB.mockClear();
			let query = { age: 23 };

			return adapter
				.findOne(query)
				.catch(protectReject)
				.then(() => {
					expect(adapter.model.findOne).toHaveBeenCalledTimes(1);
					expect(adapter.model.findOne).toHaveBeenCalledWith(query);

					expect(execCB).toHaveBeenCalledTimes(1);
				});
		});

		it("call findById", () => {
			leanCB.mockClear();
			execCB.mockClear();

			return adapter
				.findById(5)
				.catch(protectReject)
				.then(() => {
					expect(adapter.model.findById).toHaveBeenCalledTimes(1);
					expect(adapter.model.findById).toHaveBeenCalledWith(5);

					expect(execCB).toHaveBeenCalledTimes(1);
				});
		});

		it("call findByIds", () => {
			adapter.model.find.mockClear();
			leanCB.mockClear();
			execCB.mockClear();

			return adapter
				.findByIds(5)
				.catch(protectReject)
				.then(() => {
					expect(adapter.model.find).toHaveBeenCalledTimes(1);
					expect(adapter.model.find).toHaveBeenCalledWith({
						_id: { $in: 5 },
					});

					expect(execCB).toHaveBeenCalledTimes(1);
				});
		});

		it("call count", () => {
			adapter.createCursor = jest.fn(() => query());
			leanCB.mockClear();
			execCB.mockClear();

			let params = {};
			return adapter
				.count(params)
				.catch(protectReject)
				.then(() => {
					expect(adapter.createCursor).toHaveBeenCalledTimes(1);
					expect(adapter.createCursor).toHaveBeenCalledWith(params);

					expect(countCB).toHaveBeenCalledTimes(1);
					expect(execCB).toHaveBeenCalledTimes(1);
				});
		});

		it("call insert", () => {
			let entity = {};
			return adapter
				.insert(entity)
				.catch(protectReject)
				.then(() => {
					expect(fakeModel).toHaveBeenCalledTimes(1);
					expect(fakeModel).toHaveBeenCalledWith(entity);

					expect(saveCB).toHaveBeenCalledTimes(1);
				});
		});

		it("call create", () => {
			let entities = [];
			return adapter
				.insertMany(entities)
				.catch(protectReject)
				.then(() => {
					expect(adapter.model.create).toHaveBeenCalledTimes(1);
					expect(adapter.model.create).toHaveBeenCalledWith(entities);
				});
		});

		it("call updateMany", () => {
			let query = {};
			let update = {};

			return adapter
				.updateMany(query, update)
				.catch(protectReject)
				.then((res) => {
					expect(res).toBe(2);
					expect(adapter.model.updateMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.updateMany).toHaveBeenCalledWith(
						query,
						update,
						{ multi: true, new: true }
					);
				});
		});

		it("call updateById", () => {
			doc.toJSON.mockClear();

			let update = {};
			return adapter
				.updateById(5, update)
				.catch(protectReject)
				.then(() => {
					expect(
						adapter.model.findByIdAndUpdate
					).toHaveBeenCalledTimes(1);
					expect(
						adapter.model.findByIdAndUpdate
					).toHaveBeenCalledWith(5, update, { new: true });
				});
		});

		it("call removeMany", () => {
			let query = {};

			return adapter
				.removeMany(query)
				.catch(protectReject)
				.then((res) => {
					expect(res).toBe(2);
					expect(adapter.model.deleteMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.deleteMany).toHaveBeenCalledWith(
						query
					);
				});
		});

		it("call removeById", () => {
			return adapter
				.removeById(5)
				.catch(protectReject)
				.then(() => {
					expect(
						adapter.model.findByIdAndDelete
					).toHaveBeenCalledTimes(1);
					expect(
						adapter.model.findByIdAndDelete
					).toHaveBeenCalledWith(5);
				});
		});

		it("call clear", () => {
			adapter.model.deleteMany.mockClear();
			return adapter
				.clear()
				.catch(protectReject)
				.then(() => {
					expect(adapter.model.deleteMany).toHaveBeenCalledTimes(1);
					expect(adapter.model.deleteMany).toHaveBeenCalledWith({});
				});
		});

		it("call doc.toJSON", async () => {
			doc.toJSON.mockClear();
			doc._id.toHexString.mockClear();
			await adapter.entityToObject(doc);
			expect(doc.toJSON).toHaveBeenCalledTimes(1);
			expect(doc._id.toHexString).toHaveBeenCalledTimes(1);
		});

		it("call entityToObject on doc without ObjectID", async () => {
			docIdString.toJSON.mockClear();
			docIdString._id.toString.mockClear();
			await adapter.entityToObject(docIdString);
			expect(docIdString.toJSON).toHaveBeenCalledTimes(1);
			expect(docIdString._id.toString).toHaveBeenCalledTimes(1);
		});

		it("should transform idField into _id", () => {
			adapter.stringToObjectID = jest.fn((entry) => entry);

			let entry = {
				myID: "123456789",
				title: "My first post",
			};
			let idField = "myID";

			let res = adapter.beforeSaveTransformID(entry, idField);

			expect(res.myID).toEqual(undefined);
			expect(res._id).toEqual(entry.myID);
		});

		it("should NOT transform idField into _id", () => {
			// MongoDB will generate the _id
			let entry = {
				title: "My first post",
			};
			let idField = "myID";

			let res = adapter.beforeSaveTransformID(entry, idField);

			expect(res.myID).toEqual(undefined);
			expect(res._id).toEqual(undefined);
		});

		it("should transform _id into idField", () => {
			adapter.objectIDToString = jest.fn((entry) => entry);

			let entry = {
				_id: "123456789",
				title: "My first post",
			};
			let idField = "myID";

			let res = adapter.afterRetrieveTransformID(entry, idField);

			expect(res.myID).toEqual(entry.myID);
			expect(res._id).toEqual(undefined);
		});

		it("should NOT transform _id into idField", () => {
			let entry = {
				_id: "123456789",
				title: "My first post",
			};
			let idField = "_id";

			let res = adapter.afterRetrieveTransformID(entry, idField);

			expect(res.myID).toEqual(undefined);
			expect(res._id).toEqual(entry._id);
		});

		describe("getNativeVirtualPopulateQuery", () => {
			describe("stop conditions", () => {
				it("should return [] when params.populate is undefined", () => {
					const adapter = new MongooseStoreAdapter();
					const service = broker.createService({
						name: "store",
						model: { schema: { virtuals: { aVirtual: {}}}},
					});
					adapter.init(broker, service);
					const ctx = { service, params: {}};
					const res = adapter.getNativeVirtualPopulateQuery(ctx);

					expect(res).toEqual([]);
				});

				it("should return [] when params.populate is empty", () => {
					const adapter = new MongooseStoreAdapter();
					const service = broker.createService({
						name: "store",
						model: { schema: { virtuals: { aVirtual: {}}}},
					});
					adapter.init(broker, service);
					const ctx = { service, params: { populate: []}};
					const res = adapter.getNativeVirtualPopulateQuery(ctx);

					expect(res).toEqual([]);
				});

				it("should return [] when model.schema.virtuals is empty", () => {
					const adapter = new MongooseStoreAdapter();
					const service = broker.createService({
						name: "store",
						model: { schema: { virtuals: {}}},
					});
					adapter.init(broker, service);
					const ctx = { service, params: { populate: []}};
					const res = adapter.getNativeVirtualPopulateQuery(ctx);

					expect(res).toEqual([]);
				});

				it("should return [] when params.populate and model.schema.virtuals does not intersect", () => {
					const adapter = new MongooseStoreAdapter();
					const service = broker.createService({
						name: "store",
						model: { schema: { virtuals: { aVirtual: {}}}},
					});
					adapter.init(broker, service);
					const ctx = { service, params: { populate: ["notaVirtual"]}};
					const res = adapter.getNativeVirtualPopulateQuery(ctx);

					expect(res).toEqual([]);
				});
			});

			describe("default populate params overrides", () => {
				it("should return a populate with default params", () => {
					const adapter = new MongooseStoreAdapter();
					const service = broker.createService({
						name: "store",
						model: {
							schema: {
								virtuals: {
									firstVirtual: {
										options: { ref: "Foo"}
									},
									secondVirtual: {
										options: { refPath: "ref"}
									},
									thirdVirtual: {
										options: { ref: "Bar", match: { text: "baz" }}
									},
									fourthVirtual: {},
									fifthVirtual: {
										options: { ref: "Foo"}
									},
								}
							}
						},
					});
					adapter.init(broker, service);
					const ctx = { service, params: { populate: ["firstVirtual", "secondVirtual", "thirdVirtual", "fourthVirtual"]}};
					const res = adapter.getNativeVirtualPopulateQuery(ctx);

					expect(res).toHaveLength(3);

					const [pop1, pop2, pop3] = res;

					expect(pop1).toHaveProperty("path", "firstVirtual");
					expect(pop1).toHaveProperty("select", "_id");
					expect(pop1).toHaveProperty("options");
					expect(pop1.options).toHaveProperty("skipInvalidIds", true);
					expect(pop1.options).toHaveProperty("lean", true);

					expect(pop2).toHaveProperty("path", "secondVirtual");
					expect(pop2).toHaveProperty("select", "_id");
					expect(pop2).toHaveProperty("options");
					expect(pop2.options).toHaveProperty("skipInvalidIds", true);
					expect(pop2.options).toHaveProperty("lean", true);

					expect(pop3).toHaveProperty("path", "thirdVirtual");
					expect(pop3).toHaveProperty("select", undefined);
					expect(pop3).toHaveProperty("options");
					expect(pop3.options).toHaveProperty("skipInvalidIds", true);
					expect(pop3.options).toHaveProperty("lean", true);
				});

				it("should return a populate with overridden default params", () => {
					const adapter = new MongooseStoreAdapter();
					const identity = (doc) => doc;
					const service = broker.createService({
						name: "store",
						settings: {
							virtuals: {
								firstVirtual: {
									select: "_id foo bar"
								},
								secondVirtual: {
									options: { skipInvalidIds: false, limit: 4}
								},
								thirdVirtual: {
									select: "foo bar baz",
									options: { lean: false},
									transform: identity,
								}
							}
						},
						model: {
							schema: {
								virtuals: {
									firstVirtual: {
										options: { ref: "Foo"}
									},
									secondVirtual: {
										options: { refPath: "ref"}
									},
									thirdVirtual: {
										options: { ref: "Bar", match: { text: "baz" }}
									},
								}
							}
						},
					});
					adapter.init(broker, service);
					const ctx = { service, params: { populate: ["firstVirtual", "secondVirtual", "thirdVirtual"]}};
					const res = adapter.getNativeVirtualPopulateQuery(ctx);

					expect(res).toHaveLength(3);

					const [pop1, pop2, pop3] = res;

					expect(pop1).toHaveProperty("path", "firstVirtual");
					expect(pop1).toHaveProperty("select", "_id foo bar");
					expect(pop1).toHaveProperty("options");
					expect(pop1.options).toHaveProperty("skipInvalidIds", true);
					expect(pop1.options).toHaveProperty("lean", true);

					expect(pop2).toHaveProperty("path", "secondVirtual");
					expect(pop2).toHaveProperty("select", "_id");
					expect(pop2).toHaveProperty("options");
					expect(pop2.options).toHaveProperty("skipInvalidIds", false);
					expect(pop2.options).toHaveProperty("limit", 4);
					expect(pop2.options).not.toHaveProperty("lean");

					expect(pop3).toHaveProperty("path", "thirdVirtual");
					expect(pop3).toHaveProperty("select", "foo bar baz");
					expect(pop3).toHaveProperty("options");
					expect(pop3.options).toHaveProperty("lean", false);
					expect(pop3.options).not.toHaveProperty("skipInvalidIds");
					expect(pop3).toHaveProperty("transform", identity);
				});
			});
		});

		describe("mapVirtualsToLocalFields", () => {
			it("should map virtual field to localField", () => {
				const adapter = new MongooseStoreAdapter();
				const service = broker.createService({
					name: "store",
					model: {
						schema: {
							virtuals: {
								idVirtual: {options: {localField: "_id"}},
								fooVirtual: {options: {localField: "foo"}},
								barVirtual: {},
							}
						}
					},
				});
				adapter.init(broker, service);
				const ctx = { service, params: {}};
				const json = {_id: "xxx", foo: "yyy", bar: "zzz"};
				adapter.mapVirtualsToLocalFields(ctx, json);

				expect(json).toEqual({
					_id: "xxx",
					foo: "yyy",
					bar: "zzz",
					idVirtual: "xxx",
					fooVirtual: "yyy"
				});
			});
		});
	});
}
