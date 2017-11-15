"strict mode";

var assert = require("chai").assert;
var shortid = require("shortid");
var path = require("path");
var dbId = "tests";

var baseSchema = [
	{
		name: "img",
		properties: [
			{ name: "filename", type: "string" },
		    { name: "location", type: "string" },
		    { name: "filetype", type: "string", optional: true },
		    { name: "size", type: "integer", optional: true, defaultValue: 20 },
		    { name: "checked", type: "boolean" }
		]}
]

var redisConfig = require( path.join( __dirname, "redisconfig.json" ) );

// The schema used in the following tests are set in "blueEntities" instance.
var blueEntities = require( path.join( process.cwd(), "blueentities") )(baseSchema, dbId, redisConfig);

function _getSampleEntity() {
	return {
		filename: shortid.generate(),
		location: shortid.generate(),
		filetype: "png",
		size: Math.floor(Math.random()*1000),
		checked: true
	}
}

function _addEntity() {
	return new Promise( (resolve, reject) => {
		var sampleEntity = _getSampleEntity();
		
		blueEntities.addEntity( "img", sampleEntity )
					.then( (id) => { resolve( { id: id, entity: sampleEntity } ); } )
					.catch( (err) => { reject(err); } );
	});
}

function _addTestEntities( count ) {
	return new Promise( (response,reject) => {
		var addEntityPro = [];

		for( var i = 0; i < count; i++ ) {
			addEntityPro.push( blueEntities.addEntity( "img", _getSampleEntity() ));
		}

		Promise.all( addEntityPro )
				.then( (ids) => {
					response(ids);
				})
				.catch( (err) => { reject(err); } );
	});
}


describe( "Adding entities tests", (done) => {
	it( "# Try to add entity to no existing entity name", () => {
		try {
			blueEntities.addEntity( "unknownentity", _getSampleEntity() );
		} catch( err ) {}
	});

	it( "# Add simple entity", (done) => {
		blueEntities.addEntity( "img", _getSampleEntity() )
					.then( (id) => {
						assert.isString(id);
						done();
					})
					.catch( (err) => {
						done(err);
					})
	});

	it( "# Add simple entity given its id", (done) => {
		let entityId = blueEntities.getUniqueId();

		blueEntities.addEntity( "img", _getSampleEntity(), entityId )
					.then( (id) => {
						assert.isString(id);
						assert.equal( entityId, id );
						done();
					})
					.catch( (err) => {
						done(err);
					})
	});

	it( "# Add entity with missing properties", (done) => {
		let entity = {
			location: shortid.generate(),
			filetype: "png",
			size: Math.floor(Math.random()*1000),
			checked: true
		}

		blueEntities.addEntity( "img", entity )
					.then( (id) => {
						done( new Error("Exception expected in this test") );
					})
					.catch( (err) => {
						done();
					})
	});

	it( "# Add entity with optional value and no default value", (done) => {
		let entity = {
				filename: shortid.generate(),
				location: shortid.generate(),
				/* filetype: "png", filetype marked as optional in schema */
				size: Math.floor(Math.random()*1000),
				checked: true
			}

		blueEntities.addEntity( "img", entity )
					.then( (id) => {
						return blueEntities.getEntity( "img", id );						
					})
					.then( (r) => {
						assert.equal( "", r.filetype );
						done();
					})
					.catch( (err) => {
						done(err);
					})
	});

	it( "# Add entity with optional value and default value", (done) => {
		let entity = {
				filename: shortid.generate(),
				location: shortid.generate(),
				filetype: "png",
				/* size: Math.floor(Math.random()*1000), size is marked in schema as optional and with default value of 20 */
				checked: true
			}

		blueEntities.addEntity( "img", entity )
					.then( (id) => {
						return blueEntities.getEntity( "img", id )
					})
					.then( (r) => {
						assert.equal( 20, r.size );
						done();
					})
					.catch( (err) => {
						done(err);
					})
	});

	it( "# Add multiple entities", (done) => {
		const COUNT = 10;
		var addEntityPro = [];

		for( var i = 0; i < COUNT; i++ ) {
			addEntityPro.push( blueEntities.addEntity( "img", _getSampleEntity() ));
		}

		Promise.all( addEntityPro )
				.then( (ids) => {
					assert.isArray(ids);
					assert.equal( ids.length, COUNT );					
					done();
				})
				.catch( (err) => {
					done(err);
				});
	});

	it( "# Add entities in batch", (done) => {
		const COUNT = 10;
		var entities = [];

		for( var i = 0; i < COUNT; i++ ) {
			entities.push( _getSampleEntity() );
		}

		blueEntities.addEntities( "img", entities )
					.then( (ids) => {
						assert.isArray(ids);
						assert.equal( ids.length, COUNT );
						done();
					})
					.catch( (err) => {
						done(err);
					})
	});

	it( "# Add entity and check if exists", (done) => {
		blueEntities.addEntity( "img", _getSampleEntity() )
					.then( (id) => {
						assert.isString(id);
						return blueEntities.existsEntity( "img", id );
					})
					.then( (exists) => {
						assert.isBoolean( exists );
						assert.isTrue( exists );
						done();
					})
					.catch( (err) => {
						done(err);
					})
	});

	it( "# Check entity no exists", (done) => {
		blueEntities.existsEntity( "img", blueEntities.getUniqueId() )
			.then( (exists) => {
				assert.isBoolean( exists );
				assert.isFalse( exists );
				done();
			})
			.catch( (err) => { done(err); });
	});
});

