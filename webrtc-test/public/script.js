/*
  화면공유 필기 중에 들어오는 유저는 필기 확인 불가 버그(화면 크기 바꾸면 다시 돌아옴)
  화면공유 했을 때 안넘어가는 경우가있음.(건모-> 형택: X, 형택->건모: O)
  화면공유한 사람이 나가면 안됨(5/12 수정 완료)
  화면공유 width, height 조절 방식 조정해야될듯.(5/13 수정 완료)
  사람 많아지면 피어 꼬이는 경우 생김(최우선)
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
const extractColorVideo = document.getElementById('extractCam')
const hiddenCamVideo = document.createElement('canvas')
const extractCamArea = document.getElementById('extractCamArea')
const hiddenVideo = document.getElementById('hiddenVideo')

var canvas = document.getElementById(ROOM_ID)
var cursor_canvas = document.getElementById('cursorWhiteboard')

var context = canvas.getContext('2d')
var cursor_context = cursor_canvas.getContext('2d')
var extractContext = extractColorVideo.getContext('2d')
var hiddenCamContext = hiddenCamVideo.getContext('2d')

var user_id
var isCamWrite = false
var isDisplayHost = false
var isPause = false
var isDisplaying = false
var isCam = true
var isMute = false
var isNoCamUser = false
var isMuteUser = false
var isFrist = true
var isCall = {} //콜이 소실되는 경우 판단용
var isDisplayCall = {}
var isWriteLoop = true
var offDisplay = false

var prevImage
var localStream
var localDisplay
var displayCall
var gesturechk = false
var chkfirst = 0

hiddenVideo.style.visibility = 'hidden'
hiddenVideo.width = 1024
hiddenVideo.height = 768
hiddenVideo.muted = true
hiddenCamVideo.style.visibility = 'hidden'
extractCamArea.style.width = 0
extractCamArea.style.height = 0
extractCamArea.appendChild(hiddenCamVideo)
extractColorVideo.width = 0
extractColorVideo.height = 0
myDisplay.id = 'display'
myVideo.muted = true
myVideo.width = 160
myVideo.height = 120
hiddenCamVideo.width = 1024
hiddenCamVideo.height = 768

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.oGetUserMedia || navigator.msGetUserMedia;

var rX = 0.79872  //rX, rY는 최대한 마우스 에임에 맞는 필기를 위해 곱해주는 용도
var rY = 0.8091

const myPeer = new Peer({ })
const peers = {}

function printz(x)  //디버그용
{
  console.log(x)
}

var R,G,B;

var isCamWrite2 = false

extractColorVideo.addEventListener('click', (event) => { 
  const test = document.getElementById('output');
  //var ctx = test.getContext('2d');
  var imageData = extractContext.getImageData(0, 0, 1024, 768);
  imageData.getRGBA = function(i,j,k){
    return this.data[this.width*4*j+4*i+k];
  };
  var x = event.offsetX;
  var y = event.offsetY;
  alert("현재 좌표는 : "+x+" / " +y);
  R = imageData.getRGBA(x,y,0);
  G = imageData.getRGBA(x,y,1);
  B = imageData.getRGBA(x,y,2);
  console.log("R : "+R +", G : ," + G + " B : " + B);
  //const ctest = document.getElementById('coloroutput').getContext("2d");
  //ctest.fillStyle = "rgb("+R+","+G+","+B+")";
  //ctest.fillRect(0,0,50,50);
  //fun_mask();
  isCamWrite2 = true
  extractColorVideo.style.visibility = 'hidden'
});

var thr = 15;
var extractWidth = 1024
var extractHeight = 768

function extractDraw() {
  //const test = document.getElementById('output');
  if(isCamWrite) {
    if(!isCamWrite2) {
      extractContext.save()
      extractContext.scale(-1, 1)
      extractContext.translate(-extractColorVideo.width,0)
      extractContext.drawImage(hiddenVideo, 0, 0, extractColorVideo.width, extractColorVideo.height)
      extractContext.restore()
    }

    hiddenCamContext.save()
    hiddenCamContext.scale(-1, 1)
    hiddenCamContext.translate(-hiddenCamVideo.width,0)
    hiddenCamContext.drawImage(hiddenVideo, 0, 0, hiddenCamVideo.width, hiddenCamVideo.height)
    hiddenCamContext.restore()
    /*
    let src = new cv.Mat(height, width, cv.CV_8UC4);
    let cap = new cv.VideoCapture(myVideo);
    cap.read(src);
    cv.imshow(extractColorVideo,src);
    src.delete()*/
    //extractContext.restore()
    //let imgData = extractContext.getImageData(0, 0, 160, 120);
    //let src = cv.matFromImageData(imgData)      
  if(isCamWrite2) {
    let imgData = hiddenCamContext.getImageData(0, 0, hiddenCamVideo.width, hiddenCamVideo.height);
    //let imgData = extractContext.getImageData(0, 0, 160, 120);
    let src = cv.matFromImageData(imgData);

    let dst = new cv.Mat();
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
    let areathr = 1;
    var realareas=[];
    var sum = 0;
    for(let i = 0;i<cntareas.length;i++){
        if(areathr < cntareas[i]){
          realareas.push(i);
          sum += cntareas[i]*cntareas[i];
        }
    }
    var xx = 0;
    var yy = 0;
    for(let i=0;i<realareas.length;i++){
      var temp = contours.get(realareas[i]);
      xx += (cv.boundingRect(temp).x)/sum*cntareas[realareas[i]]*cntareas[realareas[i]];
      yy += (cv.boundingRect(temp).y)/sum*cntareas[realareas[i]]*cntareas[realareas[i]];
      temp.delete();
    }
    cursor_context.clearRect(0,0, width, height)
    if(xx !=0 && yy !=0){
      cam_mouse.pos.x = xx
      cam_mouse.pos.y = yy
      cursor_context.fillStyle = "red"
      
      cursor_context.fillRect(xx * (width/hiddenCamVideo.width), yy *  (height/hiddenCamVideo.height), 3, 3)
      if(cam_mouse.pos_prev && cam_mouse.click) {
        socket.emit('drawLine', {line: [cam_mouse.pos, cam_mouse.pos_prev], roomId:ROOM_ID, size:[hiddenCamVideo.width, hiddenCamVideo.height]})
      }
      cam_mouse.pos_prev = {x: cam_mouse.pos.x, y: cam_mouse.pos.y}
    }
    src.delete()
    dst.delete()
    ret.delete()
    contours.delete()
    hierarchy.delete()
    low.delete()
    high.delete()
  }
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
  //userBox.appendChild(extractColorVideo)
  userBox.appendChild(myVideo)
  addVideoStream(myVideo, localStream, userBox)
  hiddenVideo.srcObject = localStream
  hiddenVideo.addEventListener('loadedmetadata', () => {
    hiddenVideo.play()
  })
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
      socket.emit('getMute', call.peer, user_id, ROOM_ID)
      if(peers[call.peer] == undefined) {
        bold.id = call.peer
        video.id = call.peer+'!video'  // bold랑 차이두기위함
        userBox.id = call.peer + '!userBox'
        videoBackground.id = call.peer + '!videoBackground'
        addVideoStream(video, userVideoStream, userBox)  //원래 있던 유저들 보여주기
        socket.emit('getName', call.peer, ROOM_ID)
        videoUserName.appendChild(bold)
        bold.appendChild(videoUserNameText)
        userBox.appendChild(videoUserName)
        userBox.appendChild(videoBackground)
        userBox.appendChild(video)
      }
      peers[call.peer] = call
      if(localStream.flag != 2) //?
        socket.emit('getStream_server', user_id, call.peer, ROOM_ID)
    })
  })
}

