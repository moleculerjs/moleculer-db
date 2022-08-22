![Moleculer logo](http://moleculer.services/images/banner.png)

# moleculer-db-adapter-prisma [![NPM version](https://img.shields.io/npm/v/moleculer-db-adapter-prisma.svg)](https://www.npmjs.com/package/moleculer-db-adapter-prisma)

SQL adapter for Moleculer DB service with [Prisma](https://www.prisma.io).

# Features

# Install

```bash
$ npm install moleculer-db-adapter-prisma prisma --save
```

## Usage

### Define schema in project root
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DB_CONNECTION_URL")
}

model Post {
  id        String   @id @default(uuid()) @db.VarChar(36)
  title     String   @db.VarChar(255)
  content   String?
  votes     Int
  status    Boolean
  createdAt DateTime @default(now())
}
```

### Generate client
```sh
prisma generate
```

> Do not forget sync DB structure: [Schema prototyping](https://www.prisma.io/docs/guides/database/prototyping-schema-db-push)

### Write service
```js
"use strict";

const { ServiceBroker } = require("moleculer");
const DbService = require("moleculer-db");
const PrismaAdapter = require("moleculer-db-adapter-prisma");

const broker = new ServiceBroker();

broker.createService({
  name: "posts",
  mixins: [DbService],
  adapter: new PrismaAdapter(),
  model: "post", // Model name in camelCase
});

broker.start()
// Create a new post
.then(() => broker.call("posts.create", {
  title: "My first post",
  votes: 0,
  status: true,
}))

// Get all posts
.then(() => broker.call("posts.find").then(console.log));
```

### Raw queries
```js
actions: {
  findHello2() {
    return this.adapter.db
      .query("SELECT * FROM posts WHERE title = 'Hello 2' LIMIT 1")
      .then(console.log);
  }
}
```

### Soft delete
1. Add `deletedAt` field to model
```prisma
model Post {
  id        String   @id @default(uuid()) @db.VarChar(36)
  title     String   @db.VarChar(255)
  content   String?
  votes     Int
  status    Boolean
  createdAt DateTime @default(now())
  deletedAt DateTime? @db.DateTime()
}
```

2. Define adapter with `enableSoftDelete` flag:
```js
broker.createService({
  name: "posts",
  mixins: [DbService],
  adapter: new PrismaAdapter({ enableSoftDelete: true }),
  model: "post", // Model name in camelCase
});
```

3. Next all 'deletion' methods will set `deletedAt = now()`. Get and find methods will filter by `deletedAt IS NULL`

# Run example
1. Up local DB instance in docker
```sh
docker run --name prisma_demo -e MYSQL_PASSWORD=password -e MYSQL_USER=user -e MYSQL_ALLOW_EMPTY_PASSWORD=1 -e MYSQL_DATABASE=prisma -p 3306:3306 -d mysql:8.0.23 --default-authentication-plugin=mysql_native_password
```

2. Sync DB structure and generate client
```sh
npm run prisma:push
npm run prisma:gen
```

3. Run example script
```sh
npm run dev
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
