![Moleculer logo](https://moleculer.services/images/banner.png)

![CI test](https://github.com/moleculerjs/moleculer-db/workflows/CI%20test/badge.svg)
[![Build Status](https://travis-ci.org/moleculerjs/moleculer-db.svg?branch=master)](https://travis-ci.org/moleculerjs/moleculer-db)
[![Coverage Status](https://coveralls.io/repos/github/moleculerjs/moleculer-db/badge.svg?branch=master)](https://coveralls.io/github/moleculerjs/moleculer-db?branch=master)
[![Maintainability](https://api.codeclimate.com/v1/badges/0c7fa55afd189410eff3/maintainability)](https://codeclimate.com/github/moleculerjs/moleculer-db/maintainability)
[![Known Vulnerabilities](https://snyk.io/test/github/moleculerjs/moleculer-db/badge.svg)](https://snyk.io/test/github/moleculerjs/moleculer-db)
[![Discord chat](https://img.shields.io/discord/585148559155003392)](https://discord.gg/TSEcDRP)

# Official DB addons for Moleculer framework

<!-- AUTO-GENERATED-CONTENT:START (RENDERLIST:folder=packages&title=Generals) -->
## Generals
| Name | Version | Description |
| ---- | ------- | ----------- |
| [moleculer-db](/packages/moleculer-db#readme) | [![NPM version](https://img.shields.io/npm/v/moleculer-db.svg)](https://www.npmjs.com/package/moleculer-db) | Moleculer service to store entities in database |
| [moleculer-db-adapter-couchdb-nano](/packages/moleculer-db-adapter-couchdb-nano#readme) | [![NPM version](https://img.shields.io/npm/v/moleculer-db-adapter-couchdb-nano.svg)](https://www.npmjs.com/package/moleculer-db-adapter-couchdb-nano) | CouchDB Nano adapter for Moleculer DB service. |
| [moleculer-db-adapter-mongo](/packages/moleculer-db-adapter-mongo#readme) | [![NPM version](https://img.shields.io/npm/v/moleculer-db-adapter-mongo.svg)](https://www.npmjs.com/package/moleculer-db-adapter-mongo) | MongoDB native adapter for Moleculer DB service. |
| [moleculer-db-adapter-mongoose](/packages/moleculer-db-adapter-mongoose#readme) | [![NPM version](https://img.shields.io/npm/v/moleculer-db-adapter-mongoose.svg)](https://www.npmjs.com/package/moleculer-db-adapter-mongoose) | Mongoose adapter for Moleculer DB service |
| [moleculer-db-adapter-sequelize](/packages/moleculer-db-adapter-sequelize#readme) | [![NPM version](https://img.shields.io/npm/v/moleculer-db-adapter-sequelize.svg)](https://www.npmjs.com/package/moleculer-db-adapter-sequelize) | SQL adapter (Postgres, MySQL, SQLite & MSSQL) for Moleculer DB service |
<!-- AUTO-GENERATED-CONTENT:END -->

# Contribution

## Install dependencies
```bash
$ npm ci
```
this command will run a clean installation of all workspaces based on their respective `package-lock.json`.  

## Add dependencies
```bash
$ npm i -S <dependency> -w <package>
```
to install a dependency for a specific workspace.  

## Upgrade dependencies
```bash
$ npm run deps
```
This command will display an interactive check that will prompt for new dependency version to install, 
then automatically run `npm audit fix`.  

Use `npm run deps --workspaces` to run against all packages.  
Or `npm run deps -w <package>` to run against a specific workspace.  

## Audit dependencies
```bash
$ npm audit fix --workspaces
```
This command will run an audit against all packages dependencies and try to fix them if possible.

## Development
**Run the `simple` example in `moleculer-db` service with watching**
```bash
$ npm run dev moleculer-db
```

**Run the `full` example in `moleculer-db` service w/o watching**
```bash
$ npm run demo moleculer-db full
```

## Test
```bash
$ npm test
```
or run `npm test -w <package>` to run a specific package test.

## Create a new addon
```bash
$ npm init -w ./packages/moleculer-db-<modulename>
```

## Publish new releases
```bash
$ npm run release
```

# License
The project is available under the [MIT license](https://tldrlegal.com/license/mit-license).

# Contact
Copyright (c) 2016-2024 MoleculerJS

[![@moleculerjs](https://img.shields.io/badge/github-moleculerjs-green.svg)](https://github.com/moleculerjs) [![@MoleculerJS](https://img.shields.io/badge/twitter-MoleculerJS-blue.svg)](https://twitter.com/MoleculerJS)
