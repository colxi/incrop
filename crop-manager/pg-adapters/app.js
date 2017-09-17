/*
* @Author: colxi.kl
* @Date:   2017-08-28 06:02:49
* @Last Modified by:   colxi.kl
* @Last Modified time: 2017-09-15 03:41:29
*/
/* global pg */

let clock = null;

let app ={
	pg_constructor: async function(){
		pg.log('app.__constructor(): Application Controller Initialization started.');
		pg.log('app.__constructor(): Importing App Modules & dependencies...');
		// load some required pg modules
		pg.include('/pg-wonders/styles/styles.css');

		let formValidation = await pg.require('form-validation.js');
			//.then( r => pg.load.model('storage' , 'feedContents') )
			// get all Feeds Contents
			//.then( r => pg.models.feedContents.getAll(true) )
				// make form validation resources bindable
		this.regExp = formValidation.pattern;
		this.regExpInfo = formValidation.title;
				// schedule feedcontents update...
				/*
				for(let i=0; i<pg.models.storage.Data.feeds.length; i++){
		    		let feed = pg.models.storage.Data.feeds[i];
		    		pg.log('app.__constructor(): Scheduling Feed Refresh : '+ feed.id + ' (TTL : '+ feed.TTL+')');
		    		pg.models.feedContents.tasks[feed.id] = setInterval(
		    			function(id){
		    				pg.log('[Scheduled Task]: Refreshing FeedContents for feed #' + id);
		    				pg.models.feedContents.get( id , true )
		    					.then( r=> pg.models.feedContents.checkInFeed( id ) );
		    			}.bind(undefined, feed.id) , (feed.TTL * 60 * 1000)
		    		);
		    	}
		    	*/
		this.readyState = 'complete';
		return true;
	},

	readyState : 'loading',

	config : {},

	location : 'crops',

	regExp : {},

	regExpInfo : {},


	toogleArrayItem(item, array, event, object){
		let i = array.indexOf(item);
		if(i === -1) array.push(item);
		else array.splice(i, 1);
		console.log(arguments);
	}
};

module.exports = app;
