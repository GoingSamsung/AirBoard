const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const sendButton = document.getElementById('chatMessageSendBtn')
const chatInput = document.getElementById('chatInput')
var user_name = prompt('대화명을 입력해주세요.', '');
const myPeer = new Peer()
  /*undefined, {
  host: '/',
  port: '3001'
})*/
const myVideo = document.createElement('video')
myVideo.muted = true
const peers = {}
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  stream.user_name=user_name
  addVideoStream(myVideo, stream , 1)

  myPeer.on('call', call => {
    call.answer(stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream, call)
    })
  })

  socket.on('user-connected', (userId, userName) => {
    connectToNewUser(userId, stream)
  })
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close()
})

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id, user_name)
})

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream)
  const video = document.createElement('video')
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream, call)
  })
  call.on('close', () => {
    video.remove()
  })

  peers[userId] = call
}

function addVideoStream(video, stream, x) {
  console.log(x)
  var user_box = document.createElement('user_box')
  var video_user_name = document.createElement('video_user_name') //비디오에 이름 표시 코드
  var bold = document.createElement('b')
  var video_user_name_text = document.createTextNode(stream.user_name)
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  video_user_name.appendChild(bold)
  bold.appendChild(video_user_name_text)
  user_box.appendChild(video_user_name)
  user_box.appendChild(video)
  videoGrid.append(user_box)
}

var chatWindow = document.getElementById('chatWindow'); 
socket.on('updateMessage', function(data)
{ if(data.name === 'SERVER'){ var info = document.getElementById('info'); 
info.innerHTML = data.message; setTimeout(() => { info.innerText = ''; }, 1000); }
else if(ROOM_ID==data.ROOM_ID){ //사용자의 ROOM_ID와 화상 회의방의 ROOM_ID가 같은가??
  var chatMessageEl = drawChatMessage(data); 
  chatWindow.appendChild(chatMessageEl); } }); 
  function drawChatMessage(data){ var wrap = document.createElement('p'); 
  var message = document.createElement('span'); var name = document.createElement('span'); 
  name.innerText = data.name + ': '; message.innerText = data.message; 
  name.classList.add('output__user__name'); 
  message.classList.add('output__user__message'); 
  wrap.classList.add('output__user'); wrap.dataset.id = socket.id; wrap.appendChild(name); 
  wrap.appendChild(message); return wrap; }

socket.on('updateMessage', function(data){ //입장 메시지인데 아직 불완전함.
  if(data.name === 'SERVER'){ var info = document.getElementById('info'); 
  info.innerHTML = data.message; }else{ } });

sendButton.addEventListener('click', function(){ 
  var message = chatInput.value; 
  if(!message) return false; 
  socket.emit('sendMessage', { message, ROOM_ID }); chatInput.value = ''; });