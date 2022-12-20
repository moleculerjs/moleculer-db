function getField(doc, paths, res, pathIndex = 0, cachePaths = []) {
	if (pathIndex < paths.length) {
		const path = paths[pathIndex];
		if (Array.isArray(doc)) {
			cachePaths[cachePaths.length - 1].type = "array";
			if (path === "$") {
				doc.forEach((item, itemIndex) => {
					getField(item, paths, res, pathIndex + 1, cachePaths.concat({path: itemIndex}));
				});
			} else if (Object.prototype.hasOwnProperty.call(doc, path)) {
				getField(doc[path], paths, res, pathIndex + 1, cachePaths.concat({path: path}));
			}
		} else if (doc != null && Object.prototype.hasOwnProperty.call(doc, path)) {
			cachePaths.push({ path });
			getField(doc[path], paths, res, pathIndex + 1, cachePaths);
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

exports.getField = getField;
