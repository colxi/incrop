#!/bin/bash
clear
echo "Cheking dependencies for pg-server..."
cd pg-wrapper
cd pg-server
# npm install --loglevel=error
rm -f package-lock.json
cd ..
cd ..
echo "Cheking dependencies for pg-models..."
cd pg-models
# npm install --loglevel=error
rm -f package-lock.json
cd ..
echo "Done. Starting Server..."
sudo node pg-wrapper/pg-server/pg-server.js
