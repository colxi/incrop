#define MAX_WATCHERS 5

typedef struct {
    byte    pin;
    byte    value;
} watcher;

// Array to store Watchers associated pins
// 254 pins could be mapped . The value 0xff (255) is  reserved
// as a magic word for flagging unitialized watchers
watcher WATCHERS[ MAX_WATCHERS ];

// Array to store each watcher pin's last known value

//boolean watcher_last_value[MAX_WATCHERS];
int WATCHERS__initialize__(){
    //return;
    for ( int id = 0; id < MAX_WATCHERS; ++id ){
        WATCHERS[id].pin     = 0xff;
        WATCHERS[id].value   = 0x00;
    }
    return true;
}


/**
 *  watch() : CREATE A NEW WATCHER ON REQUESTED PIN
 *
 */
int watcher_new(byte pin){

    // Block if pin does not exist
    // -1 : DIGITAL PIN DOES NOT EXIST
    if (pin < 0 || pin >= NUM_DIGITAL_PINS){
        Serial.print(-1);
        return -1;
    }

    // [OPTION] Block if requested pin is in mode OUTPUT
    if(PREVENT_READ_OUTPUT_PIN){
        // -2 : CAN'T WATCH AN OUTPUT PIN
        if( get_pin_mode(pin) == OUTPUT ){
            Serial.print(-2);
            return -2;
        }
    }

    // look for an empty slot for the watcher
    int id = -1;
    for (int i=0; i<MAX_WATCHERS; i++){
        if( WATCHERS[ i ].pin == 0xff ){
            id = i;
            break;
        }
    }

    // iF NO FREE slot is found  block and return error
    // -3 : MAX WATCHERS REACHED. NO SLOTS AVAILABLE
    if(id == -1){
        Serial.print(-3);
        return -3;
    }

    // assign PIN to watcher
    WATCHERS[ id ].pin      = pin;
    WATCHERS[ id ].value    = (boolean) digitalRead(pin);
    Serial.print( id );
    Serial.print( WATCHERS[ id ].value ? ":1" : ":0");
    return id;
}

/**
 * unwatch() : Remove requested watcher, and reset pin known last value
 * @param       [int id]    Watcher ID
 *
 * @return      true        If deleted normally
 *              -1          If watcher ID is invalid
 *
 * @output      __TRUE__    If deleted normally
 *              -1          If watcher ID is invalid
 *
 */
int watcher_clear(int id, boolean _output/*=false*/){
    // Validate watcher ID, and block if invalid
    if(id < 0 || id >= MAX_WATCHERS){
        if(_output) Serial.print("-1");
        return -1;
    }
    // Delete watcher
    WATCHERS[ id ].pin      = 0xff;
    WATCHERS[ id ].value    = 0x00;
    // done!
    if(_output) Serial.print(__TRUE__);
    return true;
}

int watcher_list(){
    boolean addSeparator = false;
    for (int i=0; i<MAX_WATCHERS; i++){
        if( WATCHERS[ i ].pin != 0xff ){
            if( i > 0 && addSeparator) Serial.print( ":" );
            Serial.print( i );
            Serial.print( "," );
            Serial.print( WATCHERS[ i ].pin );
            addSeparator = true;
        }
    }
    return true;
}



/*******************************************************************************
 *
 *  INTERNAL FUNCTIONS
 *
 ******************************************************************************/

/**
 * loop_watchers() : Inspect all declared watchers,  detect changes in observed
 * pins, and launch Event notifications, when changes are detected.
 *
 * @return      true        If routine executed normally
 *              -1          If watched pin MODE is OUTPUT
 *
 * @output      [event]     If OK. "0:__WATCHER__:[id]:[value]"
 *              [error]     If watched pin MODE is OUTPUT
 *
 */
int WATCHERS__inspector__(){

    for (int id=0; id< MAX_WATCHERS; id++){
        if(WATCHERS[id].pin != 0xff){

            // [OPTION] Error and unwatch if requested pin is in mode OUTPUT
            if(PREVENT_READ_OUTPUT_PIN){
                if( get_pin_mode( WATCHERS[id].pin ) == OUTPUT ){
                    // -1 : CAN'T WATCH AN OUTPUT PIN
                    Serial.print("0:__WATCHER__:");
                    Serial.print(id);
                    Serial.print(":-1");
                    Serial.print((char)PARSER_CHAR);
                    // unwatch ID (SILENTLY delete watcher)
                    watcher_clear(id, false);
                    continue;
                }
            }
            // read the current_value of the PIN and if IS DIFFERENT from last
            // reading emit event
            byte current_value = digitalRead( WATCHERS[id].pin );
            if( current_value != WATCHERS[id].value ){
                Serial.print("0:__WATCHER__:");
                Serial.print(id);
                Serial.print( current_value ? ":1" : ":0" );
                Serial.print((char)PARSER_CHAR);
                // save current value of pin
                WATCHERS[id].value = current_value;
            }
        }
    }
    // done!
    return true;
}

