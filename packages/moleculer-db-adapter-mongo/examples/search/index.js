"use strict";

const { ServiceBroker } = require("moleculer");
const DbService = require("../../../moleculer-db/index");
const MongoDBAdapter = require("../../index");
const Fakerator = require("fakerator")();

// Create broker
let broker = new ServiceBroker({
	logger: console,
	logLevel: "debug"
});

// Load my service
broker.createService({
	name: "users",
	mixins: [DbService],
	adapter: new MongoDBAdapter("mongodb://127.0.0.1/search-test"),
	collection: "users",

	methods: {
		seed() {
			Fakerator.seed(12345);
			return this.adapter.insertMany(Array(100).fill(0).map(() => {
				return {
					username: Fakerator.internet.userName(),
					name: Fakerator.names.name(),
					zip: Fakerator.random.number(1000,9999)
				};
			}));
		},
	},

	/**
	 * Actions
	 */
	actions: {

		/**
		 * Perform a textual search with 'find' method
		 */
		searchWithFind(ctx) {
			return ctx.call("users.find", {
				search: "Dianne"
			});
		},

		/**
		 * Perform a textual search with 'list' method
		 */
		searchWithList(ctx) {
			return ctx.call("users.list", {
				search: "Dianne"
			});
		}

	},

	afterConnected() {
		return this.adapter.clear()
			.then(() => this.adapter.collection.createIndex( { name: "text" } ))
			.then(() => this.seed());

	}
});

broker.start()
	.then(() => broker.repl())
	.then(() => {
		return broker.call("users.list", {
			search: "Dianne"
		}).then(res => console.log(res));
	})
	.catch(err => broker.logger.error(err));
