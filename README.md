# Blue Entities

## Easy Redis entities management

This is the project being used in my organization ([Solid Stack](http://www.solid-stack.com)) for accesing [Redis](https://redis.io)  server information from an *entity* perspective.

Instead of using low level Redis commands (HGET, ZRANGE, etc.) with Blue Entities and the power of NodeJS performance, you can easily integrate Redis as the core database for projects with no special needs of SQL repositories of data.

This module is still in development.

One self-explanatory sample:

```
var schema = {
   name: "users",
   properties: [
      { name: "mail", type: "string" },
      { name: "password", type: "string" },
      { name: "active", type: "boolean" },
      { name: "age", type: "integer" }
   ],
   name: "books",
   properties: [
      { name: "title", type: "string" },
      { name: "subject", type: "string" },
      { name: "author", type: "string" }      
   ]
}

var redisConfig = { host: "localhost", port: 6379 };
var blueEntities = require("blueentities")(schema, redisConfig );

var newUser = {
   mail: "info@solidstack.es",
   password: "123454321",
   active: true,
   age: 43
}

blueEntities.addEntity( "users", newUser )
	.then( (id) => {
		// User added!!!
	});

```

Given that sample, to get the entity is a matter of just a few lines:

```
var userId = "HknG7QVZ7-"

blueEntities.getEntity( "users", userId )
	.then( (user) => {
		// user json object pull out from Redis!
	});
```

Yeap!!!, cool, right?

This is not a fully ORM solution based on Redis, but a module that allows to simplify using Redis repository entities as plain tables for high availability projects with real time performance needs.

## Blueentities API

### addEntitySchema( entitySchema )

### addEntity( entityName, entityProperties, entityId )

### addEntities( entityName, entities )

### getEntity( entityName, entityId )

### getCount( entityName )

### getRange( entityName, start, stop )

### removeEntity( entityName, entityId )

### removeEntities( entityName, entitiesIds )

### existsEntity( entityName, entityId )

### cleanSchemaEntities()

### getUniqueId()

### shutdown()

## Samples