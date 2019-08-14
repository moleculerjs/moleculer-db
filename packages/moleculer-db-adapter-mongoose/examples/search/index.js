"use strict";

const { ServiceBroker } = require("moleculer");
const DbService = require("../../../moleculer-db/index");
const MongooseDBAdapter = require("../../index");
const Fakerator = require("fakerator")();
const User = require("../models/users");

// Create broker
let broker = new ServiceBroker({
	logger: console,
	logLevel: "debug"
});

// Load my service
broker.createService({
	name: "users",
	mixins: [DbService],
	adapter: new MongooseDBAdapter("mongodb://localhost/search2-test"),
	model: User,

	methods: {
		seed() {
			Fakerator.seed(12345);
			return this.adapter.insertMany(Array(100).fill(0).map(() => {
				return {
					username: Fakerator.internet.userName(),
					fullName: Fakerator.names.name(),
					email: Fakerator.internet.email(),
					status: Fakerator.random.number(0,1)
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
				search: "Dianne",
				searchFields: ["name"]
			});
		},

		/**
		 * Perform a textual search with 'list' method
		 */
		searchWithList(ctx) {
			return ctx.call("users.list", {
				search: "Dianne",
				//searchFields: ["name"]
			});
		}

	},

	afterConnected() {
		return this.adapter.clear()
			.then(() => this.seed());

	}
});

broker.start()
	.then(() => broker.repl())
	.then(() => {
		return broker.call("users.list", {
			search: "Eric"
		}).then(res => console.log(res));
	})
	.catch(err => broker.logger.error(err));
