/*
  화면공유 필기 중에 들어오는 유저는 필기 확인 불가 버그(화면 크기 바꾸면 다시 돌아옴)
  캠 끄기 켜기 기능 사용시 렉 심해지는 버그(아직 원인 불명)
*/
var user_name = prompt('대화명을 입력해주세요.', '')

while(user_name == null || user_name == undefined || user_name == '') user_name = prompt('대화명을 다시 입력해주세요.', '')

const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const sendButton = document.getElementById('chatMessageSendBtn')
const chatInput = document.getElementById('chatInput')
const nocamVideo = document.getElementById('nocam__video')
const myVideo = document.createElement('video')
const myDisplay = document.createElement('video')
myDisplay.id = 'display'
myVideo.muted = true

var user_id
var isDisplayHost = false
var isPause = false
var isDisplaying = false
var drawPause = false
var isCam = true
var isMute = true
var isNoCamUser = false
var isMuteUser = false
var isCall = {} //콜이 소실되는 경우 판단용
var isDisplayCall = {}
var offDisplay = false
var canvas = document.getElementById(ROOM_ID)
var context = canvas.getContext('2d')
var prevImage
var localStream
var localDisplay

const myPeer = new Peer({ })
const peers = {}

function printz(x)  //디버그용
{
  console.log(x)
}

