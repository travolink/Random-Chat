const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let waitingUser = null;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('ready', () => {
    if (waitingUser && waitingUser !== socket.id) {
      io.to(waitingUser).emit('match', socket.id);
      socket.emit('match', waitingUser);
      waitingUser = null;
    } else {
      waitingUser = socket.id;
    }
  });

  socket.on('signal', (data) => {
    io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
  });

  socket.on('chat', (data) => {
    io.to(data.to).emit('chat', { message: data.message });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (waitingUser === socket.id) waitingUser = null;
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
