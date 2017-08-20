/* globals app */

var INITIALIZED = false;

var EVENT_DAY_START;
var EVENT_DAY_END;
var EVENT_DAY_SUNRISE;
var EVENT_DAY_SUNSET;

var NEXT_EVENT = '';

var DAY_EVENTS = {
	daySunrise : null,
	daySunset : null,
	dayEnd : null
};

/**
 * [description]
 * @return {[type]} [description]
 */
const dayCycleScheduler = async function(){
	const today = await app.Crop.getCropCalendar('today');
	const now 	= new Date();

	// clear previous timers
	clearTimeout(DAY_EVENTS.daySunrise);
	clearTimeout(DAY_EVENTS.daySunset);
	clearTimeout(DAY_EVENTS.dayEnd);

	// provide some ms padding to ensure they execute in the correct order, in
	// case of simultaneous time scheduling
	DAY_EVENTS.daySunrise = setTimeout( ()=> emitDayCycleEvent('daySunrise', today.cropDay) , today.sunrise - now + 100);
	DAY_EVENTS.daySunset = setTimeout( ()=> emitDayCycleEvent('daySunset', today.cropDay) , today.sunset - now + 200);
	DAY_EVENTS.dayEnd = setTimeout( ()=> emitDayCycleEvent('dayEnd' , today.cropDay) , today.dayEnd - now + 300);

	return true;
};

/**
 * [description]
 * @param  {[type]} event   [description]
 * @param  {[type]} cropDay [description]
 * @return {[type]}         [description]
 */
var emitDayCycleEvent = async function(event, cropDay){
	switch(event){
		case 'dayStart':
			NEXT_EVENT = 'daySunrise';
			await app.Event.emit('dayStart',cropDay, EVENT_DAY_START);
			//  Schedule the CURRENT NEW day cycle events
			await dayCycleScheduler();
			break;
		case 'daySunrise':
			NEXT_EVENT = 'daySunset';
			await app.Event.emit('daySunrise',cropDay, EVENT_DAY_SUNRISE);
			break;
		case 'daySunset':
			NEXT_EVENT = 'dayEnd';
			await app.Event.emit('daySunset',cropDay, EVENT_DAY_SUNSET);
			break;
		case 'dayEnd':
			NEXT_EVENT = 'dayStart';
			await app.Event.emit('dayEnd',cropDay, EVENT_DAY_END);
			// give 1 second secure time to launch NEXT day DAY_START event
			setTimeout( ()=> emitDayCycleEvent('dayStart',cropDay+1), 1000 );
			break;
	}
};

var DayCycle = {
	get nextEvent(){ return NEXT_EVENT },
	get isDaytime(){ return app.DayCycle.nextEvent === 'daySunset' ? true : false },
	init : async function(){
		// block if already initialized;
		if(INITIALIZED) return false;
		else INITIALIZED = true;

		// register Day Cycle events
		EVENT_DAY_START		= app.Event.register('dayStart');
		EVENT_DAY_END		= app.Event.register('dayEnd');
		EVENT_DAY_SUNRISE	= app.Event.register('daySunrise');
		EVENT_DAY_SUNSET	= app.Event.register('daySunset');

		// force the current day DayStart Event be launched
		// (will run the scheduler for the day cycle Events)
		const today = await app.Crop.getCropCalendar('today');
		await emitDayCycleEvent('dayStart', today.cropDay);
		return true;
	},

};

module.exports = DayCycle;
