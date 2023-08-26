const http = require('http');
const WebSocket = require('ws');
const server = http.createServer();
const wss = new WebSocket.Server({ server });

const cors = require('cors'); // Import the cors package
const express = require('express');
const app = express();

const { createClient } = require("@supabase/supabase-js");

// Use the cors middleware
app.use(cors());

const supabaseUrl = "https://supabase.brostonks.com";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjkzMDU5OTYyLCJleHAiOjIwMDg0MTk5NjJ9.JnlrUwdGleburTGcmWTCMlzAe0dzSxkZmQ2i3BjWyJM";

const sdk = require("api")("@mobula-api/v1.0#4cpc4om4lkxxs6mc");
sdk.auth("227cbd70-db72-4532-a285-bfaf74481af5"); // Set the authorization header using the auth method

let isWebSocketActive = false; // Flag to track WebSocket activity
let interval;

function startCheckApiInterval() {
  if (!isWebSocketActive) {
    // Start the interval to run checkApi() every 10 seconds
    interval = setInterval(checkApi, 1500);
    isWebSocketActive = true;
  }
}

function stopCheckApiInterval() {
  if (isWebSocketActive) {
    // Stop the interval
    clearInterval(interval);
    isWebSocketActive = false;
  }
}

function checkApi() {
  console.log("Starting API check"); // Debugging: Add a log statement at the beginning

  sdk
    .multiData({ assets: "bitcoin,litecoin,ethereum,tether,dogecoin" })
    .then((response) => {
      console.log("API response received"); // Debugging: Log when the API response is received

      const cryptocurrencies = response.data.data;

      for (const [name, cryptoData] of Object.entries(cryptocurrencies)) {
        console.log(`Processing ${name}`); // Debugging: Log which cryptocurrency is being processed

        const record = {
          name: name,
          market_cap: cryptoData.market_cap,
          liquidity: cryptoData.liquidity,
          price: cryptoData.price,
          volume: cryptoData.volume,
          volume_7d: cryptoData.volume_7d,
          is_listed: cryptoData.is_listed,
          updated_at: new Date().toISOString(),
        };

        supabase
          .from("crypto")
          .upsert([record], { onConflict: ["name"] })
          .then((response) => console.log(response))
          .catch((error) => console.error("Error upserting:", error));
      }
    })
    .catch((err) => console.error(err));
}

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const messageText = message.toString();
    if (messageText === 'startFetching') {
      startCheckApiInterval();
    } else if (messageText.startsWith('ping:')) {
      const originalPingTimestamp = messageText.split(':')[1];
      const pongTimestamp = new Date().getTime();
      ws.send(`pong:${pongTimestamp}:${originalPingTimestamp}`);
    }
  });

  ws.on('close', () => {
    stopCheckApiInterval(); // Stop the interval when the WebSocket connection is closed
  });

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
});


const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Node server listening on port ${PORT}`);
});
