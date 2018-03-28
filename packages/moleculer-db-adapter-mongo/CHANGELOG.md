<a name="0.3.0"></a>
# 0.3.0 (2018-03-28)

## Breaking changes
- Update `mongodb` lib to v3.0.5
- Changed constructor signature

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
