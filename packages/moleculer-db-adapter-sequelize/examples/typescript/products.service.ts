"use strict";

import * as Sequelize from "sequelize";

import {Service, ServiceBroker} from "moleculer";

import  DbConnection  from "./db.mixin";

class ProductsService extends Service {
	private DbMixin = new DbConnection("products").start();
	public  constructor(public broker: ServiceBroker) {
		super(broker);
		this.schema = this;
		this.schema = {
			name: "products",
			mixins: [this.DbMixin],
			model: {
				name: "products",
				define: {
					title: Sequelize.STRING,
					content: Sequelize.TEXT,
					author: Sequelize.INTEGER,
				},
			},
		};
	}

	// Action
	public ActionHello(): string {
		return "Hello Moleculer";
	}

	public ActionWelcome(name: string): string {
		return `Welcome, ${name}`;
	}
}

const Broker = new ServiceBroker({
	logger: true,
	namespace: "api",
	nodeID: "api",
	transporter: "TCP",
});

const Products = new ProductsService(Broker);
		Products.start()
			.then(() => {
				console.log("Products Service started!");
			})
			.catch(console.error)
			.then(() => Broker.stop())

	
