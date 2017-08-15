var cron  						= require('node-cron'); 	// Scheduler

var app_module_config_default 	= require('./app_modules/app-config-default.js');
var app_module_exit 			= require('./app_modules/app-exit.js');
var app_module_time 			= require('./app_modules/app-time.js');
var app_module_log 				= require('./app_modules/app-log.js');
var app_module_board 			= require('./app_modules/app-board.js');
var app_module_crop 			= require('./app_modules/app-crop.js');
var app_module_db 				= require('./app_modules/app-db.js');



var app 	= {
	exit 	: app_module_exit,
	config 	: app_module_config_default,
	/* */
	Board 	: app_module_board,
	Time 	: app_module_time,
	Crop 	: app_module_crop,
	Db 		: app_module_db,

	UID 	: function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	},
	/* */
	log 	: app_module_log.log,
	info 	: app_module_log.info,
	warn 	: app_module_log.warn,
	error 	: app_module_log.error,

	Status:{
		initiated 	: false,
		boot_time 	: null,
		get db(){ return app.Db.status ? 'connected' : 'disconnected'},
		get crop(){ return app.Crop.status ? 'active' : 'completed'},
		get serial(){ return app.Board.isConnected ? 'connected' : 'disconnected' },
		get board(){ return app.Board.isBusy ? 'busy' : 'idle' },
		get lights(){ return app.Lights.status ? 'On' : 'Off' }
	},


	init : async function(){
		//app.status
		process.stdin.resume();
		process.on('unhandledRejection', (reason) => {
			app.warn('[event:app] Unhandled Rejection! (details in app.log.history)');
			//console.log(reason, stack);
			if( reason instanceof Error) reason = reason.stack;
			app.error('Unhandled Rejection :'+ reason , app.config.log_unhandled_reject_details_silent);
		});

		global.app = app;

		// Block if previously initiated
		if( app.Status.initiated === true ){
			throw new app.error('app.init() : Cancelled. App already initiated...');
		}

		// Initiating App...
		app.log('app.init() : Initiating app...');

		// load json config file and apply it
		app.config.load();

		// Inform about boot mode
		app.log('app.init() : Strict Boot ' + (app.config.boot_strict ? 'Enabled' : 'Disabled') );

		// Connect to Arduino...
		app.log('app.init() : Connecting to Arduino Board...');

		try{ await app.Board.connect() }
		catch(err){
			if( app.config.boot_strict ){
				throw new app.error('app.init() : App Initiation Cancelled...  (app.config.boot_strict=true)');
			}
		}

		app.log('app.init() : Testing communication with Arduino Board...');
		let lag = 0;
		try{ lag = await app.Board.System.ping() }
		catch(err){
			if(app.config.boot_strict){
				throw new app.error('app.init() : App Initiation Cancelled...  (app.config.boot_strict=true)');
			}
		}

		app.log('app.init() : Arduino Board Ready! (response time='+lag+'ms)');

		// connect to db
		app.log('app.init() : Connecting to database...');
		app.Db.createConnection({
			host     : app.config.db_host,
			user     : app.config.db_user,
			password : app.config.db_pwd,
			database : app.config.db_name
		});
		let db = await app.Db.connect();
		if(db instanceof Error){
			if(app.config.boot_strict){
				throw new app.error('app.init() : App Initiation Cancelled...');
			}else app.log('app.init() : Continue Initiation (app.config.boot_strict=false)');
		}

		app.Status.initiated = true;
		app.log('app.init() : App initiated! ');
		app.log('*************************************************************');
		app.log('app.init() : App initiated! Getting CROP information...');
		app.Crop.id 		= app.config.crop_id;
		let crop 			= ( await app.Db.query('SELECT * from crops WHERE id=' + app.Crop.id) )[0];
		app.Crop.date_start = crop.date_start;
		app.Crop.crop_plan 	= crop.crop_plan;
		app.log('app.init() : Setting up Crop #'+app.config.crop_id+' started the day '+ app.Time.format(crop.date_start, 'date') );
		let cropPlan = await app.Crop.getCropPlan();
		let cropDay;
		try{ cropDay = await app.Crop.getCropDay() }
		catch(err){ console.warn(err) }

		app.log('app.init() : Today is the '+cropDay+'th day since the crop started.');
		app.log('app.init() : According to the "Crop Plan #'+crop.crop_plan+'", there are '+(cropPlan.length-cropDay)+' days remaining till the end.');

		// TO DO : check if current crop is active, and if not reached last day!
		// if active initiate scheduling
		app.initComponents();
		return true;
	},
	Lights : {
		status : false,
		_items : [
			{
				id : 0,
				isOn: false,
				pin : 12
			}
		],
		on : async function(id){
			if(typeof id === 'undefined'){
				for(let i=0; i<app.Lights._items.length; i++){
					await app.Board.Pin( app.Lights._items[i].pin ).value(1);
				}
				return;
			}

			if( parseInt(id) !== parseFloat(id) ){ return } // NOT INTEGERS!!!
			id = parseInt(id);
			if( typeof app.Lights._items[id] === 'undefined')	{ return } // ref doesnt exist

			await app.Board.Pin( app.Lights._items[id].pin ).value(1);
			return;

		}
	},
	programLightEvent: async function(action){
		// TODO : DETECT EVENTS OVERLAPPING
		// eg: DAY_START+SUNRISE
		// eg: SUNRISE+SUNSET (when daylight=0)
		// eg: DAY_START+SUNRISE+SUNSET (when daylight=0)
		// eg : ¿more?
		// should process the LAST one, and notify all them
		console.log( action, new Date() );
		let today = await app.Crop.getCropCalendar('today');
		let now = new Date();
		console.log(today);
		if(now < today.sunrise){
			console.log('IS NIGHTTIME. Next event is SUNRISE : '+ today.sunrise);
			setTimeout( ()=> app.programLightEvent('EVENT:SUNRISE!'),  today.sunrise - now );
		}else if(now < today.sunset){
			console.log('IS DAYTIME. Next event is SUNSET : '+ today.sunset);
			setTimeout( ()=> app.programLightEvent('EVENT:SUNSET!'), today.sunset - now );
		}else if(now < today.dayEnd){
			console.log('IS NIGHTTIME. Next event is DAY_END/DAY_START : '+ today.dayEnd);
			let tomorrow = await app.Crop.getCropCalendar('tomorrow');
			setTimeout( ()=> app.programLightEvent('EVENT:DAY_START!'), tomorrow.dayStart - now );
		}
		return;
	},
	initComponents : async function(){
		// SET LIGHT 1
		await app.Board.Pin( app.Lights._items[0].pin ).mode('OUTPUT');



		app.programLightEvent('FIRST CHECK');

		return;

		//, function(err, rows, fields) {

		//console.log(cron);

		/*
		app.components.lights = {
			'1' : new  five.Relay({
				pin: 8,
				type: 'NO'
			}),
			'2' : new  five.Relay({
				pin: 9,
				type: 'NO'
			}),
			'3' : new  five.Relay({
				pin: 10,
				type: 'NO'
			}),
			'4' : new  five.Relay({
				pin: 11,
				type: 'NO'
			}),
		};
		app.components.AC = new  five.Relay({
			pin: 12,
			type: 'NO'
		});

		// Create an Led on pin 13
		//app.components.led = new five.Led(13);
		app.components.led = new five.Led(3);
		// Strobe the pin on/off, defaults to 100ms phases
		app.components.led.strobe();
		*/
	},
	components : {},
};


app.init().catch(function(err){ console.log(err) } );





/*
265 filtro
750m3
*/