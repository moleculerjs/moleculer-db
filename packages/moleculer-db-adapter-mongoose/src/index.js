/*
 * moleculer-db-adapter-mongoose
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer-db)
 * MIT Licensed
 */

"use strict";

const _ 		= require("lodash");
const { ServiceSchemaError, MoleculerError } = require("moleculer").Errors;
const mongoose  = require("mongoose");

mongoose.set("strictQuery", true);

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
		this.useNativeMongooseVirtuals = !!service.settings?.useNativeMongooseVirtuals;

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
		let conn;
		let multipleConns;

		if (this.model) {
			/* istanbul ignore next */
			if (mongoose.connection.readyState == 1) {
				this.db = mongoose.connection;
				return Promise.resolve();
			} else if (mongoose.connection.readyState == 2) {
				conn = mongoose.connection.asPromise();
			} else {
				conn = mongoose.connect(this.uri, this.opts);
			}
		} else if (this.schema) {
			conn = new Promise(resolve =>{
				const c = mongoose.createConnection(this.uri, this.opts);
				this.model = c.model(this.modelName, this.schema);
				multipleConns = c;
				resolve(c);
			});
		}
		
		return conn.then(() => {
			this.conn = multipleConns || mongoose.connection;

			if (this.conn.readyState != this.conn.states.connected) {
				throw new MoleculerError(
					`MongoDB connection failed . Status is "${
						this.conn.states[this.conn._readyState]
					}"`
				);
			}

			if(this.model) {
				this.model = mongoose.model(this.model["modelName"],this.model["schema"]);
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
		return new Promise(resolve => {
			if (this.db && this.db.close) {
				this.db.close(resolve);
			} else if (this.conn && this.conn.close) {
				this.conn.close(resolve);
			} else {
				mongoose.connection.close(resolve);
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
		return this.model.updateMany(query, update, { multi: true, "new": true }).then(res => {
			return res.modifiedCount;
		});
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
		return this.model.deleteMany(query).then(res => {
			return res.deletedCount;
		});
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
		return this.model.findByIdAndDelete(_id);
	}

	/**
	 * Clear all entities from collection
	 *
	 * @returns {Promise}
	 *
	 * @memberof MongooseDbAdapter
	 */
	clear() {
		return this.model.deleteMany({}).then(res => res.deletedCount);
	}

	/**
	 * Return proper query to populate virtuals depending on service populate params
	 *
	 * @param {Context} ctx - moleculer context
	 * @returns {Object[]}
	 * @memberof MongooseDbAdapter
	 */
	getNativeVirtualPopulateQuery(ctx) {
		const fieldsToPopulate = ctx.params?.populate || [];

		if (fieldsToPopulate.length === 0) return [];

		const virtualFields = Object.entries( this.model?.schema?.virtuals || {})
			.reduce((acc, [path, virtual]) => {
				const hasRef = !!(virtual.options?.ref || virtual.options?.refPath);
				const hasMatch = !! virtual.options?.match;
				if (hasRef) acc[path] = hasMatch;
				return acc;
			}, {});
		const virtualsToPopulate = _.intersection(fieldsToPopulate, Object.keys(virtualFields));

		if (virtualsToPopulate.length === 0) return [];

		const getPathOptions = (path) =>
			_.get(ctx, `service.settings.virtuals.${path}.options`, {skipInvalidIds: true, lean: true});

		const getPathTransform = (path) =>
			_.get(ctx, `service.settings.virtuals.${path}.transform`, (doc) => doc._id);

		const getPathSelect = (path) =>
			_.get(ctx, `service.settings.virtuals.${path}.select`, _.get(virtualFields, path) ? undefined : "_id");

		return virtualsToPopulate.map((path) => ({
			path,
			select: getPathSelect(path),
			options : getPathOptions(path),
			transform: getPathTransform(path)
		}));
	}

	/**
	 * Replace virtuals that would trigger subqueries by the localField
	 * they target to be used later in action propagation
	 *
	 * @param {Context} ctx - moleculer context
	 * @param {Object} json - the JSONified entity
	 * @returns {Object}
	 * @memberof MongooseDbAdapter
	 */
	mapVirtualsToLocalFields(ctx, json) {
		Object.entries(this.model?.schema?.virtuals || {})
			.forEach(([path, virtual]) => {
				const localField = virtual.options?.localField;
				if (localField) json[path] = json[localField];
			});
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
		const populate = this.useNativeMongooseVirtuals ? this.getNativeVirtualPopulateQuery(ctx) : [];

		return Promise.resolve(populate.length > 0 ? entity.populate(populate) : entity)
			.then(entity => {
				const json = entity.toJSON();

				if (entity._id && entity._id.toHexString) {
					json._id = entity._id.toHexString();
				} else if (entity._id && entity._id.toString) {
					json._id = entity._id.toString();
				}

				if (!this.useNativeMongooseVirtuals) {
					this.mapVirtualsToLocalFields(ctx, json);
				}

				return json;
			});
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
