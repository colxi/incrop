/* global  pg, server */


module.exports = {
	page : async function( page = 0 , limit=10, sortBy = '' , order='DESC' ){
		let items = await server.Database.query('SELECT * FROM crops');

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

	count : async function(){
		let items = await this.page(0);
		return items.length;
	},

	get : async function(id = ''){
		let crop = await server.Database.query('SELECT * FROM crops WHERE id= ?',[id]);
		return crop[0];
	},

	getByName(name){
		for(let i = 0; i < pg.models.storage.Data.crops.length; i++){
			if(pg.models.storage.Data.crops[i].name === name) return pg.models.storage.Data.crops[i];
		}
		return -1;
	},

	delete(id=''){
		return new Promise( resolve=> {
			console.log('[Model]:crops.delete(): deleting feed #'+id);
			// get index in array
			let i = this.getIndexById(id);
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
			let i = this.getIndexById(crop.id);
			if(i === -1) i = pg.models.storage.Data.crops.length;
			pg.models.storage.Data.crops[i] = crop;
			this.updateFeedCount();
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
			let crop = this.get(id);
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

