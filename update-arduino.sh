#!/bin/bash
echo "- Uploading Project sketch to Arduino (/dev/ttyACM0)"
sudo /opt/arduino/arduino-1.8.3/arduino --upload ./arduino_board/main/main.ino  --port /dev/ttyACM0
