<a name="0.5.2"></a>
# 0.5.2 (2018-03-28)

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
