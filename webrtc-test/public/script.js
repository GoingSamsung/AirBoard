/*
  화면공유 했을 때 안넘어가는 경우가있음.(건모-> 형택: X, 형택->건모: O)
  호스트 기능들 추가
  시나리오 보여줄 기능들 다 넣기
  되돌리기 했을 때 맨 처음 필기 늘어나는 현상 있음
*/
var user_name = prompt('대화명을 입력해주세요.', '')
if(user_name === null) window.location.href = '/'
while(user_name == null || user_name == undefined || user_name == '' || user_name.length > 6)  {
  if(user_name.length > 6) user_name = prompt('대화명을 6자 이하로 설정해주세요.', '')
  else user_name = prompt('대화명을 다시 입력해주세요.', '')
}

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
var capture = document.getElementById('capture')
var cursor_canvas = document.getElementById('cursorWhiteboard')

var penStyle = 'pen'
var penColor = 'black'
var penWidth = 2

var canvasImage = new Image()

var context = canvas.getContext('2d')
var captureContext = capture.getContext('2d')
var cursor_context = cursor_canvas.getContext('2d')
var extractContext = extractColorVideo.getContext('2d')
var hiddenCamContext = hiddenCamVideo.getContext('2d')

canvasImage.onload = function() {
  context.drawImage(canvasImage, 0,0, canvas.width, canvas.height)
}

var user_id
var isHost = false
var isCamWrite = false
var isDisplayHost = false
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
var isCanvas = true
var hostCanvas = true
var isEachCanvas = false
var hostEachCanvas = false

var prevImage
var localStream
var localDisplay
var displayCall
var gesturechk = false
var chkfirst = 0
var palmcnt = 0

var menu

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
myVideo.height = 118
hiddenCamVideo.width = 1024
hiddenCamVideo.height = 768

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.oGetUserMedia || navigator.msGetUserMedia;

var rX = 0.79872  //rX, rY는 최대한 마우스 에임에 맞는 필기를 위해 곱해주는 용도
var rY = 0.8091

//const myPeer = new Peer({host:'goingsamsung-peerjs-server.herokuapp.com', secure:true, port:443})
const myPeer = new Peer({})
const peers = {}

function printz(x)  //디버그용
{
  console.log(x)
}

/*
if (window.Worker) {
  // Worker 쓰레드를 생성(js파일를 로드)
  let worker = new Worker("worker.js");
  // 에러가 발생할 경우 발생!
  worker.onerror = (e)=>{
  console.log("error " + e.message);
  }
  // worker.js에서 postMessage의 값을 받는다.
  worker.onmessage = (e)=>{
  // 콘솔 출력
  console.log(e.data);
  }
  worker.postMessage("hello")
}
*/

var R = []
var G = []
var B = []
var isCamWrite2 = false

var cntt = 0

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
  tmpR = imageData.getRGBA(x,y,0);
  tmpG = imageData.getRGBA(x,y,1);
  tmpB = imageData.getRGBA(x,y,2);
  
  // console.log now displays actual color palette instead of RGB values
  var consoleColorPaletteCSS = "background: #" + (tmpR.toString(16).length == 2 ? tmpR.toString(16) : ('0' + tmpR.toString(16))) + (tmpG.toString(16).length == 2 ? tmpG.toString(16) : ('0' + tmpG.toString(16))) + (tmpB.toString(16).length == 2 ? tmpB.toString(16) : ('0' + tmpB.toString(16))) + ';';
  console.log("Color:" + "%c  ", consoleColorPaletteCSS);
  // console.log now displays actual color palette instead of RGB values
  
  R.push(tmpR);
  G.push(tmpG);
  B.push(tmpB);
  //const ctest = document.getElementById('coloroutput').getContext("2d");
  //ctest.fillStyle = "rgb("+R+","+G+","+B+")";
  //ctest.fillRect(0,0,50,50);
  //fun_mask();

  cntt++
  if(cntt === 4) {
    isCamWrite2 = true
    extractColorVideo.style.visibility = 'hidden'
    cntt=0
  }
});

