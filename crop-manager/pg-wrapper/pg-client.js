/* global System , rivets , sightglass */

let pg = (function(){
	// private Array to store all the callbacks that must be executed once the
	// pg-client ended initiation ( pg.readyState = 'complete' ).
	let PG_ON_READY_CALLBACKS 	= [];
	let PG_LOG_HISTORY 			= [];
	let PG_BINDINGS 			= {};
	let PG_SELECTOR_PLUGINS		= {};

	let _pg;

	/**
	 *
	 * pg() :  	Pomegranade main function, provides a fast DOM ELEMENT selector
	 *  		returning a COLLECTION of elements, wich can be expanded with
	 *  		pomegranade plugins when those are loaded.
	 *  		When the argument provided is a function, behaves as pg.ready
	 *  		scheduling the function to be executed when the engine is ready.
	 *
	 * @param  {String|element|function} 	elem  	If String selector or element
	 *                   						    are provided behaves as a
	 *                   						    DOM selector. If is a function
	 *                   						    behaves a a onready scheduler
	 *
	 * @return {Array}      						Pomegranade Colletion
	 *
	 */
	_pg =  function( elem = '' ) {
		let collection;
		//
		// onReady request
		//
		// if provided ELEM is a function, pass the function to the pg.ready()
		// method and return. The function will be executed when PG is ready.
		if(typeof elem === 'function') return pg.ready(elem);
		//
		// String Selector
		//
		else if(typeof elem === 'string') collection = document.querySelectorAll(elem);
		//
		// DOM element
		//
		else if(elem instanceof Element) collection = [elem];
		//
		// Uknwnon selector
		//
		else throw new Error('pg() : Unknown input provided.');

		// method to assign to the provided collection the plugins methods
		var extendCollectionMethods = function(c){
			for(let plugin in PG_SELECTOR_PLUGINS){
				c[plugin] = function( ...args ){
					let result = PG_SELECTOR_PLUGINS[plugin].bind(c);
					return extendCollectionMethods( result( ...args ) );
				};
			}
			return c;
		};
		// inject PLUGINS to collection
		return extendCollectionMethods(collection);
	};
	/**
	 *
	 * pg.config{} : 	Stores PG configuration. Base config comes from
	 * 					pg-config-default.json , and user config comes from
	 * 					pg.config.json.
	 *
	 */
	_pg.config = null;
	/**
	 * pg.initialize() : 	(async) Initializes PG client. Loads engine config,
	 * 						includes the complementary resources, and inits the
	 * 						binding  (when required).
	 *
	 * @return 		{boolean}  		Returns false on fail.
	 *
	 */
	_pg.init = (()=>{
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
				pg.warn('pg.init() : FAILED to load pg-config-default file. Aborted!');
				return false;
			}
			// Try to load user custom configuration. If fails use default config
			// and throw a WARNING in the console.
			let config = {};
			try{ config = await pg.JSON.load('/pg-config.json') }
			catch(err){ pg.warn('pg.init() : FAILED to load pg-config file. Using default config...') }
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
				onLoadController : function(){},
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
				pg.include('/pg-wrapper/pg-styles/pg-styles.css');
			}
			if(pg.config.client_load_fontawesome){
				pg.log('pg.initialize() : Loading Font Awesome CSS...');
				pg.include('/pg-wrapper/pg-styles/font-awesome/font-awesome.css');
			}
			/* Load PG plugins */
			if(pg.config.client_load_pg_plugins.length){
				pg.log('pg.initialize() : Loading pg-Plugins...');
				for( let i=0; i < pg.config.client_load_pg_plugins.length; i++ ){
					await pg.include( '/pg-wrapper/pg-plugins/' + pg.config.client_load_pg_plugins[i] );
				}
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
	})();
	/**
	 * pg.include() : 		(async) Inserts in the Head remote SCRIPT elems
	 * 						and LINK STYLES elems. Once the element source
	 * 						is loaded, this method returns TRUE when succed
	 * 						or throws and error when FAILS.
	 *
	 * @param  {string} 	src 	Path to the file to load
	 *
	 * @return {Promise}     		Resolves in true when succedd or throws
	 *                              an Error (causing rejection) when fails.
	 *
	 */
	_pg.include = async function( src ) {
		var ext = pg.Path.fileExtension( src );
		pg.log('pg.include() : ' , src);

		var head = document.getElementsByTagName('head')[0];
		var elem;

		switch(ext){
			case 'js' :
				// Adding the script elem to the head
				elem 		= document.createElement('script');
				elem.type 	= 'text/javascript';
				elem.src 	= src;
				break;
			case 'css':
				// Adding the link elem to the head
				elem = document.createElement('link');
				elem.type 	= 'text/css';
				elem.rel 	= 'stylesheet';
				elem.href 	= src;
				break;
			default :
				throw new Error('pg.include() : Unknown file extension : ' + ext);
		}

		let status = await new Promise( function( resolve ){
			// set listeners for onload and onerror events
			let done = false;
			elem.onload = elem.onreadystatechange = function() {
				if ( !done && (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete') ) {
					done = true;
					return resolve(true);
				}
			};
			elem.onerror = function(){ resolve(false) };
			// append item to header
			head.appendChild(elem);
		});

		//done!
		if( !status ) throw new Error('pg.include() : Failed to include : '+ src);
		else return status;
	};
	/**
	 * [JSON description]
	 * @type {Object}
	 */
	_pg.JSON = {
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
				pg.warn('pg.load.json() : FAILED loading JSON : (' + filename + '). ' , err );
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
				pg.warn('pg.JSON.parse() : Error found in String Encoding. Imposible to Parse. Returning empty object');
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
	};
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
	_pg.models = (function(){
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
						pg.log('>> ' + model + '.' + method + '('  , ...args , ')');
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
						pg.log('<< ' , resp );
						// if response is a handled error, throw error
						if(typeof resp === 'object' && resp.type === 'PG_ERROR'){
							throw new Error(resp.err); // jump to catch{}
						}
					}catch(err){
						// error detected in response, throw error, and
						// stop execution
						pg.warn('REMOTE MODEL ERROR: ' + url);
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
	})();
	/**
	 * [description]
	 * @param  {[type]} )
	 * @return {[type]}   [description]
	 */
	_pg.Path = {
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
		isAbsolute : function(filepath){
			filepath = pg.Path.normalize(filepath);
			return ( filepath.split('').shift() === '/')  ? true : false;
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
	};
	/**
	 *
	 * pg.readyState Holds the readyState loading status value
	 *
	 * @type {String}
	 *
	 */
	_pg.readyState = 'loading';
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
	_pg.ready = async function(callback){
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
	};
	/**
	 *
	 * pg.registerPlugin description]
	 * @param  {[type]} name       [description]
	 * @param  {[type]} pluginFnct [description]
	 * @param  {String} type       [description]
	 * @return {[type]}            [description]
	 *
	 */
	_pg.registerPlugin = function( name, pluginFnct , type = 'selector' ){
		if(typeof pluginFnct !== 'function') return false;

		if(type === 'selector'){
			PG_SELECTOR_PLUGINS[name] = pluginFnct;
		}
		return true;
	};
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
	_pg.request = async function( user_conf = {} ){
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
				if( !config.silent ) pg.warn('pg.request() : FAILURE in request.');
				return reject( [http.status, http.statusText, http.responseText] );
			};
			// handle responses
			http.onreadystatechange = function(){
				if(http.readyState == 4){
					// RESPONSE RECEIVED. DONE!
					if(http.status == 200){
						if( !config.silent ) pg.log('pg.request() Response received : ', http.responseText );
						return resolve( http.responseText );
					}else return http.onerror();
				}
			};
			if( !config.silent ) pg.log('pg.request() : Sending ' + config.method + ' request :' + config.url );
			http.send(config.data);
		});
	};
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
	_pg.require = async function(module){
		// attach pg.config.baseUrl_modules to filename
		module = pg.config.baseUrl_modules + module;
		// if module name has no extension, add it.
		if( pg.Path.fileExtension(module) === '' ) module = module + '.js';
		module = pg.Path.normalize(module);
		let exported = await System.import( module );
		return exported;
	};
	/**
	 * [loader description]
	 * @param  {[type]} el [description]
	 * @return {[type]}    [description]
	 */
	_pg.Loader = function(el = document.body){
		return {
			show : function(text = ' '){ el.setAttribute('pg-loading',text) },
			hide : function(){ el.removeAttribute('pg-loading') },
			text : function(text = ' '){ el.setAttribute('pg-loading',text) },
			has : function(){ return el.hasAttribute('pg-loading') },
		};
	};



	/**
	 * [feeds description]
	 * @type {Array}
	 */

	_pg.log = function(...args){
		PG_LOG_HISTORY.push(...args);
		console['log']( ...args);
		return true;
	};
	_pg.warn  = function(...args){
		PG_LOG_HISTORY.push(...args);
		console['warn'](...args);
		return true;
	};
	/**
	 * [createGuid description]
	 * @return {[type]} [description]
	 */
	_pg.guid = function(){
		function S4() {  return (((1+Math.random())*0x10000)|0).toString(16).substring(1) }
		// then to call it, plus stitch in '4' in the third group
		return (S4() + S4() + '-' + S4() + '-4' + S4().substr(0,3) + '-' + S4() + '-' + S4() + S4() + S4()).toLowerCase();
	};

	/**
	 EXPERIMENTAL
		*/
	_pg.watch = function(el, key, callback, options){
		return sightglass(el, key, callback, options);
	};



	_pg.bind = function(el, data){
		var view = rivets.bind(el,data);
		var id = pg.guid();
		Object.defineProperty(view, '__pg_id__', {  value: id, enumerable: false, writable:false,  configurable: false });
		PG_BINDINGS[id] = view;
		return id;
	};
	_pg.unbind = function(id){
		if( PG_BINDINGS.hasOwnProperty(id) ){
			PG_BINDINGS[id].unbind();
			delete PG_BINDINGS[id];
			return true;
		}else{
			console.warn('pg.unbind() : Provided binding ID does not match to any previous registered binding.');
			return false;
		}
	};
	_pg.unbindAll = function(){
		pg.log('pg.unbindAll(): Unbinding all bindings ( pg.bind and rv:adapter:import)...');
		// automatic bindings in adapter imports....
		for(var adapter in rivets.imports){
			if(!rivets.imports.hasOwnProperty(adapter) ) continue;
			pg.log('- Rivets Adapter : ' , adapter);
			for(var view in rivets.imports[adapter].__views__){
				if(!rivets.imports[adapter].__views__.hasOwnProperty(view) ) continue;
				rivets.imports[adapter].__views__[view].unbind();
				delete rivets.imports[adapter].__views__[view];
			}
		}
		// manual bindings in in pomegradade...
		for(var binding in PG_BINDINGS){
			if(!PG_BINDINGS.hasOwnProperty(binding) ) continue;
			pg.log('- PG Binding : ' , binding);
			pg.unbind(binding);
		}
		return true;
	};

	return _pg;

})();


if(document.readyState === 'complete' || document.readyState === 'interactive') pg.init();
else document.addEventListener('DOMContentLoaded', pg.init );
