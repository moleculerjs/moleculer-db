declare module "moleculer-db" {
  import { Context, ServiceBroker, Service } from "moleculer";

  export interface DbServicePopulate extends Record<string,any>{
     <R>(ids: string|number, docs: any[], rule: any, ctx: Context): Promise<R>;
  }
  export interface DbServiceSettings {
    idField: string;
    fields?: Array<string>;
    populates?: Array<DbServicePopulate>;
    pageSize?: number;
    maxPageSize?: number;
    maxLimit?: number;
    entityValidator?: <T, R>(entity: T)=> Promise<R>;
  }
 export interface DbEntity<T extends Record<string,any> = Record<string,any>> extends Record<string,any> {}
  export default class DbService<T,S extends DbServiceSettings = DbServiceSettings> extends Service<S> {
 
  }

  export interface QueryOptions<T  = any> extends Record<string,any> {
  }
  export interface CursorOptions<T> extends FilterOptions<T> {
    sort?: string | string[];
    fields?: string | string[];
  }

  export interface FilterOptions<T> {
    limit?: string | number;
    offset?: string | number;
    searchFields?: string | string[];
    search?: string;
    query?: QueryOptions<T>;
  }

  export interface CountOptions<T> {
    searchFields?: string | string[];
    search?: string;
    query?: QueryOptions<T>;
  }

  export interface DbAdapter<E extends DbEntity = DbEntity> {
    /**
     * Initialize adapter
     *
     * @param {ServiceBroker} broker
     * @param {Service} service
     * @memberof DbAdapter
     */
    init(broker: ServiceBroker, service: Service): this;
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
    find<R>(filters: FilterOptions<R>): Promise<R[]>;

    /**
     * Find an entity by query
     *
     * @param {Object} query
     * @returns {Promise}
     * @memberof DbAdapter
     */
    findOne<R, Q extends QueryOptions<R> = any>(query: Q): Promise<R>;

    /**
     * Find an entity by ID
     *
     * @param {any} id
     * @returns {Promise}
     * @memberof DbAdapter
     */
    findById<R>(id: any): Promise<R>;

    /**
     * Find all entites by IDs
     *
     * @param {Array<Number>} ids
     * @returns {Promise}
     * @memberof DbAdapter
     */
    findByIds<R>(ids: (string | number)[]): Promise<R|R[]>;

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
    count<T>(filters?: CountOptions<T>): Promise<number>;

    /**
     * Insert an entity
     *
     * @param {Object} entity
     * @returns {Promise}
     * @memberof MemoryDbAdapter
     */
    insert<T, R = T>(entity: T): Promise<R>;

    /**
     * Insert multiple entities
     *
     * @param {Array<Object>} entities
     * @returns {Promise}
     * @memberof MemoryDbAdapter
     */
    insertMany<T, R = T>(...entities: T[]): Promise<R[]>;

    /**
     * Update many entities by `query` and `update`
     *
     * @param {Object} query
     * @param {Object} update
     * @returns {Promise}
     * @memberof DbAdapter
     */
    updateMany<T, Q extends QueryOptions<T> = any>(
      query: Q,
      update: T
    ): Promise<number>;

    /**
     * Update an entity by ID
     *
     * @param {string|number} id
     * @param {Object} update
     * @returns {Promise}
     * @memberof DbAdapter
     */
    updateById<T, R = T>(id: string | number, update: T): Promise<R>;

    /**
     * Remove many entities which are matched by `query`
     *
     * @param {Object} query
     * @returns {Promise}
     * @memberof DbAdapter
     */
    removeMany<Q extends QueryOptions<R>, R = any>(query: Q): Promise<number>;

    /**
     * Remove an entity by ID
     *
     * @param {number|string} id
     * @returns {Promise}
     * @memberof DbAdapter
     */
    removeById<R = any>(id: number | string): Promise<R>;

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
    entityToObject<R, T = R>(entity: T): R;

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
     * @memberof DbAdapter
     */
    createCursor<T = any,C extends CursorOptions<T> = any,Q = any,>(params: C): Q;

    /**
     * Transforms 'idField' into NeDB's '_id'
     * @param {Object} entity
     * @param {String} idField
     * @memberof DbAdapter
     * @returns {Object} Modified entity
     */
    beforeSaveTransformID<T, R = T>(entity: T, idField: string): R;

    /**
     * Transforms NeDB's '_id' into user defined 'idField'
     * @param {Object} entity
     * @param {String} idField
     * @memberof DbAdapter
     * @returns {Object} Modified entity
     */
    afterRetrieveTransformID<T, R = T>(entity: T, idField: string): R;
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

  export interface MoleculerDBServiceSettings {
    /** @type {String} Name of ID field. */
    idField?: string;

    /** @type {Array<String>?} Field filtering list. It must be an `Array`. If the value is `null` or `undefined` doesn't filter the fields of entities. */
    fields?: string[];

    /** @type {Array?} Schema for population. [Read more](#populating). */
    populates?: DbServicePopulate | DbServicePopulate[];

    /** @type {Number} Default page size in `list` action. */
    pageSize?: number;

    /** @type {Number} Maximum page size in `list` action. */
    maxPageSize?: number;

    /** @type {Number} Maximum value of limit in `find` action. Default: `-1` (no limit) */
    maxLimit?: number;

    /** @type {Object|Function} Validator schema or a function to validate the incoming entity in `create` & 'insert' actions. */
    entityValidator?: <T, R = T>(entity: T) => Promise<R>;
  }
  export interface MoleculerDB<TAdapter extends DbAdapter, S extends MoleculerDBServiceSettings= MoleculerDBServiceSettings> {
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
    settings?: S;

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
          populate: DbServicePopulate | DbServicePopulate[];
          fields?: string | string[];
          limit?: number;
          offset?: number;
          sort?: string;
          search?: string;
          searchFields?: string | string[];
          query?: QueryOptions;
        };
        handler?<R>(ctx: Context): Promise<R>;
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
      getById?<R>(
        id: string | number | string[],
        decoding?: boolean
      ): Promise<R>;
      /**
       * Clear the cache & call entity lifecycle events
       *
       * @param {String} type
       * @param {Object|Array|Number} json
       * @param {Context} ctx
       * @returns {Promise}
       */
      entityChanged?<R>(
        type: string,
        json: number | any[] | any,
        ctx: Context
      ): Promise<R>;

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
       * @param {Object} 			Params
       * @returns {Array|Object}
       */
      transformDocuments?<R>(ctx: Context, params: any, docs: any): R;
      /**
       * Filter fields in the entity object
       *
       * @param {Object} 	doc
       * @param {Array} 	fields	Filter properties of model.
       * @returns	{Object}
       */
      filterFields?<R>(doc: any, fields: any[]): R;

      /**
       * Authorize the required field list. Remove fields which is not exist in the `this.settings.fields`
       *
       * @param {Array} fields
       * @returns {Array}
       */
      authorizeFields?<R>(fields: any[]): R[];

      /**
       * Populate documents.
       *
       * @param {Context} 		ctx
       * @param {Array|Object} 	docs
       * @param {Array}			populateFields
       * @returns	{Promise}
       */
      populateDocs?<R>(
        ctx: Context,
        docs: any,
        populateFields: any[]
      ): Promise<R>;

      /**
       * Validate an entity by validator.
       *
       * @param {T} entity
       * @returns {Promise}
       */
      validateEntity?<T, R>(entity: T): Promise<R>;

      /**
       * Encode ID of entity.
       *
       * @methods
       * @param {any} id
       * @returns {R}
       */
      encodeID?<R>(id: any): R;

      /**
       * Decode ID of entity.
       *
       * @methods
       * @param {R} id
       * @returns {R}
       */
      decodeID?<R>(id: any): R;

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
}
