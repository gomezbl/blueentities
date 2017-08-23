"strict mode";

var assert = require("chai").assert;
var path = require("path");
var dbId = "tests";

function _blueEntitiesFactory( schema ) {
	return require( path.join(process.cwd(), "blueentities") )(schema, dbId);
}

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

var baseSchemaMultiple = [
	{
		name: "img",
		properties: [
			{ name: "filename", type: "string" },
		    { name: "location", type: "string" },
		    { name: "creationdatetime", type: "string" },
		    { name: "filetype", type: "string" },
		    { name: "size", type: "string" },
		    { name: "userid", type: "string" },
		]
	},

	{
		name: "users",
		properties: [
			{ name: "mail", type: "string" },
			{ name: "password", type: "string" },
			{ name: "alias", type: "string" },
			{ name: "age", type: "integer" }
		],
	}
]

describe( "Schema tests", () => {
	it( "# Add simple schema with one entity", () => {
		_blueEntitiesFactory(baseSchema, dbId);
	});

	it( "# Add schema with multiple entities", () => {
		_blueEntitiesFactory(baseSchemaMultiple, dbId);
	});

	it( "# Add schema with entity duplicated", () => {
		var badSchema = [
			{
				name: "imgrepeated",
				properties: [ { name: "filename", type: "string" } ] 
			},

			{
				name: "imgrepeated",
				properties: [ { name: "filename", type: "string" } ] 
			}
		]

		try {
			_blueEntitiesFactory(badSchema, dbId);
		} catch( err ) {
			// Validation failed
		}
	});

	it( '# Add empty schema', () => {
		try {
			_blueEntitiesFactory({});
		} catch( err ) {
			// Validation failed
		}		
	});

	it( "# Add schema with entity with no properties", () => {
		var badSchema = [
			{
				name: "imgrepeated"
			}
		]

		try {
			_blueEntitiesFactory(badSchema);
		} catch( err ) {
			// Validation failed
		}
	});

	it( "# Add schema with entity with properties with zero values", () => {
		var badSchema = [
			{
				name: "imgrepeated",
				properties: []
			}
		]

		try {
			_blueEntitiesFactory(badSchema);
		} catch( err ) {
			// Validation failed
		}
	});

	it( "# Add schema with property type wrong", () => {
		var badSchema = [
			{
				name: "img",
				properties: [ {name: "location", type: "badtype" } ]
			}
		]

		try {
			_blueEntitiesFactory(badSchema);
		} catch( err ) {
			// Validation failed
		}
	});

	it( "# Add schema with property type empty", () => {
		var badSchema = [
			{
				name: "img",
				properties: [ {name: "location", type: "" } ]
			}
		]

		try {
			_blueEntitiesFactory(badSchema);
		} catch( err ) {
			// Validation failed
		}
	});

	it( "# Add schema with property name empty", () => {
		var badSchema = [
			{
				name: "",
				properties: [ {name: "location", type: "integer" } ]
			}
		]

		try {
			_blueEntitiesFactory(badSchema);
		} catch( err ) {
			// Validation failed
		}
	});

	it( "# Add schema with entity name large", () => {
		var badSchema = [
			{
				name: "0123456789012345678901234567890123456789",
				properties: [ {name: "location", type: "integer" } ]
			}
		]

		try {
			_blueEntitiesFactory(badSchema);
		} catch( err ) {
			// Validation failed
		}
	});

	it( "# Add schema with property name large", () => {
		var badSchema = [
			{
				name: "img",
				properties: [ {name: "0123456789012345678901234567890123456789", type: "integer" } ]
			}
		]

		try {
			_blueEntitiesFactory(badSchema);
		} catch( err ) {
			// Validation failed
		}
	});
});