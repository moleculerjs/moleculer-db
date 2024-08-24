![Moleculer logo](http://moleculer.services/images/banner.png)

# moleculer-db-adapter-sequelize [![NPM version](https://img.shields.io/npm/v/moleculer-db-adapter-sequelize.svg)](https://www.npmjs.com/package/moleculer-db-adapter-sequelize)

SQL adapter (Postgres, MySQL, SQLite & MSSQL) for Moleculer DB service with [Sequelize](https://github.com/sequelize/sequelize).

# Features

# Install

```bash
$ npm install moleculer-db-adapter-sequelize sequelize --save
```

You have to install additional packages for your database server:
```bash
# For SQLite
$ npm install sqlite3 --save

# For MySQL
$ npm install mysql2 --save

# For MariaDB
$ npm install mariadb --save

# For PostgreSQL
$ npm install pg pg-hstore --save

# For MSSQL
$ npm install tedious --save
```

## Usage

```js
"use strict";

const { ServiceBroker } = require("moleculer");
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const Sequelize = require("sequelize");

const broker = new ServiceBroker();

// Create a Sequelize service for `post` entities
broker.createService({
    name: "posts",
    mixins: [DbService],
    adapter: new SqlAdapter("sqlite://:memory:"),
    model: {
        name: "post",
        define: {
            title: Sequelize.STRING,
            content: Sequelize.TEXT,
            votes: Sequelize.INTEGER,
            author: Sequelize.INTEGER,
            status: Sequelize.BOOLEAN
        },
        options: {
            // Options from http://docs.sequelizejs.com/manual/tutorial/models-definition.html
        }
    },
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

### Raw queries
You can reach the `sequelize` instance via `this.adapter.db`. To call [Raw queries](http://docs.sequelizejs.com/manual/raw-queries.html):

```js
    actions: {
        findHello2() {
            return this.adapter.db.query("SELECT * FROM posts WHERE title = 'Hello 2' LIMIT 1")
                .then(([res, metadata]) => res);
        }
    }
```

## Options
Every constructor arguments are passed to the `Sequelize` constructor. Read more about [Sequelize connection](http://docs.sequelizejs.com/manual/installation/getting-started.html).

**Example with connection URI**
```js
new SqlAdapter("postgres://user:pass@example.com:5432/dbname");
```

**Example with connection options**
```js
new SqlAdapter('database', 'username', 'password', {
    host: 'localhost',
    dialect: /* one of 'mysql' | 'mariadb' | 'postgres' | 'mssql' */,

    pool: {
        max: 5,
        min: 0,
        idle: 10000
    },

    // SQLite only
    storage: 'path/to/database.sqlite'
});
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
Copyright (c) 2016-2024 MoleculerJS

[![@moleculerjs](https://img.shields.io/badge/github-moleculerjs-green.svg)](https://github.com/moleculerjs) [![@MoleculerJS](https://img.shields.io/badge/twitter-MoleculerJS-blue.svg)](https://twitter.com/MoleculerJS)
