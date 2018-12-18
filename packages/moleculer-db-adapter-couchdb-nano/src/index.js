/*
 * moleculer-db-adapter-couchdb-nano
 * Copyright (c) 2018 Mr. Kutin (https://github.com/mrkutin/moleculer-db-adapter-couchdb-nano)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const Promise = require("bluebird");

class CouchDbNanoAdapter {

	/**
	 * Creates an instance of CouchDbNano.
	 * @param {String} uri
	 * @param {Object?} opts
	 *
	 * @memberof CouchDbNano
	 */
	constructor(uri, opts) {
		this.uri = uri;
		this.opts = opts;
		this.collection = null;
	}

	/**
	 * Initialize adapter
	 *
	 * @param {ServiceBroker} broker
	 * @param {Service} service
	 *
	 * @memberof CouchDbNano
	 */
	init(broker, service) {
		this.broker = broker;
		this.service = service;

		if (!this.service.schema.collection) {
			throw new Error("Missing `collection` definition in schema of service!");
		}
	}

	/**
	 * Connect to database
	 *
	 * @returns {Promise}
	 *
	 * @memberof CouchDbNano
	 */
	connect() {
		const opts = Object.assign({}, this.opts, {url: this.uri ? this.uri.replace("couchdb://", "http://") : "" || "http://localhost:5984"});
		const nano = require("nano")(opts);
		const dbName = `${this.service.schema.collection}`;

		return Promise.resolve(
			nano.db.get(dbName)
				.catch(e => {
					if (e.statusCode === 404) {
						return nano.db.create(dbName);
					}
					throw(e);
				})
				.then(() => this.collection = nano.db.use(dbName))
		);
	}

	/**
	 * Disconnect from database
	 *
	 * @returns {Promise}
	 *
	 * @memberof CouchDbNano
	 */
	disconnect() {
		this.collection = null;
		return Promise.resolve();
	}

	/**
	 * Insert an entity.
	 *
	 * @param {Object} entity
	 * @returns {Promise<Object>} Return with the inserted document.
	 *
	 * @memberof CouchDbNano
	 */
	insert(entity) {
		return Promise.resolve(
			this.collection.insert(entity).then(result => this.findById(result.id))
		);
	}

	/**
	 * Find an entity by ID.
	 *
	 * @param {String} _id
	 * @returns {Promise<Object>} Return with the found document.
	 *
	 * @memberof CouchDbNano
	 */
	findById(_id) {
		return Promise.resolve(this.collection.get(_id));
	}

	/**
	 * Remove an entity by ID
	 *
	 * @param {String} _id - ObjectID as hexadecimal string.
	 * @returns {Promise<Object>} Return with the removed document.
	 *
	 * @memberof CouchDbNano
	 */
	removeById(_id) {
		return Promise.resolve(
			this.findById(_id)
				.then(doc => {
					return this.collection.destroy(doc._id, doc._rev);
				})
				.then(res => {
					res._id = res.id;
					delete res.id;
					return res;
				})
		);
	}

	/**
	 * Find all entities by filters.
	 *
	 * Available filter props:
	 *    - limit
	 *  - offset
	 *  - sort
	 *  - search
	 *  - searchFields
	 *  - selector
	 *
	 * @param {Object} filters
	 * @returns {Promise<Array>}
	 *
	 * @memberof CouchDbNano
	 */
	find(filters) {
		const limit = filters.limit;
		const skip = filters.skip;
		const sort = filters.sort;
		const fields = filters.fields;

		const selector = filters.selector ? filters.selector : filters;
		if (selector.limit) {
			delete selector.limit;
		}
		if (selector.skip) {
			delete selector.skip;
		}
		if (selector.sort) {
			delete selector.sort;
		}
		if (selector.fields) {
			delete selector.fields;
		}

		Object.entries(selector).forEach(([key, value]) => {
			if (typeof value !== "object") {
				selector[key] = {$eq: value};
			}
		});
		return Promise.resolve(this.collection.find({selector, limit, skip, sort, fields}).then(result => result.docs));
	}

	/**
	 * Find an entity by selector
	 *
	 * @param {Object} selector
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	findOne(selector) {
		return this.find({selector: selector, limit: 1}).then(docs => docs.length ? docs[0] : null);
	}

	/**
	 * Find any entities by IDs.
	 *
	 * @param {Array} idList
	 * @returns {Promise<Array>} Return with the found documents in an Array.
	 *
	 * @memberof CouchDbNano
	 */
	findByIds(idList) {
		return Promise.resolve(
			this.collection.fetch({keys: idList})
				.then(res => res.rows.map(el => el.doc))
		);
	}

	/**
	 * Insert many entities
	 *
	 * @param {Array} entities
	 * @returns {Promise<Array<Object>>} Return with the inserted documents in an Array.
	 *
	 * @memberof CouchDbNano
	 */
	insertMany(entities) {
		return Promise.resolve(
			this.collection.bulk({docs: entities})
				.then(result => result.map(el => el.id))
				.then(ids => this.findByIds(ids))
		);
	}

	/**
	 * Update many entities by `selector` and `update`
	 *
	 * @param {Object} selector
	 * @param {Object} update
	 * @returns {Promise<Number>} Count of modified documents.
	 *
	 * @memberof CouchDbNano
	 */
	updateMany(selector, update) {
		return this.find({selector})
			.then(docs => docs.map(doc => Object.assign({}, doc, update.$set ? update.$set : update)))
			.then(docs => this.collection.bulk({docs}))
			.then(result => result.length);
	}

	/**
	 * Remove entities which are matched by `selector`
	 *
	 * @param {Object} selector
	 * @returns {Promise<Number>} Return with the count of deleted documents.
	 *
	 * @memberof CouchDbNano
	 */
	removeMany(selector) {
		return this.find({selector})
			.then(docs => docs.map(doc => Object.assign({}, doc, {_deleted: true})))
			.then(docs => this.collection.bulk({docs}))
			.then(result => result.length);
	}

	/**
	 * Get count of filtered entites.
	 *
	 * Available filter props:
	 * - selector (json) – JSON object describing criteria used to select documents. More information provided in the section on selector syntax. Required
	 * - limit (number) – Maximum number of results returned. Default is 25. Optional
	 * - skip (number) – Skip the first ‘n’ results, where ‘n’ is the value specified. Optional
	 * - sort (json) – JSON array following sort syntax. Optional
	 *
	 * @param {Object} [filters={}]
	 * @returns {Promise<Number>} Return with the count of documents.
	 *
	 * @memberof CouchDbNano
	 */
	count(filters = {}) {
		return this.find(filters).then(docs => docs.length);
	}

	/**
	 * Update an entity by ID and `update`
	 *
	 * @param {String} _id - ObjectID as hexadecimal string.
	 * @param {Object} update
	 * @returns {Promise<Object>} Return with the updated document.
	 *
	 * @memberof CouchDbNano
	 */
	updateById(_id, update) {
		return this.findById(_id)
			.then(doc => Object.assign({}, doc, update.$set ? update.$set : update))
			.then(mergedDoc => this.collection.insert(mergedDoc))
			.then(result => this.findById(result.id));
	}

	/**
	 * Clear all entities from collection
	 *
	 * @returns {Promise}
	 *
	 * @memberof CouchDbNano
	 */
	clear() {
		return this.removeMany({});
	}

	/**
	 * Convert DB entity to JSON object. It converts the `_id` to hexadecimal `String`.
	 *
	 * @param {Object} entity
	 * @returns {Object}
	 * @memberof CouchDbNano
	 */
	entityToObject(entity) {
		let json = _.cloneDeep(entity);
		return json;
	}

	/**
	 * Transforms 'idField' into CouchDB's '_id'
	 * @param {Object} entity
	 * @param {String} idField
	 * @memberof CouchDbNano
	 * @returns {Object} Modified entity
	 */
	beforeSaveTransformID(entity, idField) {
		let newEntity = _.cloneDeep(entity);
		if (idField !== "_id" && newEntity[idField] !== undefined) {
			newEntity._id = newEntity[idField];
			delete newEntity[idField];
		}
		return newEntity;
	}

	/**
	 * Transforms '_id' into user defined 'idField'
	 * @param {Object} entity
	 * @param {String} idField
	 * @memberof CouchDbNano
	 * @returns {Object} Modified entity
	 */
	afterRetrieveTransformID(entity, idField) {
		if (idField !== "_id") {
			entity[idField] = entity["_id"];
			delete entity._id;
		}
		return entity;
	}
}

module.exports = CouchDbNanoAdapter;
