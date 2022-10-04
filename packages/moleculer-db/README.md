![Moleculer logo](https://moleculer.services/images/banner.png)

# moleculer-db [![NPM version](https://img.shields.io/npm/v/moleculer-db.svg)](https://www.npmjs.com/package/moleculer-db)

Moleculer service to store entities in database.

# Features
- default CRUD actions
- cached actions
- pagination support
- pluggable adapter ([NeDB](https://github.com/louischatriot/nedb) is the default memory adapter for testing & prototyping)
- official adapters for MongoDB, PostgreSQL, SQLite, MySQL, MSSQL.
- fields filtering
- populating
- encode/decode IDs
- entity lifecycle events for notifications

# Install

```bash
$ npm install tenancy-moleculer-db --save
```

# Usage

```js
"use strict";

const { ServiceBroker } = require("moleculer");
const DbService = require("tenancy-moleculer-db");

const broker = new ServiceBroker();

// Create a DB service for `user` entities
broker.createService({
    name: "users",
    mixins: [DbService],

    settings: {
        fields: ["_id", "username", "name"]
    },

    afterConnected() {
        // Seed the DB with ˙this.create`
    }
});

broker.start()

// Create a new user
.then(() => broker.call("users.create", {
    username: "john",
    name: "John Doe",
    status: 1
}))

// Get all users
.then(() => broker.call("users.find").then(console.log));

// List users with pagination
.then(() => broker.call("users.list", { page: 2, pageSize: 10 }).then(console.log));

// Get a user
.then(() => broker.call("users.get", { id: 2 }).then(console.log));

// Update a user
.then(() => broker.call("users.update", { id: 2, name: "Jane Doe" }).then(console.log));

// Delete a user
.then(() => broker.call("users.remove", { id: 2 }).then(console.log));

