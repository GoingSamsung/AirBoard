/*
  화면공유 필기 중에 들어오는 유저는 필기 확인 불가 버그(화면 크기 바꾸면 다시 돌아옴)
  화면공유 했을 때 안넘어가는 경우가있음.
  캠 끄기 켜기 기능 최적화가 필요할듯
  모션 인식 연동
*/
var user_name = prompt('대화명을 입력해주세요.', '')

while(user_name == null || user_name == undefined || user_name == '') user_name = prompt('대화명을 다시 입력해주세요.', '')

const socket = io('/')
var chatWindow = document.getElementById('chatWindow'); 
const videoGrid = document.getElementById('video-grid')
const sendButton = document.getElementById('chatMessageSendBtn')
const chatInput = document.getElementById('chatInput')
const nocamVideo = document.getElementById('nocam__video')
const myVideo = document.createElement('video')
const myDisplay = document.createElement('video')
const myVideoBackground = document.createElement('videoBackground')
const extractColorVideo = document.createElement('canvas')
extractColorVideo.width = 0
extractColorVideo.height = 0
myDisplay.id = 'display'
myVideo.muted = true
myVideo.width = 160
myVideo.height = 120

var user_id
var isCamWrite = false
var isDisplayHost = false
var isPause = false
var isDisplaying = false
var drawPause = false
var isCam = true
var isMute = true
var isNoCamUser = false
var isMuteUser = false
var isFrist = true
var isCall = {} //콜이 소실되는 경우 판단용
var isDisplayCall = {}
var offDisplay = false
var canvas = document.getElementById(ROOM_ID)
var context = canvas.getContext('2d')
var extractContext = extractColorVideo.getContext('2d')
var prevImage
var localStream
var localDisplay
var displayCall

const myPeer = new Peer({ })
const peers = {}

function printz(x)  //디버그용
{
  console.log(x)
}

//제스처 테스트
async function gesturetest() {

  var getest = document.querySelector("#getest");
if (navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(function (stream) {
      getest.srcObject = stream;
    })
    .catch(function (err0r) {
      console.log("Something went wrong!");
    });
}

  // Load the MediaPipe handpose model.
  const model = await handpose.load();
  // Pass in a video stream (or an image, canvas, or 3D tensor) to obtain a
  // hand prediction from the MediaPipe graph.
  const predictions = await model.estimateHands(document.querySelector("#getest"));
  console.log("test");
  if (predictions.length > 0) {
    /*
    `predictions` is an array of objects describing each detected hand, for example:
    [
      {
        handInViewConfidence: 1, // The probability of a hand being present.
        boundingBox: { // The bounding box surrounding the hand.
          topLeft: [162.91, -17.42],
          bottomRight: [548.56, 368.23],
        },
        landmarks: [ // The 3D coordinates of each hand landmark.
          [472.52, 298.59, 0.00],
          [412.80, 315.64, -6.18],
          ...
        ],
        annotations: { // Semantic groupings of the `landmarks` coordinates.
          thumb: [
            [412.80, 315.64, -6.18]
            [350.02, 298.38, -7.14],
            ...
          ],
          ...
        }
      }
    ]
    */

    for (let i = 0; i < predictions.length; i++) {
      const keypoints = predictions[i].landmarks;

      // Log hand keypoints.
      for (let i = 0; i < keypoints.length; i++) {
        const [x, y, z] = keypoints[i];
        console.log(`Keypoint ${i}: [${x}, ${y}, ${z}]`);
      }
    }
  }
}
//--제스처 테스트 끝--

extractColorVideo.addEventListener('click', (event) => { 
  const test = document.getElementById('output');
  //var ctx = test.getContext('2d');
  var imageData = extractContext.getImageData(0, 0, 160, 120);
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
  //const ctest = document.getElementById('coloroutput').getContext("2d");
  //ctest.fillStyle = "rgb("+R+","+G+","+B+")";
  //ctest.fillRect(0,0,50,50);
  fun_mask(R,G,B);
});

function extractDraw( video, context, width, height ) {
  //const test = document.getElementById('output');
  if(isCamWrite) {
    let src = new cv.Mat(height, width, cv.CV_8UC4);
    let cap = new cv.VideoCapture(myVideo);
    cap.read(src);
    cv.imshow(extractColorVideo,src);
    setTimeout(extractDraw, 50, video, context, width, height)  //20프레임
  }
}
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
function fun_mask(R,G,B){
  let tmp = new cv.Mat(120, 160, cv.CV_8UC4);
  let cap = new cv.VideoCapture(myVideo);
  cap.read(tmp);
  console.log(R);
  console.log(G);
  console.log(B);
  //let ctx = out.getContext("2d");
  let imgData = extractContext.getImageData(0, 0, 160, 120);
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
}

myPeer.on('open', id => { //피어 접속시 맨 처음 실행되는 피어 함수
  user_id = id
  socket.emit('join-room', ROOM_ID, id, user_name)
})

