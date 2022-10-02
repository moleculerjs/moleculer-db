/*
 * moleculer-db
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer-db)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const Promise = require("bluebird");
const { flatten } = require("flat");
const { MoleculerClientError, ValidationError } = require("moleculer").Errors;
const { EntityNotFoundError } = require("./errors");
const MemoryAdapter = require("./memory-adapter");
const pkg = require("../package.json");

/**
 * Service mixin to access database entities
 *
 * @name moleculer-db
 * @module Service
 */
module.exports = {
	// Must overwrite it
	name: "",

	// Service's metadata
	metadata: {
		$category: "database",
		$description: "Official Data Access service",
		$official: true,
		$package: {
			name: pkg.name,
			version: pkg.version,
			repo: pkg.repository ? pkg.repository.url : null,
		},
	},

	// Store adapter (NeDB adapter is the default)
	adapter: null,

	/**
	 * @typedef tenantStrategy
	 * @property {function} [getAdapterHash] return hash for caching adapter
	 * @property {function} [getAdapter] return adapter which can tenant specific db adapter
	 */
	tenantStrategy: null,

	/**
	 * Default settings
	 */
	settings: {
		/** @type {String} Name of ID field. */
		idField: "_id",

		/** @type {Array<String>?} Field filtering list. It must be an `Array`. If the value is `null` or `undefined` doesn't filter the fields of entities. */
		fields: null,

		/** @type {Array?} Schema for population. [Read more](#populating). */
		populates: null,

		/** @type {Number} Default page size in `list` action. */
		pageSize: 10,

		/** @type {Number} Maximum page size in `list` action. */
		maxPageSize: 100,

		/** @type {Number} Maximum value of limit in `find` action. Default: `-1` (no limit) */
		maxLimit: -1,

		/** @type {Object|Function} Validator schema or a function to validate the incoming entity in `create` & 'insert' actions. */
		entityValidator: null,

		/** @type {Boolean} Whether to use dot notation or not when updating an entity. Will **not** convert Array to dot notation. Default: `false` */
		useDotNotation: false,

		/** @type {String} Type of cache clean event type. Values: "broadcast" or "emit" */
		cacheCleanEventType: "broadcast",
	},

	/**
	 * Actions
	 */
	actions: {
		/**
		 * Find entities by query.
		 *
		 * @actions
		 * @cached
		 *
		 * @param {String|Array<String>} populate - Populated fields.
		 * @param {String|Array<String>} fields - Fields filter.
		 * @param {Number?} limit - Max count of rows.
		 * @param {Number?} offset - Count of skipped rows.
		 * @param {String?} sort - Sorted fields.
		 * @param {String?} search - Search text.
		 * @param {String|Array<String>} searchFields - Fields for searching.
		 * @param {Object?} query - Query object. Passes to adapter.
		 *
		 * @returns {Array<Object>} List of found entities.
		 */
		find: {
			cache: {
				keys: [
					"populate",
					"fields",
					"limit",
					"offset",
					"sort",
					"search",
					"searchFields",
					"query",
				],
			},
			params: {
				populate: [
					{ type: "string", optional: true },
					{ type: "array", optional: true, items: "string" },
				],
				fields: [
					{ type: "string", optional: true },
					{ type: "array", optional: true, items: "string" },
				],
				limit: {
					type: "number",
					integer: true,
					min: 0,
					optional: true,
					convert: true,
				},
				offset: {
					type: "number",
					integer: true,
					min: 0,
					optional: true,
					convert: true,
				},
				sort: { type: "string", optional: true },
				search: { type: "string", optional: true },
				searchFields: [
					{ type: "string", optional: true },
					{ type: "array", optional: true, items: "string" },
				],
				query: [
					{ type: "object", optional: true },
					{ type: "string", optional: true },
					{ type: "array", optional: true, items: "any" },
				],
			},
			handler(ctx) {
				let params = this.sanitizeParams(ctx, ctx.params);
				return this._find(ctx, params);
			},
		},

		/**
		 * Get count of entities by query.
		 *
		 * @actions
		 * @cached
		 *
		 * @param {String?} search - Search text.
		 * @param {String|Array<String>} searchFields - Fields list for searching.
		 * @param {Object?} query - Query object. Passes to adapter.
		 *
		 * @returns {Number} Count of found entities.
		 */
		count: {
			cache: {
				keys: ["search", "searchFields", "query"],
			},
			params: {
				search: { type: "string", optional: true },
				searchFields: [
					{ type: "string", optional: true },
					{ type: "array", optional: true, items: "string" },
				],
				query: [
					{ type: "object", optional: true },
					{ type: "string", optional: true },
				],
			},
			handler(ctx) {
				let params = this.sanitizeParams(ctx, ctx.params);
				return this._count(ctx, params);
			},
		},

		/**
		 * List entities by filters and pagination results.
		 *
		 * @actions
		 * @cached
		 *
		 * @param {String|Array<String>} populate - Populated fields.
		 * @param {String|Array<String>} fields - Fields filter.
		 * @param {Number?} page - Page number.
		 * @param {Number?} pageSize - Size of a page.
		 * @param {String?} sort - Sorted fields.
		 * @param {String?} search - Search text.
		 * @param {String|Array<String>} searchFields - Fields for searching.
		 * @param {Object?} query - Query object. Passes to adapter.
		 *
		 * @returns {Object} List of found entities and count with pagination info.
		 */
		list: {
			cache: {
				keys: [
					"populate",
					"fields",
					"page",
					"pageSize",
					"sort",
					"search",
					"searchFields",
					"query",
				],
			},
			rest: "GET /",
			params: {
				populate: [
					{ type: "string", optional: true },
					{ type: "array", optional: true, items: "string" },
				],
				fields: [
					{ type: "string", optional: true },
					{ type: "array", optional: true, items: "string" },
				],
				page: {
					type: "number",
					integer: true,
					min: 1,
					optional: true,
					convert: true,
				},
				pageSize: {
					type: "number",
					integer: true,
					min: 0,
					optional: true,
					convert: true,
				},
				sort: { type: "string", optional: true },
				search: { type: "string", optional: true },
				searchFields: [
					{ type: "string", optional: true },
					{ type: "array", optional: true, items: "string" },
				],
				query: [
					{ type: "object", optional: true },
					{ type: "string", optional: true },
					{ type: "array", optional: true, items: "any" },
				],
			},
			handler(ctx) {
				let params = this.sanitizeParams(ctx, ctx.params);
				return this._list(ctx, params);
			},
		},

		/**
		 * Create a new entity.
		 *
		 * @actions
		 *
		 * @param {Object} params - Entity to save.
		 *
		 * @returns {Object} Saved entity.
		 */
		create: {
			rest: "POST /",
			handler(ctx) {
				return this._create(ctx, ctx.params);
			},
		},

		/**
		 * Create many new entities.
		 *
		 * @actions
		 *
		 * @param {Object?} entity - Entity to save.
		 * @param {Array<Object>?} entities - Entities to save.
		 *
		 * @returns {Object|Array<Object>} Saved entity(ies).
		 */
		insert: {
			params: {
				entity: { type: "object", optional: true },
				entities: { type: "array", optional: true },
			},
			handler(ctx) {
				return this._insert(ctx, ctx.params);
			},
		},

		/**
		 * Get entity by ID.
		 *
		 * @actions
		 * @cached
		 *
		 * @param {any|Array<any>} id - ID(s) of entity.
		 * @param {String|Array<String>} populate - Field list for populate.
		 * @param {String|Array<String>} fields - Fields filter.
		 * @param {Boolean?} mapping - Convert the returned `Array` to `Object` where the key is the value of `id`.
		 *
		 * @returns {Object|Array<Object>} Found entity(ies).
		 *
		 * @throws {EntityNotFoundError} - 404 Entity not found
		 */
		get: {
			cache: {
				keys: ["id", "populate", "fields", "mapping"],
			},
			rest: "GET /:id",
			params: {
				id: [{ type: "string" }, { type: "number" }, { type: "array" }],
				populate: [
					{ type: "string", optional: true },
					{ type: "array", optional: true, items: "string" },
				],
				fields: [
					{ type: "string", optional: true },
					{ type: "array", optional: true, items: "string" },
				],
				mapping: { type: "boolean", optional: true },
			},
			handler(ctx) {
				let params = this.sanitizeParams(ctx, ctx.params);
				return this._get(ctx, params);
			},
		},

		/**
		 * Update an entity by ID.
		 * > After update, clear the cache & call lifecycle events.
		 *
		 * @actions
		 *
		 * @param {any} id - ID of entity.
		 * @returns {Object} Updated entity.
		 *
		 * @throws {EntityNotFoundError} - 404 Entity not found
		 */
		update: {
			rest: "PUT /:id",
			params: {
				id: { type: "any" },
			},
			handler(ctx) {
				return this._update(ctx, ctx.params);
			},
		},

		/**
		 * Remove an entity by ID.
		 *
		 * @actions
		 *
		 * @param {any} id - ID of entity.
		 * @returns {Number} Count of removed entities.
		 *
		 * @throws {EntityNotFoundError} - 404 Entity not found
		 */
		remove: {
			rest: "DELETE /:id",
			params: {
				id: { type: "any" },
			},
			handler(ctx) {
				return this._remove(ctx, ctx.params);
			},
		},
	},

	/**
	 * Methods
	 */
	methods: {
		/**
		 * get adapter based on ctx, if not ctx given it will use the default adapter
		 * if ctx and tenant stratergy are present it will call getAdapter and getAdapterHash
		 * @param {Context} ctx
		 */
		async getAdapter(ctx) {
			const useTenantStrategy = this.tenantStrategy && ctx;

			const hash = useTenantStrategy
				? await this.tenantStrategy.getAdapterHash.call(this, ctx)
				: "default";

			if (this.adapters[hash]) {
				return Promise.resolve(this.adapters[hash]);
			}

			this.adapters[hash] = useTenantStrategy
				? await this.tenantStrategy.getAdapter.call(this, ctx)
				: this.adapter;
			this.adapters[hash].init(this.broker, this);

			this.logger.debug("Register new adapter", hash);

			// if default no need to connect because connect will be called on started method
			if (hash === "default") {
				return this.adapters[hash];
			}

			return this.connect({
				hash: hash,
				adapter: this.adapters[hash],
			}).then(() => this.adapters[hash]);
		},

		/**
		 * Connect to database.
		 * @param {object} [adapterWithHash]
		 * @param {string} [adapterWithHash.hash]
		 * @param {object} [adapterWithHash.adapter]
		 */
		connect(adapterWithHash) {
			const adapters = adapterWithHash
				? { [adapterWithHash.hash]: adapterWithHash.adapter }
				: this.adapters;

			return Promise.all(
				Object.keys(adapters).map((adapterHash) => {
					return new Promise((resolve) => {
						const connecting = (adapter, hash) => {
							return adapter
								.connect()
								.then(resolve)
								.then(() => {
									// Call an 'afterConnected' handler in schema
									if (
										_.isFunction(this.schema.afterConnected)
									) {
										try {
											return this.schema.afterConnected.call(
												this
											);
										} catch (err) {
											/* istanbul ignore next */
											this.logger.error(
												"adapter hash:",
												hash
											);
											this.logger.error(
												"afterConnected error!",
												err
											);
										}
									}
								})
								.catch((err) => {
									setTimeout(() => {
										this.logger.error(
											"adapter hash:",
											hash
										);
										this.logger.error(
											"Connection error!",
											err
										);
										this.logger.warn("Reconnecting...");
										connecting(adapter, hash);
									}, 1000);
								});
						};

						connecting(adapters[adapterHash], adapterHash);
					});
				})
			);
		},

		/**
		 * Disconnect from database.
		 */
		disconnect() {
			const adapters = _.values(this.adapters);
			// clear adapters cache
			this.adapters = {};
			return Promise.all(
				adapters.map((_adapter) => {
					if (_.isFunction(_adapter.disconnect))
						return _adapter.disconnect();
				})
			);
		},

		/**
		 * Sanitize context parameters at `find` action.
		 *
		 * @methods
		 *
		 * @param {Context} ctx
		 * @param {Object} params
		 * @returns {Object}
		 */
		sanitizeParams(ctx, params) {
			let p = Object.assign({}, params);

			// Convert from string to number
			if (typeof p.limit === "string") p.limit = Number(p.limit);
			if (typeof p.offset === "string") p.offset = Number(p.offset);
			if (typeof p.page === "string") p.page = Number(p.page);
			if (typeof p.pageSize === "string") p.pageSize = Number(p.pageSize);
			// Convert from string to POJO
			if (typeof p.query === "string") p.query = JSON.parse(p.query);

			if (typeof p.sort === "string")
				p.sort = p.sort.replace(/,/g, " ").split(" ");

			if (typeof p.fields === "string")
				p.fields = p.fields.replace(/,/g, " ").split(" ");

			if (typeof p.populate === "string")
				p.populate = p.populate.replace(/,/g, " ").split(" ");

			if (typeof p.searchFields === "string")
				p.searchFields = p.searchFields.replace(/,/g, " ").split(" ");

			if (ctx.action.name.endsWith(".list")) {
				// Default `pageSize`
				if (!p.pageSize) p.pageSize = this.settings.pageSize;

				// Default `page`
				if (!p.page) p.page = 1;

				// Limit the `pageSize`
				if (
					this.settings.maxPageSize > 0 &&
					p.pageSize > this.settings.maxPageSize
				)
					p.pageSize = this.settings.maxPageSize;

				// Calculate the limit & offset from page & pageSize
				p.limit = p.pageSize;
				p.offset = (p.page - 1) * p.pageSize;
			}
			// Limit the `limit`
			if (this.settings.maxLimit > 0 && p.limit > this.settings.maxLimit)
				p.limit = this.settings.maxLimit;

			return p;
		},

		/**
		 * Get entity(ies) by ID(s).
		 *
		 * @methods
		 * @param {any|Array<any>} id - ID or IDs.
		 * @param {Boolean?} decoding - Need to decode IDs.
		 * @param {Context} ctx
		 * @returns {Object|Array<Object>} Found entity(ies).
		 */
		getById(id, decoding, ctx) {
			return Promise.resolve().then(() => {
				if (_.isArray(id)) {
					return this.getAdapter(ctx).then((adapter) =>
						adapter.findByIds(
							decoding ? id.map((id) => this.decodeID(id)) : id
						)
					);
				} else {
					return this.getAdapter(ctx).then((adapter) =>
						adapter.findById(decoding ? this.decodeID(id) : id)
					);
				}
			});
		},

		/**
		 * Clear the cache & call entity lifecycle events
		 *
		 * @methods
		 * @param {String} type
		 * @param {Object|Array<Object>|Number} json
		 * @param {Context} ctx
		 * @returns {Promise}
		 */
		entityChanged(type, json, ctx) {
			return this.clearCache().then(() => {
				const eventName = `entity${_.capitalize(type)}`;
				if (this.schema[eventName] != null) {
					return this.schema[eventName].call(this, json, ctx);
				}
			});
		},

		/**
		 * Clear cached entities
		 *
		 * @methods
		 * @returns {Promise}
		 */
		clearCache() {
			this.broker[this.settings.cacheCleanEventType](
				`cache.clean.${this.fullName}`
			);
			if (this.broker.cacher)
				return this.broker.cacher.clean(`${this.fullName}.**`);
			return Promise.resolve();
		},

		/**
		 * Transform the fetched documents
		 * @methods
		 * @param {Context} ctx
		 * @param {Object} 	params
		 * @param {Array|Object} docs
		 * @returns {Array|Object}
		 */
		transformDocuments(ctx, params, docs) {
			let isDoc = false;
			if (!Array.isArray(docs)) {
				if (_.isObject(docs)) {
					isDoc = true;
					docs = [docs];
				} else return Promise.resolve(docs);
			}

			return (
				Promise.resolve(docs)

					// Convert entity to JS object
					.then((docs) =>
						Promise.all(
							docs.map((doc) =>
								this.getAdapter(ctx).then((adapter) =>
									adapter.entityToObject(doc)
								)
							)
						)
					)

					// Encode IDs
					.then((docs) =>
						docs.map((doc) => {
							doc[this.settings.idField] = this.encodeID(
								doc[this.settings.idField]
							);
							return doc;
						})
					)
					// Apply idField
					.then((docs) =>
						Promise.all(
							docs.map((doc) =>
								this.getAdapter(ctx).then((adapter) =>
									adapter.afterRetrieveTransformID(
										doc,
										this.settings.idField
									)
								)
							)
						)
					)
					// Populate
					.then((json) =>
						ctx && params.populate
							? this.populateDocs(ctx, json, params.populate)
							: json
					)

					// TODO onTransformHook

					// Filter fields
					.then((json) => {
						let fields =
							ctx && params.fields
								? params.fields
								: this.settings.fields;

						// Compatibility with < 0.4
						/* istanbul ignore next */
						if (_.isString(fields)) fields = fields.split(/\s+/);

						// Authorize the requested fields
						const authFields = this.authorizeFields(fields);

						return json.map((item) =>
							this.filterFields(item, authFields)
						);
					})

					// Return
					.then((json) => (isDoc ? json[0] : json))
			);
		},

		/**
		 * Filter fields in the entity object
		 *
		 * @param {Object} 	doc
		 * @param {Array<String>} 	fields	Filter properties of model.
		 * @returns	{Object}
		 */
		filterFields(doc, fields) {
			// Apply field filter (support nested paths)
			if (Array.isArray(fields)) {
				let res = {};
				fields.forEach((n) => {
					const v = _.get(doc, n);
					if (v !== undefined) _.set(res, n, v);
				});
				return res;
			}

			return doc;
		},

		/**
		 * Authorize the required field list. Remove fields which is not exist in the `this.settings.fields`
		 *
		 * @param {Array} fields
		 * @returns {Array}
		 */
		authorizeFields(fields) {
			if (this.settings.fields && this.settings.fields.length > 0) {
				let res = [];
				if (Array.isArray(fields) && fields.length > 0) {
					fields.forEach((f) => {
						if (this.settings.fields.indexOf(f) !== -1) {
							res.push(f);
							return;
						}

						if (f.indexOf(".") !== -1) {
							let parts = f.split(".");
							while (parts.length > 1) {
								parts.pop();
								if (
									this.settings.fields.indexOf(
										parts.join(".")
									) !== -1
								) {
									res.push(f);
									break;
								}
							}
						}

						let nestedFields = this.settings.fields.filter(
							(prop) => prop.indexOf(f + ".") !== -1
						);
						if (nestedFields.length > 0) {
							res = res.concat(nestedFields);
						}
					});
					//return _.intersection(f, this.settings.fields);
				}
				return res;
			}

			return fields;
		},

		/**
		 * Populate documents.
		 *
		 * @param {Context} 		ctx
		 * @param {Array|Object} 	docs
		 * @param {Array?}			populateFields
		 * @returns	{Promise}
		 */
		populateDocs(ctx, docs, populateFields) {
			if (
				!this.settings.populates ||
				!Array.isArray(populateFields) ||
				populateFields.length == 0
			)
				return Promise.resolve(docs);

			if (docs == null || (!_.isObject(docs) && !Array.isArray(docs)))
				return Promise.resolve(docs);

			let promises = [];
			_.forIn(this.settings.populates, (rule, field) => {
				if (populateFields.indexOf(field) === -1) return; // skip

				// if the rule is a function, save as a custom handler
				if (_.isFunction(rule)) {
					rule = {
						handler: Promise.method(rule),
					};
				}

				// If string, convert to object
				if (_.isString(rule)) {
					rule = {
						action: rule,
					};
				}

				if (rule.field === undefined) rule.field = field;

				let arr = Array.isArray(docs) ? docs : [docs];

				// Collect IDs from field of docs (flatten, compact & unique list)
				let idList = _.uniq(
					_.flattenDeep(
						_.compact(arr.map((doc) => _.get(doc, rule.field)))
					)
				);
				// Replace the received models according to IDs in the original docs
				const resultTransform = (populatedDocs) => {
					arr.forEach((doc) => {
						let id = _.get(doc, rule.field);
						if (_.isArray(id)) {
							let models = _.compact(
								id.map((id) => populatedDocs[id])
							);
							_.set(doc, field, models);
						} else {
							_.set(doc, field, populatedDocs[id]);
						}
					});
				};

				if (rule.handler) {
					promises.push(
						rule.handler.call(this, idList, arr, rule, ctx)
					);
				} else if (idList.length > 0) {
					// Call the target action & collect the promises
					const params = Object.assign(
						{
							id: idList,
							mapping: true,
							populate: rule.populate,
						},
						rule.params || {}
					);

					promises.push(
						ctx.call(rule.action, params).then(resultTransform)
					);
				}
			});

			return Promise.all(promises).then(() => docs);
		},

		/**
		 * Validate an entity by validator.
		 * @methods
		 * @param {Object} entity
		 * @returns {Promise}
		 */
		validateEntity(entity) {
			if (!_.isFunction(this.settings.entityValidator))
				return Promise.resolve(entity);

			let entities = Array.isArray(entity) ? entity : [entity];
			return Promise.all(
				entities.map((entity) =>
					this.settings.entityValidator.call(this, entity)
				)
			).then(() => entity);
		},

		/**
		 * Encode ID of entity.
		 *
		 * @methods
		 * @param {any} id
		 * @returns {any}
		 */
		encodeID(id) {
			return id;
		},

		/**
		 * Decode ID of entity.
		 *
		 * @methods
		 * @param {any} id
		 * @returns {any}
		 */
		decodeID(id) {
			return id;
		},

		/**
		 * Find entities by query.
		 *
		 * @methods
		 *
		 * @param {Context} ctx - Context instance.
		 * @param {Object?} params - Parameters.
		 *
		 * @returns {Array<Object>} List of found entities.
		 */
		_find(ctx, params) {
			return this.getAdapter(ctx).then((adapter) =>
				adapter
					.find(params)
					.then((docs) => this.transformDocuments(ctx, params, docs))
			);
		},

		/**
		 * Get count of entities by query.
		 *
		 * @methods
		 *
		 * @param {Context} ctx - Context instance.
		 * @param {Object?} params - Parameters.
		 *
		 * @returns {Number} Count of found entities.
		 */
		_count(ctx, params) {
			// Remove pagination params
			if (params && params.limit) params.limit = null;
			if (params && params.offset) params.offset = null;
			return this.getAdapter(ctx).then((adapter) =>
				adapter.count(params)
			);
		},

		/**
		 * List entities by filters and pagination results.
		 *
		 * @methods
		 *
		 * @param {Context} ctx - Context instance.
		 * @param {Object?} params - Parameters.
		 *
		 * @returns {Object} List of found entities and count.
		 */
		_list(ctx, params) {
			let countParams = Object.assign({}, params);
			// Remove pagination params
			if (countParams && countParams.limit) countParams.limit = null;
			if (countParams && countParams.offset) countParams.offset = null;
			if (params.limit == null) {
				if (
					this.settings.limit > 0 &&
					params.pageSize > this.settings.limit
				)
					params.limit = this.settings.limit;
				else params.limit = params.pageSize;
			}
			return Promise.all([
				// Get rows
				this.getAdapter(ctx).then((adapter) => adapter.find(params)),
				// Get count of all rows
				this.getAdapter(ctx).then((adapter) =>
					adapter.count(countParams)
				),
			]).then((res) => {
				return this.transformDocuments(ctx, params, res[0]).then(
					(docs) => {
						return {
							// Rows
							rows: docs,
							// Total rows
							total: res[1],
							// Page
							page: params.page,
							// Page size
							pageSize: params.pageSize,
							// Total pages
							totalPages: Math.floor(
								(res[1] + params.pageSize - 1) / params.pageSize
							),
						};
					}
				);
			});
		},

		/**
		 * Create a new entity.
		 *
		 * @methods
		 *
		 * @param {Context} ctx - Context instance.
		 * @param {Object?} params - Parameters.
		 *
		 * @returns {Object} Saved entity.
		 */
		_create(ctx, params) {
			let entity = params;
			return (
				this.validateEntity(entity)
					// Apply idField
					.then((entity) =>
						this.getAdapter(ctx).then((adapter) =>
							adapter.beforeSaveTransformID(
								entity,
								this.settings.idField
							)
						)
					)
					.then((entity) =>
						this.getAdapter(ctx).then((adapter) =>
							adapter.insert(entity)
						)
					)
					.then((doc) => this.transformDocuments(ctx, {}, doc))
					.then((json) =>
						this.entityChanged("created", json, ctx).then(
							() => json
						)
					)
			);
		},

		/**
		 * Create many new entities.
		 *
		 * @methods
		 *
		 * @param {Context} ctx - Context instance.
		 * @param {Object?} params - Parameters.
		 *
		 * @returns {Object|Array.<Object>} Saved entity(ies).
		 */
		_insert(ctx, params) {
			return Promise.resolve()
				.then(() => {
					if (Array.isArray(params.entities)) {
						return (
							this.validateEntity(params.entities)
								// Apply idField
								.then((entities) => {
									if (this.settings.idField === "_id")
										return entities;
									return Promise.all(
										entities.map((entity) =>
											this.getAdapter(ctx).then(
												(adapter) =>
													adapter.beforeSaveTransformID(
														entity,
														this.settings.idField
													)
											)
										)
									);
								})
								.then((entities) =>
									this.getAdapter(ctx).then((adapter) =>
										adapter.insertMany(entities)
									)
								)
						);
					} else if (params.entity) {
						return (
							this.validateEntity(params.entity)
								// Apply idField
								.then((entity) =>
									this.getAdapter(ctx).then((adapter) =>
										adapter.beforeSaveTransformID(
											entity,
											this.settings.idField
										)
									)
								)
								.then((entity) =>
									this.getAdapter(ctx).then((adapter) =>
										adapter.insert(entity)
									)
								)
						);
					}
					return Promise.reject(
						new MoleculerClientError(
							"Invalid request! The 'params' must contain 'entity' or 'entities'!",
							400
						)
					);
				})
				.then((docs) => this.transformDocuments(ctx, {}, docs))
				.then((json) =>
					this.entityChanged("created", json, ctx).then(() => json)
				);
		},

		/**
		 * Get entity by ID.
		 *
		 * @methods
		 *
		 * @param {Context} ctx - Context instance.
		 * @param {Object?} params - Parameters.
		 *
		 * @returns {Object|Array<Object>} Found entity(ies).
		 *
		 * @throws {EntityNotFoundError} - 404 Entity not found
		 */
		_get(ctx, params) {
			let id = params.id;
			let origDoc;
			return this.getById(id, true, ctx)
				.then((doc) => {
					if (!doc)
						return Promise.reject(new EntityNotFoundError(id));
					origDoc = doc;
					return this.transformDocuments(ctx, params, doc);
				})
				.then((json) => {
					if (_.isArray(json) && params.mapping === true) {
						return Promise.all(
							json.map((doc, i) =>
								this.getAdapter(ctx).then((adapter) => {
									const id = adapter.afterRetrieveTransformID(
										origDoc[i],
										this.settings.idField
									)[this.settings.idField];

									return { [id]: doc };
								})
							)
						).reduce((a, b) => ({ ...a, ...b }), {});
					} else if (_.isObject(json) && params.mapping === true) {
						return this.getAdapter(ctx).then((adapter) => {
							const id = adapter.afterRetrieveTransformID(
								origDoc,
								this.settings.idField
							)[this.settings.idField];

							return { [id]: json };
						});
					}

					return json;
				});
		},

		/**
		 * Update an entity by ID.
		 * > After update, clear the cache & call lifecycle events.
		 *
		 * @methods
		 *
		 * @param {Context} ctx - Context instance.
		 * @param {Object?} params - Parameters.
		 * @returns {Object} Updated entity.
		 *
		 * @throws {EntityNotFoundError} - 404 Entity not found
		 */
		_update(ctx, params) {
			let id;
			let sets = {};
			// Convert fields from params to "$set" update object
			Object.keys(params).forEach((prop) => {
				if (prop == "id" || prop == this.settings.idField)
					id = this.decodeID(params[prop]);
				else sets[prop] = params[prop];
			});

			if (this.settings.useDotNotation)
				sets = flatten(sets, { safe: true });

			return this.getAdapter(ctx)
				.then((adapter) => adapter.updateById(id, { $set: sets }))
				.then((doc) => {
					if (!doc)
						return Promise.reject(new EntityNotFoundError(id));
					return this.transformDocuments(ctx, {}, doc).then((json) =>
						this.entityChanged("updated", json, ctx).then(
							() => json
						)
					);
				});
		},

		/**
		 * Remove an entity by ID.
		 *
		 * @methods
		 *
		 * @param {Context} ctx - Context instance.
		 * @param {Object?} params - Parameters.
		 *
		 * @throws {EntityNotFoundError} - 404 Entity not found
		 */
		_remove(ctx, params) {
			const id = this.decodeID(params.id);
			return this.getAdapter(ctx)
				.then((adapter) => adapter.removeById(id))
				.then((doc) => {
					if (!doc)
						return Promise.reject(
							new EntityNotFoundError(params.id)
						);
					return this.transformDocuments(ctx, {}, doc).then((json) =>
						this.entityChanged("removed", json, ctx).then(
							() => json
						)
					);
				});
		},
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {
		// Compatibility with < 0.4
		if (_.isString(this.settings.fields)) {
			this.settings.fields = this.settings.fields.split(" ");
		}

		this.adapters = {};
		this.adapter = this.schema.adapter;
		this.tenantStrategy = this.schema.tenantStrategy;

		if (!this.adapter && !this.tenantStrategy) {
			this.adapter = new MemoryAdapter();
		}

		if (this.adapter) {
			// this will init the default adapter
			this.getAdapter();
		}

		// Transform entity validation schema to checker function
		if (
			this.broker.validator &&
			_.isObject(this.settings.entityValidator) &&
			!_.isFunction(this.settings.entityValidator)
		) {
			const check = this.broker.validator.compile(
				this.settings.entityValidator
			);
			this.settings.entityValidator = async (entity) => {
				let res = check(entity);
				if (check.async === true || res.then instanceof Function)
					res = await res;
				if (res === true) return Promise.resolve();
				else
					return Promise.reject(
						new ValidationError(
							"Entity validation error!",
							null,
							res
						)
					);
			};
		}
	},

	/**
	 * Service started lifecycle event handler
	 */
	started() {
		return this.connect();
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	stopped() {
		return this.disconnect();
	},

	// Export Memory Adapter class
	MemoryAdapter,
};
