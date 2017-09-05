

/**
 * [read_pin_outputs description]
 * @param  {[type]} bool allow         [description]
 * @return {[type]}      [description]
 */
int read_output_pins(boolean allow/*=true*/){
	PREVENT_READ_OUTPUT_PIN = allow ? false : true;
    Serial.print(__TRUE__);
	return true;
}


/**
 * ping() : Simple Ping method for connectivity testing propuses.
 *
 * @return 		[boolean true] 			Returns true
 *
 */
int ping(){
    Serial.print(__TRUE__);
    return true;
}

/**
 * reboot() : Restarts program from beginning, does a memory wipe but,
 * does not reset the peripherals and registers.
 *
 * @param  		[ boolean _output ] 		If true, will print to Serial a notification
 *
 * @return 		[ void ]					Before returning, execution is passed to
 *                  						the begining of code. Never RETURNS!
 *
 */
void reboot(boolean _output/*=false*/){
  // Notify client about the REBOOT
  if(_output) Serial.print(__TRUE__);
  if(_output) Serial.print((char)PARSER_CHAR);

  if(_output) Serial.print("0:__DOWN__");
  if(_output) Serial.print((char)PARSER_CHAR);

  // Secutiry stop to allow background pendant tasks to complete.
  delay(1000);
  asm volatile ("  jmp 0");
}

/**
 * mem() : Returns the ammount of free memory in the Board.
 *
 * @param  		[boolean _output]  			If true, prints in Serial the result
 *
 * @return 		[int freemem]          		Ammount of free momory
 *
 */
int free_mem(boolean _output /*=false*/) {
	extern int __heap_start, *__brkval;
	int v;
	int freemem = (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
	if(_output) Serial.print ( freemem );
	return freemem;
}

/**
 * [await description]
 * @param  {[type]} int ms            [description]
 * @return {[type]}     [description]
 */
int await(int ms){
    delay( ms );
    Serial.print(__TRUE__);
    return true;
}