```

# Settings

<!-- AUTO-CONTENT-START:SETTINGS -->
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `idField` | `String` | **required** | Name of ID field. |
| `fields` | `Array.<String>` | `null` | Field filtering list. It must be an `Array`. If the value is `null` or `undefined` doesn't filter the fields of entities. |
| `populates` | `Array` | `null` | Schema for population. [Read more](#populating). |
| `pageSize` | `Number` | **required** | Default page size in `list` action. |
| `maxPageSize` | `Number` | **required** | Maximum page size in `list` action. |
| `maxLimit` | `Number` | **required** | Maximum value of limit in `find` action. Default: `-1` (no limit) |
| `entityValidator` | `Object`, `function` | `null` | Validator schema or a function to validate the incoming entity in `create` & 'insert' actions. |

<!-- AUTO-CONTENT-END:SETTINGS -->

>**Note**: `idField` does not work with Sequelize adapter as you can freely set your own ID while creating the model.

<!-- AUTO-CONTENT-TEMPLATE:SETTINGS
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
{{#each this}}
| `{{name}}` | {{type}} | {{defaultValue}} | {{description}} |
{{/each}}
{{^this}}
*No settings.*
{{/this}}

-->

# Actions

<!-- AUTO-CONTENT-START:ACTIONS -->
## `find` ![Cached action](https://img.shields.io/badge/cache-true-blue.svg) 

Find entities by query.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `populate` | `String`, `Array.<String>` | **required** | Populated fields. |
| `fields` | `String`, `Array.<String>` | **required** | Fields filter. |
| `limit` | `Number` | - | Max count of rows. |
| `offset` | `Number` | - | Count of skipped rows. |
| `sort` | `String` | - | Sorted fields. |
| `search` | `String` | - | Search text. |
| `searchFields` | `String`, `Array.<String>` | **required** | Fields for searching. |
| `query` | `Object` | - | Query object. Passes to adapter. |

### Results
**Type:** `Array.<Object>`

List of found entities.


## `count` ![Cached action](https://img.shields.io/badge/cache-true-blue.svg) 

Get count of entities by query.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `search` | `String` | - | Search text. |
| `searchFields` | `String`, `Array.<String>` | **required** | Fields list for searching. |
| `query` | `Object` | - | Query object. Passes to adapter. |

### Results
**Type:** `Number`

Count of found entities.


## `list` ![Cached action](https://img.shields.io/badge/cache-true-blue.svg) 

List entities by filters and pagination results.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `populate` | `String`, `Array.<String>` | **required** | Populated fields. |
| `fields` | `String`, `Array.<String>` | **required** | Fields filter. |
| `page` | `Number` | - | Page number. |
| `pageSize` | `Number` | - | Size of a page. |
| `sort` | `String` | - | Sorted fields. |
| `search` | `String` | - | Search text. |
| `searchFields` | `String`, `Array.<String>` | **required** | Fields for searching. |
| `query` | `Object` | - | Query object. Passes to adapter. |

### Results
**Type:** `Object`

List of found entities and count with pagination info.


## `create` 

Create a new entity.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `params` | `Object` | **required** | Entity to save. |

### Results
**Type:** `Object`

Saved entity.


## `insert` 

Create many new entities.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `entity` | `Object` | - | Entity to save. |
| `entities` | `Array.<Object>` | - | Entities to save. |

### Results
**Type:** `Object`, `Array.<Object>`

Saved entity(ies).


## `get` ![Cached action](https://img.shields.io/badge/cache-true-blue.svg) 

Get entity by ID.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `id` | `any`, `Array.<any>` | **required** | ID(s) of entity. |
| `populate` | `String`, `Array.<String>` | **required** | Field list for populate. |
| `fields` | `String`, `Array.<String>` | **required** | Fields filter. |
| `mapping` | `Boolean` | - | Convert the returned `Array` to `Object` where the key is the value of `id`. |

### Results
**Type:** `Object`, `Array.<Object>`

Found entity(ies).


## `update` 

Update an entity by ID.
> After update, clear the cache & call lifecycle events.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `id` | `any` | **required** | ID of entity. |

### Results
**Type:** `Object`

Updated entity.


## `remove` 

Remove an entity by ID.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `id` | `any` | **required** | ID of entity. |

### Results
**Type:** `Number`

Count of removed entities.


<!-- AUTO-CONTENT-END:ACTIONS -->

<!-- AUTO-CONTENT-TEMPLATE:ACTIONS
{{#each this}}
## `{{name}}` {{#each badges}}{{this}} {{/each}}
{{#since}}
_<sup>Since: {{this}}</sup>_
{{/since}}

{{description}}

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
{{#each params}}
| `{{name}}` | {{type}} | {{defaultValue}} | {{description}} |
{{/each}}
{{^params}}
*No input parameters.*
{{/params}}

{{#returns}}
### Results
**Type:** {{type}}

{{description}}
{{/returns}}

{{#hasExamples}}
### Examples
{{#each examples}}
{{this}}
{{/each}}
{{/hasExamples}}

{{/each}}
-->

# Methods

<!-- AUTO-CONTENT-START:METHODS -->
## `sanitizeParams` 

Sanitize context parameters at `find` action.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `ctx` | `Context` | **required** |  |
| `params` | `Object` | **required** |  |

### Results
**Type:** `Object`




## `getById` 

Get entity(ies) by ID(s).

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `id` | `any`, `Array.<any>` | **required** | ID or IDs. |
| `decoding` | `Boolean` | - | Need to decode IDs. |

### Results
**Type:** `Object`, `Array.<Object>`

Found entity(ies).


## `entityChanged` 

Clear the cache & call entity lifecycle events

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `type` | `String` | **required** |  |
| `json` | `Object`, `Array.<Object>`, `Number` | **required** |  |
| `ctx` | `Context` | **required** |  |

### Results
**Type:** `Promise`




## `clearCache` 

Clear cached entities

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
*No input parameters.*

### Results
**Type:** `Promise`




## `transformDocuments` 

Transform the fetched documents

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `ctx` | `Context` | **required** |  |
| `params` | `Object` | **required** |  |
| `docs` | `Array`, `Object` | **required** |  |

### Results
**Type:** `Array`, `Object`




## `validateEntity` 

Validate an entity by validator.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `entity` | `Object` | **required** |  |

### Results
**Type:** `Promise`




## `encodeID` 

Encode ID of entity.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `id` | `any` | **required** |  |

### Results
**Type:** `any`




## `decodeID` 

Decode ID of entity.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `id` | `any` | **required** |  |

### Results
**Type:** `any`




## `_find` 

Find entities by query.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `ctx` | `Context` | **required** | Context instance. |
| `params` | `Object` | - | Parameters. |

### Results
**Type:** `Array.<Object>`

List of found entities.


## `_count` 

Get count of entities by query.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `ctx` | `Context` | **required** | Context instance. |
| `params` | `Object` | - | Parameters. |

### Results
**Type:** `Number`

Count of found entities.


## `_list` 

List entities by filters and pagination results.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `ctx` | `Context` | **required** | Context instance. |
| `params` | `Object` | - | Parameters. |

### Results
**Type:** `Object`

List of found entities and count.


## `_create` 

Create a new entity.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `ctx` | `Context` | **required** | Context instance. |
| `params` | `Object` | - | Parameters. |

### Results
**Type:** `Object`

Saved entity.


## `_insert` 

Create many new entities.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `ctx` | `Context` | **required** | Context instance. |
| `params` | `Object` | - | Parameters. |

### Results
**Type:** `Object`, `Array.<Object>`

Saved entity(ies).


## `_get` 

Get entity by ID.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `ctx` | `Context` | **required** | Context instance. |
| `params` | `Object` | - | Parameters. |

### Results
**Type:** `Object`, `Array.<Object>`

Found entity(ies).


## `_update` 

Update an entity by ID.
> After update, clear the cache & call lifecycle events.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `ctx` | `Context` | **required** | Context instance. |
| `params` | `Object` | - | Parameters. |

### Results
**Type:** `Object`

Updated entity.


## `_remove` 

Remove an entity by ID.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `ctx` | `Context` | **required** | Context instance. |
| `params` | `Object` | - | Parameters. |



<!-- AUTO-CONTENT-END:METHODS -->

<!-- AUTO-CONTENT-TEMPLATE:METHODS
{{#each this}}
## `{{name}}` {{#each badges}}{{this}} {{/each}}
{{#since}}
_<sup>Since: {{this}}</sup>_
{{/since}}

{{description}}

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
{{#each params}}
| `{{name}}` | {{type}} | {{defaultValue}} | {{description}} |
{{/each}}
{{^params}}
*No input parameters.*
{{/params}}

{{#returns}}
### Results
**Type:** {{type}}

{{description}}
{{/returns}}

{{#hasExamples}}
### Examples
{{#each examples}}
{{this}}
{{/each}}
{{/hasExamples}}

{{/each}}
-->

# Populating
The service supports to populate fields from other services. 
E.g.: if you have an `author` field in `post` entity, you can populate it with `users` service by ID of author. If the field is an `Array` of IDs, it will populate all entities via only one request.

**Example of populate schema**
```js
broker.createService({
    name: "posts",
    mixins: [DbService],
    settings: {
        populates: {
            // Shorthand populate rule. Resolve the `voters` values with `users.get` action.
            "voters": "users.get",

            // Define the params of action call. It will receive only with username & full name of author.
            "author": {
                action: "users.get",
                params: {
                    fields: "username fullName"
                }
            },

            // Custom populator handler function
            "rate"(ids, docs, rule, ctx) {
                return Promise.resolve(...);
            }
        }
    }
});

