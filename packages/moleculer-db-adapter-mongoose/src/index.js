/*
 * moleculer-db-adapter-mongoose
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer-db)
 * MIT Licensed
 */

"use strict";

const _ 		= require("lodash");
const { ServiceSchemaError } = require("moleculer").Errors;
const mongoose  = require("mongoose");

// removed: https://mongoosejs.com/docs/migrating_to_6.html#no-more-deprecation-warning-options
// mongoose.set("useNewUrlParser", true);
// mongoose.set("useFindAndModify", false);
// mongoose.set("useCreateIndex", true);

class MongooseDbAdapter {

	/**
	 * Creates an instance of MongooseDbAdapter.
	 * @param {String} uri
	 * @param {Object?} opts
	 *
	 * @memberof MongooseDbAdapter
	 */
	constructor(uri, opts) {
		this.uri = uri;
		this.opts = opts;
	}

	/**
	 * Initialize adapter
	 *
	 * @param {ServiceBroker} broker
	 * @param {Service} service
	 *
	 * @memberof MongooseDbAdapter
	 */
	init(broker, service) {
		this.broker = broker;
		this.service = service;

		if (this.service.schema.model) {
			this.model = this.service.schema.model;
		} else if (this.service.schema.schema) {
			if (!this.service.schema.modelName) {
				throw new ServiceSchemaError("`modelName` is required when `schema` is given in schema of service!");
			}
			this.schema = this.service.schema.schema;
			this.modelName = this.service.schema.modelName;
		}

		if (!this.model && !this.schema) {
			/* istanbul ignore next */
			throw new ServiceSchemaError("Missing `model` or `schema` definition in schema of service!");
		}
	}

	/**
	 * Connect to database
	 *
	 * @returns {Promise}
	 *
	 * @memberof MongooseDbAdapter
	 */
	connect() {
		return new Promise((resolve, reject) => {
			if (this.model) {
				// model field exists in service schema, should check if model has been connected
				if (this.model.db) {
					// if this.model.db is existed, adapter had connected before, just return this.model.db
					// Model.prototype.db
					// Connection the model uses.
					// https://mongoosejs.com/docs/api/model.html#model_Model-db
					resolve(this.model.db);
					return;
				}
				/* istanbul ignore next */
				if (mongoose.connection.readyState === 1) {
					// if readyState is 1, mean mongoose's connection status is connected, return it
					// dont forget that we have model field in service schema
					resolve(mongoose.connection);
				} else if (mongoose.connection.readyState === 2) {
					// readyState is 2, mean connecting, we listen on connected and return connection when done
					mongoose.connection.once("error", reject);
					mongoose.connection.once("connected", () => {
						// resolve is going to call, remove error listener
						mongoose.connection.removeListener("error", reject);
						resolve(mongoose.connection);
					});
				} else {
					// everything else cases mean we not yet do connect before, make it
					mongoose.connect(this.uri, this.opts, error => {
						if (error) return reject(error);
						else resolve(mongoose.connection);
					});
				}
			} else if (this.schema) {
				// note: do not use sth likes mongoose.createConnection().then()/*.catch()*/ here, some cases will trigger bluebird warning
				// https://github.com/petkaantonov/bluebird/blob/master/docs/docs/warning-explanations.md#warning-a-promise-was-created-in-a-handler-but-was-not-returned-from-it
				resolve(mongoose.createConnection(this.uri, this.opts));
			}
		}).then(conn => {
			if (this.model == null && this.schema) {
				// if service's schema only has schema field type, not model, init model and return connection
				this.model = conn.model(this.modelName, this.schema);
			}
			this.conn = conn;

			if (this.conn.constructor.name === "Db") {
				// conn is an mongodb.Db instance
				return this.conn;
			} else {
				// if not mongodb.Db instance, it was called by test with fake mongodb schema
				if (this.conn.db != null) {
					return this.conn.db;
				} else {
					return new Promise((resolve, reject) => {
						this.conn.once("error", reject);
						this.conn.once("connected", () => {
							this.conn.removeListener("error", reject);
							resolve(this.conn.db);
						});
					});
				}
			}
		}).then(db => {
			// at this line, in both test and real cases, we got db as mongodb.Db instance
			this.db = db;

			this.service.logger.info("MongoDB adapter has connected successfully.");

			// do not use this.db.on() because of next line
			// DeprecationWarning: Listening to events on the Db class has been deprecated and will be removed in the next major version.
			/* istanbul ignore next */
			this.conn.on("disconnected", () => this.service.logger.warn("Mongoose adapter has disconnected."));
			this.conn.on("error", err => this.service.logger.error("MongoDB error.", err));
			this.conn.on("reconnect", () => this.service.logger.info("Mongoose adapter has reconnected."));
		});
	}

