![Moleculer logo](http://moleculer.services/images/banner.png)

# moleculer-db-adapter-mongoose [![NPM version](https://img.shields.io/npm/v/moleculer-db-adapter-mongoose.svg)](https://www.npmjs.com/package/moleculer-db-adapter-mongoose)

Mongoose adapter for Moleculer DB service

## Features

## Install

```bash
$ npm install moleculer-db moleculer-db-adapter-mongoose --save
```

## Usage

```js
"use strict";

const { ServiceBroker } = require("moleculer");
const DbService = require("moleculer-db");
const MongooseAdapter = require("moleculer-db-adapter-mongoose");
const mongoose = require("mongoose");

const broker = new ServiceBroker();

// Create a Mongoose service for `post` entities
broker.createService({
    name: "posts",
    mixins: [DbService],
    adapter: new MongooseAdapter("mongodb://localhost/moleculer-demo"),
    model: mongoose.model("Post", mongoose.Schema({
        title: { type: String },
        content: { type: String },
        votes: { type: Number, default: 0}
    }))
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
new MongooseAdapter("mongodb://localhost/moleculer-db")
```

**Example with connection options**
```js
new MongooseAdapter({
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
Copyright (c) 2016-2017 Ice Services

[![@ice-services](https://img.shields.io/badge/github-ice--services-green.svg)](https://github.com/ice-services) [![@MoleculerJS](https://img.shields.io/badge/twitter-MoleculerJS-blue.svg)](https://twitter.com/MoleculerJS)
