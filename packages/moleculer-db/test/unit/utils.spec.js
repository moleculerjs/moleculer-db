"use strict";

const { flatten } = require("../../src/utils");

class ObjectId {
	constructor() {
		this.timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
		this.machineId = Math.floor(Math.random() * 16777216).toString(16).padStart(6, "0");
		this.processId = Math.floor(Math.random() * 65536).toString(16).padStart(4, "0");
		this.counter = Math.floor(Math.random() * 16777216).toString(16).padStart(6, "0");
	}

	toString() {
		return this.timestamp + this.machineId + this.processId + this.counter;
	}

	getTimestamp() {
		return new Date(parseInt(this.timestamp, 16) * 1000);
	}
}

describe("Test Utils", () => {
	describe("flatten", () => {
		it("should properly flatten a given object", () => {
			const oid = new ObjectId();
			const date = new Date("2024-01-01");
			const obj = {
				name: "John",
				active: true,
				address: {
					street: "Main St",
					location: {
						city: "Boston",
						country: "USA"
					}
				},
				account: {
					createdAt: date,
					identifier: oid,
					isSync: false,
					settings: {
						theme: null,
						language: undefined
					}
				},
				scores: [85, 90, 95],
			};

			const expected = {
				"name": "John",
				"active": true,
				"address.street": "Main St",
				"address.location.city": "Boston",
				"address.location.country": "USA",
				"account.createdAt": date,
				"account.identifier": oid,
				"account.settings.theme": null,
				"account.settings.language": undefined,
				"account.isSync": false,
				"scores": [85, 90, 95],
			};

			expect(flatten(obj)).toEqual(expected);
		});
	});
});
