/*
 * moleculer-db
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer-db)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { MoleculerClientError, ValidationError } = require("moleculer").Errors;
const { EntityNotFoundError } = require("./errors");
const MemoryAdapter = require("./memory-adapter");
const pkg = require("../package.json");
const { copyFieldValueByPath, flatten } = require("./utils");
const stringToPath = require("lodash/_stringToPath");

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
			repo: pkg.repository ? pkg.repository.url : null
		}
	},

	// Store adapter (NeDB adapter is the default)
	adapter: null,

	/**
	 * Default settings
	 */
	settings: {
		/** @type {String} Name of ID field. */
		idField: "_id",

		/** @type {Array<String>?} Field filtering list. It must be an `Array`. If the value is `null` or `undefined` doesn't filter the fields of entities. */
		fields: null,

		/** @type {Array<String>?} List of excluded fields. It must be an `Array`. The value is `null` or `undefined` will be ignored. */
		excludeFields: null,

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
		 * @param {String|Array<String>} excludeFields - List of excluded fields.
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
				keys: ["populate", "fields", "excludeFields", "limit", "offset", "sort", "search", "searchFields", "query"]
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
				excludeFields: [
					{ type: "string", optional: true },
					{ type: "array", optional: true, items: "string" },
				],
				limit: { type: "number", integer: true, min: 0, optional: true, convert: true },
				offset: { type: "number", integer: true, min: 0, optional: true, convert: true },
				sort: { type: "string", optional: true },
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
				const params = this.sanitizeParams(ctx, ctx.params);
				return this._find(ctx, params);
			}
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
				keys: ["search", "searchFields", "query"]
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
				const params = this.sanitizeParams(ctx, ctx.params);
				return this._count(ctx, params);
			}
		},

		/**
		 * List entities by filters and pagination results.
		 *
		 * @actions
		 * @cached
		 *
		 * @param {String|Array<String>} populate - Populated fields.
		 * @param {String|Array<String>} fields - Fields filter.
		 * @param {String|Array<String>} excludeFields - List of excluded fields.
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
				keys: ["populate", "fields", "excludeFields", "page", "pageSize", "sort", "search", "searchFields", "query"]
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
				excludeFields: [
					{ type: "string", optional: true },
					{ type: "array", optional: true, items: "string" },
				],
				page: { type: "number", integer: true, min: 1, optional: true, convert: true },
				pageSize: { type: "number", integer: true, min: 0, optional: true, convert: true },
				sort: { type: "string", optional: true },
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
				const params = this.sanitizeParams(ctx, ctx.params);
				return this._list(ctx, params);
			}
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
			}
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
				entities: { type: "array", optional: true }
			},
			handler(ctx) {
				return this._insert(ctx, ctx.params);
			}
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
		 * @param {String|Array<String>} excludeFields - List of excluded fields.
		 * @param {Boolean?} mapping - Convert the returned `Array` to `Object` where the key is the value of `id`.
		 *
		 * @returns {Object|Array<Object>} Found entity(ies).
		 *
		 * @throws {EntityNotFoundError} - 404 Entity not found
		 */
		get: {
			cache: {
				keys: ["id", "populate", "fields", "excludeFields", "mapping"]
			},
			rest: "GET /:id",
			params: {
				id: [
					{ type: "string" },
					{ type: "number" },
					{ type: "array" }
				],
				populate: [
					{ type: "string", optional: true },
					{ type: "array", optional: true, items: "string" },
				],
				fields: [
					{ type: "string", optional: true },
					{ type: "array", optional: true, items: "string" },
				],
				excludeFields: [
					{ type: "string", optional: true },
					{ type: "array", optional: true, items: "string" },
				],
				mapping: { type: "boolean", optional: true }
			},
			handler(ctx) {
				const params = this.sanitizeParams(ctx, ctx.params);
				return this._get(ctx, params);
			}
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
				id: { type: "any" }
			},
			handler(ctx) {
				return this._update(ctx, ctx.params);
			}
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
				id: { type: "any" }
			},
			handler(ctx) {
				return this._remove(ctx, ctx.params);
			}
		}
	},

	/**
	 * Methods
	 */
	methods: {

		/**
		 * Connect to database.
		 */
		connect() {
			return this.adapter.connect().then(() => {
				// Call an 'afterConnected' handler in schema
				if (_.isFunction(this.schema.afterConnected)) {
					try {
						return this.schema.afterConnected.call(this);
					} catch(err) {
						/* istanbul ignore next */
						this.logger.error("afterConnected error!", err);
					}
				}
			});
		},

		/**
		 * Disconnect from database.
		 */
		disconnect() {
			if (_.isFunction(this.adapter.disconnect))
				return this.adapter.disconnect();
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
			const p = Object.assign({}, params);

			// Convert from string to number
			if (typeof(p.limit) === "string")
				p.limit = Number(p.limit);
			if (typeof(p.offset) === "string")
				p.offset = Number(p.offset);
			if (typeof(p.page) === "string")
				p.page = Number(p.page);
			if (typeof(p.pageSize) === "string")
				p.pageSize = Number(p.pageSize);
			// Convert from string to POJO
			if (typeof(p.query) === "string")
				p.query = JSON.parse(p.query);

			if (typeof(p.sort) === "string")
				p.sort = p.sort.split(/[,\s]+/);

			if (typeof(p.fields) === "string")
				p.fields = p.fields.split(/[,\s]+/);

			if (typeof(p.excludeFields) === "string")
				p.excludeFields = p.excludeFields.split(/[,\s]+/);

			if (typeof(p.populate) === "string")
				p.populate = p.populate.split(/[,\s]+/);

			if (typeof(p.searchFields) === "string")
				p.searchFields = p.searchFields.split(/[,\s]+/);

			if (ctx.action.name.endsWith(".list")) {
				// Default `pageSize`
				if (!p.pageSize)
					p.pageSize = this.settings.pageSize;

				// Default `page`
				if (!p.page)
					p.page = 1;

				// Limit the `pageSize`
				if (this.settings.maxPageSize > 0 && p.pageSize > this.settings.maxPageSize)
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
		 * @returns {Object|Array<Object>} Found entity(ies).
		 */
		getById(id, decoding) {
			return Promise.resolve()
				.then(() => {
					if (_.isArray(id)) {
						return this.adapter.findByIds(decoding ? id.map(id => this.decodeID(id)) : id);
					} else {
						return this.adapter.findById(decoding ? this.decodeID(id) : id);
					}
				});
		},

		/**
		 * Call before entity lifecycle events
		 *
		 * @methods
		 * @param {String} type
		 * @param {Object} entity
		 * @param {Context} ctx
		 * @returns {Promise}
		 */
		beforeEntityChange(type, entity, ctx) {
			const eventName = `beforeEntity${_.capitalize(type)}`;
			if (this.schema[eventName] == null) {
				return Promise.resolve(entity);
			}
			return Promise.resolve(this.schema[eventName].call(this, entity, ctx));
		},

		/**
		 * Clear the cache & call entity lifecycle events
		 *
		 * @methods
		 * @param {String} type
		 * @param {Object|Array<Object>|Number} docTransformed
		 * @param {Object|Array<Object>|Number} docRaw
		 * @param {Context} ctx
		 * @returns {Promise}
		 */
		entityChanged(type, docTransformed, ctx, docRaw) {
			return this.clearCache().then(() => {
				const eventName = `entity${_.capitalize(type)}`;
				if (this.schema[eventName] != null) {
					return this.schema[eventName].call(this, docTransformed, ctx, docRaw);
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
			this.broker[this.settings.cacheCleanEventType](`cache.clean.${this.fullName}`);
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
				}
				else
					return Promise.resolve(docs);
			}

			return Promise.resolve(docs)

				// Convert entity to JS object
				.then(docs => Promise.all(docs.map(doc => this.adapter.entityToObject(doc, ctx, params))))

				// Apply idField
				.then(docs => docs.map(doc => this.adapter.afterRetrieveTransformID(doc, this.settings.idField)))
				// Encode IDs
				.then(docs => docs.map(doc => {
					doc[this.settings.idField] = this.encodeID(doc[this.settings.idField]);
					return doc;
				}))
				// Populate
				.then(json => (ctx && params.populate) ? this.populateDocs(ctx, json, params.populate) : json)

			// TODO onTransformHook

				// Filter fields
				.then(json => {
					if (ctx && params.fields) {
						const fields = _.isString(params.fields)
							// Compatibility with < 0.4
							/* istanbul ignore next */
							? params.fields.split(/\s+/)
							: params.fields;
						// Authorize the requested fields
						const authFields = this.authorizeFields(fields);

						return json.map(item => this.filterFields(item, authFields));
					} else {
						return json.map(item => this.filterFields(item, this.settings.fields));
					}
				})

				// Filter excludeFields
				.then(json => {
					const askedExcludeFields = (ctx && params.excludeFields)
						? _.isString(params.excludeFields)
							? params.excludeFields.split(/\s+/)
							: params.excludeFields
						: [];
					const excludeFields = askedExcludeFields.concat(this.settings.excludeFields || []);

					if (Array.isArray(excludeFields) && excludeFields.length > 0) {
						return json.map(doc => {
							return this._excludeFields(doc, excludeFields);
						});
					} else {
						return json;
					}
				})

				// Return
				.then(json => isDoc ? json[0] : json);
		},

		/**
		 * Filter fields in the entity object
		 *
		 * @param {Object} 	doc
		 * @param {Array<String>} 	fields	Filter properties of model.
		 * @returns	{Object}
		 */
		filterFields(doc, fields) {
			if (Array.isArray(fields)) {
				const res = {};
				fields.forEach(field => {
					const paths = stringToPath(field);
					copyFieldValueByPath(doc, paths, res);
				});
				return res;
			}
			return doc;
		},

		/**
		 * Exclude fields in the entity object
		 *
		 * @param {Object} 	doc
		 * @param {Array<String>} 	fields	Exclude properties of model.
		 * @returns	{Object}
		 */
		excludeFields(doc, fields) {
			if (Array.isArray(fields) && fields.length > 0) {
				return this._excludeFields(doc, fields);
			}

			return doc;
		},

		/**
		 * Exclude fields in the entity object. Internal use only, must ensure `fields` is an Array
		 */
		_excludeFields(doc, fields) {
			const res = _.cloneDeep(doc);
			fields.forEach(field => {
				_.unset(res, field);
			});
			return res;
		},

		/**
		 * Authorize the required field list. Remove fields which is not exist in the `this.settings.fields`
		 *
		 * @param {Array} askedFields
		 * @returns {Array}
		 */
		authorizeFields(askedFields) {
			if (this.settings.fields && this.settings.fields.length > 0) {
				let allowedFields = [];
				if (Array.isArray(askedFields) && askedFields.length > 0) {
					askedFields.forEach(askedField => {
						if (this.settings.fields.indexOf(askedField) !== -1) {
							allowedFields.push(askedField);
							return;
						}

						if (askedField.indexOf(".") !== -1) {
							const parts = askedField.split(".");
							while (parts.length > 1) {
								parts.pop();
								if (this.settings.fields.indexOf(parts.join(".")) !== -1) {
									allowedFields.push(askedField);
									return;
								}
							}
						}

						const nestedFields = this.settings.fields.filter(settingField => settingField.startsWith(askedField + "."));
						if (nestedFields.length > 0) {
							allowedFields = allowedFields.concat(nestedFields);
						}
					});
					//return _.intersection(f, this.settings.fields);
				}
				return allowedFields;
			}

			return askedFields;
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
			if (!this.settings.populates || !Array.isArray(populateFields) || populateFields.length == 0)
				return Promise.resolve(docs);

			if (docs == null || !_.isObject(docs) && !Array.isArray(docs))
				return Promise.resolve(docs);

			const settingPopulateFields = Object.keys(this.settings.populates);

			/* Group populateFields by populatesFields for deep population.
			(e.g. if "post" in populates and populateFields = ["post.author", "post.reviewer", "otherField"])
			then they would be grouped together: { post: ["post.author", "post.reviewer"], otherField:["otherField"]}
			*/
			const groupedPopulateFields = populateFields.reduce((obj, populateField) => {
				const settingPopulateField = settingPopulateFields.find(settingPopulateField => settingPopulateField === populateField || populateField.startsWith(settingPopulateField + "."));
				if (settingPopulateField != null) {
					if (obj[settingPopulateField] == null) {
						obj[settingPopulateField] = [populateField];
					} else {
						obj[settingPopulateField].push(populateField);
					}
				}
				return obj;
			}, {});

			const promises = [];
			for (const populatesField of settingPopulateFields) {
				let rule = this.settings.populates[populatesField];
				if (groupedPopulateFields[populatesField] == null)
					continue; // skip

				// if the rule is a function, save as a custom handler
				if (_.isFunction(rule)) {
					const _r = rule;
					rule = {
						handler: function(...args) {
							try {
								return Promise.resolve(_r.apply(this, args));
							} catch (err) {
								return Promise.reject(err);
							}
						}
					};
				}

				// If the rule is string, convert to object
				if (_.isString(rule)) {
					rule = {
						action: rule
					};
				}

				if (rule.field === undefined) rule.field = populatesField;

				const arr = Array.isArray(docs) ? docs : [docs];

				// Collect IDs from field of docs (flatten, compact & unique list)
				const idList = _.uniq(_.flattenDeep(_.compact(arr.map(doc => _.get(doc, rule.field)))));
				// Replace the received models according to IDs in the original docs
				const resultTransform = (populatedDocs) => {
					arr.forEach(doc => {
						const id = _.get(doc, rule.field);
						if (_.isArray(id)) {
							const models = _.compact(id.map(id => populatedDocs[id]));
							_.set(doc, populatesField, models);
						} else {
							_.set(doc, populatesField, populatedDocs[id]);
						}
					});
				};

				if (rule.handler) {
					promises.push(rule.handler.call(this, idList, arr, rule, ctx));
				} else if (idList.length > 0) {
					// Call the target action & collect the promises
					const params = Object.assign({
						id: idList,
						mapping: true,
						populate: [
							// Transform "post.author" into "author" to pass to next populating service
							...groupedPopulateFields[populatesField]
								.map((populateField)=>populateField.slice(populatesField.length + 1)) //+1 to also remove any leading "."
								.filter(field=>field!==""),
							...(rule.populate ? rule.populate : [])
						]
					}, rule.params || {});

					if (params.populate.length === 0 ) {delete params.populate;}

					promises.push(ctx.call(rule.action, params).then(resultTransform));
				}
			}

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

			const entities = Array.isArray(entity) ? entity : [entity];
			return Promise.all(entities.map(entity => this.settings.entityValidator.call(this, entity))).then(() => entity);
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
			return this.adapter.find(params)
				.then(docs => this.transformDocuments(ctx, params, docs));
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
			if (params && params.limit)
				params.limit = null;
			if (params && params.offset)
				params.offset = null;
			return this.adapter.count(params);
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
			const countParams = Object.assign({}, params);
			// Remove pagination params
			if (countParams && countParams.limit)
				countParams.limit = null;
			if (countParams && countParams.offset)
				countParams.offset = null;
			if (params.limit == null) {
				if (this.settings.limit > 0 && params.pageSize > this.settings.limit)
					params.limit = this.settings.limit;
				else
					params.limit = params.pageSize;
			}
			return Promise.all([
				// Get rows
				this.adapter.find(params),
				// Get count of all rows
				this.adapter.count(countParams)
			]).then(res => {
				return this.transformDocuments(ctx, params, res[0])
					.then(docs => {
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
							totalPages: Math.floor((res[1] + params.pageSize - 1) / params.pageSize)
						};
					});
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
			return this.beforeEntityChange("create", params, ctx)
				.then((entity)=>this.validateEntity(entity))
				// Apply idField
				.then(entity =>
					this.adapter.beforeSaveTransformID(entity, this.settings.idField)
				)
				.then(entity =>
					this.adapter.insert(entity)
				)
				.then(doc => {
					return this.transformDocuments(ctx, {}, doc)
						.then(json => this.entityChanged("created", json, ctx, doc).then(() => json));
				});
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
						return Promise.all(params.entities.map(entity => this.beforeEntityChange("create", entity, ctx)))
							.then(entities=>this.validateEntity(entities))
							// Apply idField
							.then(entities => {
								if (this.settings.idField === "_id")
									return entities;
								return entities.map(entity => this.adapter.beforeSaveTransformID(entity, this.settings.idField));
							})
							.then(entities => this.adapter.insertMany(entities));
					}
					else if (params.entity) {
						return this.beforeEntityChange("create", params.entity, ctx)
							.then(entity=>this.validateEntity(entity))
							// Apply idField
							.then(entity => this.adapter.beforeSaveTransformID(entity, this.settings.idField))
							.then(entity => this.adapter.insert(entity));
					}
					return Promise.reject(new MoleculerClientError("Invalid request! The 'params' must contain 'entity' or 'entities'!", 400));
				})
				.then(docs => {
					return this.transformDocuments(ctx, {}, docs)
						.then(json => this.entityChanged("created", json, ctx, docs).then(() => json));
				});
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
			const id = params.id;
			let origDoc;
			const shouldMapping = params.mapping === true;
			return this.getById(id, true)
				.then(doc => {
					if (!doc)
						return Promise.reject(new EntityNotFoundError(id));

					if (shouldMapping)
						origDoc = _.isArray(doc) ? doc.map(d => _.cloneDeep(d)) : _.cloneDeep(doc);
					else
						origDoc = doc;

					return this.transformDocuments(ctx, params, doc);
				})
				.then(json => {
					if (params.mapping !== true) return json;

					const res = {};
					if (_.isArray(json)) {
						json.forEach((doc, i) => {
							const id = this.encodeID(this.adapter.afterRetrieveTransformID(origDoc[i], this.settings.idField)[this.settings.idField]);
							res[id] = doc;
						});
					} else if (_.isObject(json)) {
						const id = this.encodeID(this.adapter.afterRetrieveTransformID(origDoc, this.settings.idField)[this.settings.idField]);
						res[id] = json;
					}
					return res;
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

			return Promise.resolve()
				.then(()=>this.beforeEntityChange("update", params, ctx))
				.then((params)=>{
					let sets = {};
					// Convert fields from params to "$set" update object
					Object.keys(params).forEach(prop => {
						if (prop === "id" || prop === this.settings.idField)
							id = this.decodeID(params[prop]);
						else
							sets[prop] = params[prop];
					});

					if (this.settings.useDotNotation)
						sets = flatten(sets);

					return sets;
				})
				.then((sets)=>this.adapter.updateById(id, { "$set": sets }))
				.then(doc => {
					if (!doc)
						return Promise.reject(new EntityNotFoundError(id));
					return this.transformDocuments(ctx, {}, doc)
						.then(json => this.entityChanged("updated", json, ctx, doc).then(() => json));
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
			return Promise.resolve()
				.then(()=>this.beforeEntityChange("remove", params, ctx))
				.then(()=>this.adapter.removeById(id))
				.then(doc => {
					if (!doc)
						return Promise.reject(new EntityNotFoundError(params.id));
					return this.transformDocuments(ctx, {}, doc)
						.then(json => this.entityChanged("removed", json, ctx, doc).then(() => json));
				});
		}
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {
		// Compatibility with < 0.4
		if (_.isString(this.settings.fields)) {
			this.settings.fields = this.settings.fields.split(/\s+/);
		}

		if (_.isString(this.settings.excludeFields)) {
			this.settings.excludeFields = this.settings.excludeFields.split(/\s+/);
		}

		if (!this.schema.adapter)
			this.adapter = new MemoryAdapter();
		else
			this.adapter = this.schema.adapter;

		this.adapter.init(this.broker, this);

		// Transform entity validation schema to checker function
		if (this.broker.validator && _.isObject(this.settings.entityValidator) && !_.isFunction(this.settings.entityValidator)) {
			const check = this.broker.validator.compile(this.settings.entityValidator);
			this.settings.entityValidator = async entity => {
				let res = check(entity);
				if (check.async === true || (res.then) instanceof Function) res = await res;
				if (res === true)
					return Promise.resolve();
				else
					return Promise.reject(new ValidationError("Entity validation error!", null, res));
			};
		}

	},

	/**
	 * Service started lifecycle event handler
	 */
	started() {
		if (this.adapter) {
			return new Promise(resolve => {
				const connecting = () => {
					this.connect().then(resolve).catch(err => {
						this.logger.error("Connection error!", err);
						setTimeout(() => {
							this.logger.warn("Reconnecting...");
							connecting();
						}, 1000);
					});
				};

				connecting();
			});
		}

		/* istanbul ignore next */
		return Promise.reject(new Error("Please set the store adapter in schema!"));
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	stopped() {
		if (this.adapter)
			return this.disconnect();
	},

	// Export Memory Adapter class
	MemoryAdapter
};
