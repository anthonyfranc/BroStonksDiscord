const http = require('http');
const WebSocket = require('ws');
const server = http.createServer();
const wss = new WebSocket.Server({ server });

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://web.brostonks.com";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";
const supabase = createClient(supabaseUrl, supabaseKey);

const sdk = require("api")("@mobula-api/v1.0#4cpc4om4lkxxs6mc");
sdk.auth("227cbd70-db72-4532-a285-bfaf74481af5"); // Set the authorization header using the auth method

let isWebSocketActive = false; // Flag to track WebSocket activity
let interval;

function startCheckApiInterval() {
  if (!isWebSocketActive) {
    // Start the interval to run checkApi() every 10 seconds
    interval = setInterval(checkApi, 500);
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
  sdk
    .multiData({ assets: "bitcoin,litecoin,ethereum,tether,dogecoin" })
    .then((response) => {
      const cryptocurrencies = response.data.data;

      for (const [name, cryptoData] of Object.entries(cryptocurrencies)) {
        // Fetch existing record from the database
        supabase
          .from("crypto")
          .select("*")
          .eq("name", name)
          .single()
          .then((dbRecord) => {
            if (!dbRecord || hasFieldsChanged(dbRecord, cryptoData)) {
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
          .catch((error) => console.error("Error fetching from database:", error));
      }
    })
    .catch((err) => console.error(err));
}

function hasFieldsChanged(dbRecord, newCryptoData) {
  return (
    dbRecord.market_cap !== newCryptoData.market_cap ||
    dbRecord.liquidity !== newCryptoData.liquidity ||
    dbRecord.price !== newCryptoData.price ||
    dbRecord.volume !== newCryptoData.volume ||
    dbRecord.volume_7d !== newCryptoData.volume_7d
  );
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
