/*******************************************************************************
 *
 *
 * PROMISE /ASYNC BASED BASIC WRAPPER FOR ndde MYSQL library
 *
 *
 ******************************************************************************/

/* globals app */

var mysql   = require('mysql'); 		// Db connections

var _link = null;

module.exports =  {
	status: false,
	/**
	 * [description]
	 * @return {[type]} [description]
	 */
	createConnection: function( config = {} ){
		_link = mysql.createConnection({
			host     : config.host,
			user     : config.user,
			password : config.password,
			database : config.database
		});
		return true;
	},
	/**
	 * [description]
	 * @return {[type]} [description]
	 */
	connect : async function(){
		return new Promise( (resolve) =>{
			app.Db.status= false;
			_link.connect( err => {
				if(err){
					app.warn('app.Db.connect() : Error connecting to Db: ' + err);
					return resolve(err);
				}else{
					app.Db.status=true;
					app.log('app.Db.connect() : DB Connection id #' + _link.threadId);
					return resolve(_link.threadId);
				}
			});
		});
	},
	/**
	 * [description]
	 * @param  {[type]} q [description]
	 * @return {[type]}   [description]
	 */
	query : async function(q){
		return new Promise( (resolve) =>{
			_link.query( q , function(err, rows /*, fields */ ) {
				if (err){
					app.error(err);
					resolve( err );
				}
				resolve( rows );
			});
		});
	},
};
