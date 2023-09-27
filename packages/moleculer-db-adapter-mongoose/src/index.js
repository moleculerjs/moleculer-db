/*
 * moleculer-db-adapter-mongoose
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer-db)
 * MIT Licensed
 */

"use strict";

const _ 		= require("lodash");
const Promise	= require("bluebird");
const { ServiceSchemaError, MoleculerError } = require("moleculer").Errors;
const mongoose  = require("mongoose");

mongoose.set("strictQuery", true);

class MongooseDbAdapter {

	/**
	 * Creates an instance of MongooseDbAdapter.
	 *
	 * @param {String} uri - The connection URI for the MongoDB server.
	 * @param {Object} [mongooseOpts] - Optional mongoose options.
	 * @param {Object} [opts] - Optional additional options.
	 * @param {boolean} [opts.replaceVirtualsRefById=true] - Flag indicating whether to replace virtual fields with their referenced document's ID.
	 * 														 Discussed here : https://github.com/moleculerjs/moleculer-db/pull/354#issuecomment-1736853966
	 *
	 * @memberof MongooseDbAdapter
	 */
	constructor(uri, mongooseOpts, opts = { replaceVirtualsRefById: true }) {
		this.uri = uri;
		this.mongooseOpts = mongooseOpts;
		this.opts = opts
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
			/**
			 * using model here is not a problem because we will dismantle it, and re-create a model with the correct connection later
			 * note : when creating models before the DB, they're linked to the default connection, and not the current one
			 * @link https://mongoosejs.com/docs/connections.html#multiple_connections
			 * @type {Mongoose.Model}
			 */
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
		return mongoose.createConnection(this.uri, this.mongooseOpts).asPromise().then(conn => {
            this.conn = conn;

			if (this.conn.readyState !== mongoose.connection.states.connected) {
				throw new MoleculerError(
					`MongoDB connection failed . Status is "${
						mongoose.states[this.conn._readyState]
					}"`
				);
			}


			if(this.model) {
				this.model = this.conn.model(this.model["modelName"],this.model["schema"]);
			}
			if(this.schema) {
				this.model = this.conn.model(this.modelName, this.schema);
			}

			this.db = this.conn.db;

			if (!this.db) {
				throw new MoleculerError("MongoDB connection failed to get DB object");
			}

			this.service.logger.info("MongoDB adapter has connected successfully.");

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
		if (this.db && this.db.close) {
			return this.db.close();
		} else if (this.conn && this.conn.close) {
			return this.conn.close();
		} else {
			return mongoose.connection.close();
		}
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
	 * Get count of filtered entities
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
	 * @param {Context} ctx - moleculer context
	 * @returns {Object}
	 * @memberof MongooseDbAdapter
	 */
	entityToObject(entity, ctx) {
		const fieldsToPopulate = _.get(ctx, "params.populate", []);
		const virtualFields = Object.values(_.get(this, "model.schema.virtuals", {}))
			.reduce((acc, virtual) => _.get(virtual, "options.ref") ? [...acc, virtual.path] : acc, []);
		const virtualsToPopulate = _.intersection(fieldsToPopulate, virtualFields);

		const populate = []
		if(!this.opts.replaceVirtualsRefById) {
			const options = {skipInvalidIds: true, lean: true};
			const transform = (doc) => doc._id;
			virtualsToPopulate.map(path => ({path, select: "_id", options, transform})).forEach(v => populate.push(v));
		}

		return Promise.resolve(populate.length > 0 ? entity.populate(populate) : entity)
			.then(entity => {
				const json = entity.toJSON();

				json._id = this.convertObjectIdToString(entity._id);

				if(this.opts.replaceVirtualsRefById && virtualsToPopulate.length > 0) {
					virtualsToPopulate
						.map((fieldName) => [fieldName, _.get(this, "model.schema.virtuals", {})[fieldName]])
						.filter(([, virtual]) => !!virtual)
						.forEach(([field, virtual]) => {
							json[field] = this.convertObjectIdToString(entity[virtual.options.localField])
						})
				}


				return json;
			});
	}


	/**
	 * Converts an object id to a string representation.
	 *
	 * @param {Object} _id - The object id to convert.
	 * @return {string|Object} The string representation of the object id. (or the object in case we fail to convert it)
	 */
	convertObjectIdToString(_id) {
		if (_id && _id.toHexString) {
			return _id.toHexString();
		} else if (_id && _id.toString) {
			return _id.toString();
		}

		return _id
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
