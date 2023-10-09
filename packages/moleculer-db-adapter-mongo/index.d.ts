declare module "moleculer-db-adapter-mongo" {
	import { ServiceBroker, Service } from "moleculer";

	import { CountOptions, CursorOptions, DbAdapter, FilterOptions, QueryOptions } from "moleculer-db";
	import { Collection } from "mongodb";
	export default class MongoDbAdapter implements DbAdapter {
		collection: Collection;
		constructor(uri: string, opts?: object | string, dbName?: string);

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
		findById(id: unknown): Promise<object>;

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
		entityToObject(entity: unknown): object;

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
}
