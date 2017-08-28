/* globals app */

var INITIALIZED = false;

var EVENT_DAY_START;
var EVENT_DAY_END;
var EVENT_DAY_SUNRISE;
var EVENT_DAY_SUNSET;

var EVENT_CROP_END;
var EVENT_CROP_CHANGE_STAGE;


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
			// set new day in app.Crop.crop_day
			app.Crop.crop_day = cropDay;
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
			// check if the next day exists in the crop plan, if not
			// assume today is last day, and crop finished. LAUNCH EVENT
			if(cropDay+1 >= ( await app.Crop.getCropPlan() ).length){
				NEXT_EVENT = null;
				await app.Event.emit('cropEnd',undefined, EVENT_CROP_END);
				return;
			}
			// else prepare next day
			NEXT_EVENT = 'dayStart';
			await app.Event.emit('dayEnd',cropDay, EVENT_DAY_END);
			// give 1 second secure time to launch NEXT day DAY_START event
			setTimeout( ()=> emitDayCycleEvent('dayStart',cropDay+1), 1000 );
			break;
	}
	// done!
	return true;
};

var DayCycle = {
	get nextEvent(){ return NEXT_EVENT },
	get isDaytime(){ return app.DayCycle.nextEvent === 'daySunset' ? true : false },
	/**
	 * [description]
	 * @param  {[type]} cropDay [description]
	 * @return {[type]}         [description]
	 */
	init : async function(cropDay){
		// block if already initialized;
		if(INITIALIZED) return new app.error('app.DayCycle.init() : DayCycle already initiliazed...');
		else INITIALIZED = true;
		app.log('app.DayCycle.init() : Registering DayCycle Events...');
		// register Day Cycle events
		EVENT_DAY_START		= app.Event.register('dayStart');
		EVENT_DAY_END		= app.Event.register('dayEnd');
		EVENT_DAY_SUNRISE	= app.Event.register('daySunrise');
		EVENT_DAY_SUNSET	= app.Event.register('daySunset');

		// register CROP related events
		app.log('app.DayCycle.init() : Registering Crop Events...');
		EVENT_CROP_END			= app.Event.register('cropEnd');
		EVENT_CROP_CHANGE_STAGE	= app.Event.register('cropChangeStage');


		app.log('app.DayCycle.init() : Trigering the dayStart Event , for the current day...');
		// force the current day DayStart Event be launched
		// (will run the scheduler for the day cycle Events and trigger all the
		// lost day events)
		if( typeof cropDay === 'undefined' ) cropDay = await app.Crop.getCropDay();
		await emitDayCycleEvent('dayStart', cropDay);
		// done!
		return true;
	},

};

module.exports = DayCycle;