function connectionLoop(userId, userName) //피어 연결이 제대로 될 때 까지 반복
{
  if(isCall[userId]) {
    console.log('peer connections..')
    if(peers[userId] != undefined)
      peers[userId].close()
    peers[userId] = undefined
    connectToNewUser(userId, userName)
    setTimeout(connectionLoop, 2000, userId, userName)
  }
  else {
  }
}

function firstConnectSocketCall(userId)
{
  socket.emit('newDisplayConnect_server', ROOM_ID, user_id, userId)
}

function connectToNewUser(userId, userName) { //기존 유저 입장에서 새로운 유저가 들어왔을 때
  localStream.flag = 2
  if(isDisplayHost) firstConnectSocketCall(userId) //화면공유중일때 새로 들어온 유저가 화면공유 보도록

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

    peers[userId] = call
  }
}

function addVideoStream(video, stream, userBox) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  videoGrid.append(userBox)
}

function drawChatMessage(data){
  var wrap = document.createElement('div'); 
  if(data.user_id==user_id){
    wrap.className="myMsg"
  }
  else{
    wrap.className="anotherMsg"
  }
  var message = document.createElement('span');
  message.className="msg";

  
  var name = document.createElement('span'); 

  if(data.user_id!=user_id){
    name.className="anotherName";
    name.innerText = data.name+":"; 
  }
  else{
    name.className="myName";
    name.innerText = data.name+"(나):"; 
  }

  name.classList.add('output__user__name'); 
  wrap.appendChild(name); 
  message.innerText = data.message; 
  message.classList.add('output__user__message'); 
  wrap.classList.add('output__user'); 
  wrap.dataset.id = socket.id; 
  wrap.appendChild(message); 
  return wrap; 
}

