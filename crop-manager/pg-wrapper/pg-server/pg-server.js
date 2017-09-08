/*
* @Author: colxi.kl
* @Date:   2017-08-28 19:30:44
* @Last Modified by:   colxi.kl
* @Last Modified time: 2017-09-08 19:30:37
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
var https 		= require('https');
var http 		= require('http');
var url 		= require('url');
var path 		= require('path');
var fs 			= require('fs');
var querystring = require('querystring');
var cjson   	= require('cjson');
var async_mysql = require('async-mysql');

// CLEAR SCREEN
//process.stdout.write('\x1Bc');
//console.log('\x1Bc');


// emulate client side pg.models.__model__.__method__() calls to keep the
// enviroment intuitive familiar and friendly.
var pg = global.pg  = { models : {} };

var basedir = process.cwd();


var server = {
	Database : async_mysql,
	/**
	 * [config description]
	 * @type {Object}
	 */
	// DEFAULT SERVER CONFIG!
	config : {
		//
		//*** DB CONFIG
		//
		// NOTE: Some servers would not support HTTPS
		// Some ports (like 443) can require root privileges to be opened
		'db_auto_connect' 				: true,
		'db_host' 						: 'localhost',
		'db_port'						: 3306,
		'db_user' 						: 'root',
		'db_pwd' 						: '',
		'db_name'						: 'enefty',
		'protocol' 						: 'https',
		'server_port' 					: 443,
		//
		// *** MODELS CONFIG
		//
		// disable Cache on development enviroments (prevents the need of reboot
		// server after changes in models code )
		'models_use_cache' 				: false,
		'models_request_max_size' 		: 500,
		// Absolute URL to MODELS directory
		'models_uri'  					: '/pg-models/',
		// Variable Name, holding the required Merhod in URL, for METHOD CALLs.
		'models_method_query' 			: 'method',
		// Variable Name, holding the Args in the POST data, for METHOD calls.
		'models_method_args_query' 		: 'args',
		//
		// ** HTTP SERVER CONFIG
		//
		// when requested a directory but not provided a file to open from it
		// will redirect to the default index filename
		'defaultDirectoryIndex' 		: 'index.html',
		// CORS : Cross Origin Resource Sharing.
		// Warning! Certain configurations could drive the Client (Browser) to
		// preflight the request, changing the request method to "OPTIONS".
		// That would make any MODEL EXECUTION call, FAIL (expects POST request)
		'cross_origin_allow_requests'   : true,
		'cross_origin_allow_origin' 	: '*',
		'cross_origin_allow_methods' 	: 'GET,POST,OPTIONS,PUT,PATCH,DELETE',
		'cross_origin_allow_headers' 	: 'Content-type',
		'cross_origin_allow_credentials': false,
		// SLL Certificates paths. If needed, new selfsigned certificates can be
		// generated using the ./pg-wonders/pg-certificates/generate.sh script
		'ssl_private_key_path' 			: './certificates/server.key',
		'ssl_certificate_path' 			: './certificates/server.crt',
		// Declare "Foridden directives" inside the Array, to block the targeted
		// URIs LOADING, using String or Regular Expressions.
		// Specs :
		// - String Directives with a '/' character in their begining , will be
		// considered Absolute paths (to be blocked as their children chain).
		// - String Entries that don't begin with a slash would activate the directive
		// in those URI request where the String could be located in any position.
		// eg:
		// '/pg-wrapper/pg-certificates/
		// ---> Would Block any "FILE REQUEST" pointing to that directory, or any
		// content inside (and inside the nested directories and files).
		// '.sql'
		// ---> Would Block any "FILE REQUEST" where the substring '.sql' could be
		// found in the URI
		//
		// Regular Expression Directives, are aplied as provided, testing them
		// against the URI string. When the regExp.test succeeds positivelly, the
		// request is BLOCKED.
		//
		forbidden_uri : [
			// '/node_modules/',	// blocks requests to root node_modules dir
			// 'node_modules/', 	// blocks requests to any dir that ends in node_modules/
			// /\/node_modules\//   // blocks requests to any folder called node_modules
		]
	},
	//
	// PG internal security FORBIDDEN DIRECTIVES. Protect critical files and
	// folders, blocking those calls that request them,.
	pg_forbidden_uri : [
		'/node_modules/',
		// configuration files should never be exposed
		'/pg-config.json',
		'/pg-config-demo.json',
		// this file , should never be exposed
		'/pg-wrapper/pg-server.js',
		// SSL certificates must remain private in the server
		'/pg-wrapper/pg-certificates/',
		// PG Feature : private PG directories
		/\/pg-private\//
	],
	/**
	 * [description]
	 * @param  {Object} ){						const certificates  [description]
	 * @param  {[type]} '\')           [description]
	 * @return {[type]}                [description]
	 */
	init : async function(){
		// *********************************************************************
		//
		// Load native & custom Config
		//
		if( !fs.existsSync( path.join(basedir,  'pg-config.json' ) ) ){
			console.log('server.init() : Can\'t find /pg-config.json.');
			console.log('server.init() : Using default server config.');
		}else{
			console.log('server.init() : Loading pg-config.json...');
			cjson.extend(true, server.config , cjson.load( path.join ( basedir , 'pg-config.json') ) );
		}

		var portAvailable = await server.isPortAvailable(server.config.server_port);
		if( portAvailable !== true ){
			console.log('server.init() : HTTP Server Port ' + server.config.server_port + ' can\'t be opened.');
			console.log('server.init() : Reason : ' , portAvailable);
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
		// Path to the required SSL Certificate and Key for HTTPS protocol
		const certificates = {
			key: fs.readFileSync( path.join( basedir , server.config.ssl_private_key_path) ),
			cert: fs.readFileSync( path.join ( basedir , server.config.ssl_certificate_path) )
		};

		// Connect to the database
		if(server.config.db_auto_connect){
			console.log('server.init() : Connecting to Database...');
			var link = server.Database.connect({
				host 		: server.config.db_host,
				port 		: server.config.db_port,
				database 	: server.config.db_name,
				user 		: server.config.db_user,
				password 	: server.config.db_pwd
			});

			if( link instanceof Error ){
				console.log('server.init() : Can\'t connect to Database in host ' + server.config.db_host +':' +server.config.db_port );
				console.log('server.init() : Reason : ' + link.code);
				console.log('server.init() : Aborted!');
				return;
			}
			console.log('server.init() : Connected!');
		}
		// *********************************************************************
		//
		// initiate the server: HTTP / HTTPS
		//
		if(server.config.protocol==='https'){
			https.createServer(certificates , function(request, response){ server.requestListener(request, response)  } ).listen(parseInt( server.config.server_port ));
		} else{
			http.createServer( function(request, response){ server.requestListener(request, response) }).listen(parseInt( server.config.server_port ));
		}

		//
		// *********************************************************************
		//
		// OUTPUT MESSAGE IN CONSOLE
		console.log('');
		console.log('Static file server running at => ' + server.config.protocol + '://localhost:' + server.config.server_port );
		console.log('(Press CTRL + C to exit)');
		console.log('---------------------------------------------------------');
		console.log('');
	},
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
		// Comparing the requested URI with config.models_uri (escaped version)
		//
		var escapedModelsPath  	= server.escapeRegExpTokens(server.config.models_uri);
		var regex_Modelspath 	= new RegExp('^' + escapedModelsPath );
		// get the path to the model file
		var filepath 	= path.join(basedir , uri );
		//
		if( regex_Modelspath.test( uri ) ){
			// MODEL EXECUTION REQUEST!
			// get the model name
			let modelName 	= uri.substring( server.config.models_uri.length , uri.length);
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
		return true;
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
			// else return to the client its contents , and end the conection.
			//response.writeHead(200, { 'Content-Type':  'text/plain; charset=UTF-8'});
			response.writeHead(200, { 'Content-Type':  contentType});
			response.write(file, 'binary');
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
		// RESERVED only POST method
		console.log( request.method + ' | MODEL | '+ modelName + ':' + methodName );
		if(request.method !== 'POST'){
			return server.throwError(response, 405, 'HTTP Method not Allowed ('+request.method+'). Expected:POST ');
		}

		// check if model EXIST
		if( !fs.existsSync( filepath ) || fs.statSync( filepath ).isDirectory() ){
			return server.throwError(response, 404, 'Model Does not exist');
		}
		// require model if has not been required previously (cached)
		if( !pg.models.hasOwnProperty(modelName) ) pg.models[modelName] = require( filepath );
		else if( !server.config.models_use_cache ){
			// if is been required previously but cache is disabled,
			// remove cache and load module again.
			delete require.cache[require.resolve(filepath)];
			delete pg.models[modelName];
			pg.models[modelName] = require( filepath );
		}
		// if requested method does not exist in the model, block request
		if( !pg.models[modelName].hasOwnProperty( methodName) ){
			return server.throwError(response, 416, 'Method not Found in model  : ' + modelName + '.' + methodName);
		}

		// get POST data
		var dataRaw = '';
		request.on('data', function (data) {
			dataRaw += data;
			if(dataRaw.length > server.config.models_request_max_size) {
				dataRaw = '';
				server.throwError(response, 413, 'Request Length Too Large');
				request.connection.destroy();
				return;
			}
		});

		request.on('end', function () {
			let methodArgsArray;
			// Get the POST object
			methodArgsArray = querystring.parse(dataRaw);
			// select the appropiate key in POST object
			methodArgsArray = methodArgsArray[server.config.models_method_args_query] || '[]';
			// JSON decode the key contents
			methodArgsArray = JSON.parse(methodArgsArray);
			dataRaw = '';

			let modelResponse;
			try{
				modelResponse = pg.models[modelName][methodName](...methodArgsArray);
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
	},
	/**
	 * [isPortTaken description]
	 * @param  {[type]}  port [description]
	 * @return {Boolean}      [description]
	 */
	isPortAvailable : function(port){
		return new Promise( (resolve) => {
			const tester = http.createServer()
				.once('error', (err) => resolve(err.code||err) )
				.once('listening', () => tester.once('close', () => resolve(true)).close())
				.listen(port);
		});
	}

};


server.init();
