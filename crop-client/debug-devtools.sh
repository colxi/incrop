#!/bin/bash
echo "- Starting mysql server"
sudo /opt/lampp/xampp start
echo "- Starting Node App"
./node_modules/.bin/nodemon --inspect=192.168.1.200:9229  main.js



