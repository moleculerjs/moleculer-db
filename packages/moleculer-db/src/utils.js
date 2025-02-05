function copyFieldValueByPath(doc, paths, res, pathIndex = 0, cachePaths = []) {
	if (pathIndex < paths.length) {
		const path = paths[pathIndex];
		if (Array.isArray(doc)) {
			cachePaths[cachePaths.length - 1].type = "array";
			if (path === "$") {
				doc.forEach((item, itemIndex) => {
					copyFieldValueByPath(item, paths, res, pathIndex + 1, cachePaths.concat({path: itemIndex}));
				});
			} else if (Object.prototype.hasOwnProperty.call(doc, path)) {
				copyFieldValueByPath(doc[path], paths, res, pathIndex + 1, cachePaths.concat({path: path}));
			}
		} else if (doc != null && Object.prototype.hasOwnProperty.call(doc, path)) {
			cachePaths.push({ path });
			copyFieldValueByPath(doc[path], paths, res, pathIndex + 1, cachePaths);
		}
	} else {
		let obj = res;
		for (let i = 0; i < cachePaths.length - 1; i++) {
			const cachePath = cachePaths[i];
			if (!Object.prototype.hasOwnProperty.call(obj, cachePath.path)) {
				if (cachePath.type === "array") {
					obj[cachePath.path] = [];
				} else {
					obj[cachePath.path] = {};
				}
			}
			obj = obj[cachePath.path];
		}
		obj[cachePaths[cachePaths.length - 1].path] = doc;
	}
}

exports.copyFieldValueByPath = copyFieldValueByPath;

/**
 * Flattens a JavaScript object using dot notation while preserving arrays and non-plain objects
 * @param {Object} obj - The object to flatten
 * @param {String} [prefix=""] - The prefix to use for nested keys (used internally for recursion)
 * @returns {Object} A flattened object with dot notation keys
 *
 * @example
 * const input = {
 *   name: "John",
 *   address: {
 *     street: "Main St",
 *     location: {
 *       city: "Boston",
 *       country: "USA"
 *     }
 *   },
 *   account: {
 *     createdAt: new Date("2024-01-01"),
 *     settings: {
 *       theme: null,
 *       language: undefined
 *     }
 *   },
 *   scores: [85, 90, 95],
 *   _id: ObjectId("507f1f77bcf86cd799439011")
 * };
 *
 * // Returns:
 * // {
 * //   "name": "John",
 * //   "address.street": "Main St",
 * //   "address.location.city": "Boston",
 * //   "address.location.country": "USA",
 * //   "account.createdAt": Date("2024-01-01T00:00:00.000Z"),
 * //   "account.settings.theme": null,
 * //   "account.settings.language": undefined,
 * //   "scores": [85, 90, 95],
 * //   "_id": ObjectId("507f1f77bcf86cd799439011")
 * // }
 */
function flatten(obj, prefix = "") {
	return Object.keys(obj).reduce((acc, key) => {
		const prefixedKey = prefix ? `${prefix}.${key}` : key;
		const value = obj[key];

		// Check if value is a plain object (not array, not null, and constructor is Object)
		const isPlainObject = typeof value === "object" && value && value.constructor === Object;

		// If it's a plain object, flatten it recursively
		// Otherwise, keep the value as is (handles primitives, null, undefined, arrays, dates, ObjectId, etc.)
		return isPlainObject
			? { ...acc, ...flatten(value, prefixedKey) }
			: { ...acc, [prefixedKey]: value };
	}, {});
}

exports.flatten = flatten;
