# Debug

## NoSQL Database

Attach a shell to the running mongoDB container:

```
docker exec -it mongo-pwndoc /bin/sh
```

Then connect to the database:

```
mongo mongodb://127.0.0.1/pwndoc
```

To list collections as described in [Data](data) you can use one of the following
commands from the DB shell:

- `show collections`
- `db.getCollectionNames()`
- `show tables`

For example:

```
> show collections
audits
audittypes
clients
companies
customfields
customsections
images
languages
templates
users
vulnerabilities
vulnerabilitycategories
vulnerabilitytypes
```

Then you can inspect the entries of each collection:

```
> db.<collection>.find()
```

Example for `users`:

```
> db.users.find()
{ "_id" : ObjectId("REDACTED"), "role" : "admin", "username" : "demo", "password" : "REDACTED", "firstname" : "demo", "lastname" : "demo", "createdAt" : ISODate("2020-08-21T15:45:18.999Z"), "updatedAt" : ISODate("2020-09-21T14:45:18.999Z"), "__v" : 0 }
...
```

You can access a specific entry using an array index, eg for a specific audit:

```
> db.audits.find()[1]
```

Of course you can continue to nest attributes/nodes, eg:

```
> db.audits.find()[1].findings[0].references[0]
```

Then you can use [db.collection.find](https://docs.mongodb.com/manual/reference/method/db.collection.find/) shell method
to query specific objects:

```
> db.users.find( { username: "demo" } )
```

It is possible to [filter the output](https://docs.mongodb.com/compass/current/query/project/):

```
> db.users.find( { role: "admin" }, {_id: 1} )
```

For example to get a synthetic view of custom fields:

```
> db.customfields.find( {}, {_id: 0, updatedAt: 0, size: 0, position: 0, createdAt: 0, __v: 0, offset: 0})
> db.customfields.find( {}, {label: 1, fieldType: 1, description: 1, display: 1, displaySub: 1, required: 1, _id: 0})
{ "displaySub" : "", "required" : true, "description" : "", "fieldType" : "input", "label" : "VulnID", "display" : "vulnerability" }
{ "displaySub" : "Orga", "required" : true, "description" : "", "fieldType" : "input", "label" : "RefID", "display" : "vulnerability" }
```
