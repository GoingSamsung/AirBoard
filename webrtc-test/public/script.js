const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const sendButton = document.getElementById('chatMessageSendBtn')
const chatInput = document.getElementById('chatInput')
var user_name = prompt('대화명을 입력해주세요.', '');
var user_id
var isDisplayHost = false
var isPause = false
var isDisplaying = false
var drawPause = false
var isCam = true
var isMute = true
var isNoCamUser = false
var isMuteUser = false
var canvas = document.getElementById(ROOM_ID)
var context = canvas.getContext('2d')
var prev_image
var localStream
var localDisplay
const nocamVideo = document.getElementById('nocam__video')
const myPeer = new Peer({

})
function printz(x)
{
  console.log(x)
}
const myVideo = document.createElement('video')
const myDisplay = document.createElement('video')
myDisplay.id = 'display'
myVideo.muted = true
const peers = {}

function userJoin(stream, stream2)
{
  localStream = stream2
  localStream.flag = 0
  const user_box = document.createElement('user_box')
  var video_user_name = document.createElement('video_user_name') //비디오에 이름 표시 코드
  var bold = document.createElement('b')
  var video_user_name_text = document.createTextNode(user_name)

  video_user_name.appendChild(bold)
  bold.appendChild(video_user_name_text)
  user_box.appendChild(video_user_name)
  user_box.appendChild(myVideo)
  addVideoStream(myVideo, stream, user_box, true)

  getNewUser()

  socket.on('user-connected', (userId, userName) => {
    connectToNewUser(userId, userName, stream)
  })
}

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
}).then(async(stream) => {
  userJoin(stream, stream)
  isMute = false
}).catch(error => {
  navigator.mediaDevices.getUserMedia({ //캠 x
    video: false,
    audio: true,
  }).then(async(stream) => {
    isNoCamUser = true
    isMute = false
    userJoin(stream, nocamVideo.captureStream())
  }).catch(error => { //캠 마이크 x
    /*
    isNoCamUser = true
    isMuteUser = true
    userJoin(nocamVideo.captureStream(), nocamVideo.captureStream())*/
  })
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close()
})

socket.on('setName', (userId, userName) => {
  const bold = document.getElementById(userId)
  bold.innerHTML = userName
})

myPeer.on('open', id => {
  printz("peer open")
  user_id = id
  socket.emit('join-room', ROOM_ID, id, user_name)
})

function getNewUser(){
  myPeer.on('call', call => {
    printz("!?")
    if(localStream.flag == 2)
      call.answer(localStream)
    else if(localStream.flag == 1)
      call.answer(nocamVideo.captureStream())
    else if(localDisplay == undefined)
      call.answer(localStream)
    else
      call.answer(localDisplay)
    const video_user_name = document.createElement('video_user_name') //비디오에 이름 표시 코드
    const bold = document.createElement('b')
    const video_user_name_text = document.createTextNode('loading..')
    const video = document.createElement('video')
    const user_box = document.createElement('user_box')

    call.on('stream', userVideoStream => {
      if(peers[call.peer] == undefined) {
        bold.id = call.peer
        video.id = call.peer+'!video'  // bold랑 차이두기위함
        addVideoStream(video, userVideoStream, user_box, true)  //원래 있던 유저들 보여주기
        socket.emit('getName', call.peer)
        video_user_name.appendChild(bold)
        bold.appendChild(video_user_name_text)
        user_box.appendChild(video_user_name)
        user_box.appendChild(video)
        peers[call.peer] = call
      }
    })
    call.on('close', () => {
      user_box.remove()
    })
  })
}

function connectToNewUser(userId, userName, stream) { //기존 유저 입장에서 새로운 유저가 들어왔을 때
  if(isDisplayHost) { //화면공유중일때 새로 들어온 유저가 화면공유 보도록
    socket.emit('isDisplaying_script', isDisplaying, ROOM_ID)
    socket.emit('drawPause_script',drawPause, ROOM_ID)
    socket.emit('new_display_connect', ROOM_ID, user_id, userId)
    if(prev_image != undefined && prev_image != null && drawPause)
      socket.emit('imageSend', ROOM_ID, user_id, prev_image)
  }
  if(peers[userId] == undefined) {
    const call = myPeer.call(userId, localStream)
    const video = document.createElement('video')
    const user_box = document.createElement('user_box')
    const video_user_name = document.createElement('video_user_name') //비디오에 이름 표시 코드
    const bold = document.createElement('b')
    const video_user_name_text = document.createTextNode(userName)

    call.on('stream', userVideoStream => {
      console.log("!@@!")
      video.id = userId + '!video' //bold랑 차이두기 위해 !붙임
      video_user_name.appendChild(bold)

      bold.appendChild(video_user_name_text)
      user_box.appendChild(video_user_name)
      user_box.appendChild(video)
      addVideoStream(video, userVideoStream, user_box, false)
    })
    call.on('close', () => {
      user_box.remove()
    })
    peers[userId] = call
  }
}

