![Moleculer logo](http://moleculer.services/images/banner.png)

# moleculer-db-adapter-couchdb-nano [![NPM version](https://img.shields.io/npm/v/moleculer-db-adapter-couchdb-nano.svg)](https://www.npmjs.com/package/moleculer-db-adapter-couchdb-nano)

CouchDB [Nano](https://github.com/apache/couchdb-nano) adapter for Moleculer DB service.

## Features
- Schemaless adapter
- CouchDB Nano driver v7

## Install

```bash
$ npm install moleculer-db moleculer-db-adapter-couchdb-nano --save
```

## Usage

```js
"use strict";

const { ServiceBroker } = require("moleculer");
const DbService = require("moleculer-db");
const CouchDBAdapter = require("moleculer-db-adapter-couchdb-nano");

const broker = new ServiceBroker();

// Create a CouchDB service for `blog-post` entities
broker.createService({
    name: "blog",
    collection: "posts",
    adapter: new CouchDBAdapter("couchdb://localhost:5984"),
    mixins: [DbService]
});

broker.start()
// Create a new post
.then(() => broker.call("posts.create", {
    title: "My first post",
    content: "Lorem ipsum...",
    votes: 0
}))

// Get all posts
.then(() => broker.call("posts.find").then(console.log));
```

## Options

**Example with default connection to localhost:5984 **
```js
new CouchDBAdapter()
```

**Example with connection URI & options**
```js
new CouchDBAdapter("couchdb://localhost:5984", {
    //any opts supported by Nano
})
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
Copyright (c) 2018 Mr. Kutin
