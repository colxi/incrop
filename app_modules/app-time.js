/* globals app */
var datejs   = require('datejs');  		// expands the Date Object

module.exports =  {
	/**
	 * [toUnixTime description]
	 * @return {[type]} [description]
	 */
	toUnixTime : function(){
		// Return the UNIX TIME in seconds
		return Math.round(new Date().getTime()/1000.0);
	},
	/**
	 * [format description]
	 * @param  {String} date [description]
	 * @param  {String} type [description]
	 * @return {[type]}      [description]
	 */
	format: function(d = '', type = 'datetime'){
		if( !(d instanceof Date) ){
			return app.error( 'app.Time.format() : Unknown provided argument : ' + d );
		}
		//t.setSeconds( ts );
		switch(type){
			case 'date':
				return d.toString(app.config.format_date);
			case 'time':
				return d.toString(app.config.format_time);
			case 'datetime':
				return d.toString(app.config.format_date +' ' + app.config.format_time);
			case 'timestamp':
				return  Math.round(d.getTime()/1000.0);
			default:
				return app.error('app.Time.format() : Unknown format-type requested: ' + type);
		}
	},
	daysSince: function(remoteDate){
		let diff 	= ( Date.today().getTime() - remoteDate.at('00:00') ) / 1000;
		let dayDiff = Math.floor(diff / 86400);
		return dayDiff;
	},
	remainingTime( date_end , date_start = new Date() ){
		return app.Time.msToTime(date_end - date_start);
	},


	msToTime : function(ms) {
		function z(n){ return (n<10?'0':'')+n }
		var sign = ms < 0? '-' : '';
		ms = Math.abs(ms);
		return sign + z(ms/3.6e6|0) + ':' + z(ms%3.6e6/6e4|0) + ':' + z(ms%6e4/1e3|0);
	}
};