document.querySelector('#chatInput').addEventListener('keyup', (e)=>{
  if (e.keyCode === 13) {
    var message = chatInput.value; 
  if(!message){
    return false; 
  }
  socket.emit('sendMessage', { message, ROOM_ID, user_id });
  chatInput.value = '';
  }  
});

sendButton.addEventListener('click', function(){ 
  var message = chatInput.value; 
  if(!message){
    return false; 
  }
  socket.emit('sendMessage', { message, ROOM_ID, user_id });
  chatInput.value = '';
});

var camButton = document.getElementById('cam_button')
var audioButton = document.getElementById('audio_button')
var displayButton = document.getElementById('display_button')
var camWriteButton = document.getElementById('camWrite_button')
var gestureButton = document.getElementById('gesture_button')

camButton.addEventListener('click', () => {
  if(isNoCamUser) {
    alert('캠이 없습니다.')
  }
  else {
    if(isCam) {
      myVideoBackground.style.width = '160px'
      myVideoBackground.style.height = '120px'
      myVideo.width = 0
      myVideo.height = 0
      camButton.innerText = '캠 켜기'
    }
    else {
      myVideoBackground.style.width = '0px'
      myVideoBackground.style.height = '0px'
      myVideo.width = 160
      myVideo.height = 120
      camButton.innerText = '캠 끄기'
    }
    localStream.flag = 0
    socket.emit('streamPlay_server', user_id,ROOM_ID,isCam)
    isCam = !isCam    
  }
})

audioButton.addEventListener('click', () => {
  if(!isMuteUser) {
    if(isMute) audioButton.innerText = '마이크 끄기'
    else audioButton.innerText = '마이크 켜기'
    isMute = !isMute
    socket.emit('muteRequest_server', user_id,ROOM_ID,isMute)
  }
  else alert('마이크가 없습니다.')
})

displayButton.addEventListener('click', () => {
  if(!isDisplaying) {
    displayButton.innerText = '공유 종료' //일단 4글자로 맞췄음
    displayPlay()
  }
  else if(isDisplayHost) {
    displayButton.innerText = '화면 공유'
    var displayVideo = document.getElementById('userDisplay')
    displayVideo.remove()
    canvas.style.backgroundColor = '#ffffff'
    socket.emit('displayReset_server', ROOM_ID, user_id)
    socket.emit('displayConnect_server', ROOM_ID, null)
    isDisplayHost = false
    isDisplaying = false
  }
  else alert('화면공유가 이미 켜져있습니다.')
})

camWriteButton.addEventListener('click', () => {
  if(isNoCamUser) alert('캠이 없습니다.')
  else if(!isCam) alert('캠을 켜주세요')
  else {
    if(!isCamWrite) {
      alert("캠에서 펜으로 인식할 부분을 클릭해주세요");
      extractColorVideo.style.visibility = 'visible'
      extractColorVideo.width = canvas.width
      extractColorVideo.height = canvas.height
      isCamWrite = true
      camWriteButton.innerText = '캠 필기 끄기'
    }
    else {
      alert("캠 필기 기능 종료")
      cursor_context.clearRect(0,0, width, height)
      extractColorVideo.style.visibility = 'hidden'
      isCamWrite = false
      isCamWrite2 = false
      camWriteButton.innerText = '캠 필기 켜기'
    }
  }
})

gestureButton.addEventListener('click', () => {
  탄지로()
  if(gesturechk) gestureButton.innerText = '제스처 켜기'
  else gestureButton.innerText = '제스처 끄기'
  gesturechk = !gesturechk
})

