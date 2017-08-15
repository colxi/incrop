/**
 * get_pin_mode() : Returns the mode applied to the selected digital pin
 * (0-input/1-output 2-input_pullup).
 *
 * @param           [ int pin ]             Digital Pin ID to check
 * @param           [ boolean _output]      If true prints in Serial, the result
 *
 * @return          [ int OUTPUT (0) | INPUT (1) | INPUT_PULLUP (2) ]
 *                  [ int -1 ]               DIGITAL PIN DOES NOT EXIST
 *
 */
int get_pin_mode(byte pin, boolean _output/*=false*/){
    if (pin<0 || pin >= NUM_DIGITAL_PINS){
        // -1 : DIGITAL PIN DOES NOT EXIST
        if(_output) Serial.print(-1);
        return -1;
    }
    // Check in registers
    uint8_t bit             = digitalPinToBitMask(pin);
    uint8_t port            = digitalPinToPort(pin);
    volatile uint8_t *reg   = portModeRegister(port);

    // OUTPUT !
    if (*reg & bit){
        if(_output) Serial.print("OUTPUT");
        return OUTPUT;
    }

    volatile uint8_t *out   = portOutputRegister(port);
    // INPUT_PULLUP !
    if(*out & bit){
        if(_output) Serial.print("INPUT_PULLUP");
        return INPUT_PULLUP;
    }

    // INPUT !
    if(_output) Serial.print("INPUT");
    return INPUT;
}


/**
 * set_pin_mode() : Returns the mode applied to the selected digital pin
 * (0-input/1-output 2-input_pullup).
 *
 * @param           [ int pin ]             Digital Pin ID to check
 * @param           [ char mode]            Mode to set (INPUT , OUTPUT, INPUT_PULLUP)
 * @param           [ boolean _output]      If true prints in Serial, the result
 *
 * @return          [ int true]             Return true
 *                  [ int -1 ]              DIGITAL PIN DOES NOT EXIST
 *                  [ int -2 ]              UKNOWN MODE
 *
 */
int set_pin_mode(byte pin, char mode[] , boolean _output/*=false*/){
    // -1 : DIGITAL PIN DOES NOT EXIST
    if (pin < 0 || pin >= NUM_DIGITAL_PINS){
        if(_output) Serial.print(-1);
        return -1;
    }
    // validate PROVIDED MODE
    int _mode;
    if (strcmp(mode, "INPUT") == 0)                 _mode=0;
    else if (strcmp(mode, "OUTPUT") == 0)           _mode=1;
    else if (strcmp(mode, "INPUT_PULLUP") == 0)     _mode=2;
    else{
        // -2 : UKNOWN MODE
        if(_output) Serial.print(-2);
        return -2;
    }
    // Assign ASSIGN MODE to pin
    pinMode(pin,_mode);

    if(_output) Serial.print(__TRUE__);
    // Done!
    return true;
}


