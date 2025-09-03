const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const toggleVideoBtn = document.getElementById('toggleVideoBtn');
const toggleAudioBtn = document.getElementById('toggleAudioBtn');

const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const statusDiv = document.getElementById('status');

let localStream;
let peerConnection;
let partnerId;
let isVideoOn = true;
let isAudioOn = true;

// Get user media
async function initMedia() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
}

// Socket events
socket.on('match', async (id) => {
  partnerId = id;
  statusDiv.innerText = "Status: Connected!";
  nextBtn.disabled = false;
  disconnectBtn.disabled = false;
  messageInput.disabled = false;
  sendBtn.disabled = false;

  peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = (event) => remoteVideo.srcObject = event.streams[0];

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) socket.emit('signal', { to: partnerId, signal: event.candidate });
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('signal', { to: partnerId, signal: offer });
});

socket.on('signal', async (data) => {
  if (!peerConnection) {
    peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.ontrack = (event) => remoteVideo.srcObject = event.streams[0];
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) socket.emit('signal', { to: data.from, signal: event.candidate });
    };
  }

  if (data.signal.type === 'offer') {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('signal', { to: data.from, signal: answer });
  } else if (data.signal.type === 'answer') {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
  } else if (data.signal.candidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal));
  }
});

// Chat messages
sendBtn.onclick = () => {
  const msg = messageInput.value;
  if (!msg || !partnerId) return;
  socket.emit('chat', { to: partnerId, message: msg });
  addMessage(`You: ${msg}`);
  messageInput.value = '';
};

socket.on('chat', (data) => {
  addMessage(`Stranger: ${data.message}`);
});

function addMessage(msg) {
  const div = document.createElement('div');
  div.innerText = msg;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Buttons
startBtn.onclick = async () => {
  await initMedia();
  socket.emit('ready');
  startBtn.disabled = true;
  statusDiv.innerText = "Status: Waiting for stranger...";
};

nextBtn.onclick = () => {
  disconnectChat();
  socket.emit('ready');
  statusDiv.innerText = "Status: Waiting for stranger...";
};

disconnectBtn.onclick = () => {
  disconnectChat();
  statusDiv.innerText = "Status: Not connected";
};

toggleVideoBtn.onclick = () => {
  isVideoOn = !isVideoOn;
  localStream.getVideoTracks()[0].enabled = isVideoOn;
};

toggleAudioBtn.onclick = () => {
  isAudioOn = !isAudioOn;
  localStream.getAudioTracks()[0].enabled = isAudioOn;
};

function disconnectChat() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  partnerId = null;
  nextBtn.disabled = true;
  disconnectBtn.disabled = true;
  messageInput.disabled = true;
  sendBtn.disabled = true;
  remoteVideo.srcObject = null;
}
