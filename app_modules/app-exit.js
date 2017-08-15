/* globals app */

var safeLog = function(msg){
	var log = (typeof app !== 'undefined' && app.log) || console.log;
	log(msg);
};

var safeWarn = function(msg){
	var warn = (typeof app !== 'undefined' && app.warn) || console.warn;
	warn(msg);
};


var exit = function(exitCode = 0){
	safeLog('[PREPARING TO FINISH EXECUTION]');
	safeLog('app.exit() : Disconnecting Board...');
	if(typeof app !== 'undefined'){
		app.Board.disconnect();
	}
	safeWarn('[EXECUTION FINISHED]');
	process.exit(exitCode);
};

// do app specific cleaning before exiting
process.on('exit', function(exitCode){
	safeLog('app.exit() : EVENT(Process.exit Call) Exitcode:' + exitCode);
	exit();
});

// catch ctrl+c event and exit normally
process.on('SIGINT', function () {
	safeLog('app.exit() : EVENT(CTROL-C Pressed) ExictCode: 2');
	exit(2);
});

//catch uncaught exceptions, trace, then exit normally
process.on('uncaughtException', function(e) {
	safeLog('app.exit() : EVENT(uncaughtException Detected) ExitCode:99');
	safeLog(e.stack);
	exit(99);
});


module.exports = exit;
