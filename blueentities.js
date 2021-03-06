"use strict";

/*
 * Experimental module for managing entites in Redis
 */

var redis = require("redis");
var redisPromisified = require("./lib/redispromisified.js");
var shortid = require("shortid");
var util = require("util");
var sequential = require("promise-sequential");

const SEPARATORKEYS = ":";

class BlueEntities {
	constructor(schema, dbId, redisConfig, module) {
		this._redisClient = redis.createClient(redisConfig);
		this._dbId = dbId ? dbId+":" : "";
		this._redisConfig = redisConfig ? redisConfig : {};
		this._schemaPropertyKeys = [];
		this._entitiesSchema = [];
		this._entitiesNames = [];

		schema.map( (entity) => {
			this.addEntitySchema( entity );
		});
	}

	_getSetKey( entityName ) {
		return this._dbId + entityName + SEPARATORKEYS + "set";
	}

	_getEntityKey( entityName, entityId ) {
		return this._dbId + entityName + SEPARATORKEYS + entityId;
	}

	_getSchemaPropertyKey( entityName, entityProperty ) {
		return entityName + "." + entityProperty;
	}

	_extractEntityIdFromKey(key) {
		return key.substr( key.lastIndexOf(SEPARATORKEYS)+1, key.length );
	}

	_checkProperty( propertyName, propertyValue, entityName ) {
		var sch = this._getSchemaPropertyKey(entityName, propertyName);
		var prop = this._schemaPropertyKeys[ sch ];
		var res = { validated: true };
		var t = typeof propertyValue;

		if ( prop === undefined ) {
			return {
				validated: false,
				msg: util.format( "Unknown property '%s' or schema '%s'", propertyName, entityName ) 
			}
		} 

		// Check types
		switch( prop.type ) {
			case "string": 
			{
				if ( t !== 'string' ) {
					res = { 
						validated: false,
						msg: util.format( "Property value '%s' for schema %s expected to be string", propertyValue, sch )
					}
				}
			}
			break;
			case "integer": {
				if ( t !== 'number' ) {
					res = { 
						validated: false,
						msg: util.format( "Property value '%s' for schema %s expected to be integer", propertyValue, sch )
					}					
				}
			}
			break;
			case "boolean": {
				if ( t !== 'boolean' ) {
					res = { 
						validated: false,
						msg: util.format( "Property value '%s' for schema %s expected to be boolean", propertyValue, sch )
					}					
				}
			}
			break;
			default: {
				throw new Error( "Unknown type in schema of " + prop.type );
			}
		}

		return res;
	}

	_checkProperties( valuesToHset, entityName ) {
		var properties = Object.keys(valuesToHset);		

		for( let i = 0; i < properties.length; i++ ) {
			var check = this._checkProperty( properties[i], valuesToHset[properties[i]], entityName );

			if ( !check.validated ) { return check; }
		}

		return { validated: true };
	}

	_checkEntitySchema( entitySchema ) {
		// Schema have right attributes
		if ( entitySchema.name === undefined || entitySchema.properties === undefined ) {
			return { validated: false, msg: "Schema invalid, name or properties attributes missing" };
		}
		// Schema name is not duplicated
		if ( this._entitiesNames[entitySchema.name] !== undefined ) {
			return { validated: false, msg: util.format( "Schema name duplicated of '%s'", entitySchema.name ) };
		}

		// Schema name is valid
		if ( !(entitySchema.name.length > 0 && entitySchema.name.length < 32) ) {
			return { validated: false, msg: util.format( "Schema name of '%s' invalid, it should have between 1 and 32 characteres", entitySchema.name ) };
		}

		// Properties are more than 0
		if ( entitySchema.properties.length == 0 ) {
			return { validated: false, msg: util.format( "Schema name of '%s' set with no properties", entitySchema.name ) };
		}

		// Properties have right attributes and allowed values
		entitySchema.properties.map( (prop) => {
			if ( prop.name === undefined || prop.type === undefined ) {
				return { validated: false, msg: util.format( "Schema '%s' set with bad properties, missing name or type", entitySchema.name ) };
			}

			if ( !(prop.name.length > 0 && prop.name.length < 32) ) {
				return { validated: false, msg: util.format( "Schema '%s' set with property name invalid, properties names should have between 1 and 32 characters", entitySchema.name ) };
			}

			if ( !(prop.type === "string" || prop.type === "integer") ) {
				return { validated: false, msg: util.format( "Property '%s' of schame '%s' with unknown type, only 'integer' or 'string' are valid", prop.name, entitySchema.name ) };
			}
		});

		return { validated: true };
	}

	_getRangeToFunction(entityName, start, stop, fnc) {
		return () => new Promise( (resolve,reject) => {
			this.getRange( entityName, start, stop )
				.then( (entities) => {
					entities.forEach( (e) => {
						fnc(e);
					});

					resolve();
				})
				.catch( (err) => { reject(err); })				
		});
	}