	/**
	 * Disconnect from database
	 *
	 * @returns {Promise}
	 *
	 * @memberof MongooseDbAdapter
	 */
	disconnect() {
		return new Promise(resolve => {
			if (this.conn == null) {
				mongoose.connection.close(resolve);
			} else {
				(function closeConnection(conn, db) {
					if (conn.readyState === 2) {
						return setTimeout(() => closeConnection(conn, db), 1e3);
					} else if (conn.close) {
						conn.close(resolve);
					} else if (db != null && db.close) {
						db.close(resolve);
					} else {
						mongoose.connection.close(resolve);
					}
				})(this.conn, this.db);
			}
		});
	}

	/**
	 * Find all entities by filters.
	 *
	 * Available filter props:
	 * 	- limit
	 *  - offset
	 *  - sort
	 *  - search
	 *  - searchFields
	 *  - query
	 *
	 * @param {any} filters
	 * @returns {Promise}
	 *
	 * @memberof MongooseDbAdapter
	 */
	find(filters) {
		return this.createCursor(filters).exec();
	}

	/**
	 * Find an entity by query
	 *
	 * @param {Object} query
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	findOne(query) {
		return this.model.findOne(query).exec();
	}

	/**
	 * Find an entities by ID
	 *
	 * @param {any} _id
	 * @returns {Promise}
	 *
	 * @memberof MongooseDbAdapter
	 */
	findById(_id) {
		return this.model.findById(_id).exec();
	}

	/**
	 * Find any entities by IDs
	 *
	 * @param {Array} idList
	 * @returns {Promise}
	 *
	 * @memberof MongooseDbAdapter
	 */
	findByIds(idList) {
		return this.model.find({
			_id: {
				$in: idList
			}
		}).exec();
	}

	/**
	 * Get count of filtered entites
	 *
	 * Available filter props:
	 *  - search
	 *  - searchFields
	 *  - query
	 *
	 * @param {Object} [filters={}]
	 * @returns {Promise}
	 *
	 * @memberof MongooseDbAdapter
	 */
	count(filters = {}) {
		return this.createCursor(filters).countDocuments().exec();
	}

	/**
	 * Insert an entity
	 *
	 * @param {Object} entity
	 * @returns {Promise}
	 *
	 * @memberof MongooseDbAdapter
	 */
	insert(entity) {
		const item = new this.model(entity);
		return item.save();
	}

	/**
	 * Insert many entities
	 *
	 * @param {Array} entities
	 * @returns {Promise}
	 *
	 * @memberof MongooseDbAdapter
	 */
	insertMany(entities) {
		return this.model.create(entities);
	}

	/**
	 * Update many entities by `query` and `update`
	 *
	 * @param {Object} query
	 * @param {Object} update
	 * @returns {Promise}
	 *
	 * @memberof MongooseDbAdapter
	 */
	updateMany(query, update) {
		return this.model.updateMany(query, update, { multi: true, "new": true }).then(res => res.n);
	}

	/**
	 * Update an entity by ID and `update`
	 *
	 * @param {any} _id
	 * @param {Object} update
	 * @returns {Promise}
	 *
	 * @memberof MongooseDbAdapter
	 */
	updateById(_id, update) {
		return this.model.findByIdAndUpdate(_id, update, { "new": true });
	}

	/**
	 * Remove entities which are matched by `query`
	 *
	 * @param {Object} query
	 * @returns {Promise}
	 *
	 * @memberof MongooseDbAdapter
	 */
	removeMany(query) {
		return this.model.deleteMany(query).then(res => res.n);
	}