var thr = 5;
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

    let maxR = Math.max.apply(null,R)+thr;
    let minR = Math.min.apply(null,R)-thr;
    let maxG = Math.max.apply(null,G)+thr;
    let minG = Math.min.apply(null,G)-thr;
    let maxB = Math.max.apply(null,B)+thr;
    let minB = Math.min.apply(null,B)-thr;

    let low = new cv.Mat(src.rows, src.cols, src.type(), [minR, minG,minB, 0]);
    let high = new cv.Mat(src.rows, src.cols, src.type(), [maxR, maxG, maxB, 255]);

    cv.inRange(src, low, high, dst);

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
    
    var camRelativeMouseY = yy/hiddenCamVideo.height
    var camRelativeMouseX = xx/hiddenCamVideo.width

    changeCanvasImage(camRelativeMouseX, camRelativeMouseY, cam_selected, 0)
    if(xx !=0 && yy !=0){
      cam_mouse.pos.x = xx
      cam_mouse.pos.y = yy
      cursor_context.fillStyle = "red"

      cursor_context.fillRect(xx * (width/hiddenCamVideo.width), yy * (height/hiddenCamVideo.height), 3, 3)
      if(cam_mouse.pos_prev && cam_mouse.click && penStyle === 'pen' && isCanvas) {
        if(camRelativeMouseY < 0.905 && cam_mouse.pos_prev.y/hiddenCamVideo.height < 0.905)
          socket.emit('drawLine', {line: [cam_mouse.pos, cam_mouse.pos_prev], roomId:ROOM_ID, userId:user_id, size:[hiddenCamVideo.width, hiddenCamVideo.height], penWidth: penWidth, penColor: penColor})
      }
      else if(cam_mouse.click && penStyle === 'eraser') socket.emit('erase_server', ROOM_ID, user_id, cam_mouse.pos.x, cam_mouse.pos.y, width, height)
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
/*
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
}*/

myPeer.on('open', id => { //피어 접속시 맨 처음 실행되는 피어 함수
  user_id = id
})

socket.on('setIsCanvas', (userId, flag, flag_2) => {
  if(user_id === userId) {
    isCanvas = flag
    isEachCanvas = flag_2
  }
})

socket.on('setIsEachCanvas', (userId, flag) => {
  if(user_id === userId)
    isEachCanvas = flag
})

function joinLoop()
{
  if(user_id === null || user_id === undefined) setTimeout(joinLoop, 1000)
  else socket.emit('join-room', ROOM_ID, user_id, user_name)
}

function userJoin()
{
  localStream.flag = 0
  const userBox = document.createElement('userBox')
  var videoUserName = document.createElement('videoUserName') //비디오에 이름 표시 코드
  var bold = document.createElement('b')
  var videoUserNameText = document.createTextNode(user_name)
  bold.id = 'mybold'
  videoUserName.appendChild(bold)
  bold.appendChild(videoUserNameText)
  userBox.appendChild(videoUserName)
  userBox.appendChild(myVideoBackground)
  //userBox.appendChild(extractColorVideo)
  userBox.appendChild(myVideo)
  myVideo.srcObject = localStream
  myVideo.addEventListener('loadedmetadata', () => {
    myVideo.play()
  })
  hiddenVideo.srcObject = localStream
  hiddenVideo.addEventListener('loadedmetadata', async() => { //모든 비디오 로드 된 후 시작
    hiddenVideo.play()
    await 탄지로()
    videoGrid.append(userBox)
    if(user_id !== null && user_id !== undefined)
      socket.emit('join-room', ROOM_ID, user_id, user_name)
    else joinLoop()
    canvasImage.src = 'img/canvas.png'
    allLoaded()
    camButton.addEventListener('click', () => {
      if(isNoCamUser) alert('캠이 없습니다.')
      else if(isCamWrite2) alert('캠 필기가 켜져있습니다.')
      else if(gesturechk) alert('제스처가 켜져있습니다.')
      else {
        if(isCam) {
          myVideoBackground.style.width = '160px'
          myVideoBackground.style.height = '118px'
          myVideo.width = 0
          myVideo.height = 0
          camButton.innerText = '캠 켜기'
          camImage.src="img/[크기변환]noweb-cam.png"
        }
        else {
          myVideoBackground.style.width = '0px'
          myVideoBackground.style.height = '0px'
          myVideo.width = 160
          myVideo.height = 118
          camButton.innerText = '캠 끄기'
          camImage.src="img/[크기변환]web-cam.png"
        }
        localStream.flag = 0
        socket.emit('streamPlay_server', user_id,ROOM_ID,isCam)
        isCam = !isCam    
      }
    })
    
    menu = new Menu("#myMenu");
    var item1 = new Item("list", "fas fa-bars", "#8cc9f0");
    var item2 = new Item("exit", "fas fa-sign-out-alt", "#FF5C5C", "방에서 퇴장");
    var item3 = new Item("setting", "fas fa-cog", "#64F592", "설정");
    var item4 = new Item("rename", "fas fa-exchange-alt", "#EE82EE", "이름 변경")

    menu.add(item1);
    menu.add(item2);
    menu.add(item3);
    menu.add(item4);

    var exitButton=document.getElementById("exit")
    var renameButton=document.getElementById("rename")

    exitButton.addEventListener('click', () => {
        window.location.href = '/'
    })

    renameButton.addEventListener('click', () => {
      var flag = true
      var inputName = prompt('바꿀 이름을 입력해주세요','')
      if(inputName === null || inputName === undefined || inputName === '' || inputName.length > 6) {
        alert('1~6자리 이름을 입력해주세요.')
        flag = false
      }
      if(flag) {
        var bold = document.getElementById('mybold')
        bold.innerText = inputName
        user_name = inputName
        socket.emit('nameChange_server', ROOM_ID, user_id, isHost, inputName)
      }
   })

    audioButton.addEventListener('click', () => {
      if(!isMuteUser) {
        if(isMute) {
          audioImage.src="img/[크기변환]microphone.png"
          audioButton.innerText = '마이크 끄기'
        }
        else {
          audioImage.src="img/[크기변환]nomicrophone.png"
          audioButton.innerText = '마이크 켜기'
        }
        isMute = !isMute
        socket.emit('muteRequest_server', user_id,ROOM_ID,isMute)
      }
      else alert('마이크가 없습니다.')
    })
    
    displayButton.addEventListener('click', () => {
      if(!isDisplaying) {
        displayImage.src="img/[크기변환]nodocument.png"
        displayButton.innerText = '공유 종료' //일단 4글자로 맞췄음
        displayPlay()
      }
      else if(isDisplayHost) {
        displayImage.src="img/[크기변환]document.png"
        displayButton.innerText = '화면 공유'
        var displayVideo = document.getElementById('userDisplay')
        const stream = displayVideo.srcObject
        stream.getVideoTracks()[0].stop()
        displayVideo.remove()
        canvas.style.backgroundColor = '#ffffff'
        isDisplayHost = false
        isDisplaying = false
        if(displayCall !== undefined) displayCall.close()
      }
      else alert('화면공유가 이미 켜져있습니다.')
    })
    
    camWriteButton.addEventListener('click', () => {
      if(isNoCamUser) alert('캠이 없습니다.')
      else if(!isCam) alert('캠을 켜주세요')
      else if(!isCanvas) alert('캔버스 권한이 없습니다.')
      else {
        if(!isCamWrite) {
          alert("캠에서 펜으로 인식할 부분을 클릭해주세요");
          extractColorVideo.style.visibility = 'visible'
          extractColorVideo.width = canvas.width
          extractColorVideo.height = canvas.height
          isCamWrite = true
          carwriteImage.src="img/[크기변환]nopencil.png"
          camWriteButton.innerText = '캠 필기 끄기'
        }
        else {
          alert("캠 필기 기능 종료")
          R=[]
          G=[]
          B=[]
          cursor_context.clearRect(0,0, width, height)
          extractColorVideo.style.visibility = 'hidden'
          isCamWrite = false
          isCamWrite2 = false
          cntt = 0
          carwriteImage.src="img/[크기변환]pencil.png"
          camWriteButton.innerText = '캠 필기 켜기'
        }
      }
    })
    
    gestureButton.addEventListener('click', () => {
      if(isNoCamUser) alert("캠이 없습니다.")
      else if(!isCam) alert("캠을 켜주세요.")
      else if(!isCanvas) alert('캔버스 권한이 없습니다.')
      else {
        if(gesturechk) {
          gestureImage.src="img/[크기변환]hand.png"
          gestureButton.innerText = '제스처 켜기'
        }
        else if(!gesturechk) {
          gestureImage.src="img/[크기변환]nohand.png"
          gestureButton.innerText = '제스처 끄기'
        }
        gesturechk = !gesturechk
      }
    })
  })
  getNewUser()

  socket.on('user-connected', (userId, userName) => {
    isCall[userId] = true
    connectionLoop(userId, userName, 0)
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
    videoBackground.style.height = '118px'

    call.on('stream', userVideoStream => {
      socket.emit('getMute', call.peer, user_id, ROOM_ID)
      if(peers[call.peer] == undefined) {
        bold.id = call.peer + '!bold'
        video.id = call.peer+'!video'
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

function connectionLoop(userId, userName, connectionCnt) //피어 연결이 제대로 될 때 까지 반복
{
  if(isCall[userId]) {
    console.log('peer connections..')
    if(peers[userId] != undefined)
      peers[userId].close()
    peers[userId] = undefined
    connectToNewUser(userId, userName)
    if(connectionCnt < 6)
      setTimeout(connectionLoop, 2000, userId, userName, connectionCnt +1)
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
    video.height = 118
    const userBox = document.createElement('userBox')
    userBox.id = userId + '!userBox'
    const videoUserName = document.createElement('videoUserName') //비디오에 이름 표시 코드
    const bold = document.createElement('b')
    const videoUserNameText = document.createTextNode(userName)
    const videoBackground = document.createElement('videoBackground')

    call.on('stream', userVideoStream => {
      isCall[userId] = false
      bold.id = userId + '!bold'
      video.id = userId + '!video'
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



var camButton = document.getElementById('cam_button')
var camImage = document.getElementById('webc')
var audioButton = document.getElementById('audio_button')
var audioImage = document.getElementById('micr')
var displayButton = document.getElementById('display_button')
var displayImage = document.getElementById('docu')
var camWriteButton = document.getElementById('camWrite_button')
var carwriteImage = document.getElementById('penc')
var gestureButton = document.getElementById('gesture_button')
var gestureImage = document.getElementById('hand')

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
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        displayVideo.remove()
        canvas.style.backgroundColor = '#ffffff'
        isDisplayHost = false
        isDisplaying = false
        displayButton.innerText = '화면 공유'
        displayImage.src="img/[크기변환]document.png"
        if(displayCall !== undefined) displayCall.close()
      });
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
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      console.log('display end')
      displayVideo.remove()
      canvas.style.backgroundColor = '#ffffff'
      isDisplayHost = false
      isDisplaying = false
      displayButton.innerText = '화면 공유'
      displayImage.src="img/[크기변환]document.png"
      socket.emit('displayReset_server', ROOM_ID, user_id)
      if(displayCall !== undefined) displayCall.close()
    })
    socket.emit('displayConnect_server', ROOM_ID, user_id)
  }).catch(error => {
    displayButton.innerText = '화면 공유'
    displayImage.src="img/[크기변환]document.png"
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
    }
})

socket.on('muteRequest_script', (userId, roomId, is_mute) => {
  if(roomId == ROOM_ID && userId != user_id) {
    const video = document.getElementById(userId + '!video')
    video.muted = is_mute
  }
})

socket.on('streamPlay_script', (userId, roomId, isCam) => {
  if(roomId == ROOM_ID && userId != user_id) {
    const video = document.getElementById(userId + '!video')
    const videoBackground = document.getElementById(userId + '!videoBackground')
   if(isCam) {
    videoBackground.style.width = '160px'
    videoBackground.style.height = '118px'
    video.width = 0
    video.height = 0
   }
   else {
    videoBackground.style.width = '0px'
    videoBackground.style.height = '0px'
    video.width = 160
    video.height = 118
   }
  }
})

socket.on('setHost', (userId, participant)=>{
  if(userId === user_id) {
    isHost = true
    if(participant === 0)
      window.open("/address/"+ ROOM_ID,  "popup", "width=300, \
      status=no, menubars=0, height=300, scrollbars=0, top=100px, left=100px\
      resizable=0, toolbar=0, directories=0, location=0, menubar=no")

    var item1 = new Item("everyuser", "fas fa-user", "#5CD1FF", "모든 사용자 캔버스 사용");
    var item2 = new Item("onlyhost", "fas fa-user-times", "#FFF15C", "호스트만 캔버스 사용");
    var item3 = new Item("eachcanvas", "fas fa-chalkboard-teacher", "#FFFFE0", "각자 캔버스 사용");

    menu.add(item1);
    menu.add(item2);
    menu.add(item3);

    var everyuserButton = document.getElementById("everyuser")
    var onlyhostButton = document.getElementById("onlyhost")
    var eachcanvasButton = document.getElementById("eachcanvas")

    everyuserButton.addEventListener('click', () => {
      var flag = false
      if(hostEachCanvas) flag = true
      hostCanvas = true
      hostEachCanvas = false
      isEachCanvas = false
      socket.emit('canvasControl_server', ROOM_ID, userId, hostCanvas, hostEachCanvas)
      if(flag) socket.emit('clearWhiteBoard', ROOM_ID, user_id)
    })

    onlyhostButton.addEventListener('click', () => {
      var flag = false
      if(hostEachCanvas) flag = true
      hostCanvas = false
      hostEachCanvas = false
      isEachCanvas = false
      socket.emit('canvasControl_server', ROOM_ID, userId, hostCanvas, hostEachCanvas)
      if(flag) socket.emit('clearWhiteBoard', ROOM_ID, user_id)
    })

    eachcanvasButton.addEventListener('click', () => {
      isEachCanvas = true
      hostEachCanvas = true
      hostCanvas = true
      socket.emit('clearWhiteBoard', ROOM_ID, user_id)
      socket.emit('canvasControl_server', ROOM_ID, userId, hostCanvas, hostEachCanvas)
    })
  }
})

socket.on('canvasControl_script', (userId, flag, flag_2) => {
  if(userId !== user_id) {
    isCanvas = flag
    isEachCanvas = flag_2
  }
})

socket.on('hostChange', (userId, userName)=>{
  if(userId !== user_id) {
    const bold = document.getElementById(userId+'!bold')
    bold.innerHTML = userName + '(호스트)'
  }
})

socket.on('reLoading', (userId) =>{
  if(isEachCanvas) {
    if(userId === user_id) {
      console.log('clear')
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
      //socket.emit('reDrawing', ROOM_ID)
      context.drawImage(canvasImage, 0,0, canvas.width, canvas.height)
    }
  }
  else {
    console.log('clear')
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    //socket.emit('reDrawing', ROOM_ID)
    context.drawImage(canvasImage, 0,0, canvas.width, canvas.height)
  }
})

socket.on('stroke', (data)=>{ //지우개 보류
  var line = data.line
  var size = data.size

  if(isEachCanvas) {
    if(data.userId === user_id) {
      context.strokeStyle = data.penColor
      context.beginPath()
      context.lineWidth = data.penWidth
      context.moveTo(line[0].x * (width/size[0]), line[0].y * (height/size[1]))
      context.lineTo(line[1].x * (width/size[0]), line[1].y * (height/size[1]))
      context.stroke()
    }
  }
  else {
    context.strokeStyle = data.penColor
    context.beginPath()
    context.lineWidth = data.penWidth
    context.moveTo(line[0].x * (width/size[0]), line[0].y * (height/size[1]))
    context.lineTo(line[1].x * (width/size[0]), line[1].y * (height/size[1]))
    context.stroke()
  }
})

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
  socket.emit('sendMessage', { message, ROOM_ID, user_id, user_name });
  chatInput.value = '';
  }  
});

sendButton.addEventListener('click', function(){ 
  var message = chatInput.value; 
  if(!message){
    return false; 
  }
  socket.emit('sendMessage', { message, ROOM_ID, user_id, user_name });
  chatInput.value = '';
});

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
      videoBackground.style.height = '118px'
      video.width = 0
      video.height = 0
    }
    else {
      videoBackground.style.width = '0px'
      videoBackground.style.height = '0px'
      video.width = 160
      video.height = 118
    }
  }
})