	_translatePropertyValueToWrite(entityName, propertyName, propertyValue) {
		let propSchema = this._schemaPropertyKeys[ this._getSchemaPropertyKey(entityName,propertyName) ];
		let pv = propertyValue;

		switch(propSchema.type) {
			case "boolean": {
				pv = pv === true ? 1 : 0;
			}
			break;
		}

		return pv;
	}

	_translatePropertyValueToRead(entityName, propertyName, propertyValue) {
		let propSchema = this._schemaPropertyKeys[ this._getSchemaPropertyKey(entityName,propertyName) ];
		let pv = propertyValue;

		switch( propSchema.type ) {
			case "integer": {
				pv = parseInt( propertyValue );
			}
			break;
			case "boolean": {
				pv = propertyValue === "1";
			}
			break;
		}		

		return pv;
	}
	/*
	 * Adds a new entity schema
	 * Params: entity with this json format:
	 * {
	 *    name: <name of the entity>,
	 *    properties: [
	 *		{
	 *			name: <property name>,
	 *          type: <property type (integer, datetime, string, boolean, etc.),
	 *			optional: <true|false, indicated if this property es optional>
	 *			defaultValue: <default value is optional is true>
	 *      },
	 *      ...
	 *	  ]
	 * }
	 * In properties, name and type properties are mandatory.
	 */
	addEntitySchema( entitySchema ) {
		var check = this._checkEntitySchema( entitySchema );

		if ( !check.validated ) {
			throw new Error( "Entity schema validation failed: " + check.msg );
		}

		this._entitiesNames[entitySchema.name] = "";
		this._entitiesSchema[entitySchema.name] = entitySchema.properties;

		entitySchema.properties.map( (property) => {
			this._schemaPropertyKeys[ this._getSchemaPropertyKey(entitySchema.name, property.name) ] = property;
		})		
	}

	/* 
	 * Add new entity to repository.
	 * Params:
	 *   entityName: name of the entity, it should be defined in the schema
	 *   entityProperties: array with properties and its values: [ propA: valueA, propB: valueB, ... ]
	 *   entityId: unique ID for the new entity (optional). Should be an string with 8 characters.
	 *             If it is not set, addEntity will generate a new one.
	 *			   If an unique ID is needed before calling addEntity(), getUniqueId() method can be used
	 *			   to guarantee no conflicts.
	 * Returns a promise with the entity id created
	 */
	addEntity( entityName, entityProperties, entityId ) {
		if ( this._entitiesNames[entityName] === undefined ) {
			throw new Error( util.format("Unknown entity name of '%s' when adding new entity", entityName ) );
		}

		entityId = entityId === undefined ? shortid.generate() : entityId;

		return new Promise( (resolve, reject) => {
			var promises = [];
			var check;

			// Check if all properties are included and optional values
			var schemaProperties = this._entitiesSchema[entityName];
			
			schemaProperties.forEach( (property) => {
				// Property not set and not indicated as optional in schema
				if ( entityProperties[property.name] === undefined && (property.optional === undefined || property.optional === false) ) {
					reject( new Error( util.format("Property '%s' missing in entity", property.name) ) );
				}

				// Property not set but indicated as optional
				if ( entityProperties[property.name] === undefined && property.optional === true ) {
					if ( property.defaultValue === undefined ) {
						switch( property.type ) {
							case "integer": {
								entityProperties[property.name] = 0;
							}
							break;
							case "string": {
								entityProperties[property.name] = "";
							}
							break;
							case "boolean": {
								entityProperties[property.name] = false;
							}
						}
					} else {
						let defaultValueType = typeof property.defaultValue;
						defaultValueType = defaultValueType == 'number' ? 'integer' : defaultValueType;

						if ( defaultValueType !== property.type ) {
							reject( new Error( util.format( "Default value of '%s' is not of type expected '%s'", property.defaultValue, property.type )));
						}

						entityProperties[property.name] = property.defaultValue;
					}
				}
			})

			// Check properties types
			check = this._checkProperties( entityProperties, entityName );

			if ( !check.validated ) {
				reject("One of more properties are invalid or missing: " + check.msg );
			} else {
				var haddKey = this._getEntityKey(entityName, entityId);

				// Insert for the same haddKey and entry by each property			
				Object.keys(entityProperties).forEach( (propertyName) => {
					let propertyValue = this._translatePropertyValueToWrite(entityName, propertyName, entityProperties[propertyName] );

					promises.push( redisPromisified.hset( haddKey, propertyName, propertyValue, this._redisClient ));
				});

				// Add to order set the new entity
				promises.push( redisPromisified.zadd( this._getSetKey( entityName ), haddKey, this._redisClient ) );

				Promise.all( promises )
					   .then( () => {
					   		resolve(entityId);
					   }, (err) => {
					   		reject(err);
					   });
				}
		});
	}