describe( "Removing entities tests", () => {
	it( "# Remove one entity", (done) => {
		blueEntities.addEntity( "img", _getSampleEntity() )
					.then( (id) => {
						return blueEntities.removeEntity( "img", id );
					})
					.then( () => {
						done();
					})
					.catch( (err) => {
						done(err);
					})
	});

	it( "# Remove entities in batch", (done) => {
		const COUNT = 10;
		var entities = [];

		for( var i = 0; i < COUNT; i++ ) {
			entities.push( _getSampleEntity() );
		}

		blueEntities.addEntities( "img", entities )
					.then( (ids) => {
						return blueEntities.removeEntities("img", ids);
					})
					.then( () => {
						done();
					})
					.catch( (err) => {
						done(err);
					})

	});

	it( "# Try to remove no existing entity", (done) => {
		blueEntities.removeEntity( "img", shortid.generate() )
			.then( () => {
				done( new Error("Tests should fail") );
			})
			.catch( (err) => {
				done();
			});
	});
});

describe( "Getting entities tests", () => {
	it( "# Get one entity", (done) => {
		var sampleEntity = {};

		_addEntity()
			.then( (result) => {
				sampleEntity = result.entity;
				sampleEntity.id = result.id;

				return blueEntities.getEntity( "img", result.id );
			})
			.then( (entity) => {
				assert.equal( sampleEntity.filename, entity.filename );
				assert.equal( sampleEntity.location, entity.location );
				assert.equal( sampleEntity.filetype, entity.filetype );
				assert.equal( sampleEntity.size, entity.size );
				assert.equal( sampleEntity.checked, entity.checked );
				assert.equal( sampleEntity.id, entity.id );
				done();
			})
			.catch( (err) => { done(err); } );
	});

	it( "# Get no existing entity", (done) => {
		blueEntities.getEntity( "img", shortid.generate() )
			.then( (r) => {
				done( new Error() );
			})
			.catch( (err) => {
				done();
			});
	});

	it( "# Get multiple entities", () => {

	});
});

