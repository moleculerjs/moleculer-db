/*
 * moleculer-db-adapter-mongoose
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer-db)
 * MIT Licensed
 */

"use strict";

const _ 		= require("lodash");
const Promise	= require("bluebird");
const mongoose  = require("mongoose");

class MongooseDbAdapter {

	/**
	 * Creates an instance of MongooseDbAdapter.
	 * @param {any} opts 
	 * 
	 * @memberof MongooseDbAdapter
	 */
	constructor(opts) {
		this.opts = opts;
		mongoose.Promise = Promise;
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

		this.model = this.service.schema.model;
		if (!this.model) {
			/* istanbul ignore next */
			throw new Error("Missing `model` definition in schema of service!");
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
		let uri, opts;
		if (_.isObject(this.opts) && this.opts.uri != null) {
			uri = this.opts.uri;
			opts = this.opts.opts;
		} else {
			uri = this.opts;
		}

		/* istanbul ignore next */
		if (mongoose.connection.readyState != 0) {
			this.db = mongoose.connection;
			return Promise.resolve();
		}

		const conn = mongoose.connect(uri, opts);
		return conn.then(result => {
			this.db = conn.connection || result.db;

			this.db.on("disconnected", function mongoDisconnected() {
				/* istanbul ignore next */
				this.service.logger.warn("Disconnected from MongoDB.");
			}.bind(this));
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
		if (this.db) {
			this.db.close();
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
	 * @param {any} filters 
	 * @returns {Promise}
	 * 
	 * @memberof MongooseDbAdapter
	 */
	find(filters) {
		return this.createCursor(filters).exec();
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
		return this.createCursor(filters).count().exec();
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
		return this.model.update(query, update, { multi: true, "new": true }).then(res => res.n);
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
		return this.model.remove(query).then(res => res.result.n);
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
		return this.model.remove({}).then(res => res.result.n);
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
	 * @returns {MongoQuery}
	 */
	createCursor(params) {
		if (params) {
			const q = this.model.find(params.query);
			// Full-text search
			// More info: https://docs.mongodb.com/manual/reference/operator/query/text/
			if (_.isString(params.search) && params.search !== "") {
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
			} else {
				// Sort
				if (_.isString(params.sort))
					q.sort(params.sort.replace(/,/, " "));
				else if (Array.isArray(params.sort))
					q.sort(params.sort.join(" "));					
			}

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

}

module.exports = MongooseDbAdapter;
