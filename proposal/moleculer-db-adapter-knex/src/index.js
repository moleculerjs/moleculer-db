/*
 * moleculer-db-adapter-knex
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer-db)
 * MIT Licensed
 */

"use strict";

const _ 			= require("lodash");
const Promise		= require("bluebird");
const Knex 			= require("knex");

class KnexDbAdapter {

	/**
	 * Creates an instance of KnexDbAdapter.
	 * @param {any} opts
	 * @param {any} opts2
	 *
	 * @memberof KnexDbAdapter
	 */
	constructor(opts, opts2) {
		this.opts = opts;
		this.opts2 = opts2;
	}

	/**
	 * Initialize adapter
	 *
	 * @param {ServiceBroker} broker
	 * @param {Service} service
	 *
	 * @memberof KnexDbAdapter
	 */
	init(broker, service) {
		this.broker = broker;
		this.service = service;

		if (!this.service.schema.table) {
			/* istanbul ignore next */
			throw new Error("Missing `table` definition in schema of service!");
		}
		this.idField = this.service.settings.idField || "id";
	}

	/**
	 * Connect to database
	 *
	 * @returns {Promise}
	 *
	 * @memberof KnexDbAdapter
	 */
	connect() {
		this.db = Knex(this.opts || {}, this.opts2);

		const tableDef = this.service.schema.table;
		if (_.isString(tableDef)) {
			this.table = tableDef;
		} else if (_.isObject(tableDef)) {
			this.table = tableDef.name;
			if (_.isFunction(tableDef.builder)) {
				return this.db.schema.createTableIfNotExists(this.table, tableDef.builder).then(res => {
					//this.table = this.db(tableName);
				});
			}
		}

		return Promise.resolve();
		/*
		let uri, opts;
		if (_.isObject(this.opts) && this.opts.uri != null) {
			uri = this.opts.uri;
			opts = Object.assign({ promiseLibrary: Promise }, this.opts.opts);
		} else {
			uri = this.opts;
		}

		return MongoClient.connect(uri, opts).then(db => {
			this.db = db;
			this.table = db.table(this.service.schema.table);


			this.db.on("disconnected", function mongoDisconnected() {
				this.service.logger.warn("Disconnected from MongoDB.");
			}.bind(this));

		});
		*/
	}

	/**
	 * Disconnect from database
	 *
	 * @returns {Promise}
	 *
	 * @memberof KnexDbAdapter
	 */
	disconnect() {
		if (this.db) {
			//this.db.close();
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
	 * @memberof KnexDbAdapter
	 */
	find(filters) {
		return this.createCursor(filters, false);
	}

	/**
	 * Find an entities by ID.
	 *
	 * @param {String} _id
	 * @returns {Promise<Object>} Return with the found document.
	 *
	 * @memberof KnexDbAdapter
	 */
	findById(_id) {
		return this.db(this.table).where(this.idField, _id);
	}

	/**
	 * Find any entities by IDs.
	 *
	 * @param {Array} idList
	 * @returns {Promise<Array>} Return with the found documents in an Array.
	 *
	 * @memberof KnexDbAdapter
	 */
	findByIds(idList) {
		return this.db(this.table).where({
			[this.idField]: {
				$in: idList
			}
		});
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
	 * @memberof KnexDbAdapter
	 */
	count(filters = {}) {
		return Promise.resolve(-1);
		//return this.createCursor(filters, true);
	}

	/**
	 * Insert an entity.
	 *
	 * @param {Object} entity
	 * @returns {Promise<Object>} Return with the inserted document.
	 *
	 * @memberof KnexDbAdapter
	 */
	insert(entity) {
		return this.db(this.table).insert(entity, "*").debug();
	}

	/**
	 * Insert many entities
	 *
	 * @param {Array} entities
	 * @returns {Promise<Array<Object>>} Return with the inserted documents in an Array.
	 *
	 * @memberof KnexDbAdapter
	 */
	insertMany(entities) {
		return this.db(this.table).insert(entities, "*");
	}

	/**
	 * Update many entities by `query` and `update`
	 *
	 * @param {Object} query
	 * @param {Object} update
	 * @returns {Promise<Number>} Return with the count of modified documents.
	 *
	 * @memberof KnexDbAdapter
	 */
	updateMany(query, update) {
		return this.db(this.table).where(query).update(update);
	}

	/**
	 * Update an entity by ID and `update`
	 *
	 * @param {String} _id - ObjectID as hexadecimal string.
	 * @param {Object} update
	 * @returns {Promise<Object>} Return with the updated document.
	 *
	 * @memberof KnexDbAdapter
	 */
	updateById(_id, update) {
		return this.db(this.table).where(this.idField, _id).update(update);
	}

	/**
	 * Remove entities which are matched by `query`
	 *
	 * @param {Object} query
	 * @returns {Promise<Number>} Return with the count of deleted documents.
	 *
	 * @memberof KnexDbAdapter
	 */
	removeMany(query) {
		return this.db(this.table).where(query).del();
	}

	/**
	 * Remove an entity by ID
	 *
	 * @param {String} _id - ObjectID as hexadecimal string.
	 * @returns {Promise<Object>} Return with the removed document.
	 *
	 * @memberof KnexDbAdapter
	 */
	removeById(_id) {
		return this.db(this.table).where(this.idField, _id).del();
	}

	/**
	 * Clear all entities from table
	 *
	 * @returns {Promise}
	 *
	 * @memberof KnexDbAdapter
	 */
	clear() {
		return this.db(this.table).del();
	}

	/**
	 * Convert DB entity to JSON object. It converts the `_id` to hexadecimal `String`.
	 *
	 * @param {Object} entity
	 * @returns {Object}
	 * @memberof KnexDbAdapter
	 */
	entityToObject(entity) {
		let json = Object.assign({}, entity);
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
		if (params) {
			let q = this.db(this.table).where(params.query);

			// Full-text search
			/*if (_.isString(params.search) && params.search !== "") {
				q = this.db(this.table).where(Object.assign(params.query || {}, {
					$text: {
						$search: params.search
					}
				}), { _score: { $meta: "textScore" } });
				q.sort({
					_score: {
						$meta: "textScore"
					}
				});
			} else {*/
				// Sort
				if (params.sort) {
					this.transformSort(q, params.sort);
				}
			//}

			// Offset
			if (_.isNumber(params.offset) && params.offset > 0)
				q.offset(params.offset);

			// Limit
			if (_.isNumber(params.limit) && params.limit > 0)
				q.limit(params.limit);

			return q;
		}

		// If not params
		if (isCounting)
			return this.db(this.table).count(this.idField);
		else
			return this.db(this.table).where({});
	}

	/**
	 * Convert the `sort` param to a `sort` object to Mongo queries.
	 *
	 * @param {Cursor} q
	 * @param {String|Array<String>|Object} paramSort
	 * @returns {Object} Return with a sort object like `{ "votes": 1, "title": -1 }`
	 * @memberof KnexDbAdapter
	 */
	transformSort(q, paramSort) {
		let sort = paramSort;
		if (_.isString(sort))
			sort = sort.replace(/,/, " ").split(" ");

		if (Array.isArray(sort)) {
			let sortObj = {};
			sort.forEach(s => {
				if (s.startsWith("-"))
					sortObj[s.slice(1)] = -1;
				else
					sortObj[s] = 1;
			});
			return sortObj;
		}

		if (_.isObject(sort)) {
			Object.keys(sort).forEach(key => {
				q.sort(key, sort[key] > 0 ? "asc" : "desc");
			});
		}

		return q;
	}

}

module.exports = KnexDbAdapter;