describe( "Property types test", () => {
	it( "# Add entity with bad value of string", (done) => {
		var entity = _getSampleEntity();
		entity.filename = 12; // Changed to bad type
		blueEntities.addEntity( "img", entity )
					.then( (id) => {
						done( new Error("Unexpected test result!") );
					})
					.catch( (err) => {
						done();
					})
	});

	it( "# Add entity with bad value of integer", (done) => {
		var entity = _getSampleEntity();
		entity.size = "badstringtype"; // Changed to bad type
		blueEntities.addEntity( "img", entity )
					.then( (id) => {
						done( new Error("Unexpected test result!") );
					})
					.catch( (err) => {
						done();
					})
	});

	it( "# Add entity with bad value of boolean", (done) => {
		var entity = _getSampleEntity();
		entity.checked = 100; // Changed to bad type
		blueEntities.addEntity( "img", entity )
					.then( (id) => {
						done( new Error("Unexpected test result!") );
					})
					.catch( (err) => {
						done();
					})
	});
});

describe( "Pagination tests", () => {
	it( "# Get entities count", (done) => {
		blueEntities.getCount( "img" )
			.then( (count) => {
				done();
			})
			.catch( (err) => { done(err); })
	});

	it( "# Get page 0", (done) => {
		const ENTITITESTOADD = 100;
		const PAGECOUNT = 20;

		_addTestEntities(ENTITITESTOADD)
			.then( (ids) => {
				return blueEntities.getRange( "img", 0, PAGECOUNT-1 );
			})
			.then( (entities) => {
				assert.equal( PAGECOUNT, entities.length );
				done();
			})
			.catch( (err) => { done(err); } );
	});

	it( "# Iterate over all pages of entities", (done) => {
		// This tests iterate over all entitites and check
		// if number of elements iterated are equals
		// Moreover, checks if ids returned are all differents

		var entitiesIterated = 0;
		const PAGECOUNT = 20;
		var ids = [];

		blueEntities.getCount( "img" )
			.then( (entitiesCount) => {
				var iterate = function( start ) {
					blueEntities.getRange( "img", start, start + PAGECOUNT - 1 )
						.then( (entities) => {
							entities.map( (entity) => {
								ids[entity.id] = "";
							})

							entitiesIterated += entities.length;
							
							if ( entities.length == PAGECOUNT ) {
								return iterate( start + PAGECOUNT );
							}
							else {
								assert.equal( entitiesCount, entitiesIterated );
								assert.equal( entitiesCount, Object.keys(ids).length );

								done();
							}
						})
						.catch( (err) => { done(err); })
				}

				iterate( 0, 20 );
			})
			.catch( (err) => { done(err); })
	});
});

describe( "generate new ids test", () => {
	it( "# Get new id", () => {
		let entityId = blueEntities.getUniqueId();
		assert.isString(entityId);
		if ( !(entityId.length >= 7 && entityId.length <= 12) ) {
			assert.isTrue( false );
		}
	});
});

describe( "update tests", () => {
	it( "# Update property", (done) => {
		let entity = _getSampleEntity();
		let entityId;
		let newPropertyValue = "newfiletype";

		blueEntities.addEntity( "img", entity )
					.then( (id) => {
						entityId = id;
						return blueEntities.updateEntityValue( "img", id, "filetype", newPropertyValue );
					})
					.then( () => {
						return blueEntities.getEntity( "img", entityId );
					})
					.then( (e) => {
						assert.equal( newPropertyValue, e.filetype );
						done();
					})
					.catch( (err) => {
						done(err);
					})		
	});

	it( "# Try to update no existing entity", (done) => {
		blueEntities.updateEntityValue( "img", "fooid", "filetype", "foo" )
			.then( () => {
				assert.isTrue(false);
			})
			.catch( (err) => {
				done();
			})
	});

	it( "# Update value with invalid type", (done) => {
		let entity = _getSampleEntity();
		let entityId;

		blueEntities.addEntity( "img", entity )
					.then( (id) => {
						entityId = id;
						return blueEntities.updateEntityValue( "img", id, "checked", "string value" );
					})
					.then( () => {
						assert.isTrue(false);
					})
					.catch( (err) => {
						done();
					});
	})
})

describe( "Iterate test", () =>  {
	it( "# Basic iteration", (done) => {
		let fnc = function(entity) {
			console.log(entity);
		}
		blueEntities.iterateAll( "img", fnc )
			.then( () => {
				done()
			})
			.catch( (err) => { console.log(err); })
	})
});