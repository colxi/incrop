/* global System , rivets , sightglass */

let pg = {
	/**
	 * [config description]
	 * @type {Object}
	 */
	config : {
		loadDefaultCss 					: true,
		loadFontAwesomeCss 				: true,
		bindDocumentonStartup 			: true,
		server_protocol 				: 'https',
		server_address 					: '192.168.1.200',
		server_port  					: 443,
		server_models_uri 				: '/pg-models/',
		server_models_method_query 		: 'method',
		server_models_method_args_query : 'args',
		baseUrl_import 					: '/',
		baseUrl_controller 				: 'pg-adapters/',
		baseUrl_view 					: 'pg-views/',
		baseUrl_module 					: 'pg-wrapper/pg-modules/',
		imports_constructor 			: 'pg_constructor'
	},
	/**
	 * [description] Implementacion de Deep Proxy para objecto virtual
	 * @param  {Function} ){		var modelPath              [description]
	 * @param  {Function} apply:   (target,receiver,args) [description]
	 * @return {[type]}            [description]
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
				apply: (target,receiver,args) => {
					return new Promise( resolve => {
						// prepare the request parts
						let path = target([]);
						let model = path.shift();
						let method = path.join('.');
						// prepare ajax request
						let url = 	pg.config.server_protocol + '://' +
									pg.config.server_address +  ':' +
									pg.config.server_port  +
									pg.config.server_models_uri + model + '.js'+
									'?' + pg.config.server_models_method_query + '=' + method;
						let params = pg.config.server_models_method_args_query + '=' + JSON.stringify(args);
						let http;
						http = new XMLHttpRequest();
						http.open('POST', url, true);
						http.withCredentials = false;
						// Set the proper header information for the request
						// Note: Use text/plain Content-type instead of using
						// application/json to ensure a simple request will be
						// performed and request METHOD will be POST instead
						// of OPTIONS (automatic browser behavior on complex
						// requests with CORS enabled)
						http.setRequestHeader('Content-type', 'text/plain; charset=UTF-8');

						http.onreadystatechange = function() {//Call a function when the state changes.
							if(http.readyState == 4 && http.status == 200) {
								// done !
								let resp = JSON.parse( http.responseText );
								console.log('<< ' , resp );
								if(typeof resp === 'object' && resp.type === 'PG_ERROR'){
									console.warn('REMOTE MODEL ERROR: ' + url);
									throw new Error(resp.err);
								}

								resolve(resp);
							}
						};
						// HANDLE SERVER CODE ERRORS
				       	http.onerror = function() {
          					throw new Error(http.status, http.statusText, http.responseText);
        				};

						console.log('[proxy:app.models] Sending server request :' + url );
						console.log('>> ' + model + '.' + method + '()' , args );
						http.send(params);
					});
				}
			};
			return new Proxy(target, handler);
		};
		//
		// Generate and return the proxy
		return new modelPathProxy();
	})(),
	/**
	 * [initialize description]
	 * @return {[type]} [description]
	 */
	initialize : async function(){
		pg.log('pg.initialize() : Pomegranade Object constructed. Initializing (pg.readyState="interactive")');
		pg.readyState = 'interactive';
		/* ES6 polyfill */
		await pg.require('pg-wrapper/pg-includes/babel-polyfill.min.js', 'Babel Polyfill...');
		// System js (import modules from the future)
		await pg.require('pg-wrapper/pg-includes/system.js', 'SystemJS...');
		/* Sightglass ... data binding */
		await pg.require('pg-wrapper/pg-includes/rivets/rivets-sightglass.js', 'Sightglass...');
		/* Rivers data binding....*/
		await pg.require('pg-wrapper/pg-includes/rivets/rivets.js', 'Rivets...');
		/* rivets expansion */
		await pg.require('pg-wrapper/pg-includes/rivets/rivets-stdlib.js', 'Rivets Formaters Lib...') ;
		/* rivets Adapters and views importer */
		await pg.require('pg-wrapper/pg-includes/rivets/rivets-import.js', 'Rivets Adapters Importer Lib...');
		/* modules configurations  */
		pg.log('pg.initialize() : Configure Rivets & Rivets Adapters Importer...');
		System.config({ baseURL: pg.config.baseUrl_import });
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
			onLoadController : pg.load._onRivetsLoadController,
			baseUrl : pg.config.baseUrl_controller,
			baseUrl_Views : pg.config.baseUrl_view,
			constructor : pg.config.imports_constructor
		});
		pg.log('pg.initialize() : Integrate Binder in Pomegranade...');
		sightglass.adapters = rivets.adapters;
		sightglass.root 	= rivets.rootInterface;
		/* Load DEFAULT styles */
		if(pg.config.loadDefaultCss){
			pg.log('pg.initialize() : Loading Pomegranade defaults CSS...');
			pg.load.css('../../pg-wrapper/pg-styles/pg-styles.css');
		}
		if(pg.config.loadFontAwesomeCss){
			pg.log('pg.initialize() : Loading Font Awesome CSS...');
			pg.load.css('../../pg-wrapper/pg-styles/font-awesome/font-awesome.css');
		}
		/* Ready ! Load main module */
		pg.log('pg.initialize() : Done! Pomegranade Ready! (pg.readyState="complete")');
		pg.log('----------------------------------------------------------------------');
		pg.readyState = 'complete';
		if(pg.config.bindDocumentonStartup) pg.bind( document.querySelector('html'), {} );
		else pg.log( 'pg.initialize(): Autobinding on startup is disabled. You have to Bind your document manually via pg.bind(element,{} ) (pg.config.bindDocumentonStartup=FALSE)' );
		while( pg._readyCallbacks.length) ( pg._readyCallbacks.shift() )();
		return true;
	},
	/**
	 * [ready description]
	 * @param  {Function} callback [description]
	 * @return {[type]}            [description]
	 */
	ready: function(callback){
		if(pg.readyState !== 'complete' || pg._readyCallbacks.length > 0) pg._readyCallbacks.push(callback);
		else callback();
		return true;
	},
	readyState : 'loading',
	_readyCallbacks : [],
	/**
	 * [load description]
	 * @type {Object}
	 */
	load :{
		path_toArray( p='' ){
			// generate array from path and remove empty keys (caused by double // or ending /)
			return p.split('/').filter( n=> (n === undefined || n === '') ? false : true );
		},
		path_toObject( p='' , obj={} , canWrite = true){
			let arrayPath = pg.load.path_toArray(p);
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
			controller : {}
		},
		_onRivetsLoadController(controllerName){
			pg.controllers[controllerName] = rivets.imports[controllerName];
			if(!pg.load._loaded['controller'].hasOwnProperty(controllerName)) pg.load._loaded['controller'][controllerName] = 1;
			else pg.load._loaded['controller'][controllerName]++;
		},
		_load(itemType = '', itemsList = [], containerObj = {}, returnArray = false ){
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
						System.import(pg.config['baseUrl_'+itemType] + itemName +'.js').then( item => {
							//
							//
							// GENERATE ITEM INSTANCE
							// resolve item path into container object, creating tree if required
							if(itemType==='controller') rivets.imports[itemName] = item.default;
							let objPath = pg.load.path_toObject(itemName, containerObj);
							// if item is a function assign to resolution path, if is an object, mix with existent object
							if(typeof item.default === 'function') objPath.namespace[objPath.key] = item.default;
							else objPath.object = Object.assign( objPath.object , item.default );
							//
							//
							// EXECUTE CONSTRUCTOR
							// check if has custom constructor/igniter
							if( objPath.object.hasOwnProperty(pg.config.imports_constructor) &&
							typeof objPath.object[pg.config.imports_constructor] === 'function' ){
								pg.log('pg.load.'+itemType+'() : Executing '+itemName+' constructor.' , 'info');
								// execute CONTROLLER module custom constructor
								let _c = objPath.object[pg.config.imports_constructor].call( objPath.object );
								// resolve pg.loadController (handle promise in CONTROLLER module __constructor)
								if( typeof _c === 'object' && typeof _c.then === 'function'){
									pg.log('pg.load.'+itemType+'() : Detected Promise in '+itemName+' Constructor. Waiting resolution...' , 'info');
									return _c.then( x => _constructed(objPath.object,_resolve) );
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
		controller(items= ''){
			// if more than one module has been requested, or single item has been requested inside array, return array
			let returnArray = ( arguments.length > 1 || Array.isArray(items) ) ? true : false;
			// force items to be an array
			items = Array.isArray(items) ? items : Array.prototype.slice.call(arguments) ;
			// start load
			return pg.load._load( 'controller', items , pg.controllers , returnArray );
		},
		module(items = ''){
			// if more than one module has been requested, or single item has been requested inside array, return array
			let returnArray = ( arguments.length > 1 || Array.isArray(items) ) ? true : false;
			// force items to be an array
			items = Array.isArray(items) ? items : Array.prototype.slice.call(arguments) ;
			// start load
			return pg.load._load( 'module', items , pg , returnArray );
		},
		css(filename){
			return new Promise( resolve=>{
				let head = document.getElementsByTagName('head')[0];
				let style = document.createElement('link');
				style.type = 'text/css';
				style.rel = 'stylesheet';
				style.href = '/pg-wonders/styles/'+filename;
				head.appendChild(style);
				resolve(true);
			});
		},
		view : {},
		html : {},
	},

	loader :function(el = document.body){
		return {
			show : function(text = ''){ el.setAttribute('pg-loading',text) },
			hide : function(){ el.removeAttribute('pg-loading') },
			text : function(text = ''){ el.setAttribute('pg-loading',text) },
			has : function(){ return el.hasAttribute('pg-loading') },
		};
	},

	configure : function(obj){} ,

	/**
	 * [loadView description]
	 * @param  {[type]} viewId [description]
	 * @return {[type]}        [description]
	 */
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
	/**
	 * [controller description]
	 * @type {Object}
	 */
	views : {},
	controllers : {},
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

	/**
	 * [require description]
	 * @param  {[type]} url [description]
	 * @return {[type]}     [description]
	 */
	require: (function(){
		const config = {
			baseUrl : ''
		};
		let _require = function(src, description = '') {
			pg.log('pg.require() :'+ description + ' ' + src);
			return new Promise(function(_resolve, _reject){
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
				script.src = config.baseUrl + src;
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
		};
		_require.config = function(custom_config){
			Object.assign(config,custom_config);
			return true;
		};
		return _require;
	})(),
	/**
	 * [feeds description]
	 * @type {Array}
	 */

	logStore : [],
	log : function(msg = '{empty}' , method = 'log'){
		pg.logStore.push(msg);
		console[method](msg);
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
	}
};

if(document.readyState === 'complete' || document.readyState === 'interactive') pg.initialize();
else document.addEventListener('DOMContentLoaded', pg.initialize );
