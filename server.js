const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('../public'));

let waitingUser = null;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // When user is ready to chat
  socket.on('ready', () => {
    if (waitingUser && waitingUser !== socket.id) {
      // Pair users
      io.to(waitingUser).emit('match', socket.id);
      socket.emit('match', waitingUser);
      waitingUser = null;
    } else {
      waitingUser = socket.id;
    }
  });

  // Relay WebRTC signaling
  socket.on('signal', (data) => {
    io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
  });

  // Relay chat messages
  socket.on('chat', (data) => {
    io.to(data.to).emit('chat', { message: data.message });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (waitingUser === socket.id) waitingUser = null;
  });
});

server.listen(3000, () => console.log('Server running on port 3000'));
