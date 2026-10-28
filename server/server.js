import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { WebSocketServer } from 'ws';

// Change 'COM12' to match your Device Manager port if it changes
const SERIAL_PATH = process.env.SERIAL_PORT || 'COM12'; 
const BAUD_RATE = 921600;
const WS_PORT = 8080;

const wss = new WebSocketServer({ port: WS_PORT });
console.log(`PULSEGUARD WebSocket Server active on ws://localhost:${WS_PORT}`);

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

// Start the auto-connecting loop
connectSerial();