// List posts with populated authors
broker.call("posts.find", { populate: ["author"]}).then(console.log);
```

> The `populate` parameter is available in `find`, `list` and `get` actions.

# Lifecycle entity events
There are 3 lifecycle entity events which are called when entities are manipulated.

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

> Please note! If you manipulate multiple entities (updateMany, removeMany), the `json` parameter will be a `Number` instead of entities!

# Extend with custom actions
Naturally you can extend this service with your custom actions.

```js
const DbService = require("tenancy-moleculer-db");

module.exports = {
    name: "posts",
    mixins: [DbService],

    settings: {
        fields: ["_id", "title", "content", "votes"]
    },

    actions: {
        // Increment `votes` field by post ID
        vote(ctx) {
            return this.adapter.updateById(ctx.params.id, { $inc: { votes: 1 } });
        },

        // List posts of an author
        byAuthors(ctx) {
            return this.find({
                query: {
                    author: ctx.params.authorID
                },
                limit: ctx.params.limit || 10,
                sort: "-createdAt"
            });
        }
    }
}
```
# Remove default actions

According to moleculer [documentation](https://moleculer.services/docs/0.14/services.html#Merge-algorithm) you can disable an action when override it with `false`

```js
const DbService = require("tenancy-moleculer-db");

module.exports = {
    name: "posts",
    mixins: [DbService],

    actions: {
        // Disable find default action
        find: false
    }
}
```

# Support Multiple Tenancy
Copyright by [mailaneel](https://github.com/mailaneel): https://github.com/moleculerjs/moleculer-db/pull/5


```js
const DbService = require("tenancy-moleculer-db");

const getHash = (ctx) => ctx.meta.tenantId

module.exports = {
    name: 'posts',
    mixins: [DbService],
    tenantStrategy: {
        getAdapterHash: getHash,
        getAdapter: (ctx) => {
            return new MongooseAdapter({
                    schema: RoleSchema,
                    modelName: 'Role',
                    uri: `${process.env.MONGO_URI_1}/${getHash(ctx)}`,
                    opts: Object.assign({}, { useMongoClient: true })
            })
        }
    }
}
```

# Test
```
$ npm test
```

In development with watching

```
$ npm run ci
```

# License
The project is available under the [MIT license](https://tldrlegal.com/license/mit-license).

# Contact
Copyright (c) 2016-2022 MoleculerJS

[![@moleculerjs](https://img.shields.io/badge/github-moleculerjs-green.svg)](https://github.com/moleculerjs) [![@MoleculerJS](https://img.shields.io/badge/twitter-MoleculerJS-blue.svg)](https://twitter.com/MoleculerJS)

