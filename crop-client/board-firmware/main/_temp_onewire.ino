#include <OneWire.h>

// OneWire DS18B20 Temperature Sensor (Water resistant probe)
// http://www.pjrc.com/teensy/td_libs_OneWire.html



float temp_onewire(int pin, boolean _output/*=false*/){

    if (pin<0 || pin >= NUM_DIGITAL_PINS){
        // -1 : DIGITAL PIN DOES NOT EXIST
        if(_output) Serial.print(-1);
        return -1;
    }


    OneWire  ds(pin);  // on pin 10 (a 4.7K resistor is necessary)

    //byte i;
    byte present = 0;
    //byte type_s;
    byte data[12];
    byte addr[8];
    float celsius;

    ds.search(addr);
    ds.reset();
    ds.select(addr);
    ds.write(0x44, 1);        // start conversion, with parasite power on at the end

    delay(1000);     // maybe 750ms is enough, maybe not
    // we might do a ds.depower() here, but the reset will take care of it.

    present = ds.reset();
    ds.select(addr);
    ds.write(0xBE);         // Read Scratchpad

     // we need 9 bytes
    for (byte i = 0; i < 9; i++) data[i] = ds.read();


    // Convert the data to actual temperature
    // because the result is a 16 bit signed integer, it should
    // be stored to an "int16_t" type, which is always 16 bits
    // even when compiled on a 32 bit processor.
    int16_t raw = (data[1] << 8) | data[0];

    byte cfg = (data[4] & 0x60);
    // at lower res, the low bits are undefined, so let's zero them
    if (cfg == 0x00) raw = raw & ~7;  // 9 bit resolution, 93.75 ms
    else if (cfg == 0x20) raw = raw & ~3; // 10 bit res, 187.5 ms
    else if (cfg == 0x40) raw = raw & ~1; // 11 bit res, 375 ms

    //// default is 12 bit resolution, 750 ms conversion time
    celsius = (float)raw / 16.0;
    if(_output) Serial.print(celsius);
    return celsius;
}