function userJoin()
{
  localStream.flag = 0
  const userBox = document.createElement('userBox')
  var videoUserName = document.createElement('videoUserName') //비디오에 이름 표시 코드
  var bold = document.createElement('b')
  var videoUserNameText = document.createTextNode(user_name)

  videoUserName.appendChild(bold)
  bold.appendChild(videoUserNameText)
  userBox.appendChild(videoUserName)
  userBox.appendChild(myVideoBackground)
  userBox.appendChild(extractColorVideo)
  userBox.appendChild(myVideo)
  addVideoStream(myVideo, localStream, userBox)

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
  localStream = stream
  userJoin()
  isMute = false
}).catch(error => {
  navigator.mediaDevices.getUserMedia({ //캠 x
    video: false,
    audio: true,
  }).then(async(stream) => {
    isNoCamUser = true
    isMute = false
    localStream = stream
    for(const track of nocamVideo.captureStream().getVideoTracks())
      localStream.addTrack(track)
    userJoin()
  }).catch(error => { //캠 마이크 x
    //alert('마이크나 캠 중 하나를 켜주세요.')
    //window.location.href = '/'
    
    isNoCamUser = true
    isMuteUser = true
    localStream = nocamVideo.captureStream()
    userJoin()
  })
})

function getNewUser()
{
  myPeer.on('error', err => {
    printz(err.type)
  })
  myPeer.on('call', call => {
    if(isDisplayHost && localStream.flag == 2) call.answer(localDisplay)
    else call.answer(localStream)

    const videoUserName = document.createElement('videoUserName') //비디오에 이름 표시 코드
    const bold = document.createElement('b')
    const videoUserNameText = document.createTextNode('loading..')
    const video = document.createElement('video')
    video.width = 0
    video.height = 0
    const userBox = document.createElement('userBox')
    const videoBackground = document.createElement('videoBackground')
    videoBackground.style.width = '160px'
    videoBackground.style.height = '120px'

    call.on('stream', userVideoStream => {
      if(peers[call.peer] == undefined) {
        bold.id = call.peer
        video.id = call.peer+'!video'  // bold랑 차이두기위함
        userBox.id = call.peer + '!userBox'
        videoBackground.id = call.peer + '!videoBackground'
        addVideoStream(video, userVideoStream, userBox)  //원래 있던 유저들 보여주기
        socket.emit('getName', call.peer)
        videoUserName.appendChild(bold)
        bold.appendChild(videoUserNameText)
        userBox.appendChild(videoUserName)
        userBox.appendChild(videoBackground)
        userBox.appendChild(video)
      }
      else if(localStream.flag != 2){
        const nV = document.getElementById(call.peer+'!video')
        nV.pause()
        nV.srcObject = userVideoStream
        nV.addEventListener('loadedmetadata', () => {
          nV.play()
        })
      }
      peers[call.peer] = call
      socket.emit('getStream_server', user_id, call.peer, ROOM_ID)
    })
    /*
    call.on('close', () => {
      userBox.remove()
    })*/
  })
}

function connectionLoop(userId, userName) //피어 연결이 제대로 될 때 까지 반복
{
  if(isCall[userId]) {
    if(peers[userId] != undefined)
      peers[userId].close()
    peers[userId] = undefined
    connectToNewUser(userId, userName)
    setTimeout(connectionLoop, 2000, userId, userName)
  }
  else {
  }
}

function connectToNewUser(userId, userName) { //기존 유저 입장에서 새로운 유저가 들어왔을 때
  localStream.flag = 2
  if(isDisplayHost) firstConnectSocketCall() //화면공유중일때 새로 들어온 유저가 화면공유 보도록

  //if(!isCam)  캠 끈거 들어오자마자 받아들이는 건데 일단 보류
    //socket.emit('streamPlay_server', user_id,ROOM_ID)
  //socket.emit('muteRequest_server', user_id,ROOM_ID,isMute)
  if(peers[userId] == undefined) {
    const call = myPeer.call(userId, localStream)
    const video = document.createElement('video')
    video.width = 160
    video.height = 120
    const userBox = document.createElement('userBox')
    userBox.id = userId + '!userBox'
    const videoUserName = document.createElement('videoUserName') //비디오에 이름 표시 코드
    const bold = document.createElement('b')
    const videoUserNameText = document.createTextNode(userName)
    const videoBackground = document.createElement('videoBackground')

    call.on('stream', userVideoStream => {
      isCall[userId] = false
      video.id = userId + '!video' //bold랑 차이두기 위해 !붙임
      videoBackground.id = userId + '!videoBackground'
      videoUserName.appendChild(bold)

      bold.appendChild(videoUserNameText)
      userBox.appendChild(videoUserName)
      userBox.appendChild(videoBackground)
      userBox.appendChild(video)
      addVideoStream(video, userVideoStream, userBox)
    })
    /*
    call.on('close', () => {
      userBox.remove()
    })*/
    peers[userId] = call
  }
}

