import { Client, GatewayIntentBits } from 'discord.js';
import { WebSocket } from 'ws';
import http from 'http';

const server = http.createServer();
const wss = new WebSocket.Server({ noServer: true, path: '/discord-ws' });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Keep track of connected WebSocket clients
const connectedClients = new Set();

wss.on('connection', (ws) => {
  console.log('Connected to WebSocket server');

  // Add the connected client to the set
  connectedClients.add(ws);

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    // Remove the disconnected client from the set
    connectedClients.delete(ws);
  });
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', (message) => {
  if (message.channel.id === '1146980018631737386') {
    console.log(`${message.author.tag}: ${message.content}`);
    
    // Check if there are connected WebSocket clients
    if (connectedClients.size > 0) {
      const messageData = {
        author: message.author.tag,
        content: message.content,
        timestamp: message.createdAt.toISOString(), // Include the timestamp
      };
      
      // Send the message data to all connected clients
      connectedClients.forEach((ws) => {
        ws.send(JSON.stringify(messageData));
      });
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
});

client.login(process.env.discord_token); // Replace with your bot token

const port = process.env.PORT || 36343; // Use the assigned Heroku port or a default port
server.listen(PORT, () => {
  console.log(`Node server listening on port ${PORT}`);
});
