#include <dht.h>
dht DHT;

/**
 * temp() :  Returns the temperature from a DHT sensor in PIN provided.
 *
 * @param  {[type]} int pin           [description]
 * @return {[type]}     [description]
 */
double temp_dht(int pin, boolean _output/*=false*/){

    if (pin<0 || pin >= NUM_DIGITAL_PINS){
        // -1 : DIGITAL PIN DOES NOT EXIST
        if(_output) Serial.print(-1);
        return -1;
    }

    // some secure delay time...
	delay(1000);

	DHT.read11(pin);
	if(_output) Serial.print(DHT.temperature);

	return DHT.temperature;
}


/**
 * temp() :  Returns the temperature:humidity from a DHT sensor in PIN provided.
 *
 * @param  {[type]} int pin           [description]
 * @return {[type]}     [description]
 */
double humi_dht(int pin, boolean _output/*=false*/){

    if (pin<0 || pin >= NUM_DIGITAL_PINS){
        // -1 : DIGITAL PIN DOES NOT EXIST
        if(_output) Serial.print(-1);
        return -1;
    }

    // some secure delay time...
	delay(1000);

	DHT.read11(pin);
	if(_output)  Serial.print(DHT.humidity);

	return DHT.humidity;
}
