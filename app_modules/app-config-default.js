/* globals app */
var cjson   = require('cjson'); 		// Read commented json files

module.exports = {
	load : function(){
		app.log('app.config.load() : Loading app-config.json...');
		cjson.extend(true, app.config , cjson.load('app-config.json') );
	},
	crop_id 							: 1,
	// serial communication
	serial_port 						: '/dev/ttyACM0',
	serial_port_baud_rate				: 9600,
	serial_port_parser 					: 0x0A, 	// (Dec:10) NL New Line ASCII code
	serial_port_reconnect_on_error  	: true,
	serial_port_request_timeout 		: 5000, 	// in ms
	serial_port_retry_request_timeout 	: true,
	serial_port_retries_request_timeout : 3, 		// max times to retry query before discarding
	serial_port_open_delay 				: 1000,  	// time to wait betwen open the port
													// and send Data.
	// boot
	boot_strict							: true,
	// Log config
	log_history 						: true,
	log_console							: true,
	log_console_history 				: true,
	log_console_history_length 			: 500,
	log_unhandled_reject_details_silent : true,
	log_silent_board_timeouts_reponses 	: false,
	// DB config
	db_host 							: 'localhost',
	db_user 							: 'root',
	db_pwd 								: 'root',
	db_name 							: 'enefty',
	// Date&time format
	format_date 						: 'dd-MM-yyyy',
	format_time 						: 'HH:mm:ss'
};
