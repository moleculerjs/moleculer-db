"use strict";

const path = require("path");
const fs = require("fs");
const { makeDirs } = require("moleculer").Utils;

const Benchmarkify = require("benchmarkify");
const _ = require("lodash");
const { ServiceBroker } = require("moleculer");
const DbService = require("../../packages/moleculer-db/index");
const SequelizeAdapter = require("../../packages/moleculer-db-adapter-sequelize/index");
const Sequelize = require("sequelize");

const Fakerator = require("fakerator");
const fakerator = new Fakerator();

const COUNT = 1000;

makeDirs(path.join(__dirname, "tmp"));

const neDBFileName = path.join(__dirname, "tmp", "common.db");
const sqliteFilename = path.join(__dirname, "tmp", "common.sqlite3");

const Adapters = [
	//{ name: "NeDB (memory)", type: "NeDB", adapter: new DbService.MemoryAdapter(), ref: true },
	{ name: "NeDB (file)", type: "NeDB", adapter: new DbService.MemoryAdapter({ filename: neDBFileName }) },
	{ name: "SQLite (memory)", type: "Sequelize", adapter: new SequelizeAdapter("sqlite://:memory:", { logging: false }) },
	// { name: "SQLite (file)", type: "Sequelize", adapter: new SequelizeAdapter("sqlite://benchmark/suites/tmp/common.sqlite3", { logging: false }) },
];

const benchmark = new Benchmarkify("Moleculer Database benchmark - Common");

const suites = [];

const UserServiceSchema = (serviceName, adapterDef) => {
	return {
		name: serviceName,
		mixins: [DbService],
		adapter: adapterDef.adapter,
		model: {
			name: "post",
			define: {
				firstName: Sequelize.STRING,
				lastName: Sequelize.STRING,
				userName: Sequelize.STRING,
				email: Sequelize.STRING,
				password: Sequelize.STRING,
				status: Sequelize.BOOLEAN
			},
			options: {

			}
		},
		settings: {
			idField: "id",
			fields: ["id", "firstName", "lastName", "userName", "email", "password", "status"],
		},
		async started() {
			await this.adapter.clear();
		}
	};
};

const USERS = fakerator.times(fakerator.entity.user, COUNT * 5).map(user => {
	return _.pick(user, ["firstName", "lastName", "userName", "email", "password", "status"]);
});

const broker = new ServiceBroker({ logger: false });
Adapters.forEach((adapterDef, i) => {
	// const adapterName = adapterDef.name || adapterDef.type;
	const serviceName = `users-${i}`;
	adapterDef.svcName = serviceName;
	adapterDef.svc = broker.createService(UserServiceSchema(serviceName, adapterDef));
});

// --- ENTITY CREATION ---
(function () {
	const bench = benchmark.createSuite("Entity creation", {
		description: "This test calls the `create` action to create an entity.",
		meta: {
			type: "create"
		}
	});
	suites.push(bench);
	const tearDowns = [];
	bench.tearDown(tearDowns);

	Adapters.forEach(adapterDef => {
		const adapterName = adapterDef.name || adapterDef.type;
		const svc = adapterDef.svc;
		const actionName = `${adapterDef.svcName}.create`;

		const len = USERS.length;
		let c = 0;
		bench[adapterDef.ref ? "ref" : "add"](adapterName, done => {
			broker.call(actionName, USERS[c++ % len]).then(done).catch(err => console.error(err));
		});

		// Clear all entities and create only the specified count.
		tearDowns.push(async () => {
			try {
				await svc.adapter.clear();
				await svc.adapter.insertMany(USERS.slice(0, COUNT));
			} catch(err) {
				console.error(err);
			}
		});
	});
})();

// --- ENTITY FINDING ---
(function () {
	const bench = benchmark.createSuite("Entity finding", {
		description: "This test calls the `find` action to get random 20 entities.",
		meta: {
			type: "find"
		}
	});
	suites.push(bench);

	Adapters.forEach(adapterDef => {
		const adapterName = adapterDef.name || adapterDef.type;
		const actionName = `${adapterDef.svcName}.find`;

		let c = 0;
		bench[adapterDef.ref ? "ref" : "add"](adapterName, done => {
			const offset = Math.floor(Math.random() * (COUNT - 20));
			broker.call(actionName, { offset, limit: 20 }).then(done).catch(err => console.error(err));
		});
	});
})();

