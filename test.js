"use strict";

function myPromise(i) {
	return new Promise( (resolve,reject) => {
		setTimeout( ()=> {
			console.log("About to resolve " + i)
			resolve(i);
		}, Math.random()*1000);
	});
}

var promisesParams = [];



for( let i = 0; i < 20; i++ ) {
	promisesParams.push( i );
}

function waitThen( idx, promisesParams, promiseFnc ) {
	promiseFnc( promisesParams[idx] ).then( () => {
		idx++;
		if (idx != promisesParams.length) {
			waitThen(idx, promisesParams, promiseFnc);
		}
	})
}

waitThen( 0, promisesParams, myPromise );

