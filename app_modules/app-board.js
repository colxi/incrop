/* globals app */

/**
 *
 * app.Board provides the methods and mechanisms to communicate with the Board
 * and manage a Queue of serialized requests.
 * Author: colxi.info
 *
 */

// Define some ARDUINO CONSTANTS
Object.defineProperty(global,'OUTPUT',{value:'OUTPUT',writable:false,configurable:false});
Object.defineProperty(global,'INPUT_PULLUP',{value:'INPUT_PULLUP',writable:false,configurable:false});
Object.defineProperty(global,'INPUT',{value:'INPUT',writable:false,configurable:false});
Object.defineProperty(global,'HIGH',{value:0x1,writable:false,configurable:false});
Object.defineProperty(global,'LOW',{value:0x0,writable:false,configurable:false});

var serialPort = require('serialport');

// PRIVATE VARIABLES
var _request_timeout = null; 	// setTimeout handler
var _request_id = 1; 			// counter
var _isBusy = false; 			// Board op status
var _isConnected = false; 		// Board Conection Status
var _currentRequest = null; 	// Current Task holder
var _QUEUE = [ 					// Array of queued tasks
/*
	{
		id : (int), 			// unique incremental id
		time : (int), 			// timestamp of queued
		retry: (int), 			// count of retries
		command : (string), 	// provided request
		resolve : (function), 	// promise resolve function
		reject : (function), 	// promise reject function
	},
	{...}
*/
];
var _WATCHERS = [
/*
	{
		uid 		: (string), 			// app.UID generator
		id 			: (int), 				// index in the container array
		pin 		: (int), 				// Board pin
		status 		: (string) 				// options : active|deleted|discarded
		onChange 	: (function) 			// provided callback
		public 		: { 					// Returned object
			_type_ 		: 'watcher', 		// type identifier
			_uid_ 		: (getter uid), 	// getter
			_status_ 	: (getter status), 	// getter
			_pin_ 		: (getter pin), 	// getter
			clear 		: (function) 		// Clear Current Watcher Board.Watchers.Clear(this.uid)
		}

	}
*/
];

var _COMPONENTS = {
	Pin : function( pin ){
		return Board.Pin(pin);
	},
	Relay :  function( conf ){
		// conf.pin
		// conf.mode NO|NC

		//initialize
		let pinmode = Board.Pin(conf.pin).mode(OUTPUT);

		return {
			id 		: null,
			type 	: 'Component',
			subType : 'relay',
			pin 	: conf.pin, 		// digital pin
			mode 	: conf.mode, 		// NO|NC
			getStatus: async function(){
				var r;
				try{ r = await Board.Pin(conf.pin).value() }
				catch(err){ throw new app.error(err) }
				return r;
			},
			on : async function(){
				try{ await Board.Pin(conf.pin).value(1) }
				catch( err ){ throw new app.error(err) }
				return true;
			},
			off : async function(){
				try{ await Board.Pin(conf.pin).value(0) }
				catch( err ){ throw new app.error(err) }
				return true;
			}
		};

	}

};

var _SerialPort = null; 		// serialPort link object

