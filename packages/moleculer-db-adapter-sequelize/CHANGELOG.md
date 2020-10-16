<a name="0.2.10"></a>
# 0.2.10 (2020-10-16)

## Changes
- Close Sequelize before connection error. [#228](https://github.com/moleculerjs/moleculer-db/pull/228)
--------------------------------------------------
<a name="0.2.7"></a>
# 0.2.7 (2020-06-06)

## Changes
- consider `query` filters in case of full-text searching. [#153](https://github.com/moleculerjs/moleculer-db/pull/153)
- use sync option from sequelize config for disable/enable sync model. [#192](https://github.com/moleculerjs/moleculer-db/pull/192)
--------------------------------------------------
<a name="0.2.3"></a>
# 0.2.3 (2020-03-21)

## Changes
- add `noSync` parameter. [#163](https://github.com/moleculerjs/moleculer-db/pull/163)

--------------------------------------------------
<a name="0.2.2"></a>
# 0.2.2 (2020-02-02)

## Changes
- add missing Bluebird dependency

--------------------------------------------------
<a name="0.2.1"></a>
# 0.2.1 (2019-07-16)

## Changes
- available to use sequelize instance as constructor parameter

--------------------------------------------------

<a name="0.2.0"></a>
# 0.2.0 (2019-07-07)

## Breaking changes
Dependency `sequelize` moved to peer dependencies. It means you should install `sequelize` in your project.

**New install script**
```bash
$ npm install moleculer-db moleculer-db-adapter-sequelize sequelize --save
```
--------------------------------------------------
