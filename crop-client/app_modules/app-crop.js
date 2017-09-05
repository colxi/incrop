/* globals app */

var Crop = {
	status 		: null,
	id 			: 1,
	date_start 	: null,
	crop_plan 	: null,
	crop_day 	: null,
	getCropEndDate : async function(){
		app.log( 'app.Crop.getCropEndDate() : Calculating Crop End Date.');
		let cropPlan = await Crop.getCropPlan();
		return new Date( +Crop.date_start ).add( cropPlan.length ).days();
	},
	/**
	 * [description]
	 * @param  {Date}   day [description]
	 * @return {[type]}     [description]
	 */
	getCropDay : async function( date = 'today' ){
		if( !(date instanceof Date) ){
			// if Crop.crop_day is not yet defined, force day resolution before
			// proceding to semantic day request
			if( Crop.crop_day === null ) Crop.crop_day = await Crop.getCropDay( new Date() );
			// apply semantic day request...
			if(date === 'today') 			return Crop.crop_day;
			else if(date === 'yesterday') 	return Crop.crop_day - 1;  // to do, block < 0
			else if(date === 'tomorrow') 	return Crop.crop_day + 1;  // to do , block bigger than last day
			else throw new app.error('app.crop.getCropDay() : Unknown value or reference provided as Date :'+date);
		}
		app.log( 'app.Crop.getCropDay() : Searching for the cropDay matching to '+date);

		// get the cropCalendar, where the begining and end (real time Dates)
		// of each cropDay is specified, and iterate it, comparing the current
		// date and time , with each cropDay ranges, until the current timestamp
		// fits in betwen a cropDay Start and End.
		const calendar = await Crop.getCropCalendar();
		for(let d=0 ; d< calendar.length; d++){
			if( date >= calendar[d].dayStart && date <= calendar[d].dayEnd ){
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
		app.log( 'app.Crop.getCropPlan() : Retrieving crop Plan (' + Crop.crop_plan + ')');
		const plan = await app.Db.query('SELECT * from crop_plans_conf WHERE crop_plan=' + Crop.crop_plan );
		// RETURN ALL DAYS  (default)
		if(cropDay==='*') return plan;
		// RETURN A SINGLE DAY
		else{
			// accept an Integer, a Date, the keywords 'today', 'yesterday' and
			// 'tomorrow' as valid Day selectors.
			if( cropDay instanceof Date || cropDay === 'today' || cropDay === 'yesterday' || cropDay === 'tomorrow'){
				cropDay = await Crop.getCropDay(cropDay);
			}
			// test day index before returning data
			if(typeof plan[cropDay] === 'undefined') throw new app.error('app.Crop.getCropPlan() : Requested Day ('+cropDay+') does not exist in the PLAN ('+Crop.crop_plan+')');
			app.log('app.Crop.getCropPlan() : Plan for day' + cropDay + ':' , plan[cropDay]);
			return plan[cropDay];
		}
	},
	/**
	 * [description]
	 * @param  {String} cropDay [description]
	 * @return {[type]}         [description]
	 */
	getCropCalendar : async function( cropDay='*' ){
		const calendar=[];
		app.log( 'app.Crop.getCropCalendar() : Retrieving crop Calendar (for cropPlan:' + Crop.crop_plan + ')');
		const cropPlan = await app.Db.query('SELECT * from crop_plans_conf WHERE crop_plan=' + Crop.crop_plan );
		for(let d=0 ; d<cropPlan.length ; d++){
			let _start;
			if( d===0 ) _start = Crop.date_start.at( cropPlan[d].day_start );
			else _start = new Date( +calendar[ d-1 ].dayEnd ).add( { milliseconds : 1 } );

			// Light goes on on the Sunrise (use dayStart Date and asign sunrise hour )
			let _sunrise  = new Date( +_start ).at(cropPlan[d].sunrise);
			if( _sunrise < _start ) _sunrise.add( { days : 1 } );

			// Light goes off at sunset = _sunrise + daytime hours
			let _sunset = new Date( +_sunrise ).add( { hours : cropPlan[d].daytime } );

			// calculate the end of the day. If is last day, end of day is sunset.
			let _end;
			if(typeof cropPlan[d+1] !== 'undefined' ){
				// Day ends, one second before the  next day starts
				_end =	new Date( +_sunset ).at( cropPlan[d+1].day_start );
				if( _end < _sunset ) _end.add( { days : 1 } );
				_end.add( { milliseconds : -1 } );
			}else _end = _sunset;

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
				cropDay = await Crop.getCropDay(cropDay);
			}
			// test day index before returning data
			if(typeof calendar[cropDay] === 'undefined') throw new app.error('app.Crop.getCropCalendar() : Requested Day ('+cropDay+') does not exist in the PLAN ('+Crop.crop_plan+')');
			else return calendar[cropDay];
		}
	},

};


module.exports = Crop;
