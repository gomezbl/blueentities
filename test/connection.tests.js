"strict mode";

var assert = require("chai").assert;
var path = require("path");
var dbId = "tests";

var redisConfig = require( path.join( __dirname, "redisconfig.json" ) );

var baseSchema = [
	{
		name: "img",
		properties: [
			{ name: "filename", type: "string" },
		    { name: "location", type: "string" },
		    { name: "creationdatetime", type: "string" },
		    { name: "filetype", type: "string" },
		    { name: "size", type: "string" },
		    { name: "userid", type: "string" },
		]}
]

var blueEntities = require( path.join( process.cwd(), "blueentities") )(baseSchema, dbId, redisConfig);

describe( "Redis connection tests", () => {
	it( "# Check connection Ok with Redis server", () => {

	});

	it( "# Check connection failure with Redis server", () => {

	});

	it( "# Check server info", () => {
		let serverInfo = blueEntities.serverInfo();

		assert.isObject( serverInfo );
	})
})