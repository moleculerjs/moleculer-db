"use strict";

const { flatten } = require("../../src/utils");
const { randomUUID } = require("crypto");

describe("Test Utils", () => {
	describe("flatten", () => {
		it("should properly flatten a given object", () => {
			const uuid = randomUUID();
			const date = new Date("2024-01-01");
			const obj = {
				name: "John",
				address: {
					street: "Main St",
					location: {
						city: "Boston",
						country: "USA"
					}
				},
				account: {
					createdAt: date,
					identifier: uuid,
					settings: {
						theme: null,
						language: undefined
					}
				},
				scores: [85, 90, 95],
			};

			const expected = {
				"name": "John",
				"address.street": "Main St",
				"address.location.city": "Boston",
				"address.location.country": "USA",
				"account.createdAt": date,
				"account.identifier": uuid,
				"account.settings.theme": null,
				"account.settings.language": undefined,
				"scores": [85, 90, 95],
			};

			expect(flatten(obj)).toEqual(expected);
		});
	});
});
