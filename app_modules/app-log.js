/* globals app */

var o = {
	log : function(msg, type='log',silent=false){
		let d = new Date();
		// Log in console if console logging is enabled in config
		if(app.config.log_console === true){
			// evaluate log type
			switch(type){
				case 'warn':
					if(silent) break;
					console.warn('[' + app.Time.format(d,'time') + '] ' + msg);
					break;
				case 'error':
					if(silent) break;
					console.error('[' + app.Time.format(d,'time') + '] ' +msg);
					break;
				case 'info':
					if(silent) break;
					console.info('[' + app.Time.format(d,'time') + '] ' + msg);
					break;
				//case 'log':
				default:
					if(silent) break;
					console.log('[' + app.Time.format(d,'time') + '] ' + msg);
					break;
			}
			if(app.config.log_history === true){
				o.log.history.push({
					date: d,
					type:type,
					msg : msg
				});
			}
		}
		return true;
	},
	info 	: function(msg='', silent=false){ return o.log(msg, 'info' ,silent)  },
	warn 	: function(msg='', silent=false){ return o.log(msg, 'warn' ,silent)  },
	error 	: function(msg='', silent=false){
		if( msg.hasOwnProperty('stack') ) msg = msg.stack;
		o.log(msg, 'error',silent);
		return new Error(msg);
	},
};
o.log.history = [];
module.exports = o;
