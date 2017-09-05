// AWAIT / MEM / PING / REBOOT / READ OUTPUT PINS /
int await(int ms);
int free_mem(boolean _output=false);
int ping();
void reboot(boolean _output=false);
int read_output_pins(boolean allow=true);


// INTERPRETER
int interpreter(char **input_tokens);


// PIN
int pin_write(byte pin, int value, boolean _output=false);
int pin_read(byte pin, boolean _output=false, boolean ignore_read_output_rule=false);
int pin_read_output(byte pin, boolean _output=false);

// PIN_MODE
int get_pin_mode(byte pin, boolean _output=false);
int set_pin_mode(byte pin, char mode[] , boolean _output=false);

// TEMP_DHT
double temp_dht(int pin, boolean _output=false);
double humi_dht(int pin, boolean _output=false);

// TEMP_ONEWIRE
float temp_onewire(int pin, boolean _output=false);

// WATCH
int watcher_new(byte pin);
int watcher_clear(int id, boolean _output=false);
int watcher_list();
int WATCHERS__inspector__();
int WATCHERS__initialize__();
