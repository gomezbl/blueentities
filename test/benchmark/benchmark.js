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
		    { name: "filetype", type: "string" },
		    { name: "size", type: "integer" },
		    { name: "checked", type: "boolean" }
		]}
]

var redisConfig = require( path.join( __dirname, "../redisconfig.json" ) );

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

function benchMarkTest1() {	
	return new Promise( (resolve, reject) => {
		console.log( "Adding 15000 entities..." );
		const COUNT = 15000;
		var addEntityPro = [];

		for( var i = 0; i < COUNT; i++ ) {
			addEntityPro.push( blueEntities.addEntity( "img", _getSampleEntity() ));
		}

		Promise.all( addEntityPro )
				.then( (ids) => {
					console.log("15000 entities added");
					resolve();
				})
				.catch( (err) => {
					console.log(err);
					reject();
				});
	});
}

console.time("benchMarkTest1");

benchMarkTest1().then( () => {
	console.log("bechMarkTest1 done");
	console.timeEnd("benchMarkTest1");
	
	blueEntities.shutdown();
});