	/*
	 * Adds a set of entities
	 * Params:
	 * 	entityName: name for the entity
	 *	entities: array with entities properties to add
	 */
	addEntities( entityName, entities ) {
		return new Promise( (resolve,reject) => {
			var addEntityPro = entities.map( (entity) => {
				return this.addEntity(entityName, entity);
			})

			Promise.all( addEntityPro )
				   .then( (ids) => {
				   	  resolve(ids);
				   })
				   .catch( (err) => { reject(err); })
		});
	}

	/*
	 * Retrieves an entity given its entity name and its ID
	 * Params:
	 * 	entityName: name of the entity
	 * 	entityId: id for the entity instance to retrieve
	 * Returns a promise. When completed, the result is a json object with the entity
	 */
	getEntity( entityName, entityId ) {
		var key = this._getEntityKey(entityName, entityId);

		return new Promise( (resolve,reject) => {		
			redisPromisified.hgetall(key, this._redisClient)
				.then( (result) => {
					// Convert types, in Redis, all values are stores as string
					Object.keys(result).map( (propertyName) => {
						if ( propertyName !== "id" ) {
							result[propertyName] = this._translatePropertyValueToRead(entityName, propertyName, result[propertyName]);
						}
					})

					result.id = entityId;
					resolve(result);
				})
				.catch( (err) => {
					reject(err);
				});
		});
	}

	/*
	 * Checks if an entity exists given its entity name and its ID
	 * Params:
	 * 	entityName: name of the entity
	 * 	entityId: id for the entity instance to retrieve
	 * Returns a promise. When completed, the result indicates if the entity exists (true) or not (false)
	 */
	existsEntity( entityName, entityId ) {
		var key = this._getEntityKey(entityName, entityId);

		return new Promise( (resolve,reject) => {
			redisPromisified.exists( key, this._redisClient )
				.then( (exists) => { resolve(exists === 1); })
				.catch( (err) => { reject(err); })
		});
	}

	/*
	 * Returns the number of entities instances for a given entity
	 * Params:
	 * 	entityName: name of the entity
	 */
	getCount( entityName ) {
		return redisPromisified.zcount( this._getSetKey(entityName), this._redisClient );
	}

	/*
	 * Returns a set of entities for paginating between them
	 * Params:
	 * 	entityName: name of the entity
	 * 	start: number of entity instance to begin with
	 * 	stop: number of the entity instance indicating the end of the entity to retrieve
	 */
	getRange( entityName, start, stop ) {
		var result = [];
		var entitiesKeys;

		return new Promise( (resolve,reject) => {
			redisPromisified.zrange( this._getSetKey(entityName), start, stop, this._redisClient )
				.then( (entities) => {
					var getEntityPromises = [];
					entitiesKeys = entities;
					for( let i = 0; i < entities.length; i++ ) {
						getEntityPromises.push( redisPromisified.hgetall( entities[i], this._redisClient ) );
					}

					Promise.all( getEntityPromises )
						   .then( (r) => {
						   		var rr = [];

						   		// Fill the array by keys in order
						   		entitiesKeys.map( (key) => {
						   			rr[ this._extractEntityIdFromKey(key) ] = {};
						   		})

						   		// Convert redis key in entity id
						   		r.map( (entity) => {
						   			entity.id = this._extractEntityIdFromKey(entity.id);
						   			rr[ entity.id ] = entity;
						   		})

						   		// Retrieve objects to be return in order
						   		let finalEntities = Object.keys(rr).map( (k) => { return rr[k]; });
								
								// Convert types, in Redis, all values are stores as string								
								finalEntities.map( (ent) => {									
									Object.keys(ent).map( (propertyName) => {
										if ( propertyName !== "id" ) {
											ent[propertyName] = this._translatePropertyValueToRead(entityName, propertyName, ent[propertyName]);
										}
									})									
								});

								resolve(finalEntities);
						   }, (err) => { reject(err); });
					})
				.catch( (err) => { reject(err); });
		});
	}

	/*
	 * Removes an entity instance
	 * 	entityName: name of the entity
	 * 	entityId: id of the entity to remove
	 */
	removeEntity( entityName, entityId ) {
		// To remove an entity, it should be remove the hash for the entity itself
		// and it should be remove its id from the entity set
		return new Promise( (response, reject) => {
			var entityKey = this._getEntityKey(entityName, entityId);

			redisPromisified.del( entityKey, this._redisClient )
				.then( (entitiesRemoved) => {
					if ( entitiesRemoved === 1 ) {
						return redisPromisified.zrem( this._getSetKey(entityName), entityKey, this._redisClient );
					} else if ( entitiesRemoved === 0 ) {
						reject( new Error( util.format("Trying to remove no existing entity of name '%s' and id '%s'", entityName, entityId ) ) );
					} else {
						reject( new Error( util.format("Remove entity with more than one instance! Entity name '%s' and id '%s'", entityName, entityId ) ) );
					}					
				})
				.then( (entitiesRemoved) => {
					if ( entitiesRemoved !== 1 ) {
						reject( new Error( util.format("Unable to remove entity id from set for entity name '%s' and entity id of '%s'", entityName, entityId )));
					} else {
						response(1);
					}					
				})
				.catch( (err) => {
					reject(err);
				})
		})
	}

