// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Random pairing logic
let waitingUser = null;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // When user clicks Start or Next
  socket.on('ready', () => {
    if (waitingUser && waitingUser !== socket.id) {
      // Pair the users
      io.to(waitingUser).emit('match', socket.id);
      socket.emit('match', waitingUser);
      waitingUser = null;
    } else {
      waitingUser = socket.id;
    }
  });

  // WebRTC signaling
  socket.on('signal', (data) => {
    io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
  });

  // Text chat
  socket.on('chat', (data) => {
    io.to(data.to).emit('chat', { message: data.message });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (waitingUser === socket.id) waitingUser = null;
  });
});

// Use Render-provided port or default 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
