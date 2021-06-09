/*
  화면공유 했을 때 안넘어가는 경우가있음.(건모-> 형택: X, 형택->건모: O)
  되돌리기 했을 때 맨 처음 필기 늘어나는 현상 있음
*/
var user_id
var menu  //float 버튼용 메뉴

(async () => { 
  if(user_name === '') {
    user_name = await swal({
      closeOnEsc:false,
      closeOnClickOutside: false,
      text:"대화명을 입력해주세요",
      content:'input',
      icon: "info"
    })

    if(user_name === null) window.location.href = "/"

    while(user_name === null || user_name === undefined || user_name === '' || user_name.length > 6)  {
      if(user_name.length > 6) {
        user_name = await swal({
          closeOnEsc:false,
          closeOnClickOutside: false,
          text:"대화명을 6자 이하로 설정해주세요",
          content: "input",
          icon: "warning"
        })
      }
      else {
        user_name = await swal({
          closeOnEsc:false,
          closeOnClickOutside: false,
          text:"대화명을 다시 입력해주세요",
          content: "input",
          icon: "warning"
        })
      }
    }
  }

  const socket = io('/')

  var chatWindow = document.getElementById('chatWindow')
  const sendButton = document.getElementById('chatMessageSendBtn')
  const chatInput = document.getElementById('chatInput')

  const videoGrid = document.getElementById('video-grid')

  const nocamVideo = document.getElementById('nocam__video') //캠 없는 사람을 위한 대체 stream
  const myVideo = document.createElement('video')
  const myDisplay = document.createElement('video')
  const myVideoBackground = document.createElement('videoBackground') //캠 껐을 때 대체이미지

  const extractColorVideo = document.getElementById('extractCam')
  const hiddenCamVideo = document.createElement('canvas')
  const extractCamArea = document.getElementById('extractCamArea')
  const hiddenVideo = document.getElementById('hiddenVideo')

  var canvas = document.getElementById(ROOM_ID)
  var capture = document.getElementById('capture')  //스크린샷 용도. 화면 공유와 캔버스가 동시에 캡처될 수 있도록
  var cursorCanvas = document.getElementById('cursorWhiteboard')

  var penStyle = 'pen'
  var penColor = 'black'
  var penWidth = 2

  var context = canvas.getContext('2d')
  var captureContext = capture.getContext('2d')
  var cursorContext = cursorCanvas.getContext('2d')
  var extractContext = extractColorVideo.getContext('2d')
  var hiddenCamContext = hiddenCamVideo.getContext('2d')

  var canvasImage = new Image()

  canvasImage.onload = function() { //캔버스 이미지 체인지용
    context.drawImage(canvasImage, 0,0, canvas.width, canvas.height)
  }

  var isHost = false
  var isCamWrite = false
  var isCamWrite2 = false
  var isDisplayHost = false
  var isDisplaying = false
  var isCam = true
  var isMute = false
  var isCanvas = true //캔버스 사용 가능유무
  var isReverse = false //캠 필기 좌우반전 유무

  var isNoCamUser = false
  var isMuteUser = false

  var isFirstDraw = true

  var isCall = {} //콜이 소실되는 경우 판단용
  var isDisplayCall = {}

  var isWriteLoop = true

  var hostCanvas = true
  var isEachCanvas = false
  var hostEachCanvas = false

  var localStream
  var localDisplay
  var displayCall

  var gesturechk = false
  var chkfirst = 0
  var palmcnt = 0
  var victorycnt = 0
  var thumbsupcnt = 0 //규 수정

  hiddenVideo.style.visibility = 'hidden'
  hiddenVideo.width = 160
  hiddenVideo.height = 118
  hiddenVideo.muted = true

  hiddenCamVideo.style.visibility = 'hidden'

  extractCamArea.style.width = 0
  extractCamArea.style.height = 0
  extractCamArea.appendChild(hiddenCamVideo)

  extractColorVideo.width = 0
  extractColorVideo.height = 
  
  myDisplay.id = 'display'

  myVideo.muted = true
  myVideo.width = 160
  myVideo.height = 118

  hiddenCamVideo.width = 1024
  hiddenCamVideo.height = 768

  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.oGetUserMedia || navigator.msGetUserMedia

  var rX = 0.79872  //rX, rY는 최대한 마우스 에임에 맞는 필기를 위해 곱해주는 용도
  var rY = 0.8091

  //const myPeer = new Peer({host:'goingsamsung-peerjs-server.herokuapp.com', secure:true, port:443})
  const myPeer = new Peer({})
  const peers = {}

  function printz(x)  //디버그용
  {
    console.log(x)
  }

  myPeer.on('open', id => { //피어 접속시 맨 처음 실행되는 피어 함수
    user_id = id
  })

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

  socket.on('cam', (userId) => {
    if(userId === user_id) {
      isCam = false
      myVideoBackground.style.width = '160px'
      myVideoBackground.style.height = '118px'
      myVideo.style.visibility="hidden"
      camButton.innerText = '캠 켜기'
      camImage.src="img/[크기변환]noweb-cam.png"
      localStream.flag = 0
      socket.emit('streamPlay_server', user_id,ROOM_ID,isCam)
    }
  })

  socket.on('mute', (userId) => {
    if(userId === user_id) {
      if(!isMuteUser) {
        audioImage.src="img/[크기변환]nomicrophone.png"
        audioButton.innerText = '마이크 켜기'
        isMute = true
        socket.emit('muteRequest_server', user_id,ROOM_ID,isMute)
      }
    }
  })

  socket.on('quit', (userId) => {
    if(userId === user_id) {
      window.location.href = '/airboard/quit'
      swal({
        text:"강퇴당하셨습니다.",
        icon: "warning"
      })
    }
  })

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

  socket.on('thumbsRequest_script', (userId, roomId) => {
    if(roomId === ROOM_ID && userId !== user_id) {
      const tagname='#'+userId+'thumbsicon'
      $( tagname ).fadeIn( 500, function() {
        $( this ).fadeOut( 5000 );
      });
    }
    else{
      $( "#mythumbsicon" ).fadeIn( 500, function() {
        $( this ).fadeOut( 5000 );
      });
    }
  })

  socket.on('muteRequest_script', (userId, roomId, is_mute) => {
    if(roomId === ROOM_ID && userId !== user_id) {
      const video = document.getElementById(userId + '!video')
      video.muted = is_mute
      const userbox=document.getElementById(userId+"!userBox")
      if(is_mute === true){
        const muteicon=document.createElement("img");
        muteicon.id=userId+"!muteicon";
        muteicon.className="muteicon";
        muteicon.src="img/mute.png"
        userbox.appendChild(muteicon);
      }
      else{
        const muteicon=document.getElementById(userId+"!muteicon");
        muteicon.remove();
      }
    }
    else{
      if(is_mute === true){
        const userbox=document.getElementById("myuserBox");
        const muteicon=document.createElement("img");
        muteicon.id=userId+"!muteicon";
        muteicon.className="muteicon";
        muteicon.src="img/mute.png"
        userbox.appendChild(muteicon);
      }
      else{
        const muteicon=document.getElementById(userId+"!muteicon");
        muteicon.remove();
      }
    }
  })

  socket.on('streamPlay_script', (userId, roomId, isCam) => {
    if(roomId == ROOM_ID && userId != user_id) {
      const video = document.getElementById(userId + '!video')
      const videoBackground = document.getElementById(userId + '!videoBackground')
    if(!isCam) {
      videoBackground.style.width = '160px'
      videoBackground.style.height = '118px'
      video.style.visibility='hidden'
      //video.width = 0
      //video.height = 0
    }
    else {
      videoBackground.style.width = '0px'
      videoBackground.style.height = '0px'
      video.style.visibility="visible"
      //video.width = 160
      //video.height = 118
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
      else 
        swal({
          text:'호스트가 되었습니다.',
          icon:'info'
        })
      var item1 = new Item("everyuser", "fas fa-user", "#5CD1FF", "모든 사용자 캔버스 사용")
      var item2 = new Item("onlyhost", "fas fa-user-times", "#FFF15C", "호스트만 캔버스 사용")
      var item3 = new Item("eachcanvas", "fas fa-chalkboard-teacher", "#FFFFE0", "각자 캔버스 사용")
      var item4 = new Item("userlist", "fas fa-book", '#e9f0f5', "유저 리스트 보기")

      menu.add(item1)
      menu.add(item2)
      menu.add(item3)
      menu.add(item4)

      var everyuserButton = document.getElementById("everyuser")
      var onlyhostButton = document.getElementById("onlyhost")
      var eachcanvasButton = document.getElementById("eachcanvas")
      var userlistButton = document.getElementById("userlist")

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

      userlistButton.addEventListener('click', () => {
        var popupX = (window.screen.width / 2) - (520 / 2)
        var popupY= (window.screen.height / 2) - (500 / 2)

        window.open("/userlist/"+ ROOM_ID,  "popup", "width=520, \
        status=no, menubars=0, height=500, scrollbars=0, top="+popupY+",\ left=" + popupX+ "\
        resizable=0, toolbar=0, directories=0, location=0, menubar=no")
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
      const userbox=document.getElementById(userId+"!userBox")
      const hosticon=document.createElement("img")
      hosticon.className="hosticon"
      hosticon.src="img/crown.png"
      userbox.appendChild(hosticon)
    }
  })

  socket.on('reLoading', (userId) =>{
    if(isEachCanvas) {
      if(userId === user_id) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
        context.drawImage(canvasImage, 0,0, canvas.width, canvas.height)
      }
    }
    else {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(canvasImage, 0,0, canvas.width, canvas.height)
    }
  })

  socket.on('reLoading2', (userId) =>{
    if(isEachCanvas) {
      if(userId === user_id) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
        context.drawImage(canvasImage, 0,0, canvas.width, canvas.height)
      }
    }
    else {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
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

  socket.on('reDrawLine', (userId, data)=>{ //지우개 보류
    var line = data.line
    var size = data.size

    if(userId === user_id) {
      context.strokeStyle = data.penColor
      context.beginPath()
      context.lineWidth = data.penWidth
      context.moveTo(line[0].x * (width/size[0]), line[0].y * (height/size[1]))
      context.lineTo(line[1].x * (width/size[0]), line[1].y * (height/size[1]))
      context.stroke()
    }
  })

  socket.on('updateMessage', function(data){ //입장 메시지
    if(data.name === 'SERVER'){
      var info = document.getElementById('info')
      info.innerHTML = data.message
    }
    else{ }
  })

  socket.on('updateMessage', function(data){ 
    if(data.name === 'SERVER'){
      var info = document.getElementById('info')

      info.innerHTML = data.message
      setTimeout(() => {info.innerText = '' }, 1000)
    }
    else if(ROOM_ID==data.ROOM_ID){ //사용자의 ROOM_ID와 화상 회의방의 ROOM_ID가 같은가??
      var chatMessageEl = drawChatMessage(data)
      chatWindow.appendChild(chatMessageEl)
      chatWindow.scrollTop=chatWindow.scrollHeight
    } 
  })

  socket.on('nameChange_script', (userId, isHost, userName) => {
    if(userId !== user_id) {
      var bold = document.getElementById(userId + '!bold')
      if(isHost) bold.innerText = userName + '(호스트)'
      else bold.innerText = userName
    }
  })

  socket.on('user-disconnected', userId => {
    if (peers[userId]) {
      peers[userId].close()
      const userBox = document.getElementById(userId + '!userBox')
      userBox.remove()
    }
  })

  socket.on('setName', (userId, userName, ishost) => {
    if(user_id !== userId) {
      if(ishost === true){
        const userbox=document.getElementById(userId+"!userBox");
        const hosticon=document.createElement("img");
        hosticon.className="hosticon";
        hosticon.src="img/crown.png"
        userbox.appendChild(hosticon);
      }
      const bold = document.getElementById(userId + '!bold')
      bold.innerHTML = userName
    }
  })

  socket.on('setMute', (isMute, muteUserId, userId) => {
    if(user_id === userId) {
      const video = document.getElementById(muteUserId + '!video')
      video.muted = isMute
      if(isMute) {
        const userbox=document.getElementById(muteUserId+"!userBox");
        const muteicon=document.createElement("img");
        muteicon.id=muteUserId+"!muteicon";
        muteicon.className="muteicon";
        muteicon.src="img/mute.png"
        userbox.appendChild(muteicon);
      }
    }
  })

  socket.on('setCam', (isCam, camUserId, userId) => {
    if(user_id === userId) {
      const video = document.getElementById(camUserId + '!video')
      const videoBackground = document.getElementById(camUserId + '!videoBackground')
      if(!isCam) {
        videoBackground.style.width = '160px'
        videoBackground.style.height = '118px'
        video.style.visibility="hidden"
      }
      else {
        videoBackground.style.width = '0px'
        videoBackground.style.height = '0px'
        video.style.visibility="visible"
      }
    }
  })
  
  //----캔버스----
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

  var mainFrame = 20
  var camWriteFrame = 25

  function allLoaded() {
    var socket = io.connect()
    canvas.width = parseInt(width*rX)
    canvas.height = parseInt(height-200)

    cursorCanvas.width = parseInt(width*rX)
    cursorCanvas.height = parseInt(height-200)
    
    cursorCanvas.onmousedown = (e) => {mouse.click = true}
    cursorCanvas.onmouseup = (e) => {mouse.click = false}

    cursorCanvas.onmousemove = (e) => {
      mouse.pos.x = (e.pageX - relativeX)
      mouse.pos.y = (e.pageY - relativeY)
      mouse.move = true
    }

    cursorCanvas.onclick = (e) => {
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
    mainLoop()
  }
  //====캔버스====

  //----캠 필기----
  var R = []
  var G = []
  var B = []

  var extractCnt = 0
  var thr = 5 //캠필기 threshold값

  function extractDraw() {
    if(isCamWrite) {
      if(!isCamWrite2) {
        if(!isReverse) {
          extractContext.save()
          extractContext.scale(-1, 1)
          extractContext.translate(-extractColorVideo.width,0)
        }
        extractContext.drawImage(hiddenVideo, 0, 0, extractColorVideo.width, extractColorVideo.height)
        if(!isReverse) extractContext.restore()
      }
      if(!isReverse) {
        hiddenCamContext.save()
        hiddenCamContext.scale(-1, 1)
        hiddenCamContext.translate(-hiddenCamVideo.width,0)
      }
      hiddenCamContext.drawImage(hiddenVideo, 0, 0, hiddenCamVideo.width, hiddenCamVideo.height)
      if(!isReverse) hiddenCamContext.restore()   
    if(isCamWrite2) {
      let imgData = hiddenCamContext.getImageData(0, 0, hiddenCamVideo.width, hiddenCamVideo.height)
      let src = cv.matFromImageData(imgData)

      let dst = new cv.Mat()

      let maxR = Math.max.apply(null,R)+thr
      let minR = Math.min.apply(null,R)-thr
      let maxG = Math.max.apply(null,G)+thr
      let minG = Math.min.apply(null,G)-thr
      let maxB = Math.max.apply(null,B)+thr
      let minB = Math.min.apply(null,B)-thr

      let low = new cv.Mat(src.rows, src.cols, src.type(), [minR, minG,minB, 0])
      let high = new cv.Mat(src.rows, src.cols, src.type(), [maxR, maxG, maxB, 255])

      cv.inRange(src, low, high, dst)

      let ret = new cv.Mat()
      cv.bitwise_and(src, src, ret, dst)
      
      cv.cvtColor(ret, ret, cv.COLOR_RGBA2GRAY, 0)
      cv.threshold(ret, ret, 0, 200, cv.THRESH_BINARY)
      let contours = new cv.MatVector()
      let hierarchy = new cv.Mat()
      
      cv.findContours(ret, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

      var cntareas=[]
      for(let i = 0;i<contours.size();i++){
        cntareas.push(cv.contourArea(contours.get(i)))
      }
      let areathr = 1
      var realareas=[]
      var sum = 0
      for(let i = 0;i<cntareas.length;i++){
          if(areathr < cntareas[i]){
            realareas.push(i)
            sum += cntareas[i]*cntareas[i]
          }
      }
      var xx = 0
      var yy = 0
      for(let i=0;i<realareas.length;i++){
        var temp = contours.get(realareas[i])
        xx += (cv.boundingRect(temp).x)/sum*cntareas[realareas[i]]*cntareas[realareas[i]]
        yy += (cv.boundingRect(temp).y)/sum*cntareas[realareas[i]]*cntareas[realareas[i]]
        temp.delete()
      }
      cursorContext.clearRect(0,0, width, height)
      
      var camRelativeMouseY = yy/hiddenCamVideo.height
      var camRelativeMouseX = xx/hiddenCamVideo.width
      if(cam_mouse.click) clickCanvas(cam_selected)
      changeCanvasImage(camRelativeMouseX, camRelativeMouseY, cam_selected, 0)
      if(xx !=0 && yy !=0){
        cam_mouse.pos.x = xx
        cam_mouse.pos.y = yy
        cursorContext.fillStyle = "red"

        cursorContext.fillRect(xx * (width/hiddenCamVideo.width), yy * (height/hiddenCamVideo.height), 3, 3)
        if(cam_mouse.pos_prev && cam_mouse.click && penStyle === 'pen' && isCanvas) {
          if(camRelativeMouseY < 0.905 && cam_mouse.pos_prev.y/hiddenCamVideo.height < 0.905)
            socket.emit('drawLine', {line: [cam_mouse.pos, cam_mouse.pos_prev], roomId:ROOM_ID, userId:user_id, size:[hiddenCamVideo.width, hiddenCamVideo.height], penWidth: penWidth, penColor: penColor})
        }
        else if(cam_mouse.pos_prev && cam_mouse.click && penStyle === 'eraser' && isCanvas) {
          if(camRelativeMouseY < 0.905 && cam_mouse.pos_prev.y/hiddenCamVideo.height < 0.905)
            socket.emit('drawLine', {line: [cam_mouse.pos, cam_mouse.pos_prev], roomId:ROOM_ID, userId:user_id, size:[hiddenCamVideo.width, hiddenCamVideo.height], penWidth: 30, penColor: 'white'})
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

  extractColorVideo.addEventListener('click', (event) => { 
    var imageData = extractContext.getImageData(0, 0, 1024, 768)

    imageData.getRGBA = function(i,j,k){
      return this.data[this.width*4*j+4*i+k]
    }
    var x = event.offsetX
    var y = event.offsetY

    tmpR = imageData.getRGBA(x,y,0)
    tmpG = imageData.getRGBA(x,y,1)
    tmpB = imageData.getRGBA(x,y,2)

    var consoleColorPaletteCSS = "#" + (tmpR.toString(16).length == 2 ? tmpR.toString(16) : ('0' + tmpR.toString(16))) + (tmpG.toString(16).length == 2 ? tmpG.toString(16) : ('0' + tmpG.toString(16))) + (tmpB.toString(16).length == 2 ? tmpB.toString(16) : ('0' + tmpB.toString(16))) + ';'

    changeCSS('.selected-button-color', "background", consoleColorPaletteCSS)
    swal('선택된 색상은 버튼의 색깔과 같습니다.',{
      button:{
        text:'확인',
        className: "selected-button-color",
      }
    })
    
    R.push(tmpR)
    G.push(tmpG)
    B.push(tmpB)

    extractCnt++
    if(extractCnt === 4) {
      isCamWrite2 = true
      extractColorVideo.style.visibility = 'hidden'
      extractCnt = 0
    }
  })

  document.addEventListener("keydown", (e) => {
    if(e.key == '`') cam_mouse.click = true
    if(e.key == 'Insert') {  //디버그용
      console.log(mainFrame)
    }
  })

  document.addEventListener("keyup", (e) => {
    if(e.key == '`') {  
      cam_mouse.click = false
      chkfirst = 0
    }
  })

  //====캠 필기====

  //----제스처----
  const config = {
    video: { width: 1024, height: 768, fps: 30 }
  }

  var gesturePred
  var gestureFlag = false
  var isGestureOff = false

  async function gestureLoad() {
    const knownGestures = [
      fp.Gestures.VictoryGesture,
      fp.Gestures.ThumbsUpGesture, //규 수정
      fp.Gestures.PalmGesture
    ]
    const GE = new fp.GestureEstimator(knownGestures)

    // load handpose model
    const model = await handpose.load()
    console.log("Handpose model loaded")
    await model.estimateHands(hiddenVideo, true)
    // main estimation loop
    gesturePred = async () => {
      predictions = await model.estimateHands(hiddenVideo, true)
      for(let i = 0; i < predictions.length; i++) {
        
        const est = GE.estimate(predictions[i].landmarks, 7.5)

        if(est.gestures.length > 0) {
          let result = est.gestures.reduce((p, c) => { 
            return (p.confidence > c.confidence) ? p : c
          })

          if(result.name == "palm") palmcnt+=2
          if(palmcnt>=10){
            palmcnt = 0
            socket.emit('clearWhiteBoard', ROOM_ID, user_id)
          }
          if(result.name == "victory") victorycnt+=2    

          if(victorycnt>=20){
            victorycnt = 0
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
          
          //규 수정
          if(result.name=="thumbs_up") thumbsupcnt+=2

          if(thumbsupcnt>=10){
            thumbsupcnt = 0
            console.log("thumbs up")
            socket.emit('thumbsRequest_server', user_id, ROOM_ID)
          }
        }
      }
      if(palmcnt >= 1) palmcnt--
      if(victorycnt >= 1) victorycnt--
      if(thumbsupcnt >= 1) thumbsupcnt-- //규 수정
      // ...and so on
      if(!isGestureOff && gesturechk) setTimeout(() => { gesturePred() }, 1000 / config.video.fps)
      else gestureFlag = true
    }
  }
  //====제스처====

  //----일반 버튼 function----

  var camButton = document.getElementById('cam_button')
  var camImage = document.getElementById('webc')
  var audioButton = document.getElementById('audio_button')
  var audioImage = document.getElementById('micr')
  var displayButton = document.getElementById('display_button')
  var displayImage = document.getElementById('docu')
  var camWriteButton = document.getElementById('camWrite_button')
  var camwriteImage = document.getElementById('penc')
  var gestureButton = document.getElementById('gesture_button')
  var gestureImage = document.getElementById('hand')

  function camfunc(){
    if(isNoCamUser) {
      swal({
        text:'캠이 없습니다',
        icon:'error'
      })
    }
    else if(isCamWrite2) {
      swal({
        text:'캠 필기가 켜져있습니다',
        icon:'error'
      })
      
    }
    else if(gesturechk) {
      swal({
        text:'제스처가 켜져있습니다',
        icon:'error'
      })
    }
    else {
      if(isCam) {
        myVideoBackground.style.width = '160px'
        myVideoBackground.style.height = '118px'
        myVideo.style.visibility="hidden"
        camButton.innerText = '캠 켜기'
        camImage.src="img/[크기변환]noweb-cam.png"
      }
      else {
        myVideoBackground.style.width = '0px'
        myVideoBackground.style.height = '0px'
        myVideo.style.visibility="visible"
        myVideo.width = 160
        myVideo.height = 118
        camButton.innerText = '캠 끄기'
        camImage.src="img/[크기변환]web-cam.png"
      }
      isCam = !isCam
      localStream.flag = 0
      socket.emit('streamPlay_server', user_id, ROOM_ID, isCam) 
    }
  }

  function audiofunc(){
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
      socket.emit('muteRequest_server', user_id, ROOM_ID, isMute)
    }
    else {
      swal({
        text:'마이크가 없습니다',
        icon:'error'
      })
    }
  }

  function displayfunc(){
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
    else {
      swal({
        text:'화면 공유가 이미 켜져 있습니다.',
        icon:'error'
      })
    }
  }

  function camwritefunc(){
    if(isNoCamUser) {
      swal({
        text:'캠이 없습니다',
        icon:'error'
      })
    }
    else if(!isCam) {
      swal({
        text:'캠을 켜주세요',
        icon:'error'
      })
    }
    else if(!isCanvas) {
      swal({
        text:'캔버스 권한이 없습니다',
        icon:'error'
      })
    }
    else {
      if(!isCamWrite) {
        swal({
          text:'펜으로 인식할 부분을 클릭해주세요',
          icon:'info'
        })
        extractColorVideo.style.visibility = 'visible'
        extractColorVideo.width = canvas.width
        extractColorVideo.height = canvas.height
        isCamWrite = true
        camwriteImage.src="img/[크기변환]nopencil.png"
        camWriteButton.innerText = '캠 필기 끄기'
      }
      else {
        swal({
          text:'캠 필기 기능 종료',
          icon:'info'
        })
        R=[]
        G=[]
        B=[]
        cursorContext.clearRect(0,0, width, height)
        extractColorVideo.style.visibility = 'hidden'
        isCamWrite = false
        isCamWrite2 = false
        extractCnt = 0
        camwriteImage.src="img/[크기변환]pencil.png"
        camWriteButton.innerText = '캠 필기 켜기'
      }
    }
  }

  function gesturefunc(){
    if(isNoCamUser) {
      swal({
        text:'캠이 없습니다',
        icon:'error'
      })
    }
    else if(!isCam) {
      swal({
        text:'캠을 켜주세요',
        icon:'error'
      })
    }
    else if(!isCanvas) {
      swal({
        text:'캔버스 권한이 없습니다',
        icon:'error'
      })
    }
    else {
      if(gesturechk) {
        gestureImage.src="img/[크기변환]hand.png"
        gestureButton.innerText = '제스처 켜기'
        isGestureOff = true
      }
      else if(!gesturechk) {
        gestureImage.src="img/[크기변환]nohand.png"
        gestureButton.innerText = '제스처 끄기'
        gesturePred()
      }
      gesturechk = !gesturechk
    }
  }
  //====일반 버튼 function====

  //----캠 필기 및 필기 루프----
  function extractLoop() {
    extractDraw()
    setTimeout(extractLoop, camWriteFrame)
  }

  function mainLoop() {
    if(isFirstDraw && user_id !== undefined) {
      isFirstDraw = false
      socket.emit('reDrawing', ROOM_ID, user_id)
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

    var relativeMouseY = mouse.pos.y/canvas.height
    var relativeMouseX = mouse.pos.x/canvas.width

    changeCanvasImage(relativeMouseX, relativeMouseY, selected, 1)

    if(canvas.width != width || canvas.height != height) {  //웹 페이지 크기가 변할 때
      socket.emit('reDrawing', ROOM_ID, user_id)
      canvas.width = width
      canvas.height = height

      cursorCanvas.width = width
      cursorCanvas.height = height

      extractColorVideo.width = width
      extractColorVideo.height = height
      context.drawImage(canvasImage, 0,0, canvas.width, canvas.height)
    }

    if(gesturechk) {
      if(mouse.click || cam_mouse.click){ 
        isGestureOff = true
      }
      else {
        isGestureOff = false
        if(gestureFlag) {
          gestureFlag = false
          gesturePred()
        }
      }
    }
    if(mouse.click && mouse.move && mouse.pos_prev && isCanvas) {
      if(relativeMouseY < 0.905 && mouse.pos_prev.y/canvas.height < 0.905){
        if(penStyle === 'pen') socket.emit('drawLine', {line: [mouse.pos, mouse.pos_prev], roomId:ROOM_ID, userId: user_id, size:[width, height], penWidth: penWidth, penColor: penColor})
        else socket.emit('drawLine', {line: [mouse.pos, mouse.pos_prev], roomId:ROOM_ID, userId: user_id, size:[width, height], penWidth: 30, penColor: 'white'})
      }
      mouse.move = false
    }
    //else if(mouse.click && penStyle === 'eraser') socket.emit('erase_server', ROOM_ID, mouse.pos.x, mouse.pos.y, width, height) 지우개 기능 보류
    mouse.pos_prev = {x: mouse.pos.x, y: mouse.pos.y}
    setTimeout(mainLoop, mainFrame)
  }
  //====캠 필기 및 필기 루프====

  //----CSS변경----
  function changeCSS(theClass, element, value) {
    var cssRules  
    for (var S = 0; S < document.styleSheets.length; S++) {  
       try { 
        document.styleSheets[S].insertRule(theClass + ' { ' + element + ': ' + value + '; }', document.styleSheets[S][cssRules].length)
       } catch(err) {  
          try {
            document.styleSheets[S].addRule(theClass, element + ': ' + value + ';')
          } catch(err) {  
            try {
              if (document.styleSheets[S]['rules']) cssRules = 'rules'
              else if (document.styleSheets[S]['cssRules']) cssRules = 'cssRules' 
              else {}
  
              for (var R = 0; R < document.styleSheets[S][cssRules].length; R++) {
                if (document.styleSheets[S][cssRules][R].selectorText == theClass) {
                  if (document.styleSheets[S][cssRules][R].style[element]) {
                      document.styleSheets[S][cssRules][R].style[element] = value
                      break
                  }
                }
              }
             } catch(err) {}
            }
        }
    }
 }
 //====CSS변경====

 //----유저 입장----
 function joinLoop() //콜 연결 소실 판단
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
    userBox.id = 'myuserBox'
    bold.id = 'mybold'
    videoUserName.appendChild(bold)
    bold.appendChild(videoUserNameText)
    userBox.appendChild(videoUserName)
    userBox.appendChild(myVideoBackground)
    userBox.appendChild(myVideo)

    const thumbsicon=document.createElement("img")
    thumbsicon.id="mythumbsicon"
    thumbsicon.className="thumbsicon"
    thumbsicon.src="img/thumbs.png"
    userBox.appendChild(thumbsicon)

    myVideo.srcObject = localStream
    myVideo.addEventListener('loadedmetadata', () => {
      myVideo.play()
    })
    hiddenVideo.srcObject = localStream
    hiddenVideo.addEventListener('loadedmetadata', async() => { //비디오 로드 된 후 시작
      hiddenVideo.play()
      await gestureLoad()
      $(".loading").fadeOut()
      videoGrid.append(userBox)
      if(user_id !== null && user_id !== undefined)
        socket.emit('join-room', ROOM_ID, user_id, user_name)
      else joinLoop()
      canvasImage.src = 'img/canvas.png'
      allLoaded()
      
      menu = new Menu("#myMenu")
      var item1 = new Item("list", "fas fa-bars", "#8cc9f0")
      var item2 = new Item("exit", "fas fa-sign-out-alt", "#FF5C5C", "방에서 퇴장")
      var item3 = new Item("rename", "fas fa-id-card", "#EE82EE", "이름 변경")
      var item4 = new Item("reverse", "fas fa-exchange-alt", "#64F592", "캠 필기 좌우반전")
      var item5 = new Item("screenshot", "fas fa-image", "orange", "스크린샷")

      menu.add(item1)
      menu.add(item2)
      menu.add(item3)
      menu.add(item4)
      menu.add(item5)

      var exitButton=document.getElementById("exit")
      var renameButton=document.getElementById("rename")
      var reverseButton=document.getElementById("reverse")
      var screenshotButton=document.getElementById("screenshot")

      exitButton.addEventListener('click', () => {
          window.location.href = '/'
      })

      reverseButton.addEventListener('click', () => {
        isReverse = !isReverse
      })

      renameButton.addEventListener('click', () => {
        var flag = true
        var inputName
        (async () => { 
          inputName = await swal({
            text:"바꿀 이름을 입력해주세요",
            content:'input',
            icon: "info",
            buttons:[true,"입력"]
          })
  
          if(inputName == null || inputName == undefined || inputName == '' || inputName.length > 6)  {
            swal({
              text:"6자리 이하의 적합한 이름을 입력해주세요",
              icon: "warning"
            })
            flag = false
          }

          if(flag){
            var bold = document.getElementById('mybold')
            bold.innerText = inputName
            user_name = inputName
            socket.emit('nameChange_server', ROOM_ID, user_id, isHost, inputName)
          }
        })()
      })
      
      screenshotButton.addEventListener('click', () => {
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
      })

      camButton.addEventListener('click', camfunc)
      camImage.addEventListener('click', camfunc)

      audioButton.addEventListener('click', audiofunc)
      audioImage.addEventListener('click', audiofunc)

      displayButton.addEventListener('click', displayfunc)
      displayImage.addEventListener('click', displayfunc)
      
      camWriteButton.addEventListener('click', camwritefunc)
      camwriteImage.addEventListener('click', camwritefunc)
      
      gestureButton.addEventListener('click', gesturefunc)
      gestureImage.addEventListener('click', gesturefunc)
    })
    getNewUser()

    socket.on('user-connected', (userId, userName) => {
      isCall[userId] = true
      connectionLoop(userId, userName, 0)
    })
  }
  //====유저 입장====

  //----다른 Peer의 call을 받는 함수----
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
      video.width = 160
      video.height = 118
      const userBox = document.createElement('userBox')
      const videoBackground = document.createElement('videoBackground')
      videoBackground.style.width = '160px'
      videoBackground.style.height = '118px'

      call.on('stream', userVideoStream => {
        if(peers[call.peer] == undefined) {
          socket.emit('getMute', call.peer, user_id, ROOM_ID)
          socket.emit('getCam', call.peer, user_id, ROOM_ID)
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

          const thumbsicon=document.createElement("img")
          thumbsicon.id=call.peer+"thumbsicon"
          thumbsicon.className="thumbsicon"
          thumbsicon.src="img/thumbs.png"
          userBox.appendChild(thumbsicon)
        }
        peers[call.peer] = call
      })
    })
  }
  //====다른 Peer의 call을 받는 함수====

  //----이미 접속중인 Peer에게 Call을 보내는 함수----
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
      var connectcount=0
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

        connectcount++

        if(connectcount==2){
          const thumbsicon=document.createElement("img")
          thumbsicon.id=userId+"thumbsicon"
          thumbsicon.className="thumbsicon"
          thumbsicon.src="img/thumbs.png"
          userBox.appendChild(thumbsicon)
        }
      })

      peers[userId] = call
    }
  }
  //====이미 접속중인 Peer에게 Call을 보내는 함수====

  //----비디오 추가----
  function addVideoStream(video, stream, userBox) {
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
      video.play()
    })
    videoGrid.append(userBox)
  }
  //====비디오 추가====

  //----화면 공유----
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

  function connectToDisplay(userId) {
      var displayVideo = document.createElement('video')
      var airboard = document.getElementById('airboard')
      displayVideo.id = 'userDisplay'
      displayVideo.width = canvas.width
      displayVideo.height = canvas.height
      const call = myPeer.call(userId, localStream)
      displayCall = call
      call.on('stream', stream => {
        localDisplay = stream
        airboard.append(displayVideo)
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
        })
        displayVideo.addEventListener('play', function() {
          isDisplaying = true
        }, false )
      })
      call.on('error', err => {
      })
  }

  function displayPlay() {
    var displayVideo = document.createElement('video')
    var airboard = document.getElementById('airboard')
    displayVideo.id = 'userDisplay'
    displayVideo.width = canvas.width
    displayVideo.height = canvas.height
    airboard.append(displayVideo)
    navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    }).then(stream => {
      localStream.flag = 2
      localDisplay = stream
      isDisplayHost= true
      displayVideo.srcObject = stream
      displayVideo.play()
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
    })
    displayVideo.addEventListener('play', function() {
      canvas.style.backgroundColor = 'transparent'
      isDisplaying = true
    }, false )
  }
  //====화면 공유====

  //----채팅----
  function drawChatMessage(data){
    var wrap = document.createElement('div')
    if(data.user_id==user_id) wrap.className="myMsg"
    else wrap.className="anotherMsg"
  
    var message = document.createElement('span')
    message.className="msg"

    var name = document.createElement('span')

    if(data.user_id!=user_id){
      name.className="anotherName"
      name.innerText = data.name+":"
    }
    else{
      name.className="myName"
      name.innerText = data.name+"(나):"
    }

    name.classList.add('output__user__name')
    wrap.appendChild(name)
    message.innerText = data.message
    message.classList.add('output__user__message')
    wrap.classList.add('output__user')
    wrap.dataset.id = socket.id
    wrap.appendChild(message)
    return wrap
  }

  document.querySelector('#chatInput').addEventListener('keyup', (e)=>{
    if (e.keyCode === 13) {
      var message = chatInput.value
      if(!message) return false
      socket.emit('sendMessage', { message, ROOM_ID, user_id, user_name })
      chatInput.value = ''
    }  
  })

  sendButton.addEventListener('click', function(){ 
    var message = chatInput.value
    if(!message) return false
    
    socket.emit('sendMessage', { message, ROOM_ID, user_id, user_name })
    chatInput.value = ''
  })
  //====채팅====

  //----캔버스 이미지 덧씌우기----
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

  function clickCanvas(select)
  {
    if(select === 1) penStyle = 'pen'
    else if(select === 2) penStyle = 'eraser'
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
  //====캔버스 이미지 덧씌우기====
})()