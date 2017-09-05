int interpreter(char **input_tokens){
    /*
    for (int i=0; i< MAX_PARAMETERS; i++) {
      if (input_tokens[i] == NULL)  break;
      Serial.println(input_tokens[i]);
    }
    */

    // handle empty requests
    if (strcmp(input_tokens[0], NULL) == 0)  Serial.print(__TRUE__);
    // system
    else if (strcmp(input_tokens[1], "ping") == 0)          ping();
    else if (strcmp(input_tokens[1], "free_mem") == 0)      free_mem(true);
    else if (strcmp(input_tokens[1], "await") == 0)         await(toInt(input_tokens[2]));
    else if (strcmp(input_tokens[1], "reboot") == 0)        reboot(true);
    else if (strcmp(input_tokens[1], "read_output_pins")==0)read_output_pins( (byte) toInt(input_tokens[2]) );

    // general
    else if (strcmp(input_tokens[1], "pin_write") == 0)     pin_write( (byte) toInt(input_tokens[2]), toInt(input_tokens[3]), true );
    else if (strcmp(input_tokens[1], "pin_read") == 0)      pin_read( (byte) toInt(input_tokens[2]), true );
    else if (strcmp(input_tokens[1], "pin_read_output")==0) pin_read_output( (byte) toInt(input_tokens[2]), true );
    else if (strcmp(input_tokens[1], "get_pin_mode") == 0)  get_pin_mode( (byte) toInt(input_tokens[2]), true);
    else if (strcmp(input_tokens[1], "set_pin_mode") == 0)  set_pin_mode( (byte) toInt(input_tokens[2]), input_tokens[3], true);
    else if (strcmp(input_tokens[1], "watcher_new") == 0)   watcher_new( (byte) toInt(input_tokens[2]) );
    else if (strcmp(input_tokens[1], "watcher_clear") == 0) watcher_clear( toInt(input_tokens[2]) , true);
    else if (strcmp(input_tokens[1], "watcher_list") == 0)  watcher_list();

    else if (strcmp(input_tokens[1], "temp_dht") == 0)      temp_dht( toInt(input_tokens[2]), true );
    else if (strcmp(input_tokens[1], "humi_dht") == 0)      humi_dht( toInt(input_tokens[2]), true );
    else if (strcmp(input_tokens[1], "temp_onewire") == 0)  temp_onewire( toInt(input_tokens[2]) , true);
    // unknown
    else Serial.print("_UNKNOWN_COMMAND_");

    // done!
    return true;
}

