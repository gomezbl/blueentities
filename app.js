var schema = [{
	name: "images",
	properties: [
		{ name: "filename", type: "string" },
	    { name: "location", type: "string" },
	    { name: "creationdatetime", type: "string" },
	    { name: "filetype", type: "string" },
	    { name: "size", type: "integer" },
	    { name: "userid", type: "integer" },
	]},

	{
		name: "requests",
		properties: [
			{ name: "url", type: "string" },
			{ name: "hash", type: "string" }
		]
	}

]

var blueEntity = require("./blueentities.js")(schema, "picly");

/*
blueEntity.getRange( "images", 0, 10 )
	.then( (entities) => {
		console.log(entities);
		blueEntity.shutdown();
	})
	.catch( (err) => { console.log(err); })
*/

/*
blueEntity.getCount( "images" )
	.then( (count) => {
		console.log(count);
		blueEntity.shutdown();
	})
	.catch( (err) => { console.log(err); })

var id = "BJjFdAd5RG-";
*/


var entity = { filename: "lola.png", 
			   location : "/cd/fofo/sdfs",
			   creationdatetime: "200302020",
			   filetype: "png",
			   size: 339393,
			   userid: 200 };

var insertPromises = [];

for( let i = 0; i < 1000; i++ ) {
	entity.size = i;
	insertPromises.push( blueEntity.addEntity("images", entity) );
}

insertPromises.reduce( (p,fn) => p.then(fn), Promise.resolve() )
	.then( () => {
		blueEntity.shutdown();
	})


/*
Promise.all( insertPromises )
	    .then( () => {
	    	blueEntity.shutdown();
	    	console.log("Completed!");
	    },
	    	(err) => {
	    		console.log("Error:" + err);
	    	});
*/