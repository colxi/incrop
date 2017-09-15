/* global System , rivets , sightglass */

let pg = (function(){
	// private Array to store all the callbacks that must be executed once the
	// pg-client ended initiation ( pg.readyState = 'complete' ).
	let PG_ON_READY_CALLBACKS = [];

	// Return the PG client Object
	return {
		readyState : 'loading',
		/**
		 *
		 * pg.config{} : 	Stores PG configuration. Base config comes from
		 * 					pg-config-default.json , and user config comes from
		 * 					pg.config.json.
		 *
		 */
		config : null,
		/**
		 *
		 * pg.models[model][method]() 	(async) Virtual object that handles calls
		 * 								to model methods executed in server side.
		 * 								The implementation is based in JS proxyes,
		 * 								and AJAX requests.
		 *
		 * @return 						Model Method response
		 *
		 */
		models : (function(){
			// Deep Proxy constructor pattern
			var modelPathProxy = function( target , handler){
				target  = target || {};
				handler = handler || {
					// GET TRAP, registers the name of the requested node, and
					// returns a new Proxy, to allow deep acces to the remote
					// model object
					get: (target,name) => {
						return modelPathProxy( _name => {
							_name.push(name);
							return (typeof target ==='function') ? target(_name) : _name.reverse();
						});
					},
					// APPLY TRAP, recovers the full path to the requested method,
					// returns a Promise, and requests via Ajax the execution of
					// the selected model method, with the provided arguments.
					// On server response, resolves the Promise.
					apply: async function(target,receiver,args){
						// prepare the request parts
						let path = target([]);
						let model = path.shift();
						let method = path.join('.');
						// prepare ajax request
						let url = 	pg.config.server_protocol + '://' +
									pg.config.server_address +  ':' +
									pg.config.server_port  +
									pg.config.baseurl_models + model + '.js'+
									'?' + pg.config.models_method_query + '=' + method;
						let params = pg.config.models_args_query + '=' + JSON.stringify(args);

						// launch aajax request, and catch possible errors on
						// server response
						var resp;
						try{
							console.log('>> ' + model + '.' + method + '('  , ...args , ')');
							resp = await pg.request({
								silent 			: true,
								method 			: 'POST',
								url 			: url,
								data 			: params,
								withCredentials : false,
								async 			: true,
								headers 		: {
									'Content-type' 	: 'text/plain; charset=UTF-8',
									'Accept' 		: '*/*'
								}
							});
							// parse response
							resp = JSON.parse( resp );
							console.log('<< ' , resp );
							// if response is a handled error, throw error
							if(typeof resp === 'object' && resp.type === 'PG_ERROR'){
								throw new Error(resp.err); // jump to catch{}
							}
						}catch(err){
							// error detected in response, throw error, and
							// stop execution
							console.warn('REMOTE MODEL ERROR: ' + url);
							throw new Error(err);
						}
						// done! return response!
						return resp;
					}
				};
				return new Proxy(target, handler);
			};
			//
			// Generate and return the proxy
			return new modelPathProxy();
		})(),
		/**
		 * pg.initialize() : 	(async) Initializes PG client. Loads engine config,
		 * 						includes the complementary resources, and inits the
		 * 						binding  (when required).
		 *
		 * @return 		{boolean}  		Returns false on fail.
		 *
		 */
		init : (()=>{
			// private  FLAG to track the initiation status
			let PG_INITIATED = false;

			return async function(){
				// allow only a single initiation, blocking any attempt to reinitiate
				// the client.
				if(PG_INITIATED) return false;

				// Set  the engine loading State to interactive
				pg.log('pg.initialize() : Initializing (pg.readyState="interactive")');
				pg.readyState = 'interactive';

				// Load ES6 polyfill to maximize browser compatibillity
				await pg.include('/pg-wrapper/pg-includes/babel-polyfill.min.js', 'Babel Polyfill...');

				// Load PG config files.
				// Note: pg-client CONFIG FILES are SHARED with pg-server.js, and are
				// esentially the following two files:
				// - /pg-wrapper/pg-config-default.js  (provides base default config )
				// - /pg-config.json ( user customized configuration )
				// Try to load pg default configuration, and break execution if fails
				// in the attemps.
				try{ pg.config = await pg.JSON.load('/pg-wrapper/pg-config-default.json') }
				catch(err){
					console.warn('pg.init() : FAILED to load pg-config-default file. Aborted!');
					return false;
				}
				// Try to load user custom configuration. If fails use default config
				// and throw a WARNING in the console.
				let config = {};
				try{ config = await pg.JSON.load('/pg-config.json') }
				catch(err){ console.warn('pg.init() : FAILED to load pg-config file. Using default config...') }
				Object.assign(pg.config, config);
				pg.log( 'pg.init() : Configuration Object (pg.config)' , pg.config );

				// System js (import modules from the future)
				await pg.include('/pg-wrapper/pg-includes/system.js', 'SystemJS...');
				/* Sightglass ... data binding */
				await pg.include('/pg-wrapper/pg-includes/rivets/rivets-sightglass.js', 'Sightglass...');
				/* Rivers data binding....*/
				await pg.include('/pg-wrapper/pg-includes/rivets/rivets.js', 'Rivets...');
				/* rivets expansion */
				await pg.include('/pg-wrapper/pg-includes/rivets/rivets-stdlib.js', 'Rivets Formaters Lib...') ;
				/* rivets Adapters and views importer */
				await pg.include('/pg-wrapper/pg-includes/rivets/rivets-import.js', 'Rivets Adapters Importer Lib...');
				/* modules configurations  */
				pg.log('pg.initialize() : Configure Rivets & Rivets Adapters Importer...');
				System.config({ baseURL: '/' });
				// configure RIVETS
				rivets.configure({
					prefix: 'pg', 					// Attribute prefix in templates
					preloadData: true,				// Preload templates with initial data on bind
					rootInterface: '.',				// Root sightglass interface for keypaths
					templateDelimiters: ['{', '}'],	// Template delimiters for text bindings
					// Augment the event handler of the on-* binder
					handler: function(target, ev, binding) { return this.call(target, event, binding.view.models, binding) }
				});
				rivets.configure_importer({
					onLoadController : pg.load._onRivetsLoadAdapter,
					baseUrl : pg.config.baseUrl_adapters,
					baseUrl_Views : pg.config.baseUrl_views,
					constructor : pg.config.adapters_constructor
				});
				pg.log('pg.initialize() : Integrate Binder in Pomegranade...');
				sightglass.adapters = rivets.adapters;
				sightglass.root 	= rivets.rootInterface;
				/* Load DEFAULT styles */
				if(pg.config.client_load_pg_styles){
					pg.log('pg.initialize() : Loading Pomegranade defaults CSS...');
					pg.load.css('../../pg-wrapper/pg-styles/pg-styles.css');
				}
				if(pg.config.client_load_fontawesome){
					pg.log('pg.initialize() : Loading Font Awesome CSS...');
					pg.load.css('../../pg-wrapper/pg-styles/font-awesome/font-awesome.css');
				}
				/* Ready ! Load main module */
				pg.log('pg.initialize() : Done! Pomegranade Ready! (pg.readyState="complete")');
				pg.log('----------------------------------------------------------------------');
				pg.readyState = 'complete';
				if(pg.config.client_autobind_document) pg.bind( document.querySelector('html'), {} );
				else pg.log( 'pg.initialize(): Autobinding on startup is disabled. You have to Bind your document manually via pg.bind(element,{} ) (pg.config.bindDocumentonStartup=FALSE)' );
				PG_INITIATED = true;
				while( PG_ON_READY_CALLBACKS.length){
					await ( PG_ON_READY_CALLBACKS.shift() )();
				}
				return true;
			};
		})(),
		/**
		 * pg.ready() : (async) Queues Callback functions to be executed when pg
		 * 				client is completelly loaded (pg.readyState='complete').
		 *     			If pg is already loaded,and the Ready-callbacks queue is
		 *        		empty, execute the provided callback. If the queue is
		 *        		not empty push it to the end (asume callback ongoing
		 *        		callback queue processing)
		 *
		 * @param  {Function} 	callback 	Function to be executed once the
		 *                               	client is ready (accepts async)
		 *
		 * @return {boolean}    	        Returns true if ok. False if invalid
		 *                                  callback provided.
		 *
		 */
		ready: async function(callback){
			// block if callback is not a function
			if(typeof callback !== 'function') return false;
			// add to queue if pg client not loaded, or callbacks in queue
			if(pg.readyState !== 'complete' || PG_ON_READY_CALLBACKS.length >0){
				PG_ON_READY_CALLBACKS.push(callback);
			}
			// else execute callback
			else await callback();
			// done!
			return true;
		},
		/**
		 * pg.request() 	(async) Executes an AJAX request using the provided
		 * 					configuration parameters object and returns the
		 * 					request response.
		 *
		 * @param  {Object} 	user_conf 		Configuration Object
		 *
		 * @return {Promise}
		 *
		 */
		request : function( user_conf = {} ){
			return new Promise( (resolve,reject)=>{
				// default configuration object, will be used as base to fill
				// those properties not provided in custom configuration in
				// each request
				var default_conf =  {
					silent 			: false,
					method 			: 'GET',
					url 			: '',
					data 			: null,
					withCredentials : false,
					async 			: true,
					timeout 		: 20 * 1000,
					headers 		: {
						'Content-type' 	: 'text/plain; charset=UTF-8',
						'Accept' 		: '*/*'
					}
				};
				// if a only a string provided asume is the URL
				if(typeof user_conf === 'string') user_conf = {url : user_conf};
				// mix default config with provided config
				var config;
				config = Object.assign(default_conf, user_conf);
				config.headers = Object.assign( default_conf.headers , ( user_conf.headers || {} ) );
				// sanitize input
				config.method = config.method.toUpperCase().trim();
				config.url = config.url.trim();

				// if config.data is an object, ,serialize the data
				if( typeof config.data === 'object' && config.data !== null  ){
					let serializedData = '';
					for (var key in config.data) {
						// if there are previous keys attached  insert the divider
						if (serializedData != '') serializedData += '&';
						// if key data is an object, convert to JSON encoding, if not
						// an object, force String representation of the i¡item.
						let keyData ;
						if( typeof config.data[key] === 'object' && config.data[key] !== null)  keyData = JSON.stringify( config.data[key] );
						else keyData = config.data[key].toString();
						// add the key and value to the querystring
						serializedData += key + '=' + encodeURIComponent( keyData );
					}
					// set the serialized data into the request object
					config.data = serializedData;
				}

				// if request method is GET and data has been provided in the request
				// attach config.data to the URL
				if( config.method === 'GET' && config.data !== null ){
					// if has no  query identifier (?) , add it at end of url
					if( config.url.indexOf('?') === -1 ) config.url += '?';
					else{
						// query identifier (?) located in URL, if last char of
						// url is not query keys divider (&) , inject it, to be
						// to attach the GET request serialized data
						if( config.url.slice(-1) !== '&' && config.url.slice(-1) !== '?' ) config.url += '&';
					}
					// attach request serialized data to URL
					config.url += config.data;
					// set config.data to NULL, to prevent being
					config.data = null;
				}

				// create new request object
				let http = new XMLHttpRequest();
				http.open(config.method, config.url, config.async);
				http.withCredentials = config.withCredentials;
				// Set the requested headers
				for( key in config.headers) http.setRequestHeader( key, config.headers[key] );

				// HANDLE SERVER CODE ERRORS
				http.onerror = function() {
					if( !config.silent ) console.warn('pg.request() : FAILURE in request.');
					return reject( [http.status, http.statusText, http.responseText] );
				};
				// handle responses
				http.onreadystatechange = function(){
					if(http.readyState == 4){
						// RESPONSE RECEIVED. DONE!
						if(http.status == 200){
							if( !config.silent ) console.log('pg.request() Response received : ', http.responseText );
							return resolve( http.responseText );
						}else return http.onerror();
					}
				};
				if( !config.silent ) console.log('pg.request() : Sending ' + config.method + ' request :' + config.url );
				http.send(config.data);
			});
		},
		/**
		 * pg.require() : 	(async) Loads a ES6 Module using System.import(),
		 * 					located in  the path produced by the union of :
		 * 					pg.config.baseUrl_modules + filename
		 *
		 * @param  {string} 	module 			Filename or filepath of the
		 *                             			requested module.
		 *
		 * @return {export}     				ES6 module exported data
		 *
		 */
		require : async function(module){
			// attach pg.config.baseUrl_modules to filename
			module = pg.config.baseUrl_modules + module;
			// if module name has no extension, add it.
			if( pg.Path.fileExtension(module) === '' ) module = module + '.js';
			module = pg.Path.normalize(module);
			let exported = await System.import( module );
			return exported;
		},
		/**
		 * [load description]
		 * @type {Object}
		 */
		load :{
			path_toObject( p='' , obj={} , canWrite = true){
				// generate array from path and remove empty keys (caused by double // or ending /)
				let arrayPath = p.split('/').filter( n=> (n === undefined || n === '') ? false : true );
				// extract las item (module name reference)
				let key = arrayPath.pop();
				// resolve module object instance path
				let namespace = arrayPath.reduce( (o,i)=>{
					if(o===false || ( o[i] === undefined && !canWrite ) ) return false;
					if( o[i] === undefined) o[i] = {};
					return  o[i];
				}, obj );
				namespace[key] = (typeof namespace[key] === 'object') ? namespace[key] : (canWrite ? {} : namespace[key]);

				return{
					path 		: p,
					root 		: obj,
					key 		: key,
					namespace 	: namespace,
					object 		: namespace[key]
				};
			},
			_loaded : {
				module : {},
				adapter : {}
			},
			_onRivetsLoadAdapter(adapterName){
				pg.adapters[adapterName] = rivets.imports[adapterName];
				if(!pg.load._loaded['adapter'].hasOwnProperty(adapterName)) pg.load._loaded['adapter'][adapterName] = 1;
				else pg.load._loaded['adapter'][adapterName]++;
			},
			_load : function(itemType = '', itemsList = [], containerObj = {}, returnArray = false ){
				pg.log('pg.load.'+itemType+'() : *** PREPARING TO LOAD ' + itemsList.length + ' '+itemType+'(s)...');
				// return promise
				return new Promise(function(resolve_callback){
					let results = [];
					// store loaded item object
					let _constructed = function(item,_resolve){
						delete item.__constructor; // ensure one time execution
						return _resolve( item );
					};
					// loader function
					let _loader = function(itemName = ''){
						pg.log('pg.load.'+itemType+'() : Loading '+ itemType +' : ' + itemName);
						return new Promise(function(_resolve){
							//
							//
							// IMPORT ITEM
							if(!pg.load._loaded[itemType].hasOwnProperty(itemName)) pg.load._loaded[itemType][itemName] = 1;
							else{
								pg.log('pg.load.'+itemType+'() : The '+ itemType +' ' + itemName + ' is already loaded. Using active Instance');
								pg.load._loaded[itemType][itemName]++;
								return _resolve( pg.load.path_toObject(itemName, containerObj, false) );
							}
							let filepath =  '';
							switch(itemType){
								case 'module' :
									filepath = pg.config.baseUrl_modules +  itemName +'.js';
									break;
								case 'adapter' :
									filepath = pg.config.baseUrl_adapters + itemName +'.js';
									break;
							}
							System.import( filepath ).then( item => {
								//
								//
								// GENERATE ITEM INSTANCE
								// resolve item path into container object, creating tree if required
								if(itemType==='adapter') rivets.imports[itemName] = item.default;
								let objPath = pg.load.path_toObject(itemName, containerObj);
								// if item is a function assign to resolution path, if is an object, mix with existent object
								if(typeof item.default === 'function') objPath.namespace[objPath.key] = item.default;
								else objPath.object = Object.assign( objPath.object , item.default );
								//
								//
								// EXECUTE CONSTRUCTOR
								// check if has custom constructor/igniter
								if( objPath.object.hasOwnProperty(pg.config.adapters_constructor) &&
								typeof objPath.object[pg.config.adapters_constructor] === 'function' ){
									pg.log('pg.load.'+itemType+'() : Executing '+itemName+' constructor.' );
									// execute ADAPTER custom constructor
									let _c = objPath.object[pg.config.adapters_constructor].call( objPath.object );
									// resolve pg.loadAdapter (handle promise in ADAPTER  __constructor)
									if( typeof _c === 'object' && typeof _c.then === 'function'){
										pg.log('pg.load.'+itemType+'() : Detected Promise in '+itemName+' Constructor. Waiting resolution...' );
										return _c.then( () => _constructed(objPath.object,_resolve) );
									}else{
										return _constructed(objPath.object,_resolve);
									}
								}else return _constructed(objPath.object,_resolve);
							});
						});
					};
					// promise sequential iterator
					function _next(){
						_loader( itemsList.shift() ).then( r =>{
							results.push(r);
							if(itemsList.length === 0) resolve_callback( returnArray ? results : results[0] );
							else _next();
						});
					}
					// start iteration
					_next();
				});
			},
			adapter(items= ''){
				alert('load adapter called');
				// if more than one adapter has been requested, or single item has been requested inside array, return array
				let returnArray = ( arguments.length > 1 || Array.isArray(items) ) ? true : false;
				// force items to be an array
				items = Array.isArray(items) ? items : Array.prototype.slice.call(arguments) ;
				// start load
				return pg.load._load( 'adapter', items , pg.adapters , returnArray );
			},
			/*
			module : async function(items = ''){
				// if more than one module has been requested, or single item has been requested inside array, return array
				let returnArray = ( arguments.length > 1 || Array.isArray(items) ) ? true : false;
				// force items to be an array
				items = Array.isArray(items) ? items : Array.prototype.slice.call(arguments) ;
				// start load
				let modules = [];
				for(let i=0; i<items.length;i++){
					modules[i] = await pg.require( items[i] );
				}
				return returnArray ?  modules : modules[0];
			},
			*/
			css : async function(filename){
				let head = document.getElementsByTagName('head')[0];
				let style = document.createElement('link');
				style.type = 'text/css';
				style.rel = 'stylesheet';
				style.href = '/pg-wonders/styles/'+filename;
				head.appendChild(style);
				return true;
			}
		},

		loader :function(el = document.body){
			return {
				show : function(text = ''){ el.setAttribute('pg-loading',text) },
				hide : function(){ el.removeAttribute('pg-loading') },
				text : function(text = ''){ el.setAttribute('pg-loading',text) },
				has : function(){ return el.hasAttribute('pg-loading') },
			};
		},

		JSON : {
			load : async function(filename){
				// strip comments from JSON string
				var _stripComments = function(str){
					const singleComment = 1;
					const multiComment = 2;

					const strip = () => '';

					let insideString = false;
					let insideComment = false;
					let offset = 0;
					let ret = '';

					for (let i = 0; i < str.length; i++) {
						const currentChar = str[i];
						const nextChar = str[i + 1];

						if (!insideComment && currentChar === '"') {
							const escaped = str[i - 1] === '\\' && str[i - 2] !== '\\';
							if (!escaped) {
								insideString = !insideString;
							}
						}

						if (insideString) {
							continue;
						}

						if (!insideComment && currentChar + nextChar === '//') {
							ret += str.slice(offset, i);
							offset = i;
							insideComment = singleComment;
							i++;
						} else if (insideComment === singleComment && currentChar + nextChar === '\r\n') {
							i++;
							insideComment = false;
							ret += strip(str, offset, i);
							offset = i;
							continue;
						} else if (insideComment === singleComment && currentChar === '\n') {
							insideComment = false;
							ret += strip(str, offset, i);
							offset = i;
						} else if (!insideComment && currentChar + nextChar === '/*') {
							ret += str.slice(offset, i);
							offset = i;
							insideComment = multiComment;
							i++;
							continue;
						} else if (insideComment === multiComment && currentChar + nextChar === '*/') {
							i++;
							insideComment = false;
							ret += strip(str, offset, i + 1);
							offset = i + 1;
							continue;
						}
					}

					return ret + (insideComment ? strip(str.substr(offset)) : str.substr(offset));
				};

				let resp;
				try{
					resp = await pg.request({
						method 			: 'GET',
						url 			: filename,
						silent 			: true,
						withCredentials : false,
						async 			: true,
						headers 		: {
							'Content-type' 	: 'text/plain; charset=UTF-8',
							'Accept' 		: '*/*'
						}
					});
				}catch(err){
					console.warn('pg.load.json() : FAILED loading JSON : (' + filename + '). ' , err );
					throw new Error(err);
				}
				resp = _stripComments( resp );
				resp = pg.JSON.parse( resp );

				return resp;
			},
			parse : function(str){
				// if already object, return object
				if(typeof str  === 'object') return str;
				let result;
				try{
					result = JSON.parse(str);
				}catch(err){
					console.warn('pg.JSON.parse() : Error found in String Encoding. Imposible to Parse. Returning empty object');
					result = {};
				}
				return result;
			},
			stringify : function(obj){
				let result =JSON.stringify(obj);
				return result;
			},
			validate : function(str){
				try{ JSON.parse(str) }
				catch(err){ return false }
				return true;
			}
		},

		/**
		 * [loadView description]
		 * @param  {[type]} viewId [description]
		 * @return {[type]}        [description]
		 */
		/*
		loadView : function(viewId){
			alert('pg.loadView() : just for testing');
			let path = 'views/pages/' + viewId + '.html';
			return new Promise(function(_resolve){
				let done = false;
				let _html = new XMLHttpRequest();
				_html.overrideMimeType('text/html');
				_html.open('GET', path , true);
				_html.onload = _html.onreadystatechange = function () {
					if ( !done && (!this.readyState || this.readyState === 4) ) {
						done = true;
						// free memory, explicit  listener removal;
						_resolve(_html.responseText);
						_html.onload = _html.onreadystatechange = null;
					}
				};
				_html.onerror = function(){ _resolve(false); };
				_html.send(null);
			});
		},
		*/
		/**
		 * [adapter description]
		 * @type {Object}
		 */
		views : {},
		adapters : {},
		/**
		 * [description]
		 * @param  {[type]} )
		 * @return {[type]}   [description]
		 */


		watch : function(el, key, callback, options){
			return sightglass(el, key, callback, options);
		},
		bindings : {},
		bind : function(el, data){
			var view = rivets.bind(el,data);
			var id = pg.guid();
			Object.defineProperty(view, '__pg_id__', {  value: id, enumerable: false, writable:false,  configurable: false });
			pg.bindings[id] = view;
			return id;
		},
		unbind: function(id){
			if( pg.bindings.hasOwnProperty(id) ){
				pg.bindings[id].unbind();
				delete pg.bindings[id];
				return true;
			}else{
				console.warn('pg.unbind() : Provided binding ID does not match to any previous registered binding.');
				return false;
			}
		},
		unbindAll: function(){
			pg.log('pg.unbindAll(): Unbinding all bindings ( pg.bind and rv:adapter:import)...');
			// automatic bindings in adapter imports....
			for(var adapter in rivets.imports){
				if(!rivets.imports.hasOwnProperty(adapter) ) continue;
				console.log(adapter);
				for(var view in rivets.imports[adapter].__views__){
					if(!rivets.imports[adapter].__views__.hasOwnProperty(view) ) continue;
					rivets.imports[adapter].__views__[view].unbind();
					delete rivets.imports[adapter].__views__[view];
				}
			}
			// manual bindings in in pomegradade...
			for(var binding in pg.bindings){
				if(!pg.bindings.hasOwnProperty(binding) ) continue;
				console.log(binding);
				pg.unbind(binding);
			}
			return true;
		},
		Path : {
			join : function(...paths){
				let path  = '';
				// join all strings forcing a slash / betwen them
				for(let i =0;i<paths.length;i++) path += ( paths[i] + '/' );
				// split by characters , to array
				path = path.split('');
				// remove slash in the last char of the string (forced slash /)
				path.pop();
				// convert to a string again
				path = path.join('');
				// normalize the resulting path
				path = pg.Path.normalize(path);
				return path;
			},
			fileExists : async function(filepath){
				var exists = true;
				try{
					await pg.request({
						method 			: 'HEAD',
						url 			: filepath,
					});
				}catch(err){ exists = false }

				return exists;
			},
			fileExtension : function(filename){
				// normalize the filepath
				filename = pg.Path.normalize(filename);
				// split by directories
				filename = filename.split('/');
				// get last item
				filename = filename.pop();
				// if is a directory (empty key) return false
				if( filename === '' ) return false;
				// return extension
				// works on files without extension or starting with '.'
				return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
			},
			normalize : function(path){
				// trim the string
				path = path.trim();
				// remove null characters from the path
				path = path.replace(/\0/g, '');
				// removes double slasehs in paths
				path = path.replace(/\/\/+/g, '/');
				let parts = path.split('/');
				// iterate path aprts
				for(let i=0;i<parts.length;i++){
					// if PREVIOUS_DIR token in pos>0
					if( parts[i] === '..' && i > 0 ) {
						// if previous part is PREVIOUS_DIR, assume can't be
						// resolved (as it couldnt previous), and mantain it
						if(parts[i-1] === '..') continue;
						// if pos=1, and ABS_PATH, remove useless PREVIOUS_DIR
						// token. (can't go backwards from root dir)
						if(i === 1 && parts[0] === '' ){
							parts.splice(1, 1);
							i--;
							continue;
						}
						// else remove current PREVIOUS_DIR token, and path
						// previous element.
						parts.splice(i-1, 2);
						i=i-2;
					}
				}
				// if path parts has a single element and is empty, asume '/'
				if(parts.length === 1 && parts[0] === '') parts[0] = '/';
				// done!
				return parts.join('/');
			}
		},
		/**
		 * [require description]
		 * @param  {[type]} url [description]
		 * @return {[type]}     [description]
		 */
		include: function(src, description = '') {
			return new Promise(function(_resolve, _reject){
				pg.log('pg.include() :'+ description + ' ' + src);
				let filename = src.substring(src.lastIndexOf('/')+1);
				// if no extension, assume .JS and extract again the filenamename
				if(filename.lastIndexOf('.js') === -1){
					src = src + '.js';
					filename = src.substring(src.lastIndexOf('/')+1);
				}
				// Adding the script tag to the head
				let done = false;
				let head = document.getElementsByTagName('head')[0];
				let script = document.createElement('script');
				script.type = 'text/javascript';
				script.src = src;
				//pg.log(script.src);
				script.onload = script.onreadystatechange = function() {
					// attach to both events for cross browser finish detection:
					if ( !done && (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete') ) {
						// done! execute PROMISE _resolve
						done = true;
						// cleans up a little memory, removing listener;
						script.onload = script.onreadystatechange = null;
						_resolve();
					}
				};
				// Fire the loading
				head.appendChild(script);
			});
		},
		/**
		 * [feeds description]
		 * @type {Array}
		 */

		logStore : [],
		log : function(...args){
			pg.logStore.push(...args);
			console['log'](...args);
			return true;
		},
		/**
		 * [createGuid description]
		 * @return {[type]} [description]
		 */
		guid : function(){
			function S4() {  return (((1+Math.random())*0x10000)|0).toString(16).substring(1) }
			// then to call it, plus stitch in '4' in the third group
			return (S4() + S4() + '-' + S4() + '-4' + S4().substr(0,3) + '-' + S4() + '-' + S4() + S4() + S4()).toLowerCase();
		},
		/**
		 * [removeComments description]
		 * based on https://github.com/sindresorhus/strip-json-comments
		 * @param  {[type]} str [description]
		 * @return {[type]}     [description]
		 */


	};
})();


if(document.readyState === 'complete' || document.readyState === 'interactive') pg.init();
else document.addEventListener('DOMContentLoaded', pg.init );
