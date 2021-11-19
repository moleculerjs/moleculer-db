import { Service, ServiceSchema } from "moleculer";

import DbService from "moleculer-db";
import  SequelizeDbAdapter  from "moleculer-db-adapter-sequelize";

export default class DbConnection implements Partial<ServiceSchema>, ThisType<Service>{

	private cacheCleanEventName: string;
	private collection: string;
	private schema: Partial<ServiceSchema> & ThisType<Service>;

    public constructor(public collectionName: string) {
		this.collection = collectionName;
		this.cacheCleanEventName = `cache.clean.${this.collection}`;
		this.schema = {
			mixins: [DbService],

			events: {
				/**
				 * Subscribe to the cache clean event. If it's triggered
				 * clean the cache entries for this service.
				 *
				 */
				async [this.cacheCleanEventName]() {
					if (this.broker.cacher) {
						await this.broker.cacher.clean(`${this.fullName}.*`);
					}
				},
			},
        };
    };

    public start(){
        this.schema.adapter = new  SequelizeDbAdapter("sqlite://:memory:");
    }
};
