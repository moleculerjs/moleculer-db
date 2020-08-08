declare module "moleculer-db" {
	import { Context, ServiceBroker, Service } from "moleculer";

	export interface QueryFilters extends FilterOptions{
		sort?:string;
	}

	export interface DbServiceSettings {
		idField: string;
		fields?: Array<string>;
		populates?: Array<any>;
		pageSize?: number;
		maxPageSize?: number;
		maxLimit?: number;
		entityValidator?: any;
	}


	export interface QueryOptions{
		[name: string]: any;
	}
	export interface CursorOptions extends FilterOptions {
		sort?: string | string[];
		fields?: string | string[];
	}

	export interface FilterOptions{
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
		init(broker: ServiceBroker, service: Service): DbAdapter;
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
		insert(entity: object): Promise<object[]>;

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
		updateMany< Q extends QueryOptions>(
			query: Q,
			update: object
		): Promise<number>;

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


	export interface MoleculerDB<TAdapter extends DbAdapter> {
		name: string;
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
		settings?: {
			/** @type {String} Name of ID field. */
			idField?: string;

			/** @type {Array<String>?} Field filtering list. It must be an `Array`. If the value is `null` or `undefined` doesn't filter the fields of entities. */
			fields?: string[];

			/** @type {Array?} Schema for population. [Read more](#populating). */
			populates?: any[];

			/** @type {Number} Default page size in `list` action. */
			pageSize?: number;

			/** @type {Number} Maximum page size in `list` action. */
			maxPageSize?: number;

			/** @type {Number} Maximum value of limit in `find` action. Default: `-1` (no limit) */
			maxLimit?: number;

			/** @type {Object|Function} Validator schema or a function to validate the incoming entity in `create` & 'insert' actions. */
			entityValidator?: object | Function;
		};

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
					keys:
						| "populate"
						| "fields"
						| "limit"
						| "offset"
						| "sort"
						| "search"
						| "searchFields"
						| "query";
				};
				params?: {
					populate: string | string[];
					fields?: string | string[];
					limit?: number;
					offset?: number;
					sort?: string;
					search?: string;
					searchFields?: string | string[];
					query?: any;
				};
				handler?(ctx: Context): Promise<any>;
			};
		};

		/**
		 * Methods
		 */
		methods?: {
			connect?(): Promise<void>;
			/**
			 * Disconnect from database.
			 */
			disconnect?(): Promise<void>;
			/**
			 * Sanitize context parameters at `find` action.
			 *
			 * @param {Context} ctx
			 * @param {any} origParams
			 * @returns {Promise}
			 */
			sanitizeParams?(
				ctx: Context,
				params?: DbContextParameters
			): Promise<void>;

			/**
			 * Get entity(ies) by ID(s).
			 *
			 * @methods
			 * @param {String|Number|Array} id - ID or IDs.
			 * @param {Boolean} decoding - Need to decode IDs.
			 * @returns {Object|Array<Object>} Found entity(ies).
			 */
			getById?(
				id: string | number | string[],
				decoding?: boolean
			): Promise<object | object[]>;
			/**
			 * Clear the cache & call entity lifecycle events
			 *
			 * @param {String} type
			 * @param {Object|Array|Number} json
			 * @param {Context} ctx
			 * @returns {Promise}
			 */
			entityChanged?(
				type: string,
				json: number | any[] | any,
				ctx: Context
			): Promise<any>;

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
			transformDocuments?(ctx: Context, params: object, docs: any[] | object): any;
			/**
			 * Filter fields in the entity object
			 *
			 * @param {Object} 	doc
			 * @param {Array} 	fields	Filter properties of model.
			 * @returns	{Object}
			 */
			filterFields?(doc: any, fields: any[]): object;

			/**
			 * Authorize the required field list. Remove fields which is not exist in the `this.settings.fields`
			 *
			 * @param {Array} fields
			 * @returns {Array}
			 */
			authorizeFields?(fields: any[]): any[];

			/**
			 * Populate documents.
			 *
			 * @param {Context} 		ctx
			 * @param {Array|Object} 	docs
			 * @param {Array}			populateFields
			 * @returns	{Promise}
			 */
			populateDocs?(
				ctx: Context,
				docs: any,
				populateFields: any[]
			): Promise<any>;

			/**
			 * Validate an entity by validator.
			 *
			 * @param {T} entity
			 * @returns {Promise}
			 */
			validateEntity?(entity: object): Promise<any>;

			/**
			 * Encode ID of entity.
			 *
			 * @methods
			 * @param {any} id
			 * @returns {any}
			 */
			encodeID?(id: any): any;

			/**
			 * Decode ID of entity.
			 *
			 * @methods
			 * @param {any} id
			 * @returns {any}
			 */
			decodeID?(id: any): any;

			/**
			 * Service started lifecycle event handler
			 */
			started?(): Promise<void>;
			/**
			 * Service stopped lifecycle event handler
			 */
			stopped?(): Promise<void>;
			/**
			 * Service created lifecycle event handler
			 */
			created?(): Promise<void>;
		};
	}

	export class  MemoryAdapter {

		constructor(opts?:object) ;
		/**
		 * Initialize adapter
		 *
		 * @param {ServiceBroker} broker
		 * @param {Service} service
		 * @typeOf DbAdapter
		 */
		init(broker: ServiceBroker, service: Service): DbAdapter;

		/**
		 * Connect to database
		 *
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		connect() :Promise<void>

		/**
		 * Disconnect from database
		 *
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		disconnect() :Promise<void>

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
		find(filters:QueryFilters):Promise<any>
		/**
		 * Find an entity by query
		 *
		 * @param {Object} query
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		findOne(query:QueryOptions):Promise<object>
		/**
		 * Find an entity by ID
		 *
		 * @param {any} _id
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		findById(_id: number | string):Promise<object>
		/**
		 * Find all entites by IDs
		 *
		 * @param {Array<Number>} ids
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		findByIds(ids:number[]):Promise<object[]>
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
		count(filters:object):Promise<number>
		/**
		 * Insert an entity
		 *
		 * @param {Object} entity
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		insert(entity:object):Promise<object>

		/**
		 * Insert multiple entities
		 *
		 * @param {Array<Object>} entities
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		insertMany(entities:object[]):Promise<object[]>

		/**
		 * Update many entities by `query` and `update`
		 *
		 * @param {Object} query
		 * @param {Object} update
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		updateMany(query:QueryOptions, update:object):Promise<object[]>

		/**
		 * Update an entity by ID
		 *
		 * @param {any} _id
		 * @param {Object} update
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		updateById(_id: number | string , update:object):Promise<object>

		/**
		 * Remove many entities which are matched by `query`
		 *
		 * @param {Object} query
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		removeMany(query:QueryOptions):Promise<object>

		/**
		 * Remove an entity by ID
		 *
		 * @param {any} _id
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		removeById(_id: number | string):Promise<object>

		/**
		 * Clear all entities from DB
		 *
		 * @returns {Promise}
		 * @typeOf MemoryDbAdapter
		 */
		clear():Promise<object>

		/**
		 * Convert DB entity to JSON object
		 *
		 * @param {any} entity
		 * @returns {Object}
		 * @typeOf MemoryDbAdapter
		 */
		entityToObject(entity:any):Promise<object>

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
		createCursor(params:QueryFilters):Promise<object[]> | QueryOptions

		/**
		 * Transforms 'idField' into NeDB's '_id'
		 * @param {Object} entity
		 * @param {String} idField
		 * @typeOf MemoryDbAdapter
		 * @returns {Object} Modified entity
		 */
		beforeSaveTransformID (entity:object, idField:string):object

		/**
		 * Transforms NeDB's '_id' into user defined 'idField'
		 * @param {Object} entity
		 * @param {String} idField
		 * @typeOf MemoryDbAdapter
		 * @returns {Object} Modified entity
		 */
		afterRetrieveTransformID (entity:object, idField:string):object
	}
	export  class DbService<S extends DbServiceSettings = DbServiceSettings> extends Service<S> {

	}


}
