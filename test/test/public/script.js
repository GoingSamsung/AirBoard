const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const sendButton = document.getElementById('chatMessageSendBtn')
const chatInput = document.getElementById('chatInput')
var user_name = prompt('대화명을 입력해주세요.', '');
var stream_id
var flag = 0
const myPeer = new Peer({

})

const myVideo = document.createElement('video')
myVideo.muted = true
const peers = {}
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
}).then(async(stream) => {
  await waitSetStreamId(stream.id)
  const user_box = document.createElement('user_box')
  var video_user_name = document.createElement('video_user_name') //비디오에 이름 표시 코드
  var bold = document.createElement('b')
  var video_user_name_text = document.createTextNode(user_name)
  video_user_name.appendChild(bold)
  bold.appendChild(video_user_name_text)
  user_box.appendChild(video_user_name)
  user_box.appendChild(myVideo)
  addVideoStream(myVideo, stream, user_box)

  myPeer.on('call', call => {
    call.answer(stream)
    const video_user_name = document.createElement('video_user_name') //비디오에 이름 표시 코드
    const bold = document.createElement('b')
    const video_user_name_text = document.createTextNode('loading..')
    const video = document.createElement('video')
    const user_box = document.createElement('user_box')
    call.on('stream', userVideoStream => {
      bold.id = userVideoStream.id
      addVideoStream(video, userVideoStream, user_box)  //원래 있던 유저들 보여주기
      socket.emit('getName', userVideoStream.id)
      video_user_name.appendChild(bold)
      bold.appendChild(video_user_name_text)
      user_box.appendChild(video_user_name)
      user_box.appendChild(video)
    })
  })

  socket.on('user-connected', (userId, userName) => {
    connectToNewUser(userId, userName, stream)
  })
})
async function waitSetStreamId(x)
{
  stream_id = x
  flag = 1
}
socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close()
})

socket.on('setName', (streamId, userName) => {
  const bold = document.getElementById(streamId)
  bold.innerHTML = userName
})

myPeer.on('open', id => {
  if(flag) {
    setTimeout(500)
    socket.emit('join-room', ROOM_ID, id, user_name,stream_id)
  }
  else
    socket.emit('join-room', ROOM_ID, id, user_name,stream_id)
})

function connectToNewUser(userId, userName, stream) { //기존 유저 입장에서 새로운 유저가 들어왔을 때
  const call = myPeer.call(userId, stream)
  const video = document.createElement('video')
  const user_box = document.createElement('user_box')
  const video_user_name = document.createElement('video_user_name') //비디오에 이름 표시 코드
  const bold = document.createElement('b')
  const video_user_name_text = document.createTextNode(userName)
  call.on('stream', userVideoStream => {
    video_user_name.appendChild(bold)
    bold.appendChild(video_user_name_text)
    user_box.appendChild(video_user_name)
    user_box.appendChild(video)
    addVideoStream(video, userVideoStream, user_box)
  })
  call.on('close', () => {    
    user_box.remove()
  })

  peers[userId] = call
}

function addVideoStream(video, stream, user_box) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
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

