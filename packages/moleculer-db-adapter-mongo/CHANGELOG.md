<a name="0.4.11"></a>
# 0.4.11 (2021-02-15)

## Changes
- allow only 12 character ObjectID strings [#249](https://github.com/moleculerjs/moleculer-db/pull/249)

--------------------------------------------------
<a name="0.4.6"></a>
# 0.4.6 (2020-02-02)

## Changes
- add missing Bluebird dependency

--------------------------------------------------
<a name="0.4.5"></a>
# 0.4.5 (2019-08-14)

## Changes
- Fix issue in full-text searching [#122](https://github.com/moleculerjs/moleculer-db/issues/122)

--------------------------------------------------
<a name="0.4.3"></a>
# 0.4.3 (2019-07-07)

## Changes
- Add `dbName` parameter to constructor. Example: `adapter: new MongoAdapter("mongodb://localhost", { useNewUrlParser: true }, "moleculer-db-demo")`

--------------------------------------------------
<a name="0.4.0"></a>
# 0.4.0 (2018-04-08)

## Breaking changes
- fix wrong method name from `ojectIDToString` to `objectIDToString`

--------------------------------------------------
<a name="0.3.0"></a>
# 0.3.0 (2018-03-28)

## Breaking changes
- Update `mongodb` lib to v3.0.5
- Changed constructor signature (compatible with mongodb driver)

    **Example with connection URI**
    ```js
    new MongoDBAdapter("mongodb://localhost/moleculer-db")
    ```

    **Example with connection URI & options**
    ```js
    new MongoDBAdapter("mongodb://db-server-hostname/my-db", {
        keepAlive: 1
    })
    ```

--------------------------------------------------
