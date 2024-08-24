/*
 * moleculer-db-adapter-mongo
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer-db)
 * MIT Licensed
 */

"use strict";

const _ 			= require("lodash");
const { ServiceSchemaError } = require("moleculer").Errors;
const mongodb 		= require("mongodb");
const MongoClient 	= mongodb.MongoClient;
const ObjectID 		= mongodb.ObjectID;

class MongoDbAdapter {

	/**
	 * Creates an instance of MongoDbAdapter.
	 * @param {String} uri
	 * @param {Object?} opts
	 * @param {String?} dbName
	 *
	 * @memberof MongoDbAdapter
	 */
	constructor(uri, opts, dbName) {
		this.uri = uri,
		this.opts = opts;
		this.dbName = dbName;
	}

	/**
	 * Initialize adapter
	 *
	 * @param {ServiceBroker} broker
	 * @param {Service} service
	 *
	 * @memberof MongoDbAdapter
	 */
	init(broker, service) {
		this.broker = broker;
		this.service = service;

		if (!this.service.schema.collection) {
			/* istanbul ignore next */
			throw new ServiceSchemaError("Missing `collection` definition in schema of service!");
		}
	}

	/**
	 * Connect to database
	 *
	 * @returns {Promise}
	 *
	 * @memberof MongoDbAdapter
	 */
	connect() {
		this.client = new MongoClient(this.uri, this.opts);
		return this.client.connect().then(() => {
			this.db = this.client.db(this.dbName);
			this.collection = this.db.collection(this.service.schema.collection);

			this.service.logger.info("MongoDB adapter has connected successfully.");

			/* istanbul ignore next */
			this.db.on("close", () => this.service.logger.warn("MongoDB adapter has disconnected."));
			this.db.on("error", err => this.service.logger.error("MongoDB error.", err));
			this.db.on("reconnect", () => this.service.logger.info("MongoDB adapter has reconnected."));
		});
	}