	/**
	 * Remove an entity by ID
	 *
	 * @param {any} _id
	 * @returns {Promise}
	 *
	 * @memberof MongooseDbAdapter
	 */
	removeById(_id) {
		return this.model.findByIdAndRemove(_id);
	}

	/**
	 * Clear all entities from collection
	 *
	 * @returns {Promise}
	 *
	 * @memberof MongooseDbAdapter
	 */
	clear() {
		return this.model.deleteMany({}).then(res => res.n);
	}

	/**
	 * Convert DB entity to JSON object
	 *
	 * @param {any} entity
	 * @returns {Object}
	 * @memberof MongooseDbAdapter
	 */
	entityToObject(entity) {
		let json = entity.toJSON();
		if (entity._id && entity._id.toHexString) {
			json._id = entity._id.toHexString();
		} else if (entity._id && entity._id.toString) {
			json._id = entity._id.toString();
		}
		return json;
	}

	/**
	 * Create a filtered query
	 * Available filters in `params`:
	 *  - search
	 * 	- sort
	 * 	- limit
	 * 	- offset
	 *  - query
	 *
	 * @param {Object} params
	 * @returns {QueryWithHelpers}
	 */
	createCursor(params) {
		if (params) {
			const q = this.model.find(params.query);

			// Search
			if (_.isString(params.search) && params.search !== "") {
				if (params.searchFields && params.searchFields.length > 0) {
					const searchQuery = {
						$or: params.searchFields.map(f => (
							{
								[f]: new RegExp(_.escapeRegExp(params.search), "i")
							}
						))
					};
					const query = q.getQuery();
					if (query.$or) {
						if (!Array.isArray(query.$and)) query.$and = [];
						query.$and.push(
							_.pick(query, "$or"),
							searchQuery
						);
						q.setQuery(_.omit(query, "$or"));
					} else {
						q.find(searchQuery);
					}
				} else {
					// Full-text search
					// More info: https://docs.mongodb.com/manual/reference/operator/query/text/
					q.find({
						$text: {
							$search: params.search
						}
					});
					q._fields = {
						_score: {
							$meta: "textScore"
						}
					};
					q.sort({
						_score: {
							$meta: "textScore"
						}
					});
				}
			}

			// Sort
			if (_.isString(params.sort))
				q.sort(params.sort.replace(/,/, " "));
			else if (Array.isArray(params.sort))
				q.sort(params.sort.join(" "));

			// Offset
			if (_.isNumber(params.offset) && params.offset > 0)
				q.skip(params.offset);

			// Limit
			if (_.isNumber(params.limit) && params.limit > 0)
				q.limit(params.limit);

			return q;
		}
		return this.model.find();
	}

	/**
	 * Transforms 'idField' into MongoDB's '_id'
	 * @param {Object} entity
	 * @param {String} idField
	 * @memberof MongoDbAdapter
	 * @returns {Object} Modified entity
	 */
	beforeSaveTransformID (entity, idField) {
		let newEntity = _.cloneDeep(entity);

		if (idField !== "_id" && entity[idField] !== undefined) {
			newEntity._id = this.stringToObjectID(newEntity[idField]);
			delete newEntity[idField];
		}

		return newEntity;
	}

	/**
	 * Transforms MongoDB's '_id' into user defined 'idField'
	 * @param {Object} entity
	 * @param {String} idField
	 * @memberof MongoDbAdapter
	 * @returns {Object} Modified entity
	 */
	afterRetrieveTransformID (entity, idField) {
		if (idField !== "_id") {
			entity[idField] = this.objectIDToString(entity["_id"]);
			delete entity._id;
		}
		return entity;
	}

	/**
	 * Convert hex string to ObjectID
	 * @param {String} id
	 * @returns ObjectID}
	 * @memberof MongooseDbAdapter
	 */
	stringToObjectID (id) {
		if (typeof id == "string" && mongoose.Types.ObjectId.isValid(id))
			return new mongoose.Schema.Types.ObjectId(id);
		return id;
	}

	/**
	 * Convert ObjectID to hex string
	 * @param {ObjectID} id
	 * @returns {String}
	 * @memberof MongooseDbAdapter
	 */
	objectIDToString (id) {
		if(id && id.toString)
			return id.toString();
		return id;
	}
}

module.exports = MongooseDbAdapter;
