import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app); // Creates a unified HTTP server
const wss = new WebSocketServer({ server }); // Binds WebSockets to the same server

const SERIAL_PATH = process.env.SERIAL_PORT || 'COM12';
const BAUD_RATE = 921600;
const PORT = process.env.PORT || 8080;

// 1. Serve static files from your React build folder
// (Make sure you run 'npm run build' in your frontend folder first)
app.use(express.static(path.join(__dirname, '../client/build')));

let port;
let parser;

function connectSerial() {
  port = new SerialPort({ path: SERIAL_PATH, baudRate: BAUD_RATE, autoOpen: false });
  parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  port.open((err) => {
    if (err) {
      console.log(`[Serial] Waiting for ESP32 on ${SERIAL_PATH}... Retrying in 3 seconds.`);
      setTimeout(connectSerial, 3000);
      return;
    }
    console.log(`[Serial] Successfully connected to Central RF Receiver on ${SERIAL_PATH}`);
  });

  // Broadcast validated ESP32 packets to the React Dashboard via WebSocket
  parser.on('data', (line) => {
    try {
      const parsed = JSON.parse(line.trim());
      const payload = JSON.stringify(parsed);
      wss.clients.forEach((client) => {
        if (client.readyState === 1) client.send(payload);
      });
    } catch (e) {
      // Ignore malformed serial fragments
    }
  });

  // Automatically attempt to reconnect if the USB cable is unplugged
  port.on('close', () => {
    console.log('[Serial] Device disconnected! Reconnecting in 3 seconds...');
    setTimeout(connectSerial, 3000);
  });

  port.on('error', (err) => {
    // Suppress repeated error spam while waiting for reconnection
  });
}

// Start the auto-connecting serial loop
connectSerial();

// 2. Start the unified server (Handles web pages AND WebSockets on port 8080)
server.listen(PORT, () => {
  console.log(`PULSEGUARD Production Server running at http://localhost:${PORT}`);
});