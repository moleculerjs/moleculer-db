/*
 * moleculer-db-adapter-sequelize
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer-db)
 * MIT Licensed
 */

"use strict";

const _ 		= require("lodash");
const { ServiceSchemaError } = require("moleculer").Errors;
const Sequelize = require("sequelize");

const { Model, Op } = Sequelize;

class SequelizeDbAdapter {

	/**
	 * Creates an instance of SequelizeDbAdapter.
	 * @param {any} opts
	 *
	 * @memberof SequelizeDbAdapter
	 */
	constructor(...opts) {
		this.opts = opts;
	}

	/**
	 * Initialize adapter
	 *
	 * @param {ServiceBroker} broker
	 * @param {Service} service
	 *
	 * @memberof SequelizeDbAdapter
	 */
	init(broker, service) {
		this.broker = broker;
		this.service = service;

		if (!this.service.schema.model) {
			/* istanbul ignore next */
			throw new ServiceSchemaError("Missing `model` definition in schema of service!");
		}
	}

	/**
	 * Connect to database
	 *
	 * @returns {Promise}
	 *
	 * @memberof SequelizeDbAdapter
	 */
	connect() {
		const sequelizeInstance = this.opts[0];

		if (sequelizeInstance && sequelizeInstance instanceof Sequelize)
			this.db = sequelizeInstance;
		else
			this.db = new Sequelize(...this.opts);

		return this.db.authenticate().then(() => {
			const modelDefinitionOrInstance = this.service.schema.model;

			let noSync = false;
			if (this.opts[0] && Object.prototype.hasOwnProperty.call(this.opts[0],"noSync")) {
				noSync = !!this.opts[0].noSync;
			} else if (this.opts[0] && Object.prototype.hasOwnProperty.call(this.opts[0],"sync")) {
				noSync = !this.opts[0].sync.force;
			} else if (this.opts[3] && Object.prototype.hasOwnProperty.call(this.opts[3],"sync")) {
				noSync = !this.opts[3].sync.force;
			} else if (this.opts[3]) {
				noSync = !!this.opts[3].noSync;
			}

			let modelReadyPromise;
			const isModelInstance = modelDefinitionOrInstance
				&& (Object.prototype.hasOwnProperty.call(modelDefinitionOrInstance, "attributes")
					|| modelDefinitionOrInstance.prototype instanceof Model);
			if (isModelInstance) {
				this.model = modelDefinitionOrInstance;
				modelReadyPromise = Promise.resolve();
			} else {
				this.model = this.db.define(modelDefinitionOrInstance.name, modelDefinitionOrInstance.define, modelDefinitionOrInstance.options);
				modelReadyPromise = noSync ? Promise.resolve(this.model) : this.model.sync();
			}
			this.service.model = this.model;

			return modelReadyPromise.then(() => {
				this.service.logger.info("Sequelize adapter has connected successfully.");
			}).catch((e) => {
				return this.db.close()
					.finally(() => Promise.reject(e));
			});
		});
	}

