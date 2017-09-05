var cjson   = require('cjson'); 		// Read commented json files

const app_module_config_default = require('./app_modules/app-config-default.js');
const app_module_exit 			= require('./app_modules/app-exit.js');
const app_module_time 			= require('./app_modules/app-time.js');
const app_module_log 			= require('./app_modules/app-log.js');
const app_module_board 			= require('./app_modules/app-board.js');
const app_module_crop 			= require('./app_modules/app-crop.js');
const app_module_db 			= require('./app_modules/app-db.js');
const app_module_events 		= require('./app_modules/app-events.js');
const app_day_cycle 			= require('./app_modules/app-day-cycle.js');


const app 	= {
	exit 	: app_module_exit,
	config 	: app_module_config_default,
	/* */
	Board 	: app_module_board,
	Time 	: app_module_time,
	Crop 	: app_module_crop,
	Db 		: app_module_db,
	DayCycle: app_day_cycle,
	Log 	: app_module_log,
	Event 	: app_module_events,
	on 		: app_module_events.addListener,

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

		// Setting console styles
		app.Log.addStyle( {rule:/app.init\(\)/, style: 'color:' + app.config.log_style_highlight_color} );
		app.Log.addStyle( {rule:/\[event:.*\]/, style: 'color:' + app.config.log_style_event_color} );

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

		app.log('app.init() : Loading app-board-modules.json...');
		app.Components = cjson.load('app-board-modules.json');

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
		// Get  information about current CROP
		app.log('app.init() : App initiated! Getting CROP information...');
		app.Crop.id 		= app.config.crop_id;
		let crop 			= ( await app.Db.query('SELECT * from crops WHERE id=' + app.Crop.id) )[0];
		app.Crop.date_start = crop.date_start;
		app.Crop.crop_plan 	= crop.crop_plan;
		app.log('app.init() : Setting up Crop #'+app.config.crop_id+' with CROP PLAN ' + app.Crop.crop_plan);
		// Get current CROP CALENDAR
		let cropCalendar = await app.Crop.getCropCalendar();
		app.log('app.init() : Crop started the day '+ app.Time.format(crop.date_start, 'date') + ' and ends the day ' + app.Time.format( cropCalendar[cropCalendar.length-1].dayEnd, 'datetime') );
		// block if CROP HAS ENDED
		if( new Date() > cropCalendar[cropCalendar.length-1].dayEnd ){
			app.warn('app.init() : Current Crop HAS ALREADY FINISHED. NOTHING TO DO.');
			return;
		}
		app.Crop.crop_day = await app.Crop.getCropDay();
		// output Calendar info...
		app.log('app.init() : Today is the '+app.Crop.crop_day+'th day since the crop started.');
		app.log('app.init() : According to the "Crop Plan #'+crop.crop_plan+'", there are '+(cropCalendar.length-app.Crop.crop_day)+' days remaining till the end.');

		// INITIALIZE DAY CYCLE clock & events
		app.log('app.init() : Initializing Day Cycles engine clock...');
		await app.DayCycle.init();



		app.initComponents();
		return true;
	},
	Lights : {
		_items : [
			{
				id : 0,
				isOn: false,
				pin : 12
			}
		],
		init : async function(){
			const lights = await app.Db.query('SELECT * from crop_lights WHERE crop=' + app.Crop.id );
			console.log(lights);
		},
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

	initComponents : async function(){
		// SET LIGHT 1
		await app.Board.Pin( app.Lights._items[0].pin ).mode('OUTPUT');




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
