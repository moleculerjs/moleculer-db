const { deepGet } = require("../../src/utils");
describe("test utils.js", function () {
	describe("test function deepGet", () => {
		const doc = {
			id : 1,
			name: "Walter",
			address: {
				city: "Albuquerque",
				state: "NM",
				zip: 87111
			},
			cars: [
				{id: 1, name: "BMW", model: "320i", wheels: [
					{ placement: "front-left", id: 1},
					{ placement: "front-right", id: 2},
					{ placement: "behind-left", id: 3},
					{ placement: "behind-right", id: 4},
				]},
				{id: 2, name: "BMW", model: "520i", wheels: [
					{ placement: "front-left", id: 1},
					{ placement: "front-right", id: 2},
					{ placement: "behind-left", id: 3},
					{ placement: "behind-right", id: 4},
				]},
				{id: 3, name: "AUDI", model: "Q7", wheels: [
					{ placement: "front-left", id: 1},
					{ placement: "front-right", id: 2},
					{ placement: "behind-left", id: 3},
					{ placement: "behind-right", id: 4},
				]},
			]
		};

		it("get name", () => {
			const fieldPaths = ["name"];
			const res = {};
			deepGet(doc, fieldPaths, res);
			expect(res).toEqual({"name": "Walter"});
		});

		it("get address.city", () => {
			const fieldPaths = ["address.city"];
			const res = {};
			deepGet(doc, fieldPaths, res);
			expect(res).toEqual({"address": {city: "Albuquerque"}});
		});

		it("get cars", () => {
			const fieldPaths = ["cars"];
			const res = {};
			deepGet(doc, fieldPaths, res);
			expect(res).toEqual({ cars: doc.cars });
		});

		it("get cars.$.name", () => {
			const fieldPaths = ["cars", "name"];
			const res = {};
			deepGet(doc, fieldPaths, res);
			expect(res).toEqual({
				cars: [
					{ name: "BMW" },
					{ name: "BMW" },
					{ name: "AUDI" },
				]});
		});

		it("get cars.$.name", () => {
			const fieldPaths = ["cars", "wheels", "placement"];
			const res = {};
			deepGet(doc, fieldPaths, res);
			expect(res).toEqual({
				cars: [
					{wheels: [
						{ placement: "front-left" },
						{ placement: "front-right" },
						{ placement: "behind-left" },
						{ placement: "behind-right" },
					]},
					{wheels: [
						{ placement: "front-left" },
						{ placement: "front-right" },
						{ placement: "behind-left" },
						{ placement: "behind-right" },
					]},
					{wheels: [
						{ placement: "front-left" },
						{ placement: "front-right" },
						{ placement: "behind-left" },
						{ placement: "behind-right" },
					]},
				]});
		});
	});
});
