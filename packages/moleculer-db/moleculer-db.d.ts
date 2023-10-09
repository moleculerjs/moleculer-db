declare module "moleculer-db" {
	import type { Context, ServiceBroker } from "moleculer";
	import { Service } from "moleculer";

	export interface QueryFilters extends FilterOptions {
		sort?: string;
	}

	namespace Populate {
		function HandlerFunctionRule(
			ids: any[],
			items: any[],
			rule: HandlerRule,
			ctx: Context,
		): any;
		type CommonRule = {
			field?: string;
			params?: DbContextSanitizedParams;
		};
		type ActionRule = CommonRule & { action: string };
		type HandlerRule = CommonRule & { handler: typeof HandlerFunctionRule };
		type Rule = string | ActionRule | HandlerRule | typeof HandlerFunctionRule;
	}
	export interface DbServiceSettings {
		/**
		 *  Name of ID field.
		 *  @default "_id"
		 */
		idField?: string;

		/**
		 *  Field filtering list. It must be an `Array`. If the value is `null` or `undefined` doesn't filter the fields of entities.
		 */
		fields?: string[];

		/**
		 * List of excluded fields. It must be an `Array`. The value is `null` or `undefined` will be ignored.
		 */
		excludeFields?: string[],

		/**
		 *  Schema for population.
		 *  @see https://moleculer.services/docs/0.14/moleculer-db.html#Populating
		 */
		populates?: { [k: string]: Populate.Rule };

		/**
		 * Default page size in `list` action.
		 * @default 10
		 */
		pageSize?: number;

		/**
		 * Maximum page size in `list` action.
		 * @default 100
		 */
		maxPageSize?: number;

		/**
		 * Maximum value of limit in `find` action.
		 * @default `-1` (no limit)
		 */
		maxLimit?: number;

		/**
		 * Validator schema or a function to validate the incoming entity in `create` & 'insert' actions.
		 */
		entityValidator?: object | Function;
	}

	export interface QueryOptions {
		[name: string]: any;
	}
	export interface CursorOptions extends FilterOptions {
		sort?: string | string[];
		fields?: string | string[];
	}

	export interface FilterOptions {
		limit?: string | number;
		offset?: string | number;
		searchFields?: string | string[];
		search?: string;
		query?: QueryOptions;
	}

	export interface CountOptions {
		searchFields?: string | string[];
		search?: string;
		query?: QueryOptions;
	}

	export interface DbAdapter {
		/**
		 * Initialize adapter
		 *
		 * @param {ServiceBroker} broker
		 * @param {Service} service
		 * @memberof DbAdapter
		 */
		init(broker: ServiceBroker, service: Service): void;
		/**
		 * Connect to database
		 *
		 * @returns {Promise}
		 * @memberof DbAdapter
		 */
		connect(): Promise<void>;
		/**
		 * Disconnect from database
		 *
		 * @returns {Promise}
		 * @memberof DbAdapter
		 */
		disconnect(): Promise<void>;

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
		 * @memberof DbAdapter
		 */
		find(filters: FilterOptions): Promise<object[]>;

		/**
		 * Find an entity by query
		 *
		 * @param {Object} query
		 * @returns {Promise}
		 * @memberof DbAdapter
		 */
		findOne<Q extends QueryOptions>(query: Q): Promise<object>;

		/**
		 * Find an entity by ID
		 *
		 * @param {any} id
		 * @returns {Promise}
		 * @memberof DbAdapter
		 */
		findById(id: any): Promise<object>;

		/**
		 * Find all entites by IDs
		 *
		 * @param {Array<Number>} ids
		 * @returns {Promise}
		 * @memberof DbAdapter
		 */
		findByIds(ids: (string | number)[]): Promise<object[]>;

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
		 * @memberof DbAdapter
		 */
		count(filters?: CountOptions): Promise<number>;

		/**
		 * Insert an entity
		 *
		 * @param {Object} entity
		 * @returns {Promise}
		 * @memberof MemoryDbAdapter
		 */
		insert(entity: object): Promise<object>;

		/**
		 * Insert multiple entities
		 *
		 * @param {Array<Object>} entities
		 * @returns {Promise}
		 * @memberof MemoryDbAdapter
		 */
		insertMany(...entities: object[]): Promise<object[]>;

		/**
		 * Update many entities by `query` and `update`
		 *
		 * @param {Object} query
		 * @param {Object} update
		 * @returns {Promise}
		 * @memberof DbAdapter
		 */
		updateMany<Q extends QueryOptions>(query: Q, update: object): Promise<number>;

		/**
		 * Update an entity by ID
		 *
		 * @param {string|number} id
		 * @param {Object} update
		 * @returns {Promise}
		 * @memberof DbAdapter
		 */
		updateById(id: string | number, update: object): Promise<object>;

		/**
		 * Remove many entities which are matched by `query`
		 *
		 * @param {Object} query
		 * @returns {Promise}
		 * @memberof DbAdapter
		 */
		removeMany(query: QueryOptions): Promise<number>;

		/**
		 * Remove an entity by ID
		 *
		 * @param {number|string} id
		 * @returns {Promise}
		 * @memberof DbAdapter
		 */
		removeById(id: number | string): Promise<any>;

		/**
		 * Clear all entities from DB
		 *
		 * @returns {Promise}
		 * @memberof DbAdapter
		 */
		clear(): Promise<void>;

		/**
		 * Convert DB entity to JSON object
		 *
		 * @param {any} entity
		 * @returns {Object}
		 * @memberof DbAdapter
		 */
		entityToObject(entity: any): object;

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
		 * @returns {any}
		 * @memberof DbAdapter
		 */
		createCursor(params: CursorOptions): any;

		/**
		 * Transforms 'idField' into NeDB's '_id'
		 * @param {Object} entity
		 * @param {String} idField
		 * @memberof DbAdapter
		 * @returns {Object} Modified entity
		 */
		beforeSaveTransformID(entity: object, idField: string): object;

		/**
		 * Transforms NeDB's '_id' into user defined 'idField'
		 * @param {Object} entity
		 * @param {String} idField
		 * @memberof DbAdapter
		 * @returns {Object} Modified entity
		 */
		afterRetrieveTransformID(entity: object, idField: string): object;
	}
	export interface DbContextParameters {
		limit?: string | number;
		offset?: string | number;
		page?: string | number;
		pageSize?: string | number;
		sort?: string | string[];
		fields?: string | string[];
		populate?: string | string[];
		searchFields?: string | string[];
	}
	export type DbContextSanitizedParams = DbContextParameters & { query?: QueryOptions };

	export interface MoleculerDbMethods {
		connect(): Promise<void>;
		/**
		 * Disconnect from database.
		 */
		disconnect(): Promise<void>;
		/**
		 * Sanitize context parameters at `find` action.
		 *
		 * @param {Context} ctx
		 * @param {any?} params
		 * @returns {Object}
		 */
		sanitizeParams(
			ctx: Context,
			params?: DbContextParameters & {
				query?: QueryOptions | any;
			},
		): DbContextSanitizedParams;

		/**
		 * Get entity(ies) by ID(s).
		 *
		 * @methods
		 * @param {String|Number|Array} id - ID or IDs.
		 * @param {Boolean} decoding - Need to decode IDs.
		 * @returns {Object|Array<Object>} Found entity(ies).
		 */
		getById(id: string | number | string[], decoding?: boolean): Promise<object | object[]>;
		/**
		 * Clear the cache & call entity lifecycle events
		 *
		 * @param {String} type
		 * @param {Object|Array|Number} json
		 * @param {Context} ctx
		 * @returns {Promise}
		 */
		entityChanged(type: string, json: number | any[] | any, ctx: Context): Promise<void>;

		/**
		 * Clear cached entities
		 *
		 * @methods
		 * @returns {Promise}
		 */
		clearCache(): Promise<void>;

		/**
		 * Transform the fetched documents
		 *
		 * @param {Array|Object} 	docs
		 * @param {Object} params
		 * @param {Context} ctx
		 * @returns {Array|Object}
		 */
		transformDocuments(ctx: Context, params: object, docs: any[] | object): any;
		/**
		 * Filter fields in the entity object
		 *
		 * @param {Object} 	doc
		 * @param {Array} 	fields	Filter properties of model.
		 * @returns	{Object}
		 */
		filterFields(doc: any, fields: any[]): object;
		/**
		 * Exclude fields in the entity object
		 *
		 * @param {Object} 	doc
		 * @param {Array} 	fields	Exclude properties of model.
		 * @returns	{Object}
		 */
		excludeFields(doc: any, fields: any[]): object;

		/**
		 * Authorize the required field list. Remove fields which is not exist in the `this.settings.fields`
		 *
		 * @param {Array} fields
		 * @returns {Array}
		 */
		authorizeFields(fields: any[]): any[];

		/**
		 * Populate documents.
		 *
		 * @param {Context} 		ctx
		 * @param {Array|Object} 	docs
		 * @param {Array}			populateFields
		 * @returns	{Promise}
		 */
		populateDocs(ctx: Context, docs: any, populateFields: any[]): Promise<any>;

		/**
		 * Validate an entity by validator.
		 *
		 * @param {Object} entity
		 * @returns {Promise}
		 */
		validateEntity(entity: object): Promise<any>;

		/**
		 * Encode ID of entity.
		 *
		 * @methods
		 * @param {any} id
		 * @returns {any}
		 */
		encodeID(id: any): any;

		/**
		 * Decode ID of entity.
		 *
		 * @methods
		 * @param {any} id
		 * @returns {any}
		 */
		decodeID(id: any): any;

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
		_find(ctx: Context, params?: FilterOptions): object[];

		/**
		 * Get count of entities by query.
		 * @methods
		 */
		_count(ctx: Context, params?: CountOptions): number;

		/**
		 * List entities by filters and pagination results.
		 * @methods
		 */
		_list(
			ctx: Context,
			params?: DbContextSanitizedParams,
		): {
			rows: object[];
			total: number;
			page: number;
			pageSize: number;
			totalPages: number;
		};
		/**
		 * Create a new entity.
		 * @methods
		 */
		_create(ctx: Context, params: object): Promise<object>;

		/**
		 * Create many new entities.
		 * @methods
		 */
		_insert(ctx: Context, params: object): Promise<object>;
		_insert(ctx: Context, params: object[]): Promise<object[]>;

		/**
		 * Get entity by ID.
		 * @methods
		 */
		_get(
			ctx: Context,
			params: { id: any | any[]; mapping?: boolean } & Partial<
				Pick<DbContextParameters, "populate" | "fields">
			>,
		): Promise<object | object[]>;

		/**
		 * Update an entity by ID.
		 * > After update, clear the cache & call lifecycle events.
		 * @methods
		 */
		_update(ctx: Context, params: object): Promise<object>;

		/**
		 * Remove an entity by ID.
		 * @methods
		 */
		_remove(ctx: Context, params: { id: any }): Promise<object>;
	}

	export interface MoleculerDB<TAdapter extends DbAdapter> {
		name?: string;
		metadata?: {
			$category: string;
			$official: boolean;
			$name: string;
			$version: string;
			$repo?: string;
		};
		// Store adapter (NeDB adapter is the default)
		adapter?: TAdapter;
		/**
		 * Default settings
		 */
		settings?: DbServiceSettings;

		/**
		 * Actions
		 */
		actions?: {
			/**
			 * Find entities by query.
			 *
			 * @actions
			 * @cached
			 *
			 * @param {Array<String>?} populate - Populated fields.
			 * @param {Array<String>?} fields - Fields filter.
			 * @param {Number} limit - Max count of rows.
			 * @param {Number} offset - Count of skipped rows.
			 * @param {String} sort - Sorted fields.
			 * @param {String} search - Search text.
			 * @param {String} searchFields - Fields for searching.
			 * @param {Object} query - Query object. Passes to adapter.
			 *
			 * @returns {Array<Object>} List of found entities.
			 */
			find?: {
				cache?: {
					keys: (
						| "populate"
						| "fields"
						| "limit"
						| "offset"
						| "sort"
						| "search"
						| "searchFields"
						| "query"
						| any
					)[];
				};
				params?: DbContextParameters & {
					query?: any;
				};
				handler?(ctx: Context): Promise<object[]>;
			};
		};

		/**
		 * Methods
		 */
		methods?: Partial<MoleculerDbMethods>;

		afterConnected?(): void | Promise<void>;

		// Lifecycle entity events
		// https://moleculer.services/docs/0.14/moleculer-db.html#Lifecycle-entity-events
		beforeEntityCreate<T = any, C extends Context<any, any> = Context<any, any>>(doc: T | Partial<T>, ctx: C): T | Partial<T> | Promise<T | Partial<T>>
		beforeEntityUpdate<T = any, C extends Context<any, any> = Context<any, any>>(doc: T | Partial<T>, ctx: C): T | Partial<T> | Promise<T | Partial<T>>
		beforeEntityRemove<T = any, C extends Context<any, any> = Context<any, any>>(doc: T | Partial<T>, ctx: C): T | Partial<T> | Promise<T | Partial<T>>
		entityCreated?<T = any, C extends Context<any, any> = Context<any, any>>(docsTransformed: Partial<T>[], ctx: C, docsRaw: T[]): void | Promise<void>;
		entityCreated?<T = any, C extends Context<any, any> = Context<any, any>>(docTransformed: Partial<T>, ctx: C, docRaw: T): void | Promise<void>;
		entityUpdated?<T = any, C extends Context<any, any> = Context<any, any>>(docTransformed: Partial<T>, ctx: C, docRaw: T): void | Promise<void>;
		entityRemoved?<T = any, C extends Context<any, any> = Context<any, any>>(docTransformed: Partial<T>, ctx: C, docRaw: T): void | Promise<void>;
	}

	export class MemoryAdapter implements DbAdapter {
		constructor(opts?: object);
		/**
		 * Initialize adapter
		 *
		 * @param {ServiceBroker} broker
		 * @param {Service} service
		 * @typeOf DbAdapter
		 */
		init(broker: ServiceBroker, service: Service): void;

		/**
		 * Connect to database
		 *
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		connect(): Promise<void>;

		/**
		 * Disconnect from database
		 *
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		disconnect(): Promise<void>;

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
		 * @typeOf MemoryDbAdapter
		 */
		find(filters: QueryFilters): Promise<any>;
		/**
		 * Find an entity by query
		 *
		 * @param {Object} query
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		findOne(query: QueryOptions): Promise<object>;
		/**
		 * Find an entity by ID
		 *
		 * @param {any} _id
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		findById(_id: number | string): Promise<object>;
		/**
		 * Find all entites by IDs
		 *
		 * @param {Array<Number>} ids
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		findByIds(ids: number[]): Promise<object[]>;
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
		 * @typeOf MemoryDbAdapter
		 */
		count(filters: object): Promise<number>;
		/**
		 * Insert an entity
		 *
		 * @param {Object} entity
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		insert(entity: object): Promise<object>;

		/**
		 * Insert multiple entities
		 *
		 * @param {Array<Object>} entities
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		insertMany(entities: object[]): Promise<object[]>;

		/**
		 * Update many entities by `query` and `update`
		 *
		 * @param {Object} query
		 * @param {Object} update
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		updateMany(query: QueryOptions, update: object): Promise<number>;

		/**
		 * Update an entity by ID
		 *
		 * @param {any} _id
		 * @param {Object} update
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		updateById(_id: number | string, update: object): Promise<object>;

		/**
		 * Remove many entities which are matched by `query`
		 *
		 * @param {Object} query
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		removeMany(query: QueryOptions): Promise<number>;

		/**
		 * Remove an entity by ID
		 *
		 * @param {any} _id
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		removeById(_id: number | string): Promise<object>;

		/**
		 * Clear all entities from DB
		 *
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		clear(): Promise<void>;

		/**
		 * Convert DB entity to JSON object
		 *
		 * @param {any} entity
		 * @returns {Object}
		 * @typeOf MemoryDbAdapter
		 */
		entityToObject(entity: unknown): Promise<object>;

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
		 * @typeOf MemoryDbAdapter
		 */
		createCursor(params: QueryFilters): Promise<object[]> | QueryOptions;

		/**
		 * Transforms 'idField' into NeDB's '_id'
		 * @param {Object} entity
		 * @param {String} idField
		 * @typeOf MemoryDbAdapter
		 * @returns {Object} Modified entity
		 */
		beforeSaveTransformID(entity: object, idField: string): object;

		/**
		 * Transforms NeDB's '_id' into user defined 'idField'
		 * @param {Object} entity
		 * @param {String} idField
		 * @typeOf MemoryDbAdapter
		 * @returns {Object} Modified entity
		 */
		afterRetrieveTransformID(entity: object, idField: string): object;
	}
	export default class DbService<
		S extends DbServiceSettings = DbServiceSettings,
	> extends Service<S> {
		static MemoryAdapter: typeof MemoryAdapter;
	}
}
