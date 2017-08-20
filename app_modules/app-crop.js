/* globals app */

module.exports = {
	status 		: null,
	id 			: 1,
	date_start 	: null,
	crop_plan 	: null,
	/**
	 * [description]
	 * @param  {Date}   day [description]
	 * @return {[type]}     [description]
	 */
	getCropDay : async function( day = new Date() ){
		let modifier = 0;
		let date = new Date();
		if( !(day instanceof Date) ){
			if(day === 'today') 			modifier = 0;
			else if(day === 'yesterday') 	modifier = -1;
			else if(day === 'tomorrow') 	modifier = +1;
			else throw new app.error('app.crop.getCropDay() : Unknown value or reference provided as Date :'+day);
		}else date = day;
		app.log( 'app.Crop.getCropDay() : Searching for the cropDay matching to :'+date);
		if(modifier !== 0) app.log( 'app.Crop.getCropDay() : The "'+ (modifier===1?'TOMORROW':'PREVIOUS') + ' DAY" filter will be apllied on the result');

		const calendar = await app.Crop.getCropCalendar();
		let d;
		for(d=0 ; d< calendar.length; d++){
			// The time diference betwen days in the CROP CALENDAR PLANIFIER
			// is of 1 second of distance (eg: 23.59|24.00). A HUGE GAP!!
			// All the requests to getCropDay() launched when the clock is
			// ticking that second in the day,  will produce failures , being
			// unable to return any RESULT.
			// To minimize that gap, {dayEnd} value is augmented by 999
			// milliseconds (instead of 1 second, to prevent the overlaping
			// with the {dayStart} date of the following day)
			// ** PATCHED IN .getCropCalendar() !!!
			if( date >= calendar[d].dayStart && date <= calendar[d].dayEnd /* .add(999).millisecond() */ ){
				d = d + modifier;
				if(d<0 || d>=calendar.length) break;
				else return d;
			}
		}
		throw new app.error('app.crop.getCropDay() : Could not find the REQUESTED DAY in crop calendar!');
	},
	/**
	 * [description]
	 * @param  {String} cropDay [description]
	 * @return {[type]}         [description]
	 */
	getCropPlan : async function( cropDay = '*'){
		const plan = await app.Db.query('SELECT * from crop_plans_conf WHERE crop_plan=' + app.Crop.crop_plan );
		// RETURN ALL DAYS  (default)
		if(cropDay==='*') return plan;
		// RETURN A SISNGLE DAY
		else{
			// accept an Integer, a Date, the keywords 'today', 'yesterday' and
			// 'tomorrow' as valid Day selectors.
			if( cropDay instanceof Date || cropDay === 'today' || cropDay === 'yesterday' || cropDay === 'tomorrow'){
				cropDay = await app.Crop.getCropDay(cropDay);
			}
			// test day index before returning data
			if(typeof plan[cropDay] === 'undefined') throw new app.error('app.Crop.getCropPlan() : Requested Day ('+cropDay+') does not exist in the PLAN ('+app.Crop.crop_plan+')');
			else return plan[cropDay];
		}
	},
	/**
	 * [description]
	 * @param  {String} cropDay [description]
	 * @return {[type]}         [description]
	 */
	getCropCalendar : async function( cropDay='*' ){
		const calendar=[];
		const cropPlan = await app.Crop.getCropPlan();
		for(let d=0 ; d<cropPlan.length-1 ; d++){
			let _start;
			if( d===0 ) _start = app.Crop.date_start.at( cropPlan[d].day_start );
			else _start = new Date( +calendar[ d-1 ].dayEnd ).add( { milliseconds : 1 } );

			// Light goes on on the Sunrise (use dayStart Date and asign sunrise hour )
			let _sunrise = new Date( +_start ).at(cropPlan[d].sunrise);
			if( _sunrise < _start ) _sunrise.add( { days : 1 } );

			// Light goes off at sunset = _sunrise + daytime hours
			let _sunset = new Date( +_sunrise ).add( { hours : cropPlan[d].daytime } );

			// Day ends, one second before the  next day starts
			let _end =	new Date( +_sunset ).at( cropPlan[d+1].day_start );
			if( _end < _sunset ) _end.add( { days : 1 } );
			_end.add( { milliseconds : -1 } );

			// get the length of the day in hours
			let _length = Math.round(Math.abs(_start - _end) / 36e5);

			calendar.push({
				cropDay 	: d,
				dayStart 	: _start,
				sunrise 	: _sunrise,
				sunset 		: _sunset,
				dayEnd 		: _end,
				Duration  	: {
					night 		: _length - cropPlan[d].daytime,
					day 		: cropPlan[d].daytime,
					fullday 	: _length
				}
			});
		}
		// RETURN ALL CALENDAR  (default)
		if(cropDay==='*') return calendar;
		// RETURN A SINGLE DAY of CALENDAR
		else{
			// accept an Integer, a Date, the keywords 'today', 'yesterday' and
			// 'tomorrow' as valid Day selectors.
			if( cropDay instanceof Date || cropDay === 'today' || cropDay === 'yesterday' || cropDay === 'tomorrow'){
				cropDay = await app.Crop.getCropDay(cropDay);
			}
			// test day index before returning data
			if(typeof calendar[cropDay] === 'undefined') throw new app.error('app.Crop.getCropCalendar() : Requested Day ('+cropDay+') does not exist in the PLAN ('+app.Crop.crop_plan+')');
			else return calendar[cropDay];
		}
	},

};
