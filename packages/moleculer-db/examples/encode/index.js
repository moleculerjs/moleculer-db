"use strict";

const { ServiceBroker } = require("moleculer");
const DbService = require("../../index");
const _ = require("lodash");
const ModuleChecker = require("../../test/checker");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Create broker
const broker = new ServiceBroker({
	logger: console,
	logLevel: "debug"
});

// Load my service

broker.createService(DbService, {
	name: "products",
	adapter: new DbService.MemoryAdapter(),
	settings: {
		fields: ["_id", "name"]
	},

	methods: {

		encodeID(id) {
			return "prod-" + id;
		},

		decodeID(id) {
			if (id.startsWith("prod-"))
				return id.slice(5);
		}

	},

	afterConnected() {
		this.logger.info("Connected successfully");
		return this.adapter.count().delay(500).then(count => {
			if (count == 0) {
				this.logger.info("Seed products...");
				const products = _.times(20, i => {
					return {
						name: "Product " + i
					};
				});
				return this.adapter.insertMany(products)
					.then(() => this.adapter.count())
					.then(count => console.log("Saved products:", count ));

			}
		});
	}
});

const checker = new ModuleChecker(6);

// Start checks
function start() {
	return Promise.resolve()
		.then(() => delay(500))
		.then(() => checker.execute())
		.catch(console.error)
		.then(() => broker.stop())
		.then(() => checker.printTotal());
}

// --- TEST CASES ---

let id;

// List posts
checker.add("FIND PRODUCTS", () => broker.call("products.find", { limit: 5 }), rows => {
	console.log(rows);
	id = rows[3]._id;

	return rows.length === 5 && id.startsWith("prod-");
});

// Get by encoded ID
checker.add("GET BY ID", () => broker.call("products.get", { id }), res => {
	console.log(res);
	return res && res._id === id;
});

// Update a product
checker.add("UPDATE", () => broker.call("products.update", {
	id,
	name: "Modified product"
}), res => {
	console.log(res);
	return res && res.name === "Modified product";
});

// Get by encoded ID
checker.add("GET BY ID w/ mapping", () => broker.call("products.get", { id: [id], mapping: true }), res => {
	console.log(res);
	return res && res[id] && res[id]._id === id;
});

// Remove by ID
checker.add("REMOVE BY ID", () => broker.call("products.remove", { id }), res => {
	console.log(res);
	return res === 1;
});

// Count of products
checker.add("COUNT", () => broker.call("products.count"), res => {
	console.log(res);
	return res === 19;
});


broker.start().then(() => start());
