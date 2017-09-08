/* global  pg, server */


let categories = {
	test: function(a,b){
		console.log("tttest");
		return a+b;
	},

	page( page = 0 , limit=10, sortBy = '' , order='DESC' ){
		// get all items (clone array)
		//let items = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,34,542,524,524,524,624,63636,36,36,53673,735,];
		//JSON.parse( JSON.stringify(pg.models.storage.Data.categories) );

		let items = server.Database.query('SELECT * in crops');

		// TO DO : sort by key
		// TO DO : apply ASC DESC order

		// if a page is requested, slice array , and select only corresponding items
		if(page > 0){
			let firstIndex = (page * limit) - limit;
			let lastIndex = (firstIndex + limit - 1) < items.length ? (firstIndex + limit ) : items.length ;
			items = items.slice(firstIndex, lastIndex);
		}
		// done ! return items;
		return items;
	},

	get(id='',original = false){
		let i = crops.getIndexById(id);
		return (i === -1) ? -1 :  ( original ? pg.models.storage.Data.crops[i] : JSON.parse( JSON.stringify(pg.models.storage.Data.crops[i]) ) );
	},

	getByName(name){
		for(let i = 0; i < pg.models.storage.Data.crops.length; i++){
			if(pg.models.storage.Data.crops[i].name === name) return pg.models.storage.Data.crops[i];
		}
		return -1;
	},

	delete(id=''){
		return new Promise(function(resolve){
			console.log('[Model]:crops.delete(): deleting feed #'+id);
			// get index in array
			let i = crops.getIndexById(id);
			// block if  id NOT found
			if(i === -1) resolve(false);
			// remove item from Data array
			pg.models.storage.Data.crops.splice(i,1);
			// request to save new data
			pg.models.storage.sync.categories().then( r => resolve(true) );
		});
	},

	save( crop ){
		return new Promise(function(resolve){
			console.log('[Model]:crops.save(): saving crop #' + crop.id);
			let i = crops.getIndexById(crop.id);
			if(i === -1) i = pg.models.storage.Data.crops.length;
			pg.models.storage.Data.crops[i] = crop;
			crops.updateFeedCount();
			pg.models.storage.sync.categories().then( r => resolve(true) );
		});
	},

	new(){
		return {
			id 		: pg.guid(),
			name 	: undefined,
			feeds 	: 0
		};
	},

	updateFeedCount(id=undefined){
		let _update = function(id){
			let crop = crops.get(id);
			if(crop === -1) return -1;

			crop.feeds = 0;
			for (let i=0; i < pg.models.storage.Data.feeds.length; i++ ) if(pg.models.storage.Data.feeds[i].crops.indexOf(id) !== -1) crop.feeds++;
			return crop.feeds;
		};
		if(typeof id === 'undefined') for (let i=0; i < pg.models.storage.Data.crops.length; i++ ) _update( pg.models.storage.Data.crops[i].id );
		else _update( id );
		return true;
	},


	getIndexById(id){
		return pg.models.storage.Data.crops.findIndex( crop=>(crop.id === id ) ? true : false );
	},
};

module.exports = categories;