	/*
	 * Updates and entity property value
	 * Params:
	 *    entityName: name of the entity
	 *	  entityId: id of the entity
	 *    propertyName: name of the property of the entity
	 *    propertyValue: new value for the property
	 */
	updateEntityValue( entityName, entityId, propertyName, propertyValue ) {
		return new Promise( (resolve,reject) => {
			let p = this._checkProperty( propertyName, propertyValue, entityName );
			
			if ( !p.validated ) {
				reject( new Error(util.format("Invalid property name or value. Property name: %s. Property value: %s. Error: %s", propertyName, propertyValue, p.msg )));
			} else {
				this.existsEntity(entityName, entityId)
					.then( (exists) => {
						if ( !exists ) throw new Error(util.format("Entity doesn't exist. Entity name: %s. Entity ID: %s", entityName, entityId));
						else {
							let haddKey = this._getEntityKey(entityName, entityId);
							let pv = this._translatePropertyValueToWrite(entityName, propertyName, propertyValue );

							return redisPromisified.hset( haddKey, propertyName, pv, this._redisClient );
						}
					})
					.then( () => {
						resolve();
					})
					.catch( (err) => { reject(err); })
			}
		});
	}
	/*
	 * Remove a number of entity instances
	 * Params:
	 * 	entityName: name of the entity
	 *  entitiesIds: array with the entity ids to remove
	 */
	removeEntities( entityName, entitiesIds ) {
		return new Promise( (resolve, reject) => {
			var removeEntityPro = entitiesIds.map( (entityId) => {
				return this.removeEntity( entityName, entityId );
			})

			Promise.all( removeEntityPro )
				   .then( (entitiesRemoved) => {
				   		resolve(entitiesIds.length);
				   })
				   .catch( (err) => { reject(err); })
		});
	}

	/*
	 * Clean all entities instances currently at Redis server
	 */
	cleanSchemaEntities() {

	}

	/*
	 * Returns a new and unique ID for a new entity
	 */
	getUniqueId() {
		return shortid.generate();
	}

	/*
	 * Returns information provided by Redis command "info"
	 */
	serverInfo() {
		return this._redisClient.server_info;
	}

	/*
	 * Closes internal connection with Redis server
	 */
	shutdown() {
		this._redisClient.quit();
	}

	/*
	 * Iterates over all entities of entityName type and calls fnc function with the entity instance.
	 * Params:
	 *   entityName: name of the entity to iterate over
	 *   fnc: function to be called for each entity as parameter
	 * Notes: fnc shouldn't return a promise. Consider that this operation scans
	 * all entities.
	 */
	iterateAll( entityName, fnc ) {
		return new Promise( (resolve,reject) => {
			this.getCount(entityName)
				.then( (count) => {
					const PAGECOUNT = 25;
					let fncCalled = 0;
					let getRangePromises = [];

					for( let i = 0; i < count; i+=PAGECOUNT) {
						getRangePromises.push( this._getRangeToFunction(entityName, i, i+PAGECOUNT-1, fnc) );
					}
					
					return sequential(getRangePromises);
				})
				.then( () => {
					resolve();
				})
				.catch( (err) => { reject(err); })
		});
	}

	/*
	 * Iterates over all entities of type entityName and returns
	 * all that propertyName matches with propertyValue
	 * Params:
	 *   entityName: name of the entity to iterate over
	 *   propertyName: name of the property to check
	 *   propertyValue: value of the property to find
	 * Returns: returns an array with all entities matches
	 * Note: consider that like iterateAll, this method iterates over all entities of entityName type
	 */
	findEqual( entityName, propertyName, propertyValue ) {
		return new Promise( (resolve, reject) => {
			let result = [];

			this.iterateAll( entityName, (entity) => {
					if ( entity[propertyName] === propertyValue ) { result.push(entity); }
				})
			    .then( () => {
			    	resolve(result);
			    })
			    .catch( (err) => { reject(err); } );
		});
	}
}

/*
 * Creates a new instance of BlueEntity. Receives optional params for redis client.
 */
module.exports = function(schema, dbId, redisConfig) {
	return new BlueEntities(schema, dbId, redisConfig, this);
} 