function addVideoStream(video, stream, userBox) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    gesturetest();
    video.play()
  })
  videoGrid.append(userBox)
}

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
    if(displayCall != undefined)
      displayCall.close()
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
    displayCall = call
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
  if(isDisplayHost) {
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
      socket.emit('displayReset_server', ROOM_ID, user_id)
      isDisplayHost = false
      isDisplaying = false
      drawPause = false
      offDisplay = true
      prevImage = null
    }
  }
  else {
    if(isDisplaying) {
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
      displayCall.close()
      isDisplaying = false
      drawPause = false
      offDisplay = true
      prevImage = null
    }
  }
}

function otherDraw(context, image) {
  var img = new Image();
  img.addEventListener('load', ()=> {
    context.drawImage(img, 0,0, width, height)
  })
  img.src = image
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

socket.on('muteRequest_script', (userId, roomId, is_mute) => {
  if(roomId == ROOM_ID && userId != user_id) {
    const video = document.getElementById(userId + '!video')
    video.muted = !is_mute
  }
})

socket.on('streamPlay_script', (userId, roomId, isCam) => {
  if(roomId == ROOM_ID && userId != user_id) {
    /*
    console.log(myPeer._connections)
    peers[userId].close()
    const call = myPeer.call(userId, localStream)
    peers[userId] = call*/
    const video = document.getElementById(userId + '!video')
    const videoBackground = document.getElementById(userId + '!videoBackground')
    //videoBackground.backgroundColor='black'
    //videoBackground.display='block'
    /*
    call.on('stream', userVideoStream => {
      video.srcObject = userVideoStream
      video.addEventListener('loadedmetadata', () => {
        video.play()
      })
    })
    */
   if(isCam) {
    videoBackground.style.width = '160px'
    videoBackground.style.height = '120px'
    video.width = 0
    video.height = 0
   }
   else {
    videoBackground.style.width = '0px'
    videoBackground.style.height = '0px'
    video.width = 160
    video.height = 120
   }
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

socket.on('updateMessage', function(data){ //입장 메시지
  if(data.name === 'SERVER'){
    var info = document.getElementById('info'); 
    info.innerHTML = data.message; 
  }
  else{ }
});

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

socket.on('getStream_script', (userId_caller, userId_callee, roomId) => {
  if(user_id == userId_callee && roomId == ROOM_ID)
    socket.emit('sendStream_server', userId_caller, user_id, ROOM_ID, isCam)
})

socket.on('sendStream_script', (userId_caller, userId_callee, roomId, isCam) => {
  if(user_id == userId_caller && roomId == ROOM_ID) {
    const video = document.getElementById(userId_callee + '!video')
    const videoBackground = document.getElementById(userId_callee + '!videoBackground')
   if(!isCam) {
    videoBackground.style.width = '160px'
    videoBackground.style.height = '120px'
    video.width = 0
    video.height = 0
   }
   else {
    videoBackground.style.width = '0px'
    videoBackground.style.height = '0px'
    video.width = 160
    video.height = 120
   }
  }
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) {
    peers[userId].close()
    const userBox = document.getElementById(userId + '!userBox')
    userBox.remove()
  }
})

socket.on('setName', (userId, userName) => {
  const bold = document.getElementById(userId)
  bold.innerHTML = userName
})

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
   
  if(e.key == '/' && !isNoCamUser) {
    //localStream.getTracks().forEach(t => localStream.removeTrack(t))
    if(isCam) {
      myVideoBackground.style.width = '160px'
      myVideoBackground.style.height = '120px'
      myVideo.width = 0
      myVideo.height = 0
      /*
      navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      }).then(async(stream) => {
        for(const track of stream.getTracks())
          localStream.addTrack(track)
        for(const track of nocamVideo.captureStream().getVideoTracks())
          localStream.addTrack(track)
      })*/

    }
    else {
      myVideoBackground.style.width = '0px'
      myVideoBackground.style.height = '0px'
      myVideo.width = 160
      myVideo.height = 120
      /*
      navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      }).then(async(stream) => {
        for(const track of stream.getTracks())
          localStream.addTrack(track)
      })*/
    }
    localStream.flag = 0
    socket.emit('streamPlay_server', user_id,ROOM_ID,isCam)
    isCam = !isCam    
  }
  /*
  if(e.key == '+' && !isMuteUser) { 음소거 일단 보류
    if(isMute)
      socket.emit('muteRequest_server', user_id,ROOM_ID,isMute)
    isMute = !isMute
  }*/
  if(e.key == 'Insert') {  //디버그용
    printz(myPeer._connections)
  }
  if(e.key == 'Home') {
    if(!isCamWrite) {
      alert("캠에서 펜으로 인식할 부분을 클릭해주세요");
      myVideo.width = 160
      myVideo.height = 120
      myVideo.style.visibility = 'hidden'
      extractColorVideo.width = 160
      extractColorVideo.height = 120
      isCamWrite = true
      extractDraw(myVideo, extractContext, 160, 120)
    }
    else {
      myVideo.style.visibility = 'visible'
      extractColorVideo.width = 0
      extractColorVideo.height = 0
      isCamWrite = false
    }
  }
  if(e.key === 'Delete') {
    window.open('/views/gesture')
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