	/**
	 * Disconnect from database
	 *
	 * @returns {Promise}
	 *
	 * @memberof MongoDbAdapter
	 */
	disconnect() {
		if (this.client) {
			this.client.close();
		}
		return Promise.resolve();
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
	 * @param {Object} filters
	 * @returns {Promise<Array>}
	 *
	 * @memberof MongoDbAdapter
	 */
	find(filters) {
		return this.createCursor(filters, false).toArray();
	}

	/**
	 * Find an entity by query
	 *
	 * @param {Object} query
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	findOne(query) {
		return this.collection.findOne(query);
	}

	/**
	 * Find an entities by ID.
	 *
	 * @param {String} _id
	 * @returns {Promise<Object>} Return with the found document.
	 *
	 * @memberof MongoDbAdapter
	 */
	findById(_id) {
		return this.collection.findOne({ _id: this.stringToObjectID(_id) });
	}

	/**
	 * Find any entities by IDs.
	 *
	 * @param {Array} idList
	 * @returns {Promise<Array>} Return with the found documents in an Array.
	 *
	 * @memberof MongoDbAdapter
	 */
	findByIds(idList) {
		return this.collection.find({
			_id: {
				$in: idList.map(id => this.stringToObjectID(id))
			}
		}).toArray();
	}

	/**
	 * Get count of filtered entites.
	 *
	 * Available query props:
	 *  - search
	 *  - searchFields
	 *  - query
	 *
	 * @param {Object} [filters={}]
	 * @returns {Promise<Number>} Return with the count of documents.
	 *
	 * @memberof MongoDbAdapter
	 */
	count(filters = {}) {
		return this.createCursor(filters, true);
	}

	/**
	 * Insert an entity.
	 *
	 * @param {Object} entity
	 * @returns {Promise<Object>} Return with the inserted document.
	 *
	 * @memberof MongoDbAdapter
	 */
	insert(entity) {
		return this.collection.insertOne(entity).then(res => {
			if (res.insertedCount > 0)
				return res.ops[0];
		});
	}

	/**
	 * Insert many entities
	 *
	 * @param {Array} entities
	 * @returns {Promise<Array<Object>>} Return with the inserted documents in an Array.
	 *
	 * @memberof MongoDbAdapter
	 */
	insertMany(entities) {
		return this.collection.insertMany(entities).then(res => res.ops);
	}

	/**
	 * Update many entities by `query` and `update`
	 *
	 * @param {Object} query
	 * @param {Object} update
	 * @returns {Promise<Number>} Return with the count of modified documents.
	 *
	 * @memberof MongoDbAdapter
	 */
	updateMany(query, update) {
		return this.collection.updateMany(query, update).then(res => res.modifiedCount);
	}

	/**
	 * Update an entity by ID and `update`
	 *
	 * @param {String} _id - ObjectID as hexadecimal string.
	 * @param {Object} update
	 * @returns {Promise<Object>} Return with the updated document.
	 *
	 * @memberof MongoDbAdapter
	 */
	updateById(_id, update) {
		return this.collection.findOneAndUpdate({ _id: this.stringToObjectID(_id) }, update, { returnOriginal : false }).then(res => res.value);
	}

	/**
	 * Remove entities which are matched by `query`
	 *
	 * @param {Object} query
	 * @returns {Promise<Number>} Return with the count of deleted documents.
	 *
	 * @memberof MongoDbAdapter
	 */
	removeMany(query) {
		return this.collection.deleteMany(query).then(res => res.deletedCount);
	}

	/**
	 * Remove an entity by ID
	 *
	 * @param {String} _id - ObjectID as hexadecimal string.
	 * @returns {Promise<Object>} Return with the removed document.
	 *
	 * @memberof MongoDbAdapter
	 */
	removeById(_id) {
		return this.collection.findOneAndDelete({ _id: this.stringToObjectID(_id) }).then(res => res.value);
	}

	/**
	 * Clear all entities from collection
	 *
	 * @returns {Promise}
	 *
	 * @memberof MongoDbAdapter
	 */
	clear() {
		return this.collection.deleteMany({}).then(res => res.deletedCount);
	}

	/**
	 * Convert DB entity to JSON object. It converts the `_id` to hexadecimal `String`.
	 *
	 * @param {Object} entity
	 * @returns {Object}
	 * @memberof MongoDbAdapter
	 */
	entityToObject(entity) {
		const json = Object.assign({}, entity);
		if (entity._id)
			json._id = this.objectIDToString(entity._id);
		return json;
	}

	/**
	 * Create a filtered cursor.
	 *
	 * Available filters in `params`:
	 *  - search
	 * 	- sort
	 * 	- limit
	 * 	- offset
	 *  - query
	 *
 	 * @param {Object} params
 	 * @param {Boolean} isCounting
	 * @returns {MongoCursor}
	 */
	createCursor(params, isCounting) {
		const fn = isCounting ? this.collection.countDocuments : this.collection.find;
		let q;
		if (params) {
			// Full-text search
			// More info: https://docs.mongodb.com/manual/reference/operator/query/text/
			if (_.isString(params.search) && params.search !== "") {
				q = fn.call(this.collection, Object.assign(params.query || {}, {
					$text: {
						$search: params.search
					}
				}));

				if (q.project && !isCounting)
					q.project({ _score: { $meta: "textScore" } });

				if (q.sort && !isCounting) {
					q.sort({
						_score: {
							$meta: "textScore"
						}
					});
				}
			} else {
				q = fn.call(this.collection, params.query);

				// Sort
				if (params.sort && q.sort) {
					const sort = this.transformSort(params.sort);
					if (sort)
						q.sort(sort);
				}
			}

			// Offset
			if (_.isNumber(params.offset) && params.offset > 0)
				q.skip(params.offset);

			// Limit
			if (_.isNumber(params.limit) && params.limit > 0)
				q.limit(params.limit);

			return q;
		}

		// If not params
		return fn.call(this.collection, {});
	}

	/**
	 * Convert the `sort` param to a `sort` object to Mongo queries.
	 *
	 * @param {String|Array<String>|Object} paramSort
	 * @returns {Object} Return with a sort object like `{ "votes": 1, "title": -1 }`
	 * @memberof MongoDbAdapter
	 */
	transformSort(paramSort) {
		let sort = paramSort;
		if (_.isString(sort))
			sort = sort.replace(/,/, " ").split(" ");

		if (Array.isArray(sort)) {
			const sortObj = {};
			sort.forEach(s => {
				if (s.startsWith("-"))
					sortObj[s.slice(1)] = -1;
				else
					sortObj[s] = 1;
			});
			return sortObj;
		}

		return sort;
	}

	/**
	 * Convert hex string to ObjectID
	 *
	 * @param {String} id
	 * @returns {ObjectID}
	 *
	 * @memberof MongoDbAdapter
	 */
	stringToObjectID(id) {
		if (typeof id == "string" && id.length !== 12 && ObjectID.isValid(id))
			return new ObjectID.createFromHexString(id);
		return id;
	}

	/**
	 * Convert ObjectID to Hex string
	 *
	 * @param {ObjectID} id
	 * @returns {String}
	 *
	 * @memberof MongoDbAdapter
	 */
	objectIDToString(id) {
		if (id && id.toHexString)
			return id.toHexString();

		return id;
	}

	/**
	* Transforms 'idField' into MongoDB's '_id'
	* @param {Object} entity
	* @param {String} idField
	* @memberof MongoDbAdapter
	* @returns {Object} Modified entity
	*/
	beforeSaveTransformID (entity, idField) {
		const newEntity = _.cloneDeep(entity);

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
}

module.exports = MongoDbAdapter;
