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
