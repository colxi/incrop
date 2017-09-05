/* globals app */

const EventEmitter = require('events');

//class MyEmitter extends EventEmitter {}

const _event = new EventEmitter();
_event.setMaxListeners(20);

const EVENTS = {};

module.exports  = {
	register : function(eventName){
		// verify EVENT doesn't elready exist
		if( EVENTS.hasOwnProperty(eventName) ) throw new app.error('app.Event.register() : Event ('+eventName+') already registered.');
		// generate a unique ID
		EVENTS[eventName] = {
			token : Symbol('eventToken'),
			listeners : []
		};
		// return the auth token
		app.log('app.Event.register() : Event ('+eventName+') has been registered.');
		return EVENTS[eventName].token;
	},
	emit: async function(eventName, params, eventToken){
		if( !EVENTS.hasOwnProperty(eventName) ) throw new app.error('app.Event.emit() : Event ('+eventName+') does not exist.');
		if(EVENTS[eventName].token !== eventToken)  throw new app.error('app.Event.emit() : Provided Event Token does not match.');

		app.log('[event:'+eventName+'] app.Event.emit() : Event triggered. ('+eventName+')');
		for(let i=0; i < EVENTS[eventName].listeners.length; i++){
			await EVENTS[eventName].listeners[i](params);
		}
		return true;
	},
	removeListener : function(){},
	addListener : function(eventName, listener){
		if( !EVENTS.hasOwnProperty(eventName) ) throw new app.error('app.Event.on() : Event ('+eventName+') does not exist.');
		if( typeof listener !== 'function' ) throw new app.error('app.Event.on() : Listener must be a function.');
		let l = {
			token 		: Symbol('ListenerToken'),
			event 		: eventName,
			listener 	: listener
		};
		EVENTS[eventName].listeners.push(l);
		app.log('app.Event.addListener() : Added Event Listener for event : '+eventName );
		return l.token;
	},
};