function connectionDisplayLoop(userId)
{
  if(isDisplayCall[userId]) {
    console.log('display connecting..')
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
    var displayVideo = document.createElement('video')
    var test = document.getElementById('test')
    displayVideo.id = 'userDisplay'
    displayVideo.width = canvas.width
    displayVideo.height = canvas.height
    const call = myPeer.call(userId, localStream)
    displayCall = call
    call.on('stream', stream => {
      //isDisplaying = true
      localDisplay = stream
      test.append(displayVideo)
      isDisplayCall[userId] = false
      displayVideo.srcObject = stream
      displayVideo.addEventListener('loadedmetadata', () => {
        canvas.style.backgroundColor = 'transparent'
        displayVideo.play()
      })

      displayVideo.addEventListener('play', function() {
        isDisplaying = true
        //draw( this, context, 1024, 768 );
      }, false )
    })
    call.on('error', err => {
    })
}

function displayPlay() {
  var displayVideo = document.createElement('video')
  var test = document.getElementById('test')
  displayVideo.id = 'userDisplay'
  displayVideo.width = canvas.width
  displayVideo.height = canvas.height
  test.append(displayVideo)
  navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  }).then(stream => {
    localStream.flag = 2
    localDisplay = stream
    isDisplayHost= true
    displayVideo.srcObject = stream
    displayVideo.play();
    socket.emit('displayConnect_server', ROOM_ID, user_id)
  }).catch(error => {
    displayButton.innerText = '화면 공유'
    console.log(error)
  });
  displayVideo.addEventListener('play', function() {
    canvas.style.backgroundColor = 'transparent'
    isDisplaying = true
  }, false )
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
  if(userId != user_id) {
    var displayVideo = document.getElementById('userDisplay')
    canvas.style.backgroundColor = '#ffffff'
    displayVideo.remove()
    isDisplaying = false
    displayCall.close()
  }
})

socket.on('muteRequest_script', (userId, roomId, is_mute) => {
  if(roomId == ROOM_ID && userId != user_id) {
    const video = document.getElementById(userId + '!video')
    video.muted = is_mute
    console.log(video.muted)
  }
})

