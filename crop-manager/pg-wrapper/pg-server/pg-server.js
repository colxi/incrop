/*
* @Author: colxi.kl
* @Date:   2017-08-28 19:30:44
* @Last Modified by:   colxi.kl
* @Last Modified time: 2017-09-15 00:10:24
*/
'use strict';

/*******************************************************************************
*
* PG-SERVER : NodeJS implementation of a minimalistic HTTP(s) server, wuch can
* return files, or execute MODELS methods,and return the results. It has some
* customizavle options, and DISALLOWING for access to CUSTOM LISTS OF FILES
* AND DIRECTORIES
*
*******************************************************************************/
var http 			= null;
var url 			= require('url');
var path 			= require('path');
var fs 				= require('fs');
var querystring 	= require('querystring');
var cjson   		= require('cjson');
var async_mysql 	= require('async-mysql');
var isPortAvailable = require('is-port-available');

// CLEAR SCREEN
//process.stdout.write('\x1Bc');
//console.log('\x1Bc');


// emulate client side pg.models.__model__.__method__() calls to keep the
// enviroment intuitive familiar and friendly.
var pg = global.pg  = { models : {} };

var basedir = process.cwd();


var server = global.server = {
	Database : null,
	/**
	 * [config description]
	 * @type {Object}
	 */
	// DEFAULT SERVER CONFIG!
	config : null,
	//
	// PG internal security FORBIDDEN DIRECTIVES. Protect critical files and
	// folders, blocking those calls that request them,.
	pg_forbidden_uri : [
		// don't expose config-demo file
		'/pg-config-demo.json',
		// this file , should never be exposed
		'/pg-wrapper/pg-server/pg-server.js',
		// SSL certificates must remain private in the server
		'/pg-wrapper/pg-server/certificates/',
		// PG Feature : private PG directories
		/\/pg-private\//,
		// block node modules directory contents requests, to prevent any
		// execution of potentially vulnerable third party code
		/\/node_modules\//
	],
	/**
	 *
	 * server.init() Loads the user config, sanitizes config values if required,
	 * establishes connection to the database if setted in config, and finally
	 * starts the server (HTTP or HTTPS) on requested port.
	 *
	 * @return 			{void}
	 *
	 */
	init : async function(){
		// *********************************************************************
		//
		// Load Config
		//
		// ...default config
		console.log('server.init() : Loading pg-config-default.json...');
		const defaultConfigFilePath =  path.join(basedir,  '/pg-wrapper/pg-config-default.json' );
		if( !fs.existsSync( defaultConfigFilePath ) || fs.statSync(defaultConfigFilePath).isDirectory() ){
			// block if can't find file.
			console.log('server.init() : Can\'t find pg-config-default.json FILE. Aborted!');
			return void(0);
		}else{
			try{ server.config = cjson.load( defaultConfigFilePath ) }
			catch(err){
				// block if can't parse config object
				console.log('server.init() : FAILED parsing pg-config-default.json file. Aborted!');
				console.log(err.message);
				return void(0);
			}
		}
		// ... custom config
		console.log('server.init() : Loading pg-config.json...');
		const configFilePath =  path.join(basedir,  'pg-config.json' );
		if( !fs.existsSync( configFilePath ) || fs.statSync(configFilePath).isDirectory() ){
			// Warn if user config can't be find
			console.log('server.init() : WARN : Can\'t find /pg-config.json. Using default server config.');
		}else{
			// warn if user confir cant be parsed
			try{ cjson.extend(true, server.config , cjson.load( configFilePath ) ) }
			catch(err){ console.log('server.init() : WARN : FAILED parsing pg-config.json file. Using Default config!') }
		}

		// check if server port is available
		var portAvailable = await isPortAvailable(server.config.server_port);
		if( portAvailable !== true ){
			console.log('server.init() : HTTP Server Port ' + server.config.server_port + ' can\'t be opened.');
			console.log('server.init() : Reason : ' , isPortAvailable.lastError );
			console.log('server.init() : Aborted!');
			return;
		}

		// CUSTOM CONFIG JSON sanitizer...
		// Prevent server.config.defaultDirectoryIndex to try to escape from
		// the requested directory, pointing to some non contained file.
		// Certain value asignements , like "../something.html" , would
		// compromise the whole permision DIRECTIVES, and security restrictions
		// (like Protected folders, and protected files)
		server.config.defaultDirectoryIndex = server.config.defaultDirectoryIndex.split('/').join();
		// [more config checks here...]
		//

		// *********************************************************************
		//
		// Connect to the database if requireed in config
		//
		if(server.config.db_auto_connect){
			console.log('server.init() : Connecting to Database...');
			try{
				server.Database = await async_mysql.connect({
					host 		: server.config.db_host,
					port 		: server.config.db_port,
					database 	: server.config.db_name,
					user 		: server.config.db_user,
					password 	: server.config.db_pwd
				});
			}catch(err){
				console.log('server.init() : Can\'t connect to Database in host ' + server.config.db_host +':' +server.config.db_port );
				console.log('server.init() : Reason : ' + err);
				console.log('server.init() : Aborted!');
				return void(0);
			}

			console.log('server.init() : Connected!');
		}else console.log('server.init() : Database Connection not required in pg-config. Skipped.');

		// *********************************************************************
		//
		// initiate the server: HTTP / HTTPS
		//
		if(server.config.server_protocol === 'https'){
			//
			// HTTPS SERVER
			//
			// Path to the required SSL Certificate and Key files for HTTPS
			console.log('server.init() : Starting HTTPS server...' );
			let certificates_key_file  = path.join( basedir , server.config.ssl_private_key_uri);
			let certificates_cert_file = path.join ( basedir , server.config.ssl_certificate_uri);
			// check if the Certificate files exist. if not abort server boot
			if( !fs.existsSync( certificates_key_file ) || fs.statSync(certificates_key_file).isDirectory() ){
				console.log('server.init() : Can\'t find The certificate key file in ' + certificates_key_file + '. Aborted.' );
				return void(0);
			}
			if( !fs.existsSync( certificates_cert_file ) || fs.statSync(certificates_cert_file).isDirectory() ){
				console.log('server.init() : Can\'t find The certificate file in ' + certificates_cert_file + '. Aborted.' );
				return void(0);
			}
			const certificates = {
				key: fs.readFileSync( certificates_key_file  ),
				cert: fs.readFileSync(  certificates_cert_file )
			};
			http = require('https');
			http.createServer(certificates , function(request, response){ server.requestListener(request, response)  } ).listen(parseInt( server.config.server_port ));
		}else{
			//
			// HTTP SERVER
			//
			console.log('server.init() : Starting HTTP server....' );
			http = require('http');
			http.createServer( function(request, response){ server.requestListener(request, response) }).listen(parseInt( server.config.server_port ));
		}

		// *********************************************************************
		//
		// OUTPUT info MESSAGE IN CONSOLE
		console.log('');
		console.log('Static file server running at => ' + server.config.server_protocol + '://localhost:' + server.config.server_port );
		console.log('(Press CTRL + C to exit)');
		console.log('---------------------------------------------------------');
		console.log('');

		return void(0);
	},
	/**
	 * server.requestListener() : Listens for requests and processes them, after
	 * aplying the setted filters, wich may block some of them due to the user
	 * stablished rules. Those requests that are not blocked by filters, will be
	 * split in FILE REQUESTS and MODEL EXECUTION REQUEST, and handled by the
	 * corresponding subroutine.
	 *
	 * @param  		{object} 	request  	http(s).resquest object
	 * @param  		{object} 	response 	http(s).response object
	 *
	 * @return 		{void}
	 *
	 */
	requestListener : function(request, response){
		// CORS !
		// If CORS are enabled in config, configure them...
		if( server.config.cross_origin_allow_requests ){
			// Allowed requesters...
			response.setHeader('Access-Control-Allow-Origin',
				server.config.cross_origin_allow_origin );
			// Allowed Methods
			response.setHeader('Access-Control-Allow-Methods',
				server.config.cross_origin_allow_methods );
			// Allowed headers
			response.setHeader('Access-Control-Allow-Headers',
				server.config.cross_origin_allow_headers );
			// If enabled cookies will be included in the requests
			response.setHeader('Access-Control-Allow-Credentials',
				server.config.cross_origin_allow_credentials );
		}
		// obtain the URI of the requested element... and remove double  or
		// more slashes (//) from adreess (they could bypass filters)
		var uri = url.parse(request.url).pathname;
		uri = uri.replace(/\/\/+/g, '/');


		// *****************************************************************
		// FILTER : FORBIDDEN DIRECTIVES
		// Join the default forbidden directives with the user provided
		// in config, to generate a single list with all the directives
		//
		let forbidden_directives = {};
		forbidden_directives =  server.pg_forbidden_uri.concat(server.config.forbidden_uri);
		// Check if any Forbiden directive affects the current request.
		for (let i=0; i< forbidden_directives.length;i++){
			let  regex_path;
			if(forbidden_directives[i] instanceof RegExp){
				// REGULAR EXPRESSIONS DIRECTIVES
				regex_path = forbidden_directives[i];
			}else{
				// STRING DIRECTIVES
				// ESCAPE ANY CHARACTER in the DIRECTIVE that could be
				// interpreted as a RegExp operand before runing the URI chek
				let escapedDirective = server.escapeRegExpTokens( forbidden_directives[i] );
				// check if the DIRECTIVE represents an ABSOLUTE path.
				let absPath =  forbidden_directives[i].slice(0,1) === '/' ? true : false;
				// Create a RegExpr for the DIRECTIVE
				regex_path = absPath ? new RegExp('^' + escapedDirective ) : new RegExp(escapedDirective );
			}
			// Run the RegExp Directive. If applies, block the request!
			if( regex_path.test( uri ) ){
				console.log( 'FORBIDDEN | ' + uri );
				return server.throwError(response, 403, 'PG-Forbidden');
			}
		}
		// CLEAN ! no directives are aplicable! continue with the request!


		// *****************************************************************
		//
		// Identify the request TYPE : "FILE REQUEST" or "MODEL EXECUTION"...
		// Comparing the requested URI with config.baseurl_models (escaped version)
		//
		var escapedModelsPath  	= server.escapeRegExpTokens(server.config.baseurl_models);
		var regex_Modelspath 	= new RegExp('^' + escapedModelsPath );
		// get the path to the model file
		var filepath 	= path.join(basedir , uri );
		if( regex_Modelspath.test( uri ) ){
			// MODEL EXECUTION REQUEST!
			// get the model name
			let modelName 	= uri.substring( server.config.baseurl_models.length , uri.length);
			// get the method to call
			let methodName 	= url.parse(request.url, true).query;
			methodName 		= methodName[server.config.models_method_query];

			server.modelRequest(request, response, filepath, modelName, methodName);
		}else{
			// FILE REQUEST!
			let extension = path.extname(filepath);
			server.fileRequest(request, response, filepath, uri, extension);
		}
		// done!
		return void(0);
		//
	},
	/**
	 * [fileRequest description]
	 * @param  {[type]} request   [description]
	 * @param  {[type]} response  [description]
	 * @param  {[type]} filepath  [description]
	 * @param  {[type]} uri       [description]
	 * @param  {[type]} extension [description]
	 * @return {[type]}           [description]
	 */
	fileRequest : function(request, response, filepath , uri, extension){
		console.log( request.method + ' | FILE | ' + uri );
		console.log( Array( (request.method.length + 4 ) ).join(' ')  + ( new Date() ).toLocaleString( server.config.date_locale) + ' from ' + request.connection.remoteAddress);

		// HANDLE SPECIAL REQUEST TO CONFIG file ... it will return the FINAL
		// CONFIG OBJECT, with all the sensitive data removed (credentials)
		if(uri === '/pg-config.json'){
			let conf = JSON.parse( JSON.stringify(server.config) );
			// remove sensitive data
			conf.db_pwd = '[hidden]';
			conf.db_user = '[hidden]';
			// output resulting safe object
			response.writeHead(200, { 'Content-Type':  'text/plain; charset=UTF-8'});
			response.write( JSON.stringify(conf) , 'utf8');
			response.end();
			// done!
			return void(0);
		}


		// If "file doesnt exist" or  ( is directory but filepath doesn't end with "/" char)
		// Return 404 NOT FOUND error ("/" is mandatory for referencing a
		// directory, if not present IS CONSIDERED A FILE )
		if( !fs.existsSync(filepath) ||
			( fs.statSync(filepath).isDirectory() && filepath.slice(-1) !== '/' )
		){
			return server.throwError(response, 404, 'Not Found');
		}
		// if is a directory, but there is no reference to any file to open from
		// it, point automatically to file setted in config
		if( fs.statSync(filepath).isDirectory() ){
			uri 		+= server.config.defaultDirectoryIndex;
			filepath 	+= server.config.defaultDirectoryIndex;
			extension = path.extname(filepath);
			// log the redirection attempt
			console.log(' ┬');
			console.log(' └───┤> ' + 'Default-Redirection :  ' + uri);
			// if the automatic redirection, points nowhere, throw a 404 error
			if( !fs.existsSync(filepath) ) return server.throwError(response, 404, 'Not Found');
		}
		// Open the requested file to read its contents...
		fs.readFile(filepath, 'binary', function(err, file) {
			// block if an error happened
			if(err) return server.throwError(response, 500, err);
			var contentType = 'text/plain';
			switch( extension ){
				case '.css':
					contentType ='text/css';
					break;
				case '.gif':
					contentType ='image/gif';
					break;
				case '.htm':
				case '.html':
					contentType ='text/html';
					break;
				case '.ico':
					contentType ='image/x-icon';
					break;
				case '.jpg':
				case '.jpeg':
					contentType ='image/jpeg';
					break;
				case '.js':
					contentType ='application/javascript';
					break;
				case '.json':
					contentType ='application/json';
					break;
				case '.ttf':
					contentType ='font/ttf';
					break;
				case '.woff':
					contentType ='font/woff';
					break;
				case '.xhtml':
					contentType ='application/xhtml+xml';
					break;
				case '.xml':
					contentType ='application/xml';
					break;
				default :
					contentType= 'application/octet-stream';
					break;
			}
			// else return to the client its contents (except when only HEAD
			// is requested), and end the conection.
			response.writeHead(200, { 'Content-Type':  contentType});
			if( request.method !== 'HEAD' ) response.write(file, 'binary');
			response.end();
			// done!
		});
	},
	/**
	 * [modelRequest description]
	 * @param  {[type]} request    [description]
	 * @param  {[type]} response   [description]
	 * @param  {[type]} filepath   [description]
	 * @param  {[type]} modelName  [description]
	 * @param  {[type]} methodName [description]
	 * @return {[type]}            [description]
	 */
	modelRequest : function(request, response, filepath, modelName, methodName){
		// BLOCK CONNECTION IS USED METHOD IS NOT POST
		console.log( request.method + ' | MODEL | '+ modelName + ':' + methodName );
		console.log( Array( (request.method.length + 4 ) ).join(' ')  + ( new Date() ).toLocaleString( server.config.date_locale) + ' from ' + request.connection.remoteAddress);

		if(request.method !== 'POST'){
			return server.throwError(response, 405, 'HTTP Method not Allowed ('+request.method+'). Expected:POST ');
		}

		// *** MODEL LOADING
		//
		// Check if model file exist
		if( !fs.existsSync( filepath ) || fs.statSync( filepath ).isDirectory() ){
			return server.throwError(response, 404, 'Model Does not exist');
		}
		// Wrap the MODEL load in a Try/catch structure, to handle errors in
		// requested model code.
		try{
			// Require model if has not been required previously (cached)
			if( !pg.models.hasOwnProperty(modelName) ) pg.models[modelName] = require( filepath );
			// If is been required previously but cache is disabled, load again
			else if( !server.config.models_use_cache ){
				// remove cache to ensure a clean model load
				delete require.cache[require.resolve(filepath)];
				delete pg.models[modelName];
				pg.models[modelName] = require( filepath );
			}
		}catch(err){
			// Errors where found in MODEL CODE, handle them returning to client
			// the generated error object
			var error = {type :'PG_ERROR' , err : err.stack};
			response.writeHead(200, { 'Content-Type':  'text/plain; charset=UTF-8'});
			response.write( JSON.stringify( error ) , 'utf8');
			response.end();
			return false;
		}

		// If requested method does not exist in the model, block request
		if( !pg.models[modelName].hasOwnProperty( methodName) ){
			return server.throwError(response, 416, 'Method not Found in model  : ' + modelName + '.' + methodName);
		}

		// get POST data
		var dataRaw = '';
		request.on('data', async function (data) {
			dataRaw += data;
			if(dataRaw.length > server.config.models_request_max_size) {
				dataRaw = '';
				server.throwError(response, 413, 'Request Length Too Large');
				request.connection.destroy();
				return;
			}
		});

		request.on('end', async function () {
			let methodArgsArray;
			// Get the POST object
			methodArgsArray = querystring.parse(dataRaw);
			// select the appropiate key in POST object
			methodArgsArray = methodArgsArray[server.config.models_args_query] || '[]';
			// JSON decode the key contents
			methodArgsArray = JSON.parse(methodArgsArray);
			dataRaw = '';

			let modelResponse;
			try{
				modelResponse = await pg.models[modelName][methodName](...methodArgsArray);
			}catch(err){
				modelResponse= {type :'PG_ERROR' , err : err.stack};
			}
			response.writeHead(200, { 'Content-Type':  'text/plain; charset=UTF-8'});
			response.write( JSON.stringify(modelResponse) , 'utf8');
			response.end();
		});
	},
	/**
	 * [throwError description]
	 * @param  {[type]} response [description]
	 * @param  {[type]} errCode  [description]
	 * @param  {[type]} errMsg   [description]
	 * @return {[type]}          [description]
	 */
	throwError : function(response, errCode, errMsg){
		console.log(' ┬');
		console.log(' └───┤> ' + errCode + ' ' + errMsg);
		console.log('');
		response.writeHead(errCode, {'Content-Type': 'text/plain'});
		response.write(errCode + ' ' + errMsg);
		response.end();
		return;
	},
	/**
	 * [escapeRegExp description]
	 * @param  {[type]} str [description]
	 * @return {[type]}     [description]
	 */
	escapeRegExpTokens : function(str){
		// Referring to the table here:
		// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/regexp
		// these characters should be escaped
		// \ ^ $ * + ? . ( ) | { } [ ]
		// These characters only have special meaning inside of brackets
		// they do not need to be escaped, but they MAY be escaped
		// without any adverse effects (to the best of my knowledge and casual testing)
		// : ! , =
		// my test "~!@#$%^&*(){}[]`/=?+\|-_;:'\",<.>".match(/[\#]/g)
		var specials = [
			// order matters for these
			'-',
			'[',
			']',
			// order doesn't matter for any of these
			'/',
			'{',
			'}',
			'(',
			')',
			'*',
			'+',
			'?',
			'.',
			'\\',
			'^',
			'$',
			'|'
		];
		// I choose to escape every character with '\'
		// even though only some strictly require it when inside of []
		var regex = RegExp('[' + specials.join('\\') + ']', 'g');
		// done!
		return str.replace(regex, '\\$&');
	}
};


server.init();
