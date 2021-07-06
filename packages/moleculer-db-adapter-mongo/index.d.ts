import {UpdateQuery} from "mongodb";

declare module "moleculer-db-adapter-mongo" {
	import {  ServiceBroker, Service } from "moleculer";
    import {
	Db,
	MongoClient,
	MongoClientOptions,
	FilterQuery,
	MongoCountPreferences,
	Collection
} from "mongodb"


	type TSchema = {
		[key: string]: any
	}

	class MongoDbAdapter<TCollection extends  Collection<TSchema>>{

        client: MongoClient;
        db: Db;
        collection: TCollection


    /**
	 * Creates an instance of MongoDbAdapter.
	 * @param {String} uri
	 * @param {MongoClientOptions?} opts
	 * @param {String?} dbName
	 *
	 * @memberof MongoDbAdapter
	 */
        constructor(uri: String, opts? : MongoClientOptions, dbName?: String): void;
		/**
		 * Initialize adapter
		 *
		 * @param {ServiceBroker} broker
		 * @param {Service} service
		 * @memberof MongoDbAdapter
		 */
		init(broker: ServiceBroker, service: Service): void;
		/**
		 * Connect to database
		 *
		 * @returns {Promise}
		 * @memberof MongoDbAdapter
		 */
         connect(): Promise<MongoClient>;
		/**
		 * Disconnect from database
		 *
		 * @returns {Promise}
		 * @memberof MongoDbAdapter
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
		 *  - query
		 *
		 * @param {FilterQuery<TSchema>} filters
		 * @returns {Promise<Array<Object>}
		 * @memberof MongoDbAdapter
		 */
		find(filters: FilterQuery<TSchema>): Promise<Object[]>;

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
		 * @returns {Promise<Array>}
		 *
		 * @memberof MongoDbAdapter
		 */
		find(filters: FilterQuery):Promise<Object[]>;

		/**
		 * Find an entity by query
		 *
		 * @param {QueryOptions} query
		 * @returns {Promise<Object>}
		 * @memberof MongoDbAdapter
		 */
		findOne<T = TSchema>(query: FilterQuery<TSchema>): Promise<T | null>;

		/**
		 * Find an entity by ID
		 *
		 * @param {any} id
		 * @returns {Promise<Object}
		 * @memberof MongoDbAdapter
		 */
		findById(id: any): Promise<Object>;

		/**
		 * Find all entites by IDs
		 *
		 * @param {Array<Number | String>} ids
		 * @returns {Promise<Array<Object>}
		 * @memberof MongoDbAdapter
		 */
		findByIds(ids: (string | number)[]): Promise<Object[]>;

		/**
		 * Get count of filtered entites
		 *
		 * Available filter props:
		 *  - search
		 *  - searchFields
		 *  - query
		 *
		 * @param {CountOptions} [filters={}]
		 * @returns {Promise}
		 * @memberof MongoDbAdapter
		 */
		count(filters?: FilterQuery<TSchema>,options?: MongoCountPreferences): Promise<number>;

		/**
		 * Insert an entity
		 *
		 * @param {Object} entity
		 * @returns {Promise<Object>}
		 * @memberof MongoDbAdapter
		 */
		insert(entity: Object): Promise<Object[]>;

		/**
		 * Insert multiple entities
		 *
		 * @param {Array<Object>} entities
		 * @returns {Promise<Array<Object>>}
		 * @memberof MongoDbAdapter
		 */
		insertMany(...entities: Object[]): Promise<Object[]>;

		/**
		 * Update many entities by `query` and `update`
		 *
		 * @param {Object} query
		 * @param {UpdateQuery | Partial} update
		 * @returns {Promise<number>}
		 * @memberof MongoDbAdapter
		 */
		updateMany(
			query: FilterQuery<TSchema>,
			update: UpdateQuery<TSchema> | Partial<TSchema>
		): Promise<number>;

		/**
		 * Update an entity by ID
		 *
		 * @param {string|number} id
		 * @param {Object} update
		 * @returns {Promise<Object>}
		 * @memberof MongoDbAdapter
		 */
		updateById(id: string | number, update: Object): Promise<Object>;

		/**
		 * Remove many entities which are matched by `query`
		 *
		 * @param {FilterQuery<TSchema>} filter
		 * @returns {Promise<number>}
		 * @memberof MongoDbAdapter
		 */
		removeMany(filter: FilterQuery<TSchema>,): Promise<number>;

		/**
		 * Remove an entity by ID
		 *
		 * @param {number|string} id
		 * @returns {Promise<Object>}
		 * @memberof MongoDbAdapter
		 */
		removeById(id: number | string): Promise<any>;

		/**
		 * Clear all entities from DB
		 *
		 * @returns {Promise}
		 * @memberof MongoDbAdapter
		 */
		clear(): Promise<void>;

		/**
		 * Convert DB entity to JSON Object
		 *
		 * @param {any} entity
		 * @returns {Object}
		 * @memberof MongoDbAdapter
		 */
		entityToObject(entity: any): Object;



        /**
         * Convert the `sort` param to a `sort` object to Mongo queries.
         *
         * @param {String|Array<String>|Object} paramSort
         * @returns {Object} Return with a sort object like `{ "votes": 1, "title": -1 }`
         * @memberof MongoDbAdapter
         */
	    transformSort(paramSort): Object;

        /**
         * Convert hex string to ObjectID
         *
         * @param {String} id
         * @returns {any}
         *
         * @memberof MongoDbAdapter
         */
        stringToObjectID(id:String): any;

        /**
         * Convert ObjectID to Hex string
         *
         * @param {any} id
         * @returns {String}
         *
         * @memberof MongoDbAdapter
         */
        objectIDToString(id:any): String;

		/**
		 * Transforms 'idField' into MongoDB's '_id'
		 * @param {Object} entity
		 * @param {String} idField
		 * @memberof MongoDbAdapter
		 * @returns {Object} Modified entity
		 */
        beforeSaveTransformID(entity: Object, idField: string): Object;

		/**
		 * Transforms MongoDB's '_id' into user defined 'idField'
		 * @param {Object} entity
		 * @param {String} idField
		 * @memberof MongoDbAdapter
		 * @returns {Object} Modified entity
		 */
		afterRetrieveTransformID(entity: Object, idField: string): Object;
	}

	export = MongoDbAdapter

}
