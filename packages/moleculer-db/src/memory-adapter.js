/*
 * moleculer-db
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer-db)
 * MIT Licensed
 */

"use strict";

const _ 		= require("lodash");
const Datastore = require("@seald-io/nedb");
const util = require("util");
const {method} = require("lodash");

/**
 * NeDB adapter for `moleculer-db`
 *
 * @class MemoryDbAdapter
 */
class MemoryDbAdapter {

	/**
	 * Creates an instance of MemoryDbAdapter.
	 *
	 * @param {Object} opts
	 * @memberof MemoryDbAdapter
	 */
	constructor(opts) {
		this.opts = opts;
	}

	/**
	 * Initialize adapter
	 *
	 * @param {ServiceBroker} broker
	 * @param {Service} service
	 * @memberof MemoryDbAdapter
	 */
	init(broker, service) {
		this.broker = broker;
		this.service = service;
	}

	/**
	 * Connect to database
	 *
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	connect() {
		if(this.opts instanceof Datastore)
			this.db = this.opts; //use preconfigured datastore
		else
			this.db = new Datastore(this.opts); // in-memory

		["loadDatabase", "insert", "findOne", "count", "remove", "ensureIndex", "removeIndex"].forEach(method => {
			this.db[method] = util.promisify(this.db[method]);
		});

		const _update = this.db["update"];

		this.db["update"] = util.promisify(function(...args) {
			return new Promise(() => {
				const cb = args.pop();
				return _update.call(this, ...args, (err, ...results) => {
					return cb(err, results);
				});
			});
		});

		return this.db.loadDatabase();
	}

	/**
	 * Disconnect from database
	 *
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	disconnect() {
		this.db = null;
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
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	find(filters) {
		return new Promise((resolve, reject) => {
			this.createCursor(filters).exec((err, docs) => {
				/* istanbul ignore next */
				if (err)
					return reject(err);

				resolve(docs);
			});

		});
	}

	/**
	 * Find an entity by query
	 *
	 * @param {Object} query
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	findOne(query) {
		return this.db.findOne(query);
	}

	/**
	 * Find an entity by ID
	 *
	 * @param {any} _id
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	findById(_id) {
		return this.db.findOne({ _id });
	}

	/**
	 * Find all entites by IDs
	 *
	 * @param {Array<Number>} ids
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	findByIds(ids) {
		return new Promise((resolve, reject) => {
			this.db.find({ _id: { $in: ids } }).exec((err, docs) => {
				/* istanbul ignore next */
				if (err)
					return reject(err);

				resolve(docs);
			});

		});
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
	 * @memberof MemoryDbAdapter
	 */
	count(filters = {}) {
		return new Promise((resolve, reject) => {
			this.createCursor(filters).exec((err, docs) => {
				/* istanbul ignore next */
				if (err)
					return reject(err);

				resolve(docs.length);
			});

		});
	}

	/**
	 * Insert an entity
	 *
	 * @param {Object} entity
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	insert(entity) {
		return this.db.insert(entity);
	}

	/**
	 * Insert multiple entities
	 *
	 * @param {Array<Object>} entities
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	insertMany(entities) {
		return this.db.insert(entities);
	}

	/**
	 * Update many entities by `query` and `update`
	 *
	 * @param {Object} query
	 * @param {Object} update
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	updateMany(query, update) {
		return this.db.update(query, update, { multi: true }).then(res => res[0]);
	}

	/**
	 * Update an entity by ID
	 *
	 * @param {any} _id
	 * @param {Object} update
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	updateById(_id, update) {
		return this.db.update({ _id }, update, { returnUpdatedDocs: true }).then(res => res[1]);
	}

	/**
	 * Remove many entities which are matched by `query`
	 *
	 * @param {Object} query
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	removeMany(query) {
		return this.db.remove(query, { multi: true });
	}

	/**
	 * Remove an entity by ID
	 *
	 * @param {any} _id
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	removeById(_id) {
		return this.db.remove({ _id });
	}

	/**
	 * Clear all entities from DB
	 *
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	clear() {
		return this.db.remove({}, { multi: true });
	}

	/**
	 * Convert DB entity to JSON object
	 *
	 * @param {any} entity
	 * @returns {Object}
	 * @memberof MemoryDbAdapter
	 */
	entityToObject(entity) {
		return entity;
	}

	/**
	 * Add filters to query
	 *
	 * Available filters:
	 *  - search
	 *  - searchFields
	 * 	- sort
	 * 	- limit
	 * 	- offset
	 *  - query
	 *
	 * @param {Object} params
	 * @returns {Query}
	 * @memberof MemoryDbAdapter
	 */
	createCursor(params) {
		if (params) {
			let q;

			// Text search
			if (_.isString(params.search) && params.search !== "") {
				let fields = [];
				if (params.searchFields) {
					fields = _.isString(params.searchFields) ? params.searchFields.split(" ") : params.searchFields;
				}

				q = this.db.find({
					$where: function() {
						let item = this;
						if (fields.length > 0)
							item = _.pick(this, fields);

						const res = _.values(item).find(v => String(v).toLowerCase().indexOf(params.search.toLowerCase()) !== -1);

						return res != null;
					}
				});
			} else {
				if (params.query)
					q = this.db.find(params.query);
				else
					q = this.db.find({});
			}

			// Sort
			if (params.sort) {
				const sortFields = {};
				params.sort.forEach(field => {
					if (field.startsWith("-"))
						sortFields[field.slice(1)] = -1;
					else
						sortFields[field] = 1;
				});
				q.sort(sortFields);
			}

			// Limit
			if (_.isNumber(params.limit) && params.limit > 0)
				q.limit(params.limit);

			// Offset
			if (_.isNumber(params.offset) && params.offset > 0)
				q.skip(params.offset);

			return q;
		}

		return this.db.find({});
	}

	/**
	* Transforms 'idField' into NeDB's '_id'
	* @param {Object} entity
	* @param {String} idField
	* @memberof MemoryDbAdapter
	* @returns {Object} Modified entity
	*/
	beforeSaveTransformID (entity, idField) {
		const newEntity = _.cloneDeep(entity);

		if (idField !== "_id" && entity[idField] !== undefined) {
			newEntity._id = newEntity[idField];
			delete newEntity[idField];
		}

		return newEntity;
	}

	/**
	* Transforms NeDB's '_id' into user defined 'idField'
	* @param {Object} entity
	* @param {String} idField
	* @memberof MemoryDbAdapter
	* @returns {Object} Modified entity
	*/
	afterRetrieveTransformID (entity, idField) {
		if (idField !== "_id") {
			entity[idField] = entity["_id"];
			delete entity._id;
		}
		return entity;
	}
}

module.exports = MemoryDbAdapter;
