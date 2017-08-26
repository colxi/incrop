/* globals app */


var _styleRules = [];

var _getStyle = function(msg){
	let css = '';
	for(let i = 0 ; i < _styleRules.length ; i++){
		if( _styleRules[i].rule.test(msg) ) css += _styleRules[i].style + ';';
	}
	return css;
};

var Log = {
	history : [],
	/**
	 * [addStyle description]
	 * @param {[type]} r [description]
	 */
	addStyle : function(r){
		// check if is a valid rule object
		if(!r.hasOwnProperty('rule') || !r.hasOwnProperty('style') ) return new app.error('app.Log.addStyle() : Invalid argument. Expected object structure : { rule:/regExp/ , style:"CSS-STRING" }');
		// check if is a valid regexp rule, and string type CSS style
		try{ new RegExp(r.rule) }
		catch(e){ return new app.error('app.Log.addStyle() : Invalid Rule (Invalid Regular Expression)') }
		if(typeof r.style !== 'string' ) return new app.error('app.Log.addStyle() : Style must be a string');
		// done, accepted!
		_styleRules.push(r);
		return true;
	},
	/**
	 * [removeStyle description]
	 * @param  {[type]} exp [description]
	 * @return {[type]}     [description]
	 */
	removeStyle: function(exp){
		for(let i = 0 ; i < _styleRules.length ; i++){
			if( exp === _styleRules[i].rule.toString() ){
				_styleRules[i].splice(i,1);
				i--;
			}
		}
		return true;
	},
	/**
	 * [log description]
	 * @param  {[type]}  msg    [description]
	 * @param  {String}  type   [description]
	 * @param  {Boolean} silent [description]
	 * @return {[type]}         [description]
	 */
	log : function(msg, type='log',silent=false){
		let d = new Date();
		// Log in console if console logging is enabled in config
		if(app.config.log_console === true){
			let style = _getStyle(msg);
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
					console.info('%c[' + app.Time.format(d,'time') + '] ' + msg , style);
					break;
				//case 'log':
				default:
					if(silent) break;
					console.log('%c[' + app.Time.format(d,'time') + '] ' + msg , style);
					break;
			}
			if(app.config.log_history === true){
				Log.history.push({
					date: d,
					type:type,
					msg : msg
				});
			}
		}
		return true;
	},
	info 	: function(msg='', silent=false){ return Log.log(msg, 'info' ,silent)  },
	warn 	: function(msg='', silent=false){ return Log.log(msg, 'warn' ,silent)  },
	error 	: function(msg='', silent=false){
		if( msg.hasOwnProperty('stack') ) msg = msg.stack;
		Log.log(msg, 'error',silent);
		return new Error(msg);
	},
};
module.exports = Log;
