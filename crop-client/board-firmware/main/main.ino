#include "main.h"

char DELIMITER_CHAR[]           = ":";
int  MAX_PARAMETERS             = 20;
char PARSER_CHAR                = 0x0A; // Dec:10 - NL New Line
bool PREVENT_READ_OUTPUT_PIN    = true;

char __TRUE__[9]    = "__TRUE__";
char __FALSE__[10]  = "__FALSE__";


int   input_length = 0;   // for incoming serial data
char  input_string[31];
//char  *delimeter = (char *)DELIMITER_CHAR;



void setup() {
    Serial.begin(9600);     // opens serial port, sets data rate to 9600 bps
    Serial.print("0:__UP__");
    Serial.print((char)PARSER_CHAR);

    WATCHERS__initialize__();
}

void loop() {
    WATCHERS__inspector__();
    if (Serial.available() > 0){
        input_string[input_length] = Serial.read();
        // if not end of command, move position to next char
        // and return;
        if(input_string[input_length] != PARSER_CHAR){
          input_length++;
          return;
        }
        // END of command detected! replace endo of command,
        // with NULL CHARACTER (end of string)
        input_string[input_length] = 0x00;
        // tokenize the string
        char **input_tokens = tokenizeInput();
        // print request id PREFIX
        Serial.print(input_tokens[0]);
        Serial.print(":");
        // execute function requested
        interpreter(input_tokens);

        // free memory
        free(input_tokens);
        input_length = 0;

        // Output msg ending character
        Serial.print((char)PARSER_CHAR);


        /* DONE */
    }
}

char **tokenizeInput(){
    char *saveptr;
    char **input_tokens = (char **) malloc(MAX_PARAMETERS);
    //clear memory allocation
    for (int i=0; i< MAX_PARAMETERS; i++) {
        input_tokens[i] = 0x00;
    }

    input_tokens[0] =  strtok_r(input_string, DELIMITER_CHAR, &saveptr);
    for (int i=1; i< MAX_PARAMETERS; i++) {
      input_tokens[i] =  strtok_r(0x00,  DELIMITER_CHAR, &saveptr);
      if (input_tokens[i] == 0x00) break;
    }
    free(saveptr);
    return input_tokens;
}


int toInt(char *val){
  return strtol(val, NULL, 10 );
}