function addVideoStream(video, stream, user_box, cnt) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  videoGrid.append(user_box)
}

var chatWindow = document.getElementById('chatWindow'); 
socket.on('updateMessage', function(data){ 
  if(data.name === 'SERVER'){
    var info = document.getElementById('info'); 

    info.innerHTML = data.message;
    setTimeout(() => {info.innerText = ''; }, 1000);
  }
  else if(ROOM_ID==data.ROOM_ID){ //사용자의 ROOM_ID와 화상 회의방의 ROOM_ID가 같은가??
  var chatMessageEl = drawChatMessage(data); 
  
  chatWindow.appendChild(chatMessageEl); 
  } 
}); 

function drawChatMessage(data){
  var wrap = document.createElement('p'); 
  var message = document.createElement('span');
  var name = document.createElement('span'); 

  name.innerText = data.name + ': '; message.innerText = data.message; 
  name.classList.add('output__user__name'); 
  message.classList.add('output__user__message'); 
  wrap.classList.add('output__user'); wrap.dataset.id = socket.id; wrap.appendChild(name); 
  wrap.appendChild(message); 
  return wrap; 
}

socket.on('updateMessage', function(data){ //입장 메시지
  if(data.name === 'SERVER'){
    var info = document.getElementById('info'); 
    info.innerHTML = data.message; 
  }
  else{ }
});

sendButton.addEventListener('click', function(){ 
  var message = chatInput.value; 
  if(!message){
    return false; 
  }
  socket.emit('sendMessage', { message, ROOM_ID });
  chatInput.value = '';
});

//---화면 공유---
function connectToDisplay(userId) {
    var displayBox = document.getElementById('displayBox')
    var video = document.createElement('video')
    video.id = 'userDisplay'
    displayBox.append(video)
    const call = myPeer.call(userId, localStream)
    printz(call)
    call.on('stream', stream => {
      printz(stream+'??')
      video.srcObject = stream
      video.addEventListener('loadedmetadata', () => {
        video.play()
      })
    })
    call.on('error', err => {
       printz(err)
    })


    video.addEventListener('play', function() {
      draw( this, context, 1024, 768 );
    }, false )
}
socket.on('display_connected', (roomId, userId) => {
  if(roomId == ROOM_ID && userId != user_id)
    connectToDisplay(userId)
})
socket.on('new_display_connected', (roomId, userId, newUserId) => {
  if(roomId == ROOM_ID && userId != user_id && newUserId == user_id)
    connectToDisplay(userId)
})

function displayPlay() {
  var displayBox = document.getElementById('displayBox')
  var video = document.createElement('video')
  video.id = 'userDisplay'
  displayBox.append(video)
  navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  }).then(stream => {
    localDisplay = stream
    localDisplay.flag = 1
    isDisplaying= !isDisplaying
    isDisplayHost= true
    socket.emit('isDisplaying_script', isDisplaying, ROOM_ID)
    video.srcObject = stream
    video.play();
    socket.emit('display_connect', ROOM_ID, user_id)
  }).catch(error => {
    console.log(error)
  });
  video.addEventListener('play', function() {
    draw( this, context, 1024, 768 );
  }, false )
}


function draw( video, context, width, height ) {
  width = parseInt(window.innerWidth*0.742)
  height = parseInt(window.innerHeight*0.753)
  if(!drawPause) {
    context.drawImage( video, 0, 0, width, height );
    prev_image = canvas.toDataURL()
    if(canvas.width != width || canvas.height != height) {
      otherDraw(context, prev_image)
      canvas.width = width
      canvas.height = height
    }
    /*
    var img = new Image();
    img.addEventListener('load', ()=> {
      context.drawImage(img, 0,0)
    })
    img.src = prev_image
    */

    //if(prev_image != undefined && prev_image != null)
     //socket.emit('imageSend', ROOM_ID, user_id, prev_image)
  }
  setTimeout(draw, 50, video, context, width, height)  //20프레임
}


socket.on('drawImage', (roomId,userId,image)=>{
  if(userId != user_id && roomId == ROOM_ID) {
    prev_image = image
    otherDraw(context, image)
  }
})

function otherDraw(context, image) {
  var img = new Image();
  img.addEventListener('load', ()=> {
    context.drawImage(img, 0,0)
  })
  img.src = image
}

//---화면 공유 끝---

