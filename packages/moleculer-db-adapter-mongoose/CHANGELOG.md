<a name="0.8.8"></a>
# 0.8.8 (2020-09-27)

## Changes
fix connection error if there is more than one service [#222](https://github.com/moleculerjs/moleculer-db/pull/222)

--------------------------------------------------
<a name="0.8.6"></a>
# 0.8.6 (2020-06-18)

## Changes
Add support for searchFields parameter [#197](https://github.com/moleculerjs/moleculer-db/pull/197)

--------------------------------------------------
<a name="0.8.0"></a>
# 0.8.0 (2019-07-07)

## Changes
Mongoose connection logic has been changed. No need to update existing codes.

--------------------------------------------------
<a name="0.7.0"></a>
# 0.7.0 (2018-04-08)

## Breaking changes
Dependency `mongoose` moved to peer dependencies. It means you should install `mongoose` in your project.

**New install script**
```bash
$ npm install moleculer-db moleculer-db-adapter-mongoose mongoose --save
```

--------------------------------------------------
<a name="0.6.0"></a>
# 0.6.0 (2018-03-28)

## Breaking changes
- Update mongoose to v5.0.12
- Changed constructor signature

**Example with connection URI**
```js
new MongooseAdapter("mongodb://localhost/moleculer-db")
```

**Example with URI and options**
```js
new MongooseAdapter("mongodb://db-server-hostname/my-db", {
    user: process.env.MONGO_USERNAME,
    pass: process.env.MONGO_PASSWORD
    keepAlive: true
})
```

--------------------------------------------------
<a name="0.2.0"></a>
# 0.2.0 (2017-07-06)

## Breaking changes

### Update methods to moleculer-db v0.2.0
- `findAll` renamed to `find`
- `update` renamed to `updateMany`
- `remove` renamed to `removeMany`

--------------------------------------------------
