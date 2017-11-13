"use strict";

let errors = require("../../src/errors");


describe("Test Errors", () => {

	it("test EntityNotFoundError", () => {
		let err = new errors.EntityNotFoundError(123);
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.EntityNotFoundError);
		expect(err.code).toBe(404);
		expect(err.type).toBe(null);
		expect(err.name).toBe("EntityNotFoundError");
		expect(err.message).toBe("Entity not found");
		expect(err.data).toEqual({
			id: 123
		});
	});

});