	/**
	 * Disconnect from database
	 *
	 * @returns {Promise}
	 *
	 * @memberof SequelizeDbAdapter
	 */
	disconnect() {
		if (this.db) {
			return this.db.close();
		}
		/* istanbul ignore next */
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
	 * @memberof SequelizeDbAdapter
	 */
	find(filters) {
		return this.createCursor(filters);
	}

	/**
	 * Find an entity by query
	 *
	 * @param {Object} query
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	findOne(query) {
		return this.model.findOne(query);
	}

	/**
	 * Find an entities by ID
	 *
	 * @param {any} _id
	 * @returns {Promise}
	 *
	 * @memberof SequelizeDbAdapter
	 */
	findById(_id) {
		return this.model.findByPk(_id);
	}

	/**
	 * Find any entities by IDs
	 *
	 * @param {Array} idList
	 * @returns {Promise}
	 *
	 * @memberof SequelizeDbAdapter
	 */
	findByIds(idList) {
		return this.model.findAll({
			where: {
				id: {
					[Op.in]: idList
				}
			}
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
	 *
	 * @memberof SequelizeDbAdapter
	 */
	count(filters = {}) {
		return this.createCursor(filters, true);
	}

	/**
	 * Insert an entity
	 *
	 * @param {Object} entity
	 * @returns {Promise}
	 *
	 * @memberof SequelizeDbAdapter
	 */
	insert(entity) {
		return this.model.create(entity);
	}

	/**
	 * Insert many entities
	 *
	 * @param {Array} entities
	 * @param {Object} opts
	 * @returns {Promise}
	 *
	 * @memberof SequelizeDbAdapter
	 */
	insertMany(entities, opts = { returning: true }) {
		return this.model.bulkCreate(entities, opts);
	}

	/**
	 * Update many entities by `where` and `update`
	 *
	 * @param {Object} where
	 * @param {Object} update
	 * @returns {Promise}
	 *
	 * @memberof SequelizeDbAdapter
	 */
	updateMany(where, update) {
		return this.model.update(update, { where }).then(res => res[0]);
	}

	/**
	 * Update an entity by ID and `update`
	 *
	 * @param {any} _id
	 * @param {Object} update
	 * @returns {Promise}
	 *
	 * @memberof SequelizeDbAdapter
	 */
	updateById(_id, update) {
		return this.findById(_id).then(entity => {
			return entity && entity.update(update["$set"]);
		});
	}

	/**
	 * Remove entities which are matched by `where`
	 *
	 * @param {Object} where
	 * @returns {Promise}
	 *
	 * @memberof SequelizeDbAdapter
	 */
	removeMany(where) {
		return this.model.destroy({ where });
	}

	/**
	 * Remove an entity by ID
	 *
	 * @param {any} _id
	 * @returns {Promise}
	 *
	 * @memberof SequelizeDbAdapter
	 */
	removeById(_id) {
		return this.findById(_id).then(entity => {
			return entity && entity.destroy().then(() => entity);
		});
	}

	/**
	 * Clear all entities from collection
	 *
	 * @returns {Promise}
	 *
	 * @memberof SequelizeDbAdapter
	 */
	clear() {
		return this.model.destroy({ where: {} });
	}

	/**
	 * Convert DB entity to JSON object
	 *
	 * @param {any} entity
	 * @returns {Object}
	 * @memberof SequelizeDbAdapter
	 */
	entityToObject(entity) {
		return entity.get({ plain: true });
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
 	 * @param {Boolean} isCounting
	 * @returns {Promise}
	 */
	createCursor(params, isCounting) {
		if (!params) {
			if (isCounting)
				return this.model.count();

			return this.model.findAll();
		}

		const q = {
			where: {}
		};

		const searchConditions = [];

		// Text search
		if (_.isString(params.search) && params.search !== "") {
			let fields = [];
			if (params.searchFields) {
				fields = _.isString(params.searchFields) ? params.searchFields.split(" ") : params.searchFields;
			}

			for (const f of fields) {
				searchConditions.push({
					[f]: {
						[Op.like]: "%" + params.search + "%"
					}
				});
			}
		}
		// Case insensitive search
		else if (_.isString(params.iSearch) && params.iSearch !== "") {
			let fields = [];
			if (params.searchFields) {
				fields = _.isString(params.searchFields) ? params.searchFields.split(" ") : params.searchFields;
			}
			const lowerCaseSearch = "%" + (params.iSearch).toLowerCase() + "%";  

			for (const f of fields) {
				searchConditions.push(Sequelize.where(
					Sequelize.fn("lower", Sequelize.col(f)),
					Op.like,
					lowerCaseSearch
				));
			}
		}
		
		// Assign only query params
		if (searchConditions.length == 0) {
			if (params.query) {
				Object.assign(q.where, params.query);
			}
		// Assign query and search params
		} else {
			if (params.query) {
				q.where[Op.and] = [
					params.query,
					{ [Op.or]: searchConditions }
				];
			} else {
				q.where[Op.or] = searchConditions;
			}
		}

		// Sort
		if (params.sort) {
			const sort = this.transformSort(params.sort);
			if (sort)
				q.order = sort;
		}

		// Offset
		if (_.isNumber(params.offset) && params.offset > 0)
			q.offset = params.offset;

		// Limit
		if (_.isNumber(params.limit) && params.limit > 0)
			q.limit = params.limit;

		if (isCounting)
			return this.model.count(q);

		return this.model.findAll(q);
	}

	/**
	 * Convert the `sort` param to a `sort` object to Sequelize queries.
	 *
	 * @param {String|Array<String>|Object} paramSort
	 * @returns {Object} Return with a sort object like `[["votes", "ASC"], ["title", "DESC"]]`
	 * @memberof SequelizeDbAdapter
	 */
	transformSort(paramSort) {
		let sort = paramSort;
		if (_.isString(sort))
			sort = sort.replace(/,/, " ").split(" ");

		if (Array.isArray(sort)) {
			const sortObj = [];
			sort.forEach(s => {
				if (s.startsWith("-"))
					sortObj.push([s.slice(1), "DESC"]);
				else
					sortObj.push([s, "ASC"]);
			});
			return sortObj;
		}

		if (_.isObject(sort)) {
			return Object.keys(sort).map(name => [name, sort[name] > 0 ? "ASC" : "DESC"]);
		}

		/* istanbul ignore next*/
		return [];
	}

	/**
	* For compatibility only.
	* @param {Object} entity
	* @param {String} idField
	* @memberof SequelizeDbAdapter
	* @returns {Object} Entity
	*/
	beforeSaveTransformID(entity, idField) {
		return entity;
	}

	/**
	* For compatibility only.
	* @param {Object} entity
	* @param {String} idField
	* @memberof SequelizeDbAdapter
	* @returns {Object} Entity
	*/
	afterRetrieveTransformID(entity, idField) {
		return entity;
	}

}

module.exports = SequelizeDbAdapter;