// 
function rgb2hsv (r, g, b) {
  let rabs, gabs, babs, rr, gg, bb, h, s, v, diff, diffc, percentRoundFn;
  rabs = r / 255;
  gabs = g / 255;
  babs = b / 255;
  v = Math.max(rabs, gabs, babs),
  diff = v - Math.min(rabs, gabs, babs);
  diffc = c => (v - c) / 6 / diff + 1 / 2;
  percentRoundFn = num => Math.round(num * 100) / 100;
  if (diff == 0) {
      h = s = 0;
  } else {
      s = diff / v;
      rr = diffc(rabs);
      gg = diffc(gabs);
      bb = diffc(babs);

      if (rabs === v) {
          h = bb - gg;
      } else if (gabs === v) {
          h = (1 / 3) + rr - bb;
      } else if (babs === v) {
          h = (2 / 3) + gg - rr;
      }
      if (h < 0) {
          h += 1;
      }else if (h > 1) {
          h -= 1;
      }
  }
  return {
      h: Math.round(h * 360),
      s: percentRoundFn(s * 100),
      v: percentRoundFn(v * 100)
  };
}
function loops()
{
  var widthtest = 480;
  var heighttest = 360;
  const test = document.getElementById('output');
  let src = new cv.Mat(heighttest, widthtest, cv.CV_8UC4);
  let cap = new cv.VideoCapture(myVideo);
  cap.read(src);
  cv.imshow(test,src);
  // const colorout = document.getElementById('coloroutput');
  // cv.imshow(colorout,src);
  setTimeout(loops, 50)
}
function fun_mask(R,G,B){
  var widthtest = 480;
  var heighttest = 360;
  const colorout = document.getElementById('coloroutput');
  let tmp = new cv.Mat(heighttest, widthtest, cv.CV_8UC4);
  let cap = new cv.VideoCapture(myVideo);
  cap.read(tmp);
  cv.imshow(colorout,tmp);
  console.log(R);
  console.log(G);
  console.log(B);
  const out = document.getElementById('coloroutput')
  let ctx = out.getContext("2d");
  let imgData = ctx.getImageData(0, 0, 480, 360);
  let src = cv.matFromImageData(imgData);

  let dst = new cv.Mat();
  var thr = 15;
  let low = new cv.Mat(src.rows, src.cols, src.type(), [R-thr, G-thr, B-thr, 0]);
  let high = new cv.Mat(src.rows, src.cols, src.type(), [R+thr, G+thr, B+thr, 255]);
  
  cv.inRange(src, low, high, dst);
  //let tmpimg = new cv.Mat();
  //cv.cvtColor(src, tmpimg, cv.COLOR_RGBA2GRAY,0);
  
  //cv.imshow(out,tmpimg);
  let ret = new cv.Mat();
  cv.bitwise_and(src, src, ret, dst);

  
  cv.cvtColor(ret, ret, cv.COLOR_RGBA2GRAY, 0);
  cv.threshold(ret, ret, 0, 200, cv.THRESH_BINARY);
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  
  cv.findContours(ret, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

  // let contourtest = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
  // let contoursColor = new cv.Scalar(255, 255, 255);
  // cv.drawContours(contourtest, contours, 0, contoursColor, 1, 8, hierarchy, 100);

  var cntareas=[];
  for(let i = 0;i<contours.size();i++){
    cntareas.push(cv.contourArea(contours.get(i)));
  }
  console.log(cntareas);
  let maxx = 0;
  let anspoint = 0;
  for(let i = 0;i<cntareas.length;i++){
      if(maxx < cntareas[i]){
        console.log(cntareas[i]);
        maxx = cntareas[i];
        anspoint = i;
      }
  }
  let ans = contours.get(anspoint);
  let rect = cv.boundingRect(ans);

  console.log(rect.x, rect.y);

  cv.imshow(out, ret);
}
function clickCanvas(event){
  const test = document.getElementById('output');
  var ctx = test.getContext('2d');
  var imageData = ctx.getImageData(0, 0, 480, 360);
  imageData.getRGBA = function(i,j,k){
    return this.data[this.width*4*j+4*i+k];
  };
  var x = event.offsetX;
  var y = event.offsetY;
  alert("현재 좌표는 : "+x+" / " +y);
  var R = imageData.getRGBA(x,y,0);
  var G = imageData.getRGBA(x,y,1);
  var B = imageData.getRGBA(x,y,2);
  console.log("R : "+R +", G : ," + G + " B : " + B);
  const ctest = document.getElementById('coloroutput').getContext("2d");
  ctest.fillStyle = "rgb("+R+","+G+","+B+")";
  ctest.fillRect(0,0,50,50);
  fun_mask(R,G,B);
}

function userJoin(stream, stream2)
{
  localStream = stream2
  localStream.flag = 0
  const userBox = document.createElement('userBox')
  var videoUserName = document.createElement('videoUserName') //비디오에 이름 표시 코드
  var bold = document.createElement('b')
  var videoUserNameText = document.createTextNode(user_name)

  videoUserName.appendChild(bold)
  bold.appendChild(videoUserNameText)
  userBox.appendChild(videoUserName)
  userBox.appendChild(myVideo)
 

  addVideoStream(myVideo, stream, userBox)

  getNewUser()

  socket.on('user-connected', (userId, userName) => {
    isCall[userId] = true
    connectionLoop(userId, userName)
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
    alert('마이크나 캠 중 하나를 켜주세요.')
    window.location.href = '/'
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

myPeer.on('open', id => { //피어 접속시 맨 처음 실행되는 피어 함수
  user_id = id
  socket.emit('join-room', ROOM_ID, id, user_name)
})

function getNewUser(){
  myPeer.on('error', err => {
    printz(err.type)
  })
  myPeer.on('call', call => {
    if(isDisplayHost && localStream.flag == 2)
      call.answer(localDisplay)
    else if(localStream.flag == 1)
      call.answer(nocamVideo.captureStream())
    else
      call.answer(localStream)

    const videoUserName = document.createElement('videoUserName') //비디오에 이름 표시 코드
    const bold = document.createElement('b')
    const videoUserNameText = document.createTextNode('loading..')
    const video = document.createElement('video')
    const userBox = document.createElement('userBox')

    call.on('stream', userVideoStream => {
      if(peers[call.peer] == undefined) {
        bold.id = call.peer
        video.id = call.peer+'!video'  // bold랑 차이두기위함
        addVideoStream(video, userVideoStream, userBox)  //원래 있던 유저들 보여주기
        socket.emit('getName', call.peer)
        videoUserName.appendChild(bold)
        bold.appendChild(videoUserNameText)
        userBox.appendChild(videoUserName)
        userBox.appendChild(video)
        peers[call.peer] = call
      }
    })
    call.on('close', () => {
      userBox.remove()
    })
  })
}

function connectionLoop(userId, userName) //피어 연결이 제대로 될 때 까지 반복
{
  if(isCall[userId]) {
    peers[userId] = undefined
    connectToNewUser(userId, userName)
    setTimeout(connectionLoop, 2000, userId, userName)
  }
  else {
  }
}

function connectToNewUser(userId, userName) { //기존 유저 입장에서 새로운 유저가 들어왔을 때
  localStream.flag = 2
  if(isDisplayHost) { //화면공유중일때 새로 들어온 유저가 화면공유 보도록
    socket.emit('isDisplaying_script', isDisplaying, ROOM_ID)
    socket.emit('drawPause_script',drawPause, ROOM_ID)
    socket.emit('newDisplayConnect_server', ROOM_ID, user_id, userId)
    if(prevImage != undefined && prevImage != null && drawPause)
      socket.emit('imageSend', ROOM_ID, user_id, prevImage)
  }
  //if(!isCam)  캠 끈거 들어오자마자 받아들이는 건데 일단 보류
    //socket.emit('streamPlay_server', user_id,ROOM_ID)
  //socket.emit('muteRequest_server', user_id,ROOM_ID,isMute)
  if(peers[userId] == undefined) {
    const call = myPeer.call(userId, localStream)
    const video = document.createElement('video')
    const userBox = document.createElement('userBox')
    const videoUserName = document.createElement('videoUserName') //비디오에 이름 표시 코드
    const bold = document.createElement('b')
    const videoUserNameText = document.createTextNode(userName)

    call.on('stream', userVideoStream => {
      isCall[userId] = false
      video.id = userId + '!video' //bold랑 차이두기 위해 !붙임
      videoUserName.appendChild(bold)

      bold.appendChild(videoUserNameText)
      userBox.appendChild(videoUserName)
      userBox.appendChild(video)
      addVideoStream(video, userVideoStream, userBox)
    })
    call.on('close', () => {
      userBox.remove()
    })
    peers[userId] = call
  }
}

function addVideoStream(video, stream, userBox) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    // 
    video.width = 480;
    video.height = 360;
    video.play()
    loops()
  })
  videoGrid.append(userBox)
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

  name.innerText = data.name + ': '; 
  message.innerText = data.message; 
  name.classList.add('output__user__name'); 
  message.classList.add('output__user__message'); 
  wrap.classList.add('output__user'); 
  wrap.dataset.id = socket.id; wrap.appendChild(name); 
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

function connectionDisplayLoop(userId)
{
  if(isDisplayCall[userId]) {
    connectToDisplay(userId)
    setTimeout(connectionDisplayLoop, 2000, userId)
  }
  else {
  }
}

//---화면 공유---
function connectToDisplay(userId) {
    var displayBox = document.getElementById('displayBox')
    var video = document.createElement('video')
    video.id = 'userDisplay'
    const call = myPeer.call(userId, localStream)
    call.on('stream', stream => {
      isDisplaying = true
      localDisplay = stream
      displayBox.append(video)
      isDisplayCall[userId] = false
      video.srcObject = stream
      video.addEventListener('loadedmetadata', () => {
        video.play()
      })

      video.addEventListener('play', function() {
        draw( this, context, 1024, 768 );
      }, false )
    })
    call.on('error', err => {
    })
}
socket.on('displayConnect_script', (roomId, userId) => {
  if(roomId == ROOM_ID && userId != user_id) {
    isDisplayCall[userId] = true
    connectionDisplayLoop(userId)
  }
})
socket.on('newDisplayConnect_script', (roomId, userId, newUserId) => {
  if(roomId == ROOM_ID && userId != user_id && newUserId == user_id) {
    isDisplayCall[userId] = true
    connectionDisplayLoop(userId)
  }
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
    localStream.flag = 2
    localDisplay = stream
    isDisplaying= !isDisplaying
    isDisplayHost= true
    //socket.emit('isDisplaying_script', isDisplaying, ROOM_ID)
    video.srcObject = stream
    video.play();
    socket.emit('displayConnect_server', ROOM_ID, user_id)
  }).catch(error => {
    console.log(error)
  });
  video.addEventListener('play', function() {
    draw( this, context, 1024, 768 );
  }, false )
}


function draw( video, context, width, height ) {
  if(localDisplay.active == true && isDisplaying) {
    width = parseInt(window.innerWidth*0.742)
    height = parseInt(window.innerHeight*0.753)
    if(!drawPause) {
      context.drawImage( video, 0, 0, width, height );
      prevImage = canvas.toDataURL()
      if(canvas.width != width || canvas.height != height) {
        otherDraw(context, prevImage)
        canvas.width = width
        canvas.height = height
      }
    }
    setTimeout(draw, 50, video, context, width, height)  //20프레임
  }
  else{
    if(isDisplayHost) socket.emit('displayReset_server', ROOM_ID, user_id)
    isDisplayHost = false
    isDisplaying = false
    drawPause = false
    offDisplay = true
    prevImage = null
  }
}

socket.on('displayReset_script', (roomId, userId) => {
  if(userId != user_id)
    isDisplaying = false
})

socket.on('drawImage', (roomId,userId,image)=>{
  if(userId != user_id && roomId == ROOM_ID) {
    prevImage = image
    otherDraw(context, image)
  }
})

function otherDraw(context, image) {
  var img = new Image();
  img.addEventListener('load', ()=> {
    context.drawImage(img, 0,0, width, height)
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
    socket.emit('pause_server', user_id, isPause)
    isPause=!isPause
  }
  if(e.key == 'Escape')  {//지우개
    socket.emit('clearWhiteBoard', ROOM_ID)
    if(isDisplaying && drawPause) {
      otherDraw(canvas.getContext('2d'), prevImage)
      socket.emit('imageSend', ROOM_ID, user_id, prevImage)
    }
  }
  if(e.key == '*' && !isDisplaying)   //화면공유
    displayPlay()
  if(e.key == '-' && isDisplaying && isDisplayHost) {//화면 정지
    drawPause = !drawPause
    socket.emit('drawPause_script',drawPause, ROOM_ID)
  }
   
  if(e.key == '/' && !isNoCamUser) {  //렉 심해지는 버그 잇음
    if(isCam) {
      localStream.flag = 1
      myVideo.srcObject = nocamVideo.captureStream()
      myVideo.addEventListener('loadedmetadata', () => {
        myVideo.play()
      })
      socket.emit('streamPlay_server', user_id,ROOM_ID)
    }
    else {
      localStream.flag = 0
      myVideo.srcObject = localStream
      myVideo.addEventListener('loadedmetadata', () => {
        myVideo.play()
      })
      socket.emit('streamPlay_server', user_id,ROOM_ID)
    }
    isCam = !isCam
  }
  /*
  if(e.key == '+' && !isMuteUser) { 음소거 일단 보류
    if(isMute)
      socket.emit('muteRequest_server', user_id,ROOM_ID,isMute)
    isMute = !isMute
  }*/
  if(e.key == 'Insert') {  //디버그용
    printz(localDisplay.active, localDisplay.srcObject)
  }
})

socket.on('muteRequest_script', (userId, roomId, is_mute) => {
  if(roomId == ROOM_ID && userId != user_id) {
    const video = document.getElementById(userId + '!video')
    video.muted = !is_mute
  }
})

socket.on('streamPlay_script', (userId, roomId) => {
  if(roomId == ROOM_ID && userId != user_id) {
    const call = myPeer.call(userId, localStream)
    const video = document.getElementById(userId + '!video')
    call.on('stream', userVideoStream => {
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

socket.on('pause_script', (userId, isPause) => {
  const video = document.getElementById(userId+'!video')
  if(video) {
    if(isPause) video.play()
    else video.pause()
  }
})

socket.on('reLoading', (roomId)=>{
  if(roomId == ROOM_ID) {
    canvas.width += 1
    canvas.width -= 1
    socket.emit('reDrawing', ROOM_ID)
  }
})

var width = window.innerWidth
var height = window.innerHeight
//---캔버스 코드 시작---
document.addEventListener("DOMContentLoaded", ()=> {
  var mouse = {
    click: false,
    move: false,
    pos: {x:0, y:0},
    pos_prev: false
  }
  var socket = io.connect()
  var relativeX = 8
  var relativeY = 188
  var rX = 0.742  //rX, rY는 최대한 마우스 에임에 맞는 필기를 위해 곱해주는 용도
  var rY = 0.753
  canvas.width = parseInt(width*rX)
  canvas.height = parseInt(height*rY)

  canvas.onmousedown = (e) => {mouse.click = true}
  canvas.onmouseup = (e) => {mouse.click = false}

  canvas.onmousemove = (e) => {
    mouse.pos.x = (e.pageX - relativeX)
    mouse.pos.y = (e.pageY - relativeY)
    mouse.move = true
  }

  socket.on('drawLine', data => {
    var line = data.line
    var size = data.size

    if(ROOM_ID == data.roomId) {
    context.beginPath()
    context.lineWidth = 2
    context.moveTo(line[0].x * (width/size[0]), line[0].y * (height/size[1]))
    context.lineTo(line[1].x * (width/size[0]), line[1].y * (height/size[1]))
    context.stroke()
    }
  })
  function outerLoop(){
    if(drawPause) mainLoop()
    else if(offDisplay) {
      offDisplay = !offDisplay  //화면공유 껐을 때 알아차리고 루프 빠져나오기 위함
      mainLoop()
    }
    else setTimeout(outerLoop, 50)
  }
  function mainLoop() {
    /// 
    


    ///
    width = parseInt(window.innerWidth*rX)
    height = parseInt(window.innerHeight*rY)
    if(canvas.width != width || canvas.height != height) {  //웹 페이지 크기가 변할 때
      socket.emit('reDrawing', ROOM_ID)
      otherDraw(context, prevImage)
      canvas.width = width
      canvas.height = height
    }
    if(isDisplaying && !drawPause) {  //방송중이고 방송 일시정지가 아니면
      socket.emit('clearWhiteBoard', ROOM_ID)
      outerLoop()
    }
    else {
      if(mouse.click && mouse.move && mouse.pos_prev) {
        socket.emit('drawLine', {line: [mouse.pos, mouse.pos_prev], roomId:ROOM_ID, size:[width, height]})
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