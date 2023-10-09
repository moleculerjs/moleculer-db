/*
 * moleculer-db-adapter-prisma
 * Copyright (c) 2022 MoleculerJS (https://github.com/moleculerjs/moleculer-addons)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { ServiceSchemaError } = require("moleculer").Errors;

const { PrismaClient } = require("@prisma/client");

const DELETED_FIELD = "deletedAt";

class PrismaDbAdapter {
	/**
	 * Creates an instance of PrismaDbAdapter.
	 * @param {any} opts
	 */
	constructor(opts = {}) {
		this.opts = opts;
		this.db = new PrismaClient({ log: opts.log || ["error"] });
	}

	/**
	 * Initialize adapter
	 *
	 * @param {ServiceBroker} broker
	 * @param {Service} service
	 */
	init(broker, service) {
		this.broker = broker;
		this.service = service;

		const model = this.service.schema.model;
		if (!model) {
			/* istanbul ignore next */
			throw new ServiceSchemaError(
				"Missing `model` definition in schema of service!"
			);
		}

		if (this.opts.enableSoftDelete) {
			this.db.$use(async (params, next) => {
				// Check incoming query type
				if (_.toLower(params.model) === _.toLower(model)) {
					switch (params.action) {
						case "delete":
							params.action = "update";
							_.set(params.args, `data.${DELETED_FIELD}`, new Date());
							break;
						case "deleteMany":
							params.action = "updateMany";
							_.set(params.args, `data.${DELETED_FIELD}`, new Date());
							break;
						case "findUnique":
						case "findFirst":
							params.action = "findFirst";
							_.set(params.args, `where.${DELETED_FIELD}`, null);
							break;
						case "findMany":
						case "count":
							_.set(params.args, `where.${DELETED_FIELD}`, null);
							break;
						// case "update":
						// 	params.action = "updateMany";
						case "updateMany":
							_.set(params.args, `where.${DELETED_FIELD}`, null);
							break;
						default:
							break;
					}
				}

				return next(params);
			});
		}
	}

	/**
	 * Connect to database
	 *
	 * @returns {Promise}
	 */
	async connect() {
		return this.db.$connect().then(() => {
			// eslint-disable-next-line no-prototype-builtins
			if (!this.db.hasOwnProperty(this.service.schema.model)) {
				throw new Error(`Incorrect model: ${this.service.schema.model}`);
			}

			this.model = this.db[this.service.schema.model];

			this.service.logger.info("Prisma adapter has connected successfully.");
		}).catch((e) => {
			return this.db.$disconnect().finally(() => Promise.reject(e));
		});
	}

	/**
	 * Disconnect from database
	 *
	 * @returns {Promise}
	 */
	async disconnect() {
		return this.db.$disconnect();
	}

	async query(string) {
		return this.db.$queryRawUnsafe(string);
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
	 */
	async find(filters) {
		return this.createCursor(filters);
	}

	/**
	 * Find an entity by query
	 *
	 * @param {Object} query
	 * @returns {Promise}
	 */
	async findOne(query) {
		return this.model.findFirst({
			where: query,
		});
	}

	/**
	 * Find an entities by ID
	 *
	 * @param {any} _id
	 * @returns {Promise}
	 */
	async findById(id) {
		return this.model.findUnique({
			where: {
				id,
			},
		});
	}

	/**
	 * Find any entities by IDs
	 *
	 * @param {Array} idList
	 * @returns {Promise}
	 */
	async findByIds(idList) {
		if (_.isEmpty(idList)) {
			return [];
		}

		return this.model.findMany({
			where: {
				id: { in: idList },
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
	 */
	async count(params) {
		return this.createCursor(params, true);
	}

	/**
	 * Insert an entity
	 *
	 * @param {Object} entity
	 * @returns {Promise}
	 */
	async insert(entity) {
		return this.model.create({ data: entity });
	}

	/**
	 * Insert many entities
	 *
	 * @param {Array} entities
	 * @returns {Promise}
	 */
	async insertMany(entities) {
		return this.model.createMany({ data: entities }).then((res) => res.count);
	}

	/**
	 * Update many entities by `where` and `update`
	 *
	 * @param {Object} where
	 * @param {Object} update
	 * @returns {Promise}
	 */
	async updateMany(where, data) {
		return this.model.updateMany({ where, data: data.$set }).then((res) => res.count);
	}

	/**
	 * Update an entity by ID and `update`
	 *
	 * @param {any} _id
	 * @param {Object} update
	 * @returns {Promise}
	 */
	async updateById(id, data) {
		return this.model.update({ where: { id } , data: data.$set });
	}

	/**
	 * Remove entities which are matched by `where`
	 *
	 * @param {Object} where
	 * @returns {Promise}
	 */
	async removeMany(where) {
		return this.model.deleteMany({ where }).then((res) => res.count);
	}

	/**
	 * Remove an entity by ID
	 *
	 * @param {any} _id
	 * @returns {Promise}
	 */
	async removeById(id) {
		return this.model.deleteMany({ where: { id } });
	}

	/**
	 * Clear all entities from collection
	 *
	 * @returns {Promise}
	 */
	async clear() {
		return this.model.deleteMany({ where: {} }).then((res) => res.count);
	}

	/**
	 * Convert DB entity to JSON object
	 *
	 * @param {any} entity
	 * @returns {Object}
	 * @memberof SequelizeDbAdapter
	 */
	entityToObject(entity) {
		return entity;
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
	async createCursor(params, isCounting = false) {
		if (_.isEmpty(params)) {
			if (isCounting) {
				return this.model.count();
			}

			return this.model.findMany();
		}

		const q = {
			where: {},
		};

		// Text search
		if (_.isString(params.search) && !_.isEmpty(params.search)) {
			const fields = Array.isArray(params.searchFields) ? params.searchFields : [];

			const searchConditions = fields.map((f) => {
				return {
					[f]: {
						contains: params.search,
					},
				};
			});

			if (params.query) {
				Object.assign(q.where, params.query, { OR: searchConditions });
			} else {
				Object.assign(q.where, { OR: searchConditions });
			}
		} else if (!_.isEmpty(params.query)) {
			Object.assign(q.where, params.query);
		}

		if (!_.isEmpty(params.populates) && !isCounting) {
			q.include = params.populates.reduce((acc, curr) => {
				acc[curr] = true;

				return acc;
			}, {});
		}

		// Sort
		if (params.sort && !isCounting) {
			q.orderBy = this.transformSort(params.sort);
		}

		// Offset
		if (_.isInteger(params.offset) && params.offset > 0) {
			q.skip = params.offset;
		}

		// Limit
		if (_.isInteger(params.limit) && params.limit > 0) {
			q.take = params.limit;
		}

		if (isCounting) {
			return this.model.count(q);
		}

		return this.model.findMany(q);
	}

	/**
	 * Convert the `sort` param to a `sort` object to Sequelize queries.
	 *
	 * @param {String|Array<String>|Object} paramSort
	 * @returns {Object}
	 */
	transformSort(paramSort) {
		let sort = paramSort;
		if (_.isString(sort)) sort = sort.split(/[, ]+/);

		if (Array.isArray(sort)) {
			return sort.map(s => {
				if (s.startsWith("-")) {
					return {
						[s.slice(1)]: "desc"
					};
				} else {
					return {
						[s]: "asc",
					};
				}
			});
		}

		if (_.isObject(sort)) {
			return Object.keys(sort).map((name) => [
				name,
				sort[name] > 0 ? "asc" : "desc",
			]);
		}

		/* istanbul ignore next*/
		return [];
	}

	/**
	 * For compatibility only.
	 * @param {Object} entity
	 * @returns {Object} Entity
	 */
	beforeSaveTransformID(entity) {
		return entity;
	}

	/**
	 * For compatibility only.
	 * @param {Object} entity
	 * @returns {Object} Entity
	 */
	afterRetrieveTransformID(entity) {
		return entity;
	}
}

module.exports = PrismaDbAdapter;