// --- ENTITY LISTING ---
(function () {
	const bench = benchmark.createSuite("Entity listing", {
		description: "This test calls the `users.list` service action to random 20 entities.",
		meta: {
			type: "list"
		}
	});
	suites.push(bench);

	Adapters.forEach(adapterDef => {
		const adapterName = adapterDef.name || adapterDef.type;
		const actionName = `${adapterDef.svcName}.list`;

		const maxPage = COUNT / 20 - 2;
		let c = 0;
		bench[adapterDef.ref ? "ref" : "add"](adapterName, done => {
			const page = Math.floor(Math.random() * maxPage) + 1;
			broker.call(actionName, { page, pageSize: 20 }).then(done).catch(err => console.error(err));
		});
	});
})();

// --- ENTITY COUNTING ---
(function () {
	const bench = benchmark.createSuite("Entity counting", {
		description:
			"This test calls the `users.count` service action to get the number of entities.",
		meta: {
			type: "count"
		}
	});
	suites.push(bench);

	Adapters.forEach(adapterDef => {
		const adapterName = adapterDef.name || adapterDef.type;
		const actionName = `${adapterDef.svcName}.count`;

		let c = 0;
		bench[adapterDef.ref ? "ref" : "add"](adapterName, done => {
			broker.call(actionName).then(done).catch(err => console.error(err));
		});
	});
})();

// --- ENTITY GETTING ---
(function () {
	const bench = benchmark.createSuite("Entity getting", {
		description: "This test calls the `users.get` service action to get a random entity.",
		meta: {
			type: "get"
		}
	});
	suites.push(bench);
	const setups = [];
	bench.setup(setups);

	Adapters.forEach(adapterDef => {
		const adapterName = adapterDef.name || adapterDef.type;
		const actionName = `${adapterDef.svcName}.get`;

		let docs = null;
		setups.push(async () => {
			docs = await broker.call(`${adapterDef.svcName}.find`);
		});

		let c = 0;
		bench[adapterDef.ref ? "ref" : "add"](adapterName, done => {
			const entity = docs[Math.floor(Math.random() * docs.length)];
			return broker.call(actionName, { id: entity.id }).then(done).catch(err => console.error(err));
		});
	});
})();

// --- ENTITY UPDATING ---
(function () {
	const bench = benchmark.createSuite("Entity updating", {
		description: "This test calls the `users.update` service action to update a entity.",
		meta: {
			type: "update"
		}
	});
	suites.push(bench);
	const setups = [];
	bench.setup(setups);

	Adapters.forEach(adapterDef => {
		const adapterName = adapterDef.name || adapterDef.type;
		const actionName = `${adapterDef.svcName}.update`;

		let docs = null;
		setups.push(async () => {
			docs = await broker.call(`${adapterDef.svcName}.find`);
		});

		let c = 0;
		bench[adapterDef.ref ? "ref" : "add"](adapterName, done => {
			const entity = docs[Math.floor(Math.random() * docs.length)];
			const newStatus = Math.round(Math.random());
			return broker.call(actionName, { id: entity.id, status: newStatus }).then(done).catch(err => console.error(err));
		});
	});
})();

// --- ENTITY DELETING ---
(function () {
	const bench = benchmark.createSuite("Entity deleting", {
		description: "This test calls the `users.remove` service action to delete a random entity.",
		meta: {
			type: "remove"
		}
	});
	suites.push(bench);
	const setups = [];
	bench.setup(setups);

	Adapters.forEach(adapterDef => {
		const adapterName = adapterDef.name || adapterDef.type;
		const actionName = `${adapterDef.svcName}.remove`;

		let docs = null;
		setups.push(async () => {
			docs = await broker.call(`${adapterDef.svcName}.find`);
		});

		let c = 0;
		bench[adapterDef.ref ? "ref" : "add"](adapterName, done => {
			const entity = docs[Math.floor(Math.random() * docs.length)];
			return broker.call(actionName, { id: entity.id }).catch(done).then(done).catch(err => console.error(err));
		});
	});
})();

async function run() {
	await broker.start();
	try {
		console.log("Running suites...");
		await benchmark.run(suites);
	} finally {
		await broker.stop();
	}
	console.log("Done.");

	process.exit(0);
}

run();
