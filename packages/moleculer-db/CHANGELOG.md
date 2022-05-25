--------------------------------------------------
<a name="0.8.14"></a>
# 0.8.14 (2021-05-25)

## Changes
- upgrade `seald-io/nedb` to 3.0.0 [#315](https://github.com/moleculerjs/moleculer-db/pull/315)
- async custom validation [#306](https://github.com/moleculerjs/moleculer-db/pull/306)
- fix `count` just the right number of row [#304](https://github.com/moleculerjs/moleculer-db/pull/304)
- fix RegExp throw error if search startsWith '.' or '+' [#316](https://github.com/moleculerjs/moleculer-db/pull/316)
 
--------------------------------------------------
<a name="0.8.13"></a>
# 0.8.13 (2021-04-26)

## Changes
- add `cacheCleanEventType` service setting [#258](https://github.com/moleculerjs/moleculer-db/pull/258)
- 
--------------------------------------------------
<a name="0.8.12"></a>
# 0.8.12 (2021-02-15)

## Changes
- support custom NeDB Datastores (in MemoryDbAdapter contructor) [#248](https://github.com/moleculerjs/moleculer-db/pull/248)

--------------------------------------------------
<a name="0.8.11"></a>
# 0.8.11 (2020-11-16)

## Changes
- fix missing limit when directly call `this._list` [#229](https://github.com/moleculerjs/moleculer-db/pull/229)
--------------------------------------------------
<a name="0.8.10"></a>
# 0.8.10 (2020-09-27)

## Changes
- allow to specify resulting populated field name [#224](https://github.com/moleculerjs/moleculer-db/pull/224)
- update typescript definitions [#202](https://github.com/moleculerjs/moleculer-db/pull/202), [#208](https://github.com/moleculerjs/moleculer-db/pull/208)
--------------------------------------------------
<a name="0.8.8"></a>
# 0.8.8 (2020-06-06)

## Changes
- handling nested fields in populating. [#177](https://github.com/moleculerjs/moleculer-db/pull/177)
- use dot notation in update action in case of `useDotNotation: true`. [#183](https://github.com/moleculerjs/moleculer-db/pull/183)
--------------------------------------------------
<a name="0.8.7"></a>
# 0.8.7 (2020-04-08)

## Changes
- fix mapping in `get` action with simple ID. [#176](https://github.com/moleculerjs/moleculer-db/pull/176)
- 
--------------------------------------------------
<a name="0.8.5"></a>
# 0.8.5 (2020-02-06)

## Changes
- fix `fields` property issue in `update` action. [#152](https://github.com/moleculerjs/moleculer-db/pull/152)

--------------------------------------------------
<a name="0.8.4"></a>
# 0.8.4 (2019-11-19)

## Changes
- parsing `query` string property in `find` & `list` actions by [@jjgumucio](https://github.com/jjgumucio). PR [#149](https://github.com/moleculerjs/moleculer-db/pull/149)

--------------------------------------------------
<a name="0.8.1"></a>
# 0.8.1 (2019-07-07)

## Changes
- update dependencies
- add rest properties for CRUD actions

--------------------------------------------------
<a name="0.8.0"></a>
# 0.8.0 (2019-07-01)

## Changes
- add new CRUD (`_find`, `_count`, `_insert`, `_create`, `_get`,  `_update`, `_remove`, ) methods by [@rzvdaniel](https://github.com/rzvdaniel)

--------------------------------------------------
<a name="0.7.5"></a>
# 0.7.5 (2018-07-13)

## Changes
- fix custom `entityValidator` calling

<a name="0.7.0"></a>
# 0.7.0 (2017-11-13)

## Breaking changes
- `transformDocuments` and `entityChanged` calls have been moved from methods to actions.
- `this.find(ctx, params)` method has been removed. Use `this.adapter.find(params)` instead.
- `this.count(ctx, params)` method has been removed. Use `this.adapter.count(params)` instead.
- `this.create(ctx, params)` method has been removed. Use `this.adapter.insert(params.entity)` instead.
- `this.createMany(ctx, params)` method has been removed. Use `this.adapter.insertMany(params.entities)` instead.
- `this.getById(ctx, params)` arguments have been changed. First argument is the ID or IDs, second argument is a `decoding` boolean. If true, it calls the `decodeID` method with every ID. The mapping feature has been moved to `get` action.
- `this.updateById(ctx, params)` method has been removed. Use `this.adapter.updateById(params.id, params.update)` instead.
- `this.updateMany(ctx, params)` method has been removed. Use `this.adapter.updateMany(params.query, params.update)` instead.
- `this.removeById(ctx, params)` method has been removed. Use `this.adapter.removeById(params.id)` instead.
- `this.removeMany(ctx, params)` method has been removed. Use `this.adapter.removeMany(params.query)` instead.
- `this.clear(ctx)` method has been removed. Use `this.adapter.clear()` instead and call the `entityChanged` method.

## New
- adapters have a new `findOne` method which returns with only one entity by `query`.

--------------------------------------------------
<a name="0.6.4"></a>
# 0.6.4 (2017-11-12)

## Changes
- add `findOne` method to get one record by a `query`

--------------------------------------------------

<a name="0.6.0"></a>
# 0.6.0 (2017-09-12)

## Breaking changes
- update Moleculer to v0.11.x

--------------------------------------------------
<a name="0.5.0"></a>
# 0.5.0 (2017-08-08)

## Changes

### Changed `create` & `insert` actions (breaking)
The current `create` action renamed to `insert`. It accepts `entity` param to create an entity. Or `entities` array to create multiple entities.
The `create` actions save a new entity from the `params` directly. So you can send an entity JSON directly to the `create` action.
```js
// Create a new entity
broker.call("users.create", {
    name: "John",
    age: 33,
    status: true
});

// Create a new entity
broker.call("users.insert", {
    entity: {
        name: "John",
        age: 33,
        status: true
    }
});

// Create multiple entities
broker.call("users.insert", {
    entities: [
        {
            name: "John",
            age: 33,
            status: true
        },
        {
            name: "Jane",
            age: 28,
            status: true
        }
    ]
});
```

### Better `update` action (breaking)
The `update` action update entity fields from `params` directly. You don't need to wrap it under an `update` prop.
```js
broker.call("users.update", {
    id: 5,
    name: "Jane",
    status: false
});
```

## Minor changes
- added `EntityNotFoundError`.


--------------------------------------------------
<a name="0.4.0"></a>
# 0.4.0 (2017-07-17)

## New
### Encoding & decoding IDs
There are two new `encodeID` and `decodeID` methods. You can use them if you want to encode & decode database ID (for example with [hashids](https://github.com/ivanakimov/hashids.js))
```js
const Hashids = require("hashids");
const hashids = new Hashids("secret salt");

broker.createService({
    name: "posts",
    mixins: [DbService],
    methods: {
        encodeID(id) {
            return hashids.encodeHex(id);
        },
        decodeID(id) {
            return hashids.decodeHex(id);
        }
    }
});
```

### Entity lifecycle events
There are 3 entity lifecycle events which are called when entities are manipulated.

```js
broker.createService({
    name: "posts",
    mixins: [DbService],
    settings: {},

	afterConnected() {
		this.logger.info("Connected successfully");
	},

	entityCreated(json, ctx) {
		this.logger.info("New entity created!");
	},

	entityUpdated(json, ctx) {
        // You can also access to Context
		this.logger.info(`Entity updated by '${ctx.meta.user.name}' user!`);
	},

	entityRemoved(json, ctx) {
		this.logger.info("Entity removed", json);
	},
});
```

### Better fields filtering
A new fields filtering method is implemented. It can also handle nested properties.
```js
const DbService = require("moleculer-db");

module.exports = {
    name: "users",
    mixins: [DbService],

    settings: {
        fields: ["name", "address.city", "address.country", "bio"]
    }
}

broker.call("users.get", { id: 5, fields: ["name", "address", "bio.height", "bio.hair", "password"] }).then(console.log);
/* The returned object contains only the following fields:
{
    name: "Walter",
    address: {
        city: "Albuquerque",
        country: "USA"
    },
    bio: {
        height: 185,
        hair: "bald"
    }
}
*/
```
## Changes
- deprecated `fields` as space-separated `String` in `settings`. Enabled only `Array<String>`.
- deprecated `fields` as space-separated `String` in `fields` of `settings.populates`. Enabled only `Array<String>`.

- **BREAKING**: `model` action & method is removed! Use `get` action instead.

- `moleculer-db-adapter-mongoose` returns with Mongoose objects instead of native object. But it will be converted to native JS object in [moleculer-db].
    ```js
        customAction(ctx) {
            return this.adapter.find({}).then(docs => {
                // You can access the Mongoose virtual methods & getters of `docs` here
            });
        }
    ```

--------------------------------------------------
<a name="0.3.0"></a>
# 0.3.0 (2017-07-07)

## New

### New `createMany` method
A new `createMany` method is created. With it you can insert many entities to the database.

```js
this.createMany(ctx, {
    entities: [...]
});
```

### New `list` action with pagination
There is a new `list` action with pagination support.

```js
broker.call("posts.list", { page: 2, pageSize: 10});
```
The result is similar as
```js
{
    rows: [
        { title: 'Post #26' },
        { title: 'Post #27' },
        { title: 'Post #25' },
        { title: 'Post #21' },
        { title: 'Post #28' }
    ],
    total: 28,
    page: 2,
    pageSize: 10,
    totalPages: 3
}
```

### New settings
- `pageSize` - Default page size in `list` action. Default: `10`
- `maxPageSize` - Maximum page size in `list` action. Default: `100`
- `maxLimit` - Maximum value of limit in `find` action. Default: `-1` (no limit)

--------------------------------------------------
<a name="0.2.0"></a>
# 0.2.0 (2017-07-06)

## Breaking changes

### Renamed service methods
- `findAll` renamed to `find`
- `update` renamed to `updateMany`
- `remove` renamed to `removeMany`

### `clear` action is removed
We removed the `clear` action from service The reason is if you don't filter it in whitelists of API gw, it will be published and callable from client-side what is very dangerous.

After all if you need it:
```js
module.exports = {
    name: "posts",
    mixins: [DbService],

    actions: {
        clear(ctx) {
            return this.clear(ctx);
        }
    }
}
```

### Renamed adapter methods
- `findAll` renamed to `find`
- `update` renamed to `updateMany`
- `remove` renamed to `removeMany`

--------------------------------------------------