socket.on('streamPlay_script', (userId, roomId, isCam) => {
  if(roomId == ROOM_ID && userId != user_id) {
    const video = document.getElementById(userId + '!video')
    const videoBackground = document.getElementById(userId + '!videoBackground')
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

socket.on('pause_script', (userId, isPause) => {
  const video = document.getElementById(userId+'!video')
  if(video) {
    if(isPause) video.play()
    else video.pause()
  }
})

socket.on('reLoading', (roomId)=>{
  if(roomId == ROOM_ID) {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
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
    chatWindow.scrollTop=chatWindow.scrollHeight;
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
  if(user_id !== userId) {
    const bold = document.getElementById(userId)
    bold.innerHTML = userName
  }
})

socket.on('setMute', (isMute, muteUserId, userId) => {
  if(user_id === userId) {
    const video = document.getElementById(muteUserId + '!video')
    video.muted = isMute
  }
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
  }
  if(e.key == '*' && !isDisplaying) {  //화면공유
    displayButton.innerText = '공유 종료'
    displayPlay()
  }
  if(e.key == '`') {
    cam_mouse.click = true
  }
  if(e.key == '/' && !isNoCamUser) {
    //localStream.getTracks().forEach(t => localStream.removeTrack(t))
    if(isCam) {
      myVideoBackground.style.width = '160px'
      myVideoBackground.style.height = '120px'
      myVideo.width = 0
      myVideo.height = 0
      camButton.innerText = '캠 켜기'
    }
    else {
      myVideoBackground.style.width = '0px'
      myVideoBackground.style.height = '0px'
      myVideo.width = 160
      myVideo.height = 120
      camButton.innerText = '캠 끄기'
    }
    localStream.flag = 0
    socket.emit('streamPlay_server', user_id,ROOM_ID,isCam)
    isCam = !isCam    
  }
  
  if(e.key == '+' && !isMuteUser) {
    if(isMute) audioButton.innerText = '마이크 끄기'
    else audioButton.innerText = '마이크 켜기'
    isMute = !isMute
    socket.emit('muteRequest_server', user_id,ROOM_ID,isMute)
  }
  if(e.key == 'Insert') {  //디버그용
    console.log(thr)
    console.log(myPeer.connections)
  }
  if(e.key == 'Home' && !isNoCamUser && isCam) {
    if(!isCamWrite) {
      alert("캠에서 펜으로 인식할 부분을 클릭해주세요");
      extractColorVideo.style.visibility = 'visible'
      extractColorVideo.width = canvas.width
      extractColorVideo.height = canvas.height
      isCamWrite = true
      camWriteButton.innerText = '캠 필기 끄기'
    }
    else {
      alert("캠 필기 기능 종료")
      cursor_context.clearRect(0,0, width, height)
      extractColorVideo.style.visibility = 'hidden'
      isCamWrite = false
      isCamWrite2 = false
      camWriteButton.innerText = '캠 필기 켜기'
    }
  }
  if(e.key === 'PageUp') thr += 1
  if(e.key === 'PageDown') thr -= 1
  if(e.key === 'g'){
    탄지로()
    if(gesturechk) gestureButton.innerText = '제스처 켜기'
    else gestureButton.innerText = '제스처 끄기'
    gesturechk = !gesturechk
  } 
})

document.addEventListener("keyup", (e) => {
  if(e.key == '`') {  
    cam_mouse.click = false
    chkfirst = 0
  }
})

var mouse = {
  click: false,
  move: false,
  pos: {x:0, y:0},
  pos_prev: false
}
var cam_mouse = {
  click: false,
  move: false,
  pos: {x:0, y:0},
  pos_prev: false
}
var relativeX = 3
var relativeY = 188

var width = window.innerWidth
var height = window.innerHeight
//---캔버스 코드 시작---
document.addEventListener("DOMContentLoaded", ()=> {
  var socket = io.connect()
  canvas.width = parseInt(width*rX)
  canvas.height = parseInt(height-200)

  cursor_canvas.width = parseInt(width*rX)
  cursor_canvas.height = parseInt(height-200)
  
  cursor_canvas.onmousedown = (e) => {mouse.click = true}
  cursor_canvas.onmouseup = (e) => {mouse.click = false}

  cursor_canvas.onmousemove = (e) => {
    mouse.pos.x = (e.pageX - relativeX)
    mouse.pos.y = (e.pageY - relativeY)
    mouse.move = true
  }

  socket.on('drawLine', data => {
    var line = data.line
    var size = data.size
    if(ROOM_ID == data.roomId) {
      if(chkfirst < 2) {
        chkfirst++
      }
      else{
        context.beginPath()
        context.lineWidth = 2
        context.moveTo(line[0].x * (width/size[0]), line[0].y * (height/size[1]))
        context.lineTo(line[1].x * (width/size[0]), line[1].y * (height/size[1]))
        context.stroke()
      }
    }
  })

  function extractLoop() {
    extractDraw()
    setTimeout(extractLoop, 25)
  }
  function mainLoop() {
    if(isDisplayHost && localDisplay.active === false) {
      var displayVideo = document.getElementById('userDisplay')
      displayVideo.remove()
      canvas.style.backgroundColor = '#ffffff'
      socket.emit('displayReset_server', ROOM_ID, user_id)
      isDisplayHost = false
      isDisplaying = false
      displayButton.innerText = '화면 공유'
    }
    if(isDisplaying) {
      var displayVideo = document.getElementById('userDisplay')
      if(displayVideo !== null) {
        
        displayVideo.width = canvas.width
        displayVideo.height = canvas.height
    }
    }

    if(isCamWrite && isWriteLoop) {
      isWriteLoop = !isWriteLoop
      extractLoop()
    }

    width = parseInt(window.innerWidth*rX)
    height = parseInt(window.innerHeight-200)
    if(canvas.width != width || canvas.height != height) {  //웹 페이지 크기가 변할 때
      socket.emit('reDrawing', ROOM_ID)
      canvas.width = width
      canvas.height = height

      cursor_canvas.width = width
      cursor_canvas.height = height

      extractColorVideo.width = width
      extractColorVideo.height = height
    }

    if(mouse.click && mouse.move && mouse.pos_prev) {
      socket.emit('drawLine', {line: [mouse.pos, mouse.pos_prev], roomId:ROOM_ID, size:[width, height]})
      /*
      context.beginPath()
      context.lineWidth = 2
      context.moveTo(mouse.pos.x, mouse.pos.y )
      context.lineTo(mouse.pos_prev.x , mouse.pos_prev.y )
      context.stroke()*/

      mouse.move = false
    }
    mouse.pos_prev = {x: mouse.pos.x, y: mouse.pos.y}
    setTimeout(mainLoop, 20)  //최종은 20
  }
  socket.emit('reDrawing', ROOM_ID)
  mainLoop()
  //---캔버스 코드 끝---
})


//=제스처
const config = {
  video: { width: 1024, height: 768, fps: 30 }
};

async function 탄지로() {

  const video = document.getElementById('hiddenVideo')

  const knownGestures = [
    fp.Gestures.VictoryGesture,
    fp.Gestures.ThumbsUpGesture
  ];
  const GE = new fp.GestureEstimator(knownGestures);

  // load handpose model
  const model = await handpose.load();
  console.log("Handpose model loaded");

  // main estimation loop
  const estimateHands = async () => {

    const predictions = await model.estimateHands(video, true);

    for(let i = 0; i < predictions.length; i++) {

      const est = GE.estimate(predictions[i].landmarks, 7.5);

      if(est.gestures.length > 0) {

        let result = est.gestures.reduce((p, c) => { 
          return (p.confidence > c.confidence) ? p : c;
        });

        console.log(result.name);
      }
    }

    // ...and so on
    if(gesturechk)
      setTimeout(() => { estimateHands(); }, 1000 / config.video.fps);
  };

  estimateHands();
  console.log("Starting predictions");
}
//-제스처