"use strict";

var util = require("util");

module.exports.hset = function( key, propertyName, propertyValue, redisClient ) {
	return new Promise( (resolve, reject) => {
		redisClient.hset( key, propertyName, propertyValue, (err) => {
			if ( err ) { reject(err); }
			else {
				resolve();
			}
		})
	});
}

module.exports.del = function( key, redisClient ) {
	return new Promise( (resolve, reject) => {
		redisClient.del( key, (err,r) => {
			if ( err ) { reject(err); }
			else {
				resolve(r);
			}
		})
	});
}

module.exports.hgetall = function( key, redisClient ) {
	return new Promise( (resolved, reject) => {
		redisClient.hgetall( key, (err, result) => {
			if ( err ) { reject(err); }
			else {
				if ( result == null ) {
					reject( new Error(util.format("hgetall failed when accesting to key '%s'", key) ) );
				} else {
					result.id = key;
					resolved(result);
				}
			}
		})
	});
}

module.exports.zadd = function( setkey, newelement, redisClient ) {
	return new Promise( (resolved, reject) => {
		redisClient.zadd( setkey, 0, newelement, (err, result) => {
			if ( err ) { reject(err); }
			else { resolved(result); }
		})
	});
}

module.exports.zrem = function( setkey, element, redisClient ) {
	return new Promise( (resolved,reject) => {
		redisClient.zrem( setkey, element, (err, result) => {
			if ( err) { reject(err); }
			else { resolved( result ); }
		})
	});
}

module.exports.zcount = function( key, redisClient ) {
	return new Promise( (resolved, reject) => {
		redisClient.zcount( key, 0, 1, (err, result) => {
			if ( err ) { reject(err); }
			else { resolved(result); }
		})
	});
}

module.exports.zrange = function( key, start, stop, redisClient ) {
	return new Promise( (resolved, reject) => {
		redisClient.zrange( key, start, stop, (err, result) => {
			if ( err ) { reject(err); }
			else { resolved(result); }
		})
	});	
}

module.exports.exists = function( key , redisClient) {
	return new Promise( (resolved, reject) => {
		redisClient.exists( key, (err, result) => {
			if ( err ) { reject(err); }
			else { resolved(result); }
		})
	})
}