document.addEventListener("keydown", (e) => {
  if(e.key == ' ') {  
    if(isPause)
      myVideo.play()
    else
      myVideo.pause()
    socket.emit('pauseServer', user_id, isPause)
    isPause=!isPause
  }
  if(e.key == 'Escape')  {//지우개
    socket.emit('clearWhiteBoard', ROOM_ID)
    if(isDisplaying && drawPause) {
      otherDraw(canvas.getContext('2d'), prev_image)
      socket.emit('imageSend', ROOM_ID, user_id, prev_image)
    }
  }
  if(e.key == '*' && !isDisplaying)   //화면공유
    displayPlay()
  if(e.key == '-' && isDisplaying && isDisplayHost) {//화면 정지
    drawPause = !drawPause
    socket.emit('drawPause_script',drawPause, ROOM_ID)
  }
   
  if(e.key == '/' && !isNoCamUser) {
    if(isCam) {
      localStream.flag = 1
      myVideo.srcObject = nocamVideo.captureStream()
      myVideo.addEventListener('loadedmetadata', () => {
        myVideo.play()
      })
      socket.emit('stream_play', user_id,ROOM_ID)
    }
    else {
      localStream.flag = 2
      myVideo.srcObject = localStream
      myVideo.addEventListener('loadedmetadata', () => {
        myVideo.play()
      })
      socket.emit('stream_play', user_id,ROOM_ID)
    }
    isCam = !isCam
  }
  if(e.key == '+' && !isMuteUser) {
    printz(isMute)
    if(isMute) {
      myVideo.muted = false
      socket.emit('mute_request', user_id,ROOM_ID,isMute)
    }
    else {
      myVideo.muted = true
      socket.emit('mute_request', user_id,ROOM_ID,isMute)
    }
    isMute = !isMute
  }
  if(e.key == 'Insert') {  //디버그용
    printz(localStream.flag)
    printz(localDisplay.flag)
  }
})

socket.on('muteRequest', (userId, roomId, is_mute) => {
  if(roomId == ROOM_ID && userId != user_id) {
    const video = document.getElementById(userId + '!video')
    video.muted = !is_mute
  }
})

socket.on('streamPlay', (userId, roomId) => {
  if(roomId == ROOM_ID && userId != user_id) {
    const call = myPeer.call(userId, localStream)
    const video = document.getElementById(userId + '!video')
    call.on('stream', userVideoStream => {
      console.log("ABC")
      video.srcObject = userVideoStream
      video.addEventListener('loadedmetadata', () => {
        video.play()
      })
    })
  }
})

socket.on('drawPause_server', (tf,roomId) =>{
  if(ROOM_ID==roomId)
    drawPause = tf
})

socket.on('isDisplaying_server', (tf,roomId) =>{
  if(ROOM_ID==roomId)
    isDisplaying = tf
})

socket.on('pause', (userId, isPause) => {
  const video = document.getElementById(userId+'!video')
  if(video) {
    if(isPause)
      video.play()
    else
      video.pause()
  }
})

socket.on('reLoading', (roomId)=>{
  if(roomId == ROOM_ID) {
    canvas.width += 1
    canvas.width -= 1
    socket.emit('reDrawing', ROOM_ID)
  }
})

//---캔버스 코드 시작---
document.addEventListener("DOMContentLoaded", ()=> {
  var mouse = {
    click: false,
    move: false,
    pos: {x:0, y:0},
    pos_prev: false
  }
  var width = window.innerWidth
  var height = window.innerHeight
  var socket = io.connect()
  var relativeX = 8
  var relativeY = 188 //이거 값 유동적으로 할 수 있도록 해아함
  var rX = 0.742
  var rY = 0.753
  canvas.width = parseInt(width*rX)
  canvas.height = parseInt(height*rY)

  canvas.onmousedown = (e) => {mouse.click = true}
  canvas.onmouseup = (e) => {mouse.click = false}

  canvas.onmousemove = (e) => {
    mouse.pos.x = (e.pageX - relativeX)
    mouse.pos.y = (e.pageY - relativeY) //상대좌표로하려면 height로 나누기
    mouse.move = true
  }

  socket.on('drawLine', data => {
    var line = data.line
    if(ROOM_ID == data.roomId) {
    context.beginPath()
    context.lineWidth = 2
    context.moveTo(line[0].x, line[0].y)
    context.lineTo(line[1].x, line[1].y)  //상대좌표로하려면 x는 width로 y는 height로 나누기
    context.stroke()
    }
  })

  function outerLoop(){
    if(drawPause) {
      mainLoop()
    }
    else {
      setTimeout(outerLoop, 50)
    }
  }
  function mainLoop() {
    width = parseInt(window.innerWidth*rX)
    height = parseInt(window.innerHeight*rY)
    if(canvas.width != width || canvas.height != height) {
      socket.emit('reDrawing', ROOM_ID)
      otherDraw(context, prev_image)
      canvas.width = width
      canvas.height = height
    }
    if(isDisplaying && !drawPause) {
      socket.emit('clearWhiteBoard', ROOM_ID)
      outerLoop()
    }
    else {
      if(mouse.click && mouse.move && mouse.pos_prev) {
        socket.emit('drawLine', {line: [mouse.pos, mouse.pos_prev], roomId:ROOM_ID})
        mouse.move = false
      }
      mouse.pos_prev = {x: mouse.pos.x, y: mouse.pos.y}
    setTimeout(mainLoop, 25)  //최종은 25로
    }
  }
  socket.emit('reDrawing', ROOM_ID)
  mainLoop()
  //---캔버스 코드 끝---
})