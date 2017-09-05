/**
 * pin_write() : Set the provided value (hight/low) to the DIGITAL pin specified.
 *  PIN MUST BE setted previously in OUTPUT MODE!
 *
 * @param  			[ int pin ]				Number of the digital PIN
 * @param  			[ int value ]          	TRUE/FALSE (1/0) Accepted
 * @param  			[ boolean _output ]  	If true will print to Serial the result
 *
 * @return 			[ int true ]          	Confirmation MSG
 *                  [ int -1   ] 			ERR : DIGITAL PIN DOES NOT EXIST
 *                  [ int -2   ] 			ERR : CAN'T set value to A NON OUTPUT PIN
 *
 */
int pin_write(byte pin, int value, boolean _output/*=false*/){
	// Block if pin does not exist
    // -1 : DIGITAL PIN DOES NOT EXIST
    if (pin < 0 || pin >= NUM_DIGITAL_PINS){
        if(_output) Serial.print(-1);
        return -1;
    }

    // Block if requested pin is NOT in OUTPUT mode
    // -2 : CAN'T set value to A NON OUTPUT PIN
    if( get_pin_mode(pin) != OUTPUT ){
        if(_output) Serial.print(-2);
        return -2;
    }

    // set the value in the pin
    digitalWrite(pin, value);
    if(_output) Serial.print(__TRUE__);

    // done!
    return true;
}

/**
 * pin_read() : Set the provided value (hight/low) to the DIGITAL pin specified.
 *  PIN MUST BE setted previously in OUTPUT MODE!
 *
 * @param           [ int pin ]             Number of the digital PIN
 * @param           [ int value ]           TRUE/FALSE (1/0) Accepted
 * @param           [ boolean _output ]     If true will print to Serial the result
 *
 * @return          [ int true ]            Confirmation MSG
 *                  [ int -1   ]            ERR : DIGITAL PIN DOES NOT EXIST
 *                  [ int -2   ]            ERR : CAN'T set value to A NON OUTPUT PIN
 *
 */
int pin_read(byte pin, boolean _output/*=false*/, boolean ignore_read_output_rule/*=false*/){
    // Block if pin does not exist
    // -1 : DIGITAL PIN DOES NOT EXIST
    if (pin < 0 || pin >= NUM_DIGITAL_PINS){
        if(_output) Serial.print(-1);
        return -1;
    }

    // [OPTION] Block if requested pin is NOT in INPUT|INPUT_PULLUP mode
    if( ignore_read_output_rule ? false : PREVENT_READ_OUTPUT_PIN){
        // -2 : CAN'T get value from A NON INPUT|INPUT_PULLUP PIN
        if( get_pin_mode(pin) != INPUT && get_pin_mode(pin) != INPUT_PULLUP  ){
            if(_output) Serial.print(-2);
            return -2;
        }
    }

    // get the value in the pin
    int value = digitalRead( pin );
    if(_output) Serial.print( value );

    // done!
    return value;
}


/**
 * pin_read_output() : PROXY FUNCTION! Bypass the directive PREVENT_READ_OUTPUT_PIN
 * and provide a secure and explicit channel to read the value of output
 * pins (strictly them)
 *
 * @param           [ int pin ]             Number of the digital PIN
 * @param           [ boolean _output ]     If true will print to Serial the result
 *
 * @return          [ int true ]            Confirmation MSG
 *                  [ int -2   ]            ERR : CAN'T READ value to A NON OUTPUT PIN
 *                  [ int -1   ]            ERR : DIGITAL PIN DOES NOT EXIST ( from pin_read() )
 *
 */
int pin_read_output(byte pin, boolean _output/*=false*/){
    // Block if requested pin is NOT in OUTPUT mode
    // -2 : Only for OUTPUT PINS
    if( get_pin_mode(pin) != OUTPUT ){
        if(_output) Serial.print(-2);
        return -2;
    }
    // just RETURN value. Data Serial output is performed via pin_read()
    return pin_read(pin, _output, true );
}