// app.Board PUBLIC API
var Board = {
	Config : {
		serial_port_open_delay 				: '',
		log_silent_board_timeouts_reponses 	: '',
		serial_port_reconnect_on_error 		: '',
		serial_port_request_timeout 		: '',
		serial_port_retry_request_timeout 	: '',
		serial_port_retries_request_timeout : '',
		serial_port_parser 					: '',
		serial_port 						: '',
		serial_port_baud_rate 				: ''
	},
	get isBusy(){  		return _isBusy  },
	get isConnected(){  return _isConnected  },
	/**
	 * [get description]
	 * @param  {[type]} components [description]
	 * @param  {[type]} item)      {			console.log(components, item);			if (typeof components[item] [description]
	 * @return {[type]}            [description]
	 */
	new : new Proxy( _COMPONENTS, {
		get: function( components , item) {
			return function(){
				return components[item].apply(this, arguments);
			};
		}
	}),
	/**************************************************************************
	 *
	 *  QUEUE
	 *  Requests Queue Processing methods.
	 *
	 **************************************************************************/
	Queue : {
		/**
		 * [currentRequest description]
		 * @return {[type]} [description]
		 */
		get currentRequest(){  return _currentRequest  },
		/**
		 * [items description]
		 * @return {[type]} [description]
		 */
		get items(){ return _QUEUE },
		/**
		 * [clearQueue description]
		 * @return {[type]} [description]
		 */
		clear : function(){
			app.log('app.Board.Queue.clear() : Clearing Queue!' );
			for(let i=0; i<_QUEUE.length;i++) _QUEUE[i].reject('Queue Clear Request');
			_QUEUE = [];
			app.log('app.Board.Queue.clear() : Requests Queue CLEARED!' );
		},
		/**
		 * [process description]
		 * @return {[type]} [description]
		 */
		process : function(){
			if( !_QUEUE.length ){
				app.log('app.Board.Queue.process() : Queue is empty. Done');
				return true;
			}
			var _request = _QUEUE[0];
			_QUEUE.shift();
			Board.System.send(_request, true);
		},
	},
	/**************************************************************************
	 *
	 *  SYSTEM
	 *  Internal Event Handlers & Debuging utilities.
	 *
	 **************************************************************************/
	System : {
		Events : {
			/**
			 *
			 * onConnect() : EVENT HANDLER. The Event is called with no args
			 * when the port is opened and ready for writing.
			 *
			 * @return {void}
			 *
			 */
			onConnect : function(){
				app.log('[event:Connect] app.Board.System.Events.onConnect() : Board port OPEN!');
				// set link flag to true, and set board to ready status
				_isConnected = true;
				_isBusy = false;
				if(_currentRequest){
					// If there is a TASK pending of response...
					// ...set board as busy
					_isBusy = true;
					app.log('[event:Connect] app.Board.System.Events.onConnect() :  There is a TASK pending of response.');
				}else if( _QUEUE.length){
					// If no Task is pending... but are items in the QUEUE,
					// launch queue execution
					setTimeout( () =>{
						app.log('[event:Connect] app.Board.System.Events.onConnect() :  Pending Requests found. Processing Queue (Size:'+_QUEUE.length+')');
						Board.Queue.process();
					} , app.config.serial_port_open_delay );
				}

				// Execute user custom onConnect Event Handler
				if(typeof Board.onConnect === 'function' ) Board.onConnect();

				return void(0);
			},
			/**
			 *
			 * onDisconnect() : EVENT HANDLER. is called with no arguments when
			 * the port is closed.In the case of an disconnect it will be called
			 * with a Disconnect Error object (err.disconnected == true).
			 * In the case of a close error, an error event (onError) is
			 * triggered instead
			 *
			 * @param  {error} 		err 	Error Object
			 *
			 * @return {void}
			 *
			 */
			onDisconnect : function(err){
				_isConnected = false;
				_isBusy = false;
				_SerialPort = null;
				if(err){
					app.warn('[event:Disconnect] app.Board.System.Events.onDisconnect() : Error happened on Board Port closing.');
					app.warn(err);
				}else{
					app.warn('[event:Disconnect] app.Board.System.Events.onDisconnect() : Board Communication port CLOSED!');
				}
				// Execute user custom onDisconnect Event Handler
				if(typeof Board.onDisconnect === 'function' ) Board.onDisconnect(err);

				return void(0);
			},
			/**
			 *
			 * onData() : EVENT HANDLER. Will process the Board Messages and
			 * execute Request callbacks. Will handle SYSTEM CALLS and
			 * NOTIFICATION MESSAGES. After processing the response, will try to
			 * process the Queue if elements are found
			 *
			 * @param  {string} 	response 	String returned by the Board
			 *
			 * @return {void}
			 *
			 */
			onData : function(response){

				// split response in 2 parts: responseId and responseText
				// (expecting ID:DATA[:MORE_DATA:MUCH_MORE:DATA])
				let response_parts = response.split(':');

				// tokenize response
				let id =  response_parts.shift();
				let data = response_parts.join(':');

				// BLOCK if expected formating does not match with expected
				if( isNaN(id) ){
					app.log('<< ' + response );
					return app.error('[event:Data] app.Board.System.Events.onData() : Unkwnow Request Identifier received ("'+response+'"). DISCARDING RESPONSE');
				}else id = parseInt(id);

				// HANDLE BOARD system MESSAGES (Messages with ID=0 )
				if( id === 0){
					app.info('<< ' + response );
					// Obtain System Service ID
					let sys_id, sys_data;
					sys_data 	= data.split(':');
					sys_id 		= sys_data.shift();

					switch(sys_id){
						// HANDLE __WATCHER__ service mesages...
						case '__WATCHER__':{
							// __WATCHER__ service ALWAYS return 2 values, the FIRST one
							// is the WATCHER reference ID, and the SECOND one is the
							// actual message (new pin value(>=0), errorCode(<0))
							if( sys_data.length<2 ) throw new app.error('[event:Watcher] app.Board.System.Events.onData() : Unkwnow Watcher Event Formatting. DISCARDING EVENT');

							let watcher_id 		= parseInt( sys_data.shift() );
							let watcher_value 	= parseInt( sys_data.shift() );
							app.info('[event:Watcher] app.Board.System.Events.onData() : Watcher ('+watcher_id+') Event received ("'+watcher_value+'")');

							if(watcher_value >= 0){
								// NEW VALUE!
								// execute user Callback
								if(_WATCHERS[ watcher_id ].status !== 'active') app.warn('[event:Watcher] app.Board.System.Events.onData() : Preventing execution of DISCARTED Watcher Callback. Ignore.');
								else _WATCHERS[ watcher_id ].onChange(watcher_value);
							}else{
								// ERROR MESSAGE
								if(watcher_value === -1){
									app.warn('[event:Watcher] app.Board.System.Events.onData() : Watcher ('+watcher_id+') assosiated PIN ('+_WATCHERS[watcher_id].pin+') is now OUTPUT. Can\'t watch. Deleting Watcher.');
									Board.Watchers.clear( _WATCHERS[watcher_id].uid, '_system_' );
								}else throw new app.error('[event:Watcher] app.Board.System.Events.onData() : UNKWNOWN Watcher ERROR!');
							}
							break;
						}
						//case '__UP__':
						//case '__DOWN__':
						default:{
							app.warn('[event:Data] app.Board.System.Events.onData() : Unhandled System message received from Board ("'+data+'")');
						}
					}
					return void(0);
				}

				// Integrity check. Response ID must match with current TASK ID
				if(!_currentRequest || id !== _currentRequest.id){
					app.log('<< ' + response , null, app.config.log_silent_board_timeouts_reponses);
					app.warn('[event:Data] app.Board.System.Events.onData() : IDs from request (#'+ (_currentRequest ? _currentRequest.id : 'REQUEST_DESTROYED') +') and response (#'+id+') don\'t match. ¿TIMEOUT? DISCARDING RESPONSE', app.config.log_silent_board_timeouts_reponses);
					return void(0);
				}

				// Ready for RESPONSE processing & resolving
				//
				app.log('<< ' + response );
				// clear Timeout associated to request. Response arrived at time.
				clearTimeout(_request_timeout);
				// recover original request data callback (RESOLVE),
				// free current task slot & set board as ready
				let resolve = _currentRequest.resolve;
				_currentRequest = null;
				_isBusy = false;
				// NOTIFY original caller, request is completed!
				resolve(data);

				// process queue if there are more items...
				if( _QUEUE.length ){
					app.log('[event:Data] app.Board.System.Events.onData() : Pending Requests found. Processing Queue (Size:'+ _QUEUE.length +')');
					Board.Queue.process();
				}
				return void(0);
			},
			/**
			 *
			 * onError() : EVENT HANDLER. Is executed when communication error
			 * with Board happens. Resets flags, and if setted, try to reconnect
			 *
			 * @param  {error} 		error
			 *
			 * @return {void}
			 *
			 */
			onError : function(err){
				app.error('[event:Error] app.Board.System.Events.onError() : Board communication Interrupted. ' + err);
				_isBusy = false;
				_isConnected = false;
				_SerialPort = null;
				if(app.config.serial_port_reconnect_on_error){
					app.log('[event:Error] app.Board.System.Events.onError() : Trying AUTO-RECONNECT (serial_port_reconnect_on_error=true)');
					Board.connect();
				}

				// Execute user custom onError Event Handler
				if( typeof Board.onError === 'function' ) Board.onError(err);

				return void(0);
			},
		},
		/**
		 *
		 * send() ASYNC. queues the request, and tries to process it, if there
		 * is no other request pending, or being processed. It returns a promise
		 * but is never resolved or rejected on this functions, as far it will
		 * be resolved when board response is received.
		 *
		 * @param  {string} 	request 	String containing the request
		 * @param  {bool} 		hasPriority If true, process with priority
		 *
		 * @return {Promise}
		 *
		 */
		send : function(request = undefined, hasPriority = false){
			return new Promise( (resolve, reject) =>{
				// BLOCK IF NO REQUEST PROVIDED!
				if(typeof request === 'undefined') return resolve(true);
				// QUEUE provided request... This will allow to execute queued
				// request later, in case that can't be executed in this attempt.
				// Deppending of hasPriority value will be added in the beginning
				// or at the end of the Queue
				let queueAction = (hasPriority) ? 'unshift' : 'push';
				// if provided REQUEST is a QUEUE element recover stored properties
				if( typeof request === 'object') _QUEUE[queueAction](request);
				else{
					_QUEUE[queueAction]({
						id 		: _request_id++,
						time 	: new Date(),
						retry 	: 0,
						command : request,
						resolve : resolve,
						reject 	: reject
					});
				}

				// BLOCK is board PORT is not available (CLOSED)
				if(!_isConnected){
					app.error('app.Board.System.send() : Serial port is not Open. Make connection first! Request queued. (Queue Size:'+_QUEUE.length+')');
					return false;
				}
				// BLOCK execution if board is busy (eg. processing another request,
				// waiting for a response, opening port... )
				if(_isBusy){
					app.warn('app.Board.System.send() : Board is busy. Request queued: '+ request+' (Queue Size:'+_QUEUE.length+')');
					return false;
				}

				// READY TO SEND REQUESTS!
				//
				// Select first request in queue (remove from queue), and block
				// Board to any other concurrent sendings attempts
				_currentRequest = _QUEUE.shift();
				_isBusy = true;

				// TIMEOUT HANDLER
				// set a TIMEOUT observer and callback, to handle timeout on response
				_request_timeout = setTimeout( () =>{
					app.warn('[event:timeout] app.Board.System.send() : The request '+ _currentRequest.id+':'+ _currentRequest.command +' has TIMEOUT (>'+app.config.serial_port_request_timeout+'ms)');
					_isBusy = false;
					if(app.config.serial_port_retry_request_timeout && _currentRequest.retry<app.config.serial_port_retries_request_timeout){
						_QUEUE.unshift(_currentRequest);
						// set new id to prevent colision with responses associated
						// to previous ID
						_QUEUE[0].id = _request_id++;
						_QUEUE[0].retry++;
						app.log('[event:timeout] app.Board.System.send() : Retry sending ('+ _currentRequest.retry+'/'+app.config.serial_port_retries_request_timeout+') (New ID:'+_QUEUE[0].id+')' );
						_currentRequest = null;
						Board.Queue.process();
						return void(0);
					}
					_currentRequest.reject( new app.error('[event:timeout] app.Board.System.send() : Failed to Execute REQUEST. DISCARDING REQUEST') );
					_currentRequest = null;
					if( _QUEUE.length ) Board.Queue.process();
					return void(0);
				}, app.config.serial_port_request_timeout );

				_SerialPort.write(_currentRequest.id +':'+ _currentRequest.command + String.fromCharCode(app.config.serial_port_parser), function(err) {
					if(err instanceof Error) return err;
					app.log('>> ' + _currentRequest.id + ':'+ _currentRequest.command  );
					return true;
				});
			});
		},
		/**
		 *
		 * freeMem() : ASYNC. Returns  ammount of free Kb in Board's SRAM memory
		 *
		 * @return  {int} 					Ammount of free Memory in Kb
		 *
		 */
		freeMem : async function(){
			let mem = await Board.System.send('free_mem');
			mem = parseInt(mem);
			app.log('app.Board.System.freeMem() : Board has '+ mem +' bytes of free SRAM.');
			return mem;
		},
		/**
		 *
		 * ping() : ASYNC. Returns  time betwen method call and response arrival
		 * considering time waiting in Queue before ping is executed.
		 *
		 * @return  {int} 					Response Time in ms
		 *
		 */
		ping : async function(){
			const t1 	= new Date();
			await Board.System.send('ping');
			const t2 	= new Date();
			const dif 	= ( t2 - t1 );
			app.log('app.Board.System.ping() : Response in ' + dif +' ms ('+dif/1000+'s)');
			return dif;
		},
		/**
		 *
		 * await() : ASYNC. Makes the Board freeze for the provided time (ms).
		 *
		 * @param  {int}		ms 	 		Time to freeze in ms
		 *
		 * @return {bool}   	true
		 *
		 */
		await : async function(ms=0){
			await Board.System.send( 'await:'+parseInt(ms) );
			return true;
		},
		/**
		 *
		 * reboot() : ASYNC. Performs a Board reboot. Memory will be wiped, and
		 * code execution will start again from begining, but PINS and REGISTERS
		 * will not be reset.
		 *
		 * @return  {bool} 		true
		 *
		 */
		reboot : async function(){
			await Board.System.send('reboot');
			return true;
		},
		/**
		 * [description]
		 * @param  {[type]} rule [description]
		 * @return {[type]}      [description]
		 */
		allowReadOutputPins : async function( rule=true ){
			await Board.System.send( 'read_output_pins:'+ (rule ? '1' : '0') );
			return true;
		},
	},
	/**************************************************************************
	 *
	 *  WATCHERS
	 *  Provide an observer on the selected PIN, that launches tje execution
	 *  of a callback each time a change is detected on the PIN
	 *
	 **************************************************************************/
	Watchers : {
		/**
		 *
		 * list() : ASYNC. Returns an array of all the WATCHER OBJS considering
		 * active Watchers in the BOARD.
		 *
		 * @return {array} 						Array of _WATCHERS[x].public Obj
		 *
		 */
		list: async function(){
			console.log('app.Board..Watcher.list() : Requesting Watchers List');
			// requesting remote WATCHERS, will ensure only active watchers will
			// be returned in the listing, ignoring the removal pending ones.
			let w_Board = await Board.System.send('watcher_list');
			// convert response String to Array of watchers
			w_Board = w_Board.length === 0 ? [] : w_Board.split(':');
			// inject into a clean array the local watchers references
			let w = [];
			for(const i in w_Board){
				let key = w_Board[i].split(',');
				w.push(_WATCHERS[ parseInt(key[0]) ].public );
			}
			return w;
		},
		/**
		 * new() : ASYNC. Alias for Board.Pin({pin}).watch().Creates and returns
		 * a new Watcher on requested pin.
		 *
		 * @param  {int}   		pin      		Pin to watch
		 * @param  {function} 	callback   		onChange handler function
		 *
		 * @return {object}       				_WATCHERS[x].public
		 *
		 */
		new : async function(pin,callback = function(){} ){
			//
			return await Board.Pin(pin).watch(callback);
		},
		/**
		 *
		 * clear() : ASYNC. Will delete the provided Watcher , or ALL the
		 * available watchers if NO specified. Watcher is setted as 'discarted'
		 * meanwhile Board applies removal.
		 *
		 * @param  {object} 	watcher 		Accepts UID, and Watcher obj ref
		 *                            			If undefined remove ALL watchers
		 * @param  {bool} 		_only_localReference_ 	PRIV! DEL ONLY LOCAL REF
		 *
		 * @return {bool}
		 *
		 */
		clear: async function(watcher, _only_localReference_ = false){

			// IF WATCHER REFERENCE IS PROVIDED, REMOVE ONLY REQUESTED WATCHER.
			// Accepted types are : UID and Watcher Public object, detect
			// provided item, block if invalid or select watcher if found.
			let uid;
			switch(typeof watcher){
				case 'object':
					// if is an object look for _uid_ key, and use its value
					// as watcher identifier.
					if( watcher._type_ !== 'watcher' ) return app.warn('app.Board.Watchers.clear() : Provided Object is not a watcher reference. Returning.');
					if( watcher._status_ === 'deleted' ) return app.warn('app.Board.Watchers.clear() : Provided Watcher has already been removed. Returning.');
					else uid = watcher._uid_;
					break;
				case 'string' :
					// If is string, asume valid UID
					uid = watcher;
					break;
				case 'undefined' :{
					// if no WATCHER REFERENCE is provided DELETE ALL WATCHERS!
					app.log('app.Board.Watchers.clear() : Removing ALL Watchers');
					// set new Status (discarded) to ALL LOCAL WATCHERS
					for(let i=0; i<_WATCHERS.length;i++){
						if( typeof _WATCHERS[i] === 'object' ){
							_WATCHERS[i].status = 'discarted';
						}
					}
					const w = await Board.Watchers.list();
					const e = [];

					for(let i=0; i<w.length;i++){
						try{ await Board.Watchers.clear( w[i] ) }
						catch(err){ e.push(err) }
					}
					if(e.length) throw new app.error(e);
					return true;
				}
				default :
					// block any other input
					throw new app.error('app.Board.Watchers.clear() : Unexpected Argument (Allowed: String or Watcher reference).');
			}
			// search WATCHER in array holder of watchers, BLOCK if not found
			let w = _WATCHERS.find(o => typeof o === 'object' && o.uid === uid);
			if(typeof w === 'undefined') return app.warn('app.Board.Watchers.clear() : Provided watcher does not exist. Returning.');

			app.log('app.Board.Watchers.clear() : Removing Watcher ('+w.id+') attached to pin '+w.pin+'...');

			// get Watcher ID (array index) and request Board removal
			let id = w.id;
			// flag it as pendent removal
			_WATCHERS[id].status = 'discarted';


			// if _only_localReference_ (system request), dont notify Board
			if(_only_localReference_ !== '_system_'){
				let resp = await Board.System.send('watcher_clear:' + id);
				if(resp !== '__TRUE__') throw new app.error('app.Board.Watchers.clear() : Error happened on watcher removal. (ErrCode:'+resp+')');
			}

			// Update PUBLIC WATCHER object
			delete w.public._uid_;
			delete w.public._pin_;
			delete w.public.clear;
			// set new Status (deleted)
			delete w.public._status_;
			Object.defineProperty(w.public, '_status_', { get: function() {
				return 'deleted';
			} , enumerable: true  });
			// DELETE INTERNAL WATCHER object
			for ( let prop in _WATCHERS[id] ) delete _WATCHERS[id][prop];
			_WATCHERS[id] = null;
			delete _WATCHERS[id];

			// done!
			return true;
		}
	},
	/**************************************************************************
	 *
	 *  PIN
	 *  Constructor for all the PIN related methods. Will return an object with
	 *  all the available methods for the selected PIN.
	 *
	 **************************************************************************/
	Pin : function(pin){
		// if Watcher ID is Not a Number, or is less than 0 (err), or bigger
		// than 254 ( 0xFF (255) is a internal reserved value) , or is not an
		// Integer, assume error. and block!
		if( parseInt(pin) !== parseFloat(pin) ||
			parseInt(pin) < 0 || parseInt(pin)>254 ){
			app.error('app.Board.Pin() : Parameter "pin" must be an Integer (betwen 0-254)');
			return false;
		}
		pin = parseInt(pin);

		return {
			//-----------------------------------------------------------PINMODE
			/**
	 		 * [description]
	 		 * @param  {[type]} mode [description]
	 		 * @return {[type]}      [description]
	 		 */
			setMode: async function(mode){
				let r = await Board.System.send('set_pin_mode:'+ pin +':'+mode);
				if(parseInt(r) < 0 ){
					throw new app.error( 'ERROR : '+ parseInt(r) );
				}
				return r;
			},
			/**
			 * [description]
			 * @return {[type]} [description]
			 */
			getMode: async function(){
				let r=  await Board.System.send('get_pin_mode:'+ pin );
				if(parseInt(r) < 0 ){
					throw new app.error( 'ERROR : '+ parseInt(r) );
				}
				return r;
			},
			/**
			 * [description]
			 * @param  {[type]} mode [description]
			 * @return {[type]}      [description]
			 */
			mode : async function(mode){

				return (typeof mode !== 'undefined') ? await this.setMode(mode) : await this.getMode();
			},
			//---------------------------------------------------------------I/O
			readOutput : async function(){
				let r =  await Board.System.send('pin_read_output:'+ pin);
				if(parseInt(r) < 0 ){
					throw new app.error( 'ERROR : '+ parseInt(r) );
				}
				return r;
			},
			/**
			 * [description]
			 * @return {[type]} [description]
			 */
			read: async function(){
				let r =  await Board.System.send('pin_read:'+ pin);
				if(parseInt(r) < 0 ){
					throw new app.error( 'ERROR : '+ parseInt(r) );
				}
				return r;
			},
			/**
			 * [description]
			 * @param  {[type]} value [description]
			 * @return {[type]}       [description]
			 */
			write: async function(value){
				let r =  await Board.System.send('pin_write:'+ pin +':'+value);
				if(parseInt(r) < 0 ){
					throw new app.error( 'Board.Pin('+pin+').write('+value+') : ERROR RETURNED: '+ parseInt(r) );
				}
				return r;
			},
			/**
			 * [description]
			 * @param  {[type]} value [description]
			 * @return {[type]}       [description]
			 */
			value : async function(value){
				var r;
				try{
					if(typeof value !== 'undefined') r =await this.write(value);
					else r = await this.read();
				}catch(err){ throw new app.error(err) }
				return r;
			},
			//----------------------------------------------------------WATCHERS
			/**
			 *
			 * [description]
			 * @param  {[type]} onChange [description]
			 * @return {[type]}          [description]
			 *
			 */
			watch : async function( onChange = function(){}  ){
				let data = await Board.System.send('watcher_new:'+pin);

				let data_parts = data.split(':');
				let id = data_parts.shift();
				// if Watcher ID is not a Number, or is less than 0 (err),
				// or is not an Integer, assume error. and block!
				if( isNaN(id) || parseInt(id)<0 || parseInt(id) !== parseFloat(id) ){
					let err;
					switch(id){
						case '-1':
							err = 'app.Board.Pin('+pin+').watch() : Invalid pin number:' + pin + '. Canceled. (errCode:-1)';
							break;
						case '-2':
							err = 'app.Board.Pin('+pin+').watch() : Cannot Watch Pins in OUTPUT Mode (pin:'+ pin +'). Canceled. (errCode:-2)';
							break;
						case '-3':
							err = 'app.Board.Pin('+pin+').watch() : Reached Maximum ammount of Watchers. Canceled. (errCode:-3)';
							break;
						default:
							err = 'app.Board.Pin('+pin+').watch() : Unexpected Board response. Cancelled. (Response: '+ id +')';
					}
					throw new app.error(err);
				}
				// get  current value of the PIN
				let pin_value = data_parts.shift();
				id = parseInt(id);

				// prepare new watcher object
				_WATCHERS[id] = (function(){
					var w = {
						uid :  app.UID(),
						id : id,
						status : 'active',
						pin : pin,
						onChange : onChange,
						public:  {
							get _type_(){ return 'watcher'},
							get _pin_(){ return w.pin},
							get _status_(){ return w.status},
							get _uid_(){ return w.uid },
							clear : function(){ Board.Watchers.clear(w.uid) }
						}
					};
					return w;
				})();

				// done!
				app.log('app.Board.Pin('+pin+').watch() : New Watcher created on pin '+_WATCHERS[id].pin+' ('+ _WATCHERS[id].uid+')');
				// execute user callback with current value
				// but apply a timer to garantee THIS PROMISE RESOLUTION
				// EXECUTES FIRST!
				setTimeout( () =>_WATCHERS[id].onChange(pin_value) , 500);
				return _WATCHERS[id].public;
			},
			/**
			 *
			 * [description]
			 * @return {[type]} [description]
			 *
			 */
			clearWatchers: async function(){
				// get the list of watchers assined to pin
				let w = await this.watchers();
				let e = [];

				// request each watcher removal
				for(let i =0; i<w.length;i++){
					try{ await Board.Watchers.clear( w[i]) }
					catch(err){ e.push(err) }
				}
				if(e.length) throw new app.error(e);

				// done!
				app.log('app.Board.Pin('+pin+').clearWatchers() : All Watchers assigned to PIN='+pin+' have been removed');
				return true;
			},
			/**
			 *
			 * [description]
			 * @return {[type]} [description]
			 *
			 */
			watchers: async function(){
				let w = await Board.Watchers.list();
				let _filtered = [];
				for(let id=0; id<w.length;id++){
					if( w[id]._pin_ === pin) _filtered.push( w );
				}
				app.log('app.Board.Pin('+pin+').watchers() : Found '+_filtered.length+' attached watchers to PIN='+pin);
				return w;
			}
		};
	},
	/**************************************************************************
	 *
	 *  MAIN METHODS
	 *
	 *
	 **************************************************************************/
	/**
	 * [connect description]
	 * @return {[type]} [description]
	 */
	connect  : function(){
		return  new Promise( (resolve,reject)=> {
			// If no _SerialPort object, create it...
			if(_SerialPort === null){
				app.log('app.Board.connect() : Initiating Serial Port ' + app.config.serial_port + ' at baudRate:' + app.config.serial_port_baud_rate );
				_SerialPort = new serialPort(app.config.serial_port, {
					autoOpen 	: false,
					lock 		: true,
					dataBits 	: 8,
					baudRate 	: app.config.serial_port_baud_rate,
					parser 		: serialPort.parsers.readline( String.fromCharCode(app.config.serial_port_parser) )
				});
				// Declare event HANDLERS
				_SerialPort.on('open', Board.System.Events.onConnect );
				_SerialPort.on('close', Board.System.Events.onDisconnect );
				_SerialPort.on('data', Board.System.Events.onData );
				_SerialPort.on('error', Board.System.Events.onError );
			}
			// Block if already opened
			if(_isConnected){
				app.log('app.Board.connect() : Board Serial Port already Open.');
				return resolve(false);
			}
			// open port
			_isBusy = true;
			app.log('app.Board.connect() : Opening Board Serial Port...');
			_SerialPort.open( (err)=>{
				// reject on error and resolve if OK, but provide some delay
				// time, before resolve Promise...
				if(err instanceof Error) return reject(err);
				else setTimeout( () => resolve(true) , app.config.serial_port_open_delay );
			});
		});
	},
	/**
	 *
	 * [disconnect description]
	 * @return {[type]} [description]
	 *
	 */
	disconnect : function(){
		return new Promise( (resolve,reject)=>{
			// Block if already opened
			if(!_isConnected){
				app.log('app.Board.connect() : Board Serial Port already Closed.');
				return resolve(false);
			}
			app.log('app.Board.disconnect() : Closing Board communication port...');
			// Reject on error and resolve if ok
			_SerialPort.close( (err)=>{
				if(err instanceof Error) return reject(err);
				else return resolve(true);
			});
		});
	},
	/**************************************************************************
	 *
	 *  USER PROVIDED EVENT HANDLERS & HOOKS
	 *  Will be executed on Board Events
	 *
	 **************************************************************************/
	// onConnect: function(){},
	// onDisconnect: function(){},
	// onError: function(){},
	// onData: function(){},
};

module.exports = Board;
