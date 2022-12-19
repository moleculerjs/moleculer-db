const _ = require("lodash");

function deepGet(doc, fieldPaths, res, i = 0) {
	while (i < fieldPaths.length) {
		const path = fieldPaths[i++]; // increase i
		doc = _.get(doc, path);
		if (doc !== undefined) {
			if (fieldPaths.length > i) { // still remain paths
				if (Array.isArray(doc)) {
					const resVal = _.get(res, path, []);
					_.set(res, path, doc.map((item, index) => {
						const obj = resVal[index] || {};
						deepGet(item, fieldPaths, obj, i);
						return obj;
					}));
				} else {
					return; // if .$. dont apply to array, return
				}
			} else {
				_.set(res, path, doc);
			}
		} else {
			return;
		}
	}
}
exports.deepGet = deepGet;
