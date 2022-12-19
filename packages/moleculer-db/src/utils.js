const _ = require("lodash");

function deepGet(doc, fieldPaths, res, i = 0) {
	while (i < fieldPaths.length) {
		const path = fieldPaths[i++];
		doc = _.get(doc, path);
		if (doc !== undefined) {
			if ((Array.isArray(doc) && fieldPaths.length > i)) {
				const resVal = _.get(res, path, []);
				_.set(res, path, doc.map((item, index) => {
					const obj = resVal[index] || {};
					deepGet(item, [].concat(fieldPaths), obj, i);
					return obj;
				}));
			} else {
				_.set(res, path, doc);
			}
		}
	}
}
exports.deepGet = deepGet;
