#!/bin/bash
clear
echo "Cheking dependencies..."
cd pg-models
npm install --loglevel=error
rm -f package-lock.json
cd ..
echo "Done. Starting Server..."
sudo node pg-wrapper/pg-server/pg-server.js
