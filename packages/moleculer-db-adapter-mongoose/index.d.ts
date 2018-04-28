declare module "moleculer-db-adapter-mongoose" {
	import { Service, ServiceBroker } from "moleculer";
	import {
		ConnectionBase,
		ConnectionOptions,
		Document,
		DocumentQuery,
		Model,
		Schema
	} from "mongoose";
	import { Db } from "mongodb";

	type HasModelOrSchema<T extends Document> =
		| {
				model: Model<T>;
		  }
		| {
				schema: Schema;
				modelName: string;
		  };

	/**
	 * Parameters to {@link MongooseDbAdapter.count}
	 */
	interface CountFilters {
		query?: any;
		search?: string;
		searchFields?: string[]; // never used?
	}

	/**
	 * Parameters to {@link MongooseDbAdapter.createCursor}
	 */
	interface FindFilters {
		query?: any;
		search?: string;
		searchFields?: string[]; // never used???
		sort?: string | string[];
		offset?: number;
		limit?: number;
	}

	class MongooseDbAdapter<TDocument extends Document> {
		uri: string;
		opts?: ConnectionOptions;
		broker: ServiceBroker;
		service: Service;
		model: Model<TDocument>;
		schema?: Schema;
		modelName?: string;
		db: Db;

		/**
		 * Creates an instance of MongooseDbAdapter.
		 */
		constructor(uri: string, opts?: ConnectionOptions);
		/**
		 * Initialize adapter
		 */
		init(
			broker: ServiceBroker,
			service: Service & HasModelOrSchema<TDocument>
		): void;
		/**
		 * Connect to database
		 */
		connect(): Promise<void>;
		/**
		 * Disconnect from database
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
		 */
		find(filters: FindFilters): Promise<TDocument[]>;
		/**
		 * Find an entity by query
		 */
		findOne(query: any): Promise<TDocument | null>;
		/**
		 * Find an entities by ID
		 */
		findById(_id: any): Promise<TDocument | null>;
		/**
		 * Find any entities by IDs
		 */
		findByIds(idList: any[]): Promise<TDocument[]>;
		/**
		 * Get count of filtered entites
		 *
		 * Available filter props:
		 *  - search
		 *  - searchFields
		 *  - query
		 */
		count(filters?: CountFilters): Promise<number>;
		/**
		 * Insert an entity
		 */
		insert(entity: any): Promise<TDocument>;
		/**
		 * Insert many entities
		 */
		insertMany(entities: any[]): Promise<TDocument[]>;
		/**
		 * Update many entities by `query` and `update`
		 */
		updateMany(query: any, update: any): Promise<number>;
		/**
		 * Update an entity by ID and `update`
		 */
		updateById(
			_id: any,
			update: any
		): DocumentQuery<TDocument | null, TDocument>;
		/**
		 * Remove entities which are matched by `query`
		 */
		removeMany(query: any): Promise<number>;
		/**
		 * Remove an entity by ID
		 */
		removeById(_id: any): DocumentQuery<TDocument | null, TDocument>;
		/**
		 * Clear all entities from collection
		 */
		clear(): Promise<number>;
		/**
		 * Convert DB entity to JSON object
		 */
		entityToObject(entity: any): any;
		/**
		 * Create a filtered query
		 * Available filters in `params`:
		 *  - search
		 * 	- sort
		 * 	- limit
		 * 	- offset
		 *  - query
		 */
		createCursor(
			params: FindFilters
		): DocumentQuery<TDocument[], TDocument>;
	}
	export = MongooseDbAdapter;
}
