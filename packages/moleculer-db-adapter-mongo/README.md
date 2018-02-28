![Moleculer logo](http://moleculer.services/images/banner.png)

# moleculer-db-adapter-mongo [![NPM version](https://img.shields.io/npm/v/moleculer-db-adapter-mongo.svg)](https://www.npmjs.com/package/moleculer-db-adapter-mongo)

MongoDB native adapter for Moleculer DB service.

## Features
- schemaless adapter
- MongoDB driver v2.2

## Install

```bash
$ npm install moleculer-db moleculer-db-adapter-mongo --save
```

## Usage

```js
"use strict";

const { ServiceBroker } = require("moleculer");
const DbService = require("moleculer-db");
const MongoDBAdapter = require("moleculer-db-adapter-mongo");

const broker = new ServiceBroker();

// Create a Mongoose service for `post` entities
broker.createService({
    name: "posts",
    mixins: [DbService],
    adapter: new MongoDBAdapter("mongodb://localhost/moleculer-demo"),
    collection: "posts"
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
The constructor options need to be a `String` or an `Object`.

**Example with connection URI**
```js
new MongoDBAdapter("mongodb://localhost/moleculer-db")
```

**Example with connection options**
```js
new MongoDBAdapter({
    uri: "mongodb://db-server-hostname/my-db",
    options: {
        user: process.env.MONGO_USERNAME,
        pass: process.env.MONGO_PASSWORD
        server: {
            socketOptions: {
                keepAlive: 1
            }
        }
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
Copyright (c) 2016-2018 MoleculerJS

[![@moleculerjs](https://img.shields.io/badge/github-ice--services-green.svg)](https://github.com/moleculerjs) [![@MoleculerJS](https://img.shields.io/badge/twitter-MoleculerJS-blue.svg)](https://twitter.com/MoleculerJS)
