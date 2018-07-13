"use strict";

const { ServiceBroker } = require("moleculer");
//const MyService = require("../../src");

describe("Test MyService", () => {
	const broker = new ServiceBroker({ logger: false });
	//	const service = broker.createService(MyService);

	it("should be created", () => {
		//		expect(service).toBeDefined();
	});
/*
	it("should return with 'Hello Anonymous'", () => {
		return broker.call("knex.test").then(res => {
			expect(res).toBe("Hello Anonymous");
		});
	});

	it("should return with 'Hello John'", () => {
		return broker.call("knex.test", { name: "John" }).then(res => {
			expect(res).toBe("Hello John");
		});
	});
*/
});