socket.on('nameChange_script', (userId, isHost, userName) => {
  if(userId !== user_id) {
    var bold = document.getElementById(userId + '!bold')
    if(isHost) bold.innerText = userName + '(호스트)'
    else bold.innerText = userName
  }
})


var newImg = new Image()
  newImg.onload = function() {
    context.drawImage(newImg, 0,0, canvas.width, canvas.height)
  }
  function selectImage(selectNum) {
    if(selected !== selectNum) {
      newImg.src = 'img/select_' + selectNum.toString() + '.png'
      selected = selectNum
    }
  }
  function camSelectImage(selectNum) {
    if(cam_selected !== selectNum) {
      newImg.src = 'img/select_' + selectNum.toString() + '.png'
      cam_selected = selectNum
    }
  }

function changeCanvasImage(relativeMouseX, relativeMouseY, select, flag) {
  if(relativeMouseY >= 0.91 && relativeMouseY <= 0.99) {
    if(relativeMouseX >= 0.034 && relativeMouseX <= 0.073) {
      if(flag) selectImage(1)
      else camSelectImage(1)
    }
    else if(relativeMouseX >= 0.105 && relativeMouseX <= 0.128) {
      if(flag) selectImage(2)
      else camSelectImage(2)
    }
    else if(relativeMouseX >= 0.159 && relativeMouseX <= 0.185) {
      if(flag) selectImage(3)
      else camSelectImage(3)
    }
    else if(relativeMouseX >= 0.218 && relativeMouseX <= 0.247) {
      if(flag) selectImage(4)
      else camSelectImage(4)
    }
    else if(relativeMouseX >= 0.278 && relativeMouseX <= 0.309) {
      if(flag) selectImage(5)
      else camSelectImage(5)
    }
    else if(relativeMouseX >= 0.34 && relativeMouseX <= 0.37) {
      if(flag) selectImage(6)
      else camSelectImage(6)
    }
    else if(relativeMouseX >= 0.401 && relativeMouseX <= 0.431) {
      if(flag) selectImage(7)
      else camSelectImage(7)
    }
    else if(relativeMouseX >= 0.463 && relativeMouseX <= 0.494) {
      if(flag) selectImage(8)
      else camSelectImage(8)
    }
    else if(relativeMouseX >= 0.525 && relativeMouseX <= 0.555) {
      if(flag) selectImage(9)
      else camSelectImage(9)
    }
    else if(relativeMouseX >= 0.586 && relativeMouseX <= 0.617) {
      if(flag) selectImage(10)
      else camSelectImage(10)
    }
    else if(relativeMouseX >= 0.648 && relativeMouseX <= 0.679) {
      if(flag) selectImage(11)
      else camSelectImage(11)
    }
    else if(relativeMouseX >= 0.708 && relativeMouseX <= 0.723) {
      if(flag) selectImage(12)
      else camSelectImage(12)
    }
    else if(relativeMouseX >= 0.752 && relativeMouseX <= 0.772) {
      if(flag) selectImage(13)
      else camSelectImage(13)
    }
    else if(relativeMouseX >= 0.801 && relativeMouseX <= 0.824) {
      if(flag) selectImage(14)
      else camSelectImage(14)
    }
    else if(relativeMouseX >= 0.853 && relativeMouseX <= 0.896) {
      if(flag) selectImage(15)
      else camSelectImage(15)
    }
    else if(relativeMouseX >= 0.927 && relativeMouseX <= 0.968) {
      if(flag) selectImage(16)
      else camSelectImage(16)
    }
    else if (select !== 0){
      newImg.src = 'img/canvas.png'
      context.clearRect(0, canvas.height * 0.905, canvas.width, canvas.height*0.99)
      if(flag) selected = 0
      else cam_selected = 0
    }
  }
  else if(select !== 0) {
    newImg.src = 'img/canvas.png'
    context.clearRect(0, canvas.height * 0.905, canvas.width, canvas.height*0.99)
    if(flag) selected = 0
    else cam_selected = 0
  } 
}

socket.on('user-disconnected', userId => {
  if (peers[userId]) {
    peers[userId].close()
    const userBox = document.getElementById(userId + '!userBox')
    userBox.remove()
  }
})

socket.on('setName', (userId, userName) => {
  if(user_id !== userId) {
    const bold = document.getElementById(userId + '!bold')
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
  if(e.key == '`') {
    cam_mouse.click = true
    gestureFlag = true
    if(isCanvas)
      clickCanvas(cam_selected)
  }
  if(e.key === 'End') {
    capture.width = canvas.width
    capture.height = canvas.height
    if(isDisplaying) {
      var displayVideo = document.getElementById('userDisplay')
      captureContext.drawImage(displayVideo, 0, 0, width, height)
    }
    var img = new Image()
    img.src = canvas.toDataURL()
    img.addEventListener('load', ()=> {
      captureContext.drawImage(img, 0, 0, width, height)
      var link = document.getElementById('download')
      link.href = capture.toDataURL()
      link.download = 'AirBoard_screenshot.png'
      link.click()
    })
  }
  if(e.key == 'Insert') {  //디버그용
    console.log(isCanvas, isEachCanvas)
  }
})

document.addEventListener("keyup", (e) => {
  if(e.key == '`') {  
    cam_mouse.click = false
    gestureFlag = false
    chkfirst = 0
  }
})

function clickCanvas(select)
{
  if(select === 1) penStyle = 'pen'
  //else if(select === 2) penStyle = 'eraser' 보류
  else if(select === 3) socket.emit('clearWhiteBoard', ROOM_ID, user_id)
  else if(select === 4) penColor = 'black'
  else if(select === 5) penColor = 'red'
  else if(select === 6) penColor = 'orange'
  else if(select === 7) penColor = 'yellow'
  else if(select === 8) penColor = '#1EDF16'
  else if(select === 9) penColor = '#0054FF'
  else if(select === 10) penColor = 'blue'
  else if(select === 11) penColor = 'purple'
  else if(select === 12) penWidth = 1
  else if(select === 13) penWidth = 2
  else if(select === 14) penWidth = 4
  else if(select === 15) socket.emit('undo_server', ROOM_ID, user_id)
  else if(select === 16) socket.emit('redo_server', ROOM_ID, user_id)
}

var selected = 0
var cam_selected = 0
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

function allLoaded() {
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

  cursor_canvas.onclick = (e) => {
    if(isCanvas)
      clickCanvas(selected)
  }

  socket.on('drawLine', data => {
    var line = data.line
    var size = data.size
    if(ROOM_ID == data.roomId && !isEachCanvas) {
      if(chkfirst < 2) {
        chkfirst++
      }
      else{
        context.strokeStyle = data.penColor
        context.beginPath()
        context.lineWidth = data.penWidth
        context.moveTo(line[0].x * (width/size[0]), line[0].y * (height/size[1]))
        context.lineTo(line[1].x * (width/size[0]), line[1].y * (height/size[1]))
        context.stroke()
      }
    }
    if(ROOM_ID == data.roomId && isEachCanvas) {
      if(data.userId === user_id) {
        if(chkfirst < 2) {
          chkfirst++
        }
        else{
          context.strokeStyle = data.penColor
          context.beginPath()
          context.lineWidth = data.penWidth
          context.moveTo(line[0].x * (width/size[0]), line[0].y * (height/size[1]))
          context.lineTo(line[1].x * (width/size[0]), line[1].y * (height/size[1]))
          context.stroke()
        }
      }
    }
  })

  function extractLoop() {
    extractDraw()
    setTimeout(extractLoop, 25)
  }
  function mainLoop() {
    /*
    if(isDisplayHost && localDisplay.active === false) {
      var displayVideo = document.getElementById('userDisplay')
      displayVideo.remove()
      canvas.style.backgroundColor = '#ffffff'
      socket.emit('displayReset_server', ROOM_ID, user_id)
      isDisplayHost = false
      isDisplaying = false
      displayButton.innerText = '화면 공유'
      displayImage.src="img/[크기변환]document.png"
    }*/
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

    var relativeMouseY = mouse.pos.y/canvas.height
    var relativeMouseX = mouse.pos.x/canvas.width

    changeCanvasImage(relativeMouseX, relativeMouseY, selected, 1)

    if(canvas.width != width || canvas.height != height) {  //웹 페이지 크기가 변할 때
      socket.emit('reDrawing', ROOM_ID, user_id)
      canvas.width = width
      canvas.height = height

      cursor_canvas.width = width
      cursor_canvas.height = height

      extractColorVideo.width = width
      extractColorVideo.height = height
      context.drawImage(canvasImage, 0,0, canvas.width, canvas.height)
    }

    if(mouse.click) gestureFlag = true
    else gestureFlag = false

    if(mouse.click && mouse.move && mouse.pos_prev && isCanvas) {
      if(relativeMouseY < 0.905 && mouse.pos_prev.y/canvas.height < 0.905){
        if(penStyle === 'pen') socket.emit('drawLine', {line: [mouse.pos, mouse.pos_prev], roomId:ROOM_ID, userId: user_id, size:[width, height], penWidth: penWidth, penColor: penColor})
        //else socket.emit('erase_server', ROOM_ID, mouse.pos.x, mouse.pos.y)
      }
      mouse.move = false
    }
    //else if(mouse.click && penStyle === 'eraser') socket.emit('erase_server', ROOM_ID, mouse.pos.x, mouse.pos.y, width, height) 보류
    mouse.pos_prev = {x: mouse.pos.x, y: mouse.pos.y}
    setTimeout(mainLoop, 20)  //최종은 20
  }
  socket.emit('reDrawing', ROOM_ID, user_id)
  mainLoop()
  //---캔버스 코드 끝---
}

var gestureFlag = false

//=제스처
const config = {
  video: { width: 1024, height: 768, fps: 30 }
};

async function 탄지로() {
  const knownGestures = [
    fp.Gestures.VictoryGesture,
    fp.Gestures.GyuGesture,
    fp.Gestures.PalmGesture
  ];
  const GE = new fp.GestureEstimator(knownGestures);

  // load handpose model
  const model = await handpose.load();
  console.log("Handpose model loaded");

  // main estimation loop
  const estimateHands = async () => {
    if(!gestureFlag) {
      const predictions = await model.estimateHands(hiddenVideo, true);
      for(let i = 0; i < predictions.length; i++) {
        
        const est = GE.estimate(predictions[i].landmarks, 7.5);

        if(est.gestures.length > 0) {

          let result = est.gestures.reduce((p, c) => { 
            return (p.confidence > c.confidence) ? p : c;
          });

          console.log(result.name);
          if(result.name == "palm"){
            palmcnt+=2;
          }
          if(palmcnt>=10){
            palmcnt = 0;
            socket.emit('clearWhiteBoard', ROOM_ID, user_id);
          }
        }
      }
  }    
    if(gestureFlag) config.video.fps = 1
    else config.video.fps = 30
    if(palmcnt>=1){
      palmcnt--;
    }
    // ...and so on
    if(gesturechk)
      setTimeout(() => { estimateHands(); }, 1000 / config.video.fps);
    else gestureLoop()
  };
  function gestureLoop() {
    if(!gesturechk)
      setTimeout(gestureLoop, 1000)
    else estimateHands()
  }
  estimateHands();
  console.log("Starting predictions");
}
//-제스처