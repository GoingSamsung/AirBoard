const express = require('express')
const app = express()
const fs = require('fs')
const https = require('https');
const server = https.createServer(
	{
		key: fs.readFileSync('/etc/letsencrypt/live/airboard.ga/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/airboard.ga/cert.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/airboard.ga/chain.pem'),
    requestCert: false,
    rejectUnauthorized: false,
	},
	app
);
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')

const mongoose = require('mongoose')
const User = require('./models/user')
const Room = require('./models/room')
const Account = require('./models/account')
const { response } = require('express')
const user = require('./models/user')
const { request } = require('http')
const bodyParser = require('body-parser')

const indexRoute = require("./routes/index")
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const Session = require('express-session')
const flash = require('connect-flash')
var MongoDBStore = require('connect-mongodb-session')(Session)

//로컬 테스트시 여기서 복붙
//mongoose 연결

var favicon = require('serve-favicon')
var path = require('path')

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))

mongoose.connect('mongodb://localhost:27017/room_user_db')
const db = mongoose.connection
db.on('error', console.error)
db.once('open', function(){
    // CONNECTED TO MONGODB SERVER
    console.log("Connected to mongod server")
})
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }));

var store = new MongoDBStore({//세션을 저장할 공간
  uri: 'mongodb://localhost:27017/room_user_db',//db url
  collection: 'sessions'//콜렉션 이름
});

store.on('error', function(error) {//에러처리
  console.log(error);
});

app.use(Session({
  secret:'goingsamsung', //세션 암호화 key
  resave:false,//세션 재저장 여부
  saveUninitialized:true,
  rolling:true,//로그인 상태에서 페이지 이동 시마다 세션값 변경 여부
  cookie:{maxAge:1000*60*60},//유효시간
  store: store
}));

app.use(passport.initialize())
app.use(passport.session())

app.use(flash())

app.use("/home", indexRoute)

var line_track = [] //캔버스용 라인따기
var line_track_backup = [] //캔버스용 라인따기
var backup_track = []
var isDisplayHost = []

app.get('/img/:fileName', (req, res) => {
  const { fileName } = req.params
  const { range } = req.headers
  const fileStat = fs.statSync('img/nocam.mp4')
  const { size } = fileStat
  const fullPath = 'img/nocam.mp4'
  if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0])
      const end = parts[1] ? parseInt(parts[1]) : size - 1
      const chunk = end - start + 1
      const stream = fs.createReadStream(fullPath, { start, end })
      res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunk,
          'Content-Type': 'video/mp4'
      })
      stream.pipe(res)
  } else {
      res.writeHead(200, {
          'Content-Length': size,
          'Content-Type': 'video/mp4'
      })
      fs.createReadStream(fullPath).pipe(res)
  }
})

app.get('/', (req, res) => {
  res.redirect('/home')
})

app.get('/accInfo', (req, res) => {
  if(req.user === undefined) res.redirect('/') 
  else res.render("accInfo",{name: req.user.name, email: req.user.email})
})

app.get('/:room', async(req, res) => {
  const room = await Room.findOne({roomId: req.params.room}, null, {})
  if(room !== null) {
      if(req.user === undefined) res.render('room', { roomId: req.params.room, name: ''})
      else res.render('room', { roomId: req.params.room, name: req.user.name})
  }
  else res.render("noPage",{message:"존재하지 않는 회의실 주소입니다"})
})

app.get('/address/:room', (req, res) => {
  res.render('address', { roomId: req.params.room })
})

app.get('/userlist/:room', (req, res) => {
  fs.readFile('views/userlist.ejs', async(err, tmpl) => {
    var roomId = req.params.room
    var userlist = await User.find({roomId:roomId, isHost: false}, null, {})
    var cnt = 1
    var topText = "<table><tr><th>순번</th><th>이름</th><th colspan=\"4\">사용자 컨트롤</th></tr>"
    var userinfo = ""
    if(userlist) {
      if(userlist.length === 0) userinfo += "<tr><td colspan=\"5\">사용자가 없습니다</td></tr>"
      else {
        for(var i=0; i<userlist.length; i++) {   
          userinfo += "<tr><td>"
          + cnt++ + "</td>" + "<td>"+ userlist[i].userName +"</td>"
          + "<td><button onclick='controlUser(" + "\"" + userlist[i].userId + "\"" + "," + "\""  + roomId + "\"" + "," + "\""  + "cam" + "\"" + ");'>캠 끄기</button></td>"
          + "<td><button onclick='controlUser(" + "\"" + userlist[i].userId + "\"" + "," + "\""  + roomId + "\"" + "," + "\""  + "mute" + "\"" + ");'>마이크 끄기</button></td>"
          + "<td><button onclick='controlUser(" + "\"" + userlist[i].userId + "\"" + "," + "\""  + roomId + "\"" + "," + "\""  + "quit" + "\"" + ");'>강제 퇴장</button></td></tr>"
        }
      }
    }
    userinfo += "</table>"
    topText = topText+userinfo;
    let html = tmpl.toString().replace('%', topText)
    res.writeHead(200,{'Content-Type':'text/html'})
    res.end(html)
  })
})

app.get('/controlUser/:room/:userId/:flag', async (req, res) => {
  console.log('hh')
  var userId = req.params.userId
  var flag = req.params.flag
  var roomId = req.params.room
  if (flag === 'quit') {
      io.emit('quit', userId)
      await User.deleteOne({ userId: userId })
  }
  if (flag === 'cam') io.emit('cam', userId)
  if (flag === 'mute') io.emit('mute', userId)
  res.redirect('/userlist/' + roomId)
})

app.get('/airboard/quit', async (req, res) => {
  res.render("noPage",{message:"호스트에 의해 강제 퇴장 당했습니다"});
})

io.on('connection', socket => {
  socket.on('test', ()=> {
    console.log('hellotest')
  })
  socket.on('sendMessage', function(data){ 
    data.name = data.user_name;
    io.sockets.emit('updateMessage', data); 
  });
  socket.on('displayConnect_server', (roomId, userId) => {
    if(isDisplayHost[roomId] === undefined) isDisplayHost[roomId] = new Array(1)
    isDisplayHost[roomId] = userId
    if(userId !== null) io.sockets.in(roomId).emit('displayConnect_script', roomId, userId)
  })
  socket.on('newDisplayConnect_server', (roomId, userId, newUserId) => {
    io.sockets.in(roomId).emit('newDisplayConnect_script', roomId, userId, newUserId)
  })
  socket.on('streamPlay_server', async(userId, roomId, isCam) => {
    io.sockets.in(roomId).emit('streamPlay_script', userId, roomId, isCam)
    const camUser = await User.findOne({userId: userId}, null, {})
    camUser.isCam = isCam
    camUser.save()
  })
  socket.on('muteRequest_server', async(userId, roomId, isMute) => {
    io.sockets.in(roomId).emit('muteRequest_script', userId, roomId, isMute)
    const muteUser = await User.findOne({userId: userId}, null, {})
    muteUser.isMute = isMute
    muteUser.save()
  })
  socket.on('thumbsRequest_server',async(userId, roomId)=>{
    io.sockets.in(roomId).emit('thumbsRequest_script', userId, roomId)
  })
  socket.on('displayReset_server', (roomId, userId) => {
    io.sockets.in(roomId).emit('displayReset_script', roomId, userId)
  })
  socket.on('getName', async (userId, roomId) =>{ //유저 이름 달아줌
    users = await User.findOne({userId:userId}, null, {})
    if(users.isHost) io.sockets.in(roomId).emit('setName', userId, users.userName, true) //호스트 문구 처리는 나중에 더 이쁘게
    else io.sockets.in(roomId).emit('setName', userId, users.userName, false)
  })

  socket.on('getMute', async(muteUserId, userId, roomId) => {
    users = await User.findOne({userId:muteUserId}, null, {})
    io.sockets.in(roomId).emit('setMute', users.isMute, muteUserId, userId)
  })

  socket.on('getCam', async(camUserId, userId, roomId) => {
    users = await User.findOne({userId:camUserId}, null, {})
    io.sockets.in(roomId).emit('setCam', users.isCam, camUserId, userId)
  })

  socket.on('undo_server', async(roomId, userId) => {
    const room = await Room.findOne({roomId: roomId}, null, {})
    var flag = true
      if(line_track[roomId] !== undefined) {
        if(line_track[roomId][userId] !== undefined) {
          var undoDO = function(cnt, roomId, userId)
          {
            for(var i = 0; i < cnt; i++) line_track[roomId][userId].pop()
            backup_track[roomId][userId].push(cnt)
          }          
          var length = line_track[roomId][userId].length
          if(length >= 9) undoDO(9, roomId, userId)
          else if(length === 8) undoDO(8, roomId, userId)
          else if(length === 7) undoDO(7, roomId, userId)
          else if(length === 6) undoDO(6, roomId, userId)
          else if(length === 5) undoDO(5, roomId, userId)
          else if(length === 4) undoDO(4, roomId, userId)
          else if(length === 3) undoDO(3, roomId, userId)
          else if(length === 2) undoDO(2, roomId, userId)
          else if(length === 1) undoDO(1, roomId, userId)
          else flag = false
          if(flag) {
            io.sockets.in(roomId).emit('reLoading2', userId)
            if(!room.isEachCanvas)
              for(var i in line_track[roomId])
                for(var j in line_track[roomId][i]) {
                  io.sockets.in(roomId).emit('stroke', {line: line_track[roomId][i][j].line, roomId:line_track[roomId][i][j].roomId, userId: userId, size: line_track[roomId][i][j].size, penWidth: line_track[roomId][i][j].penWidth, penColor: line_track[roomId][i][j].penColor})
                }
            else
              for(var i in line_track[roomId][userId])
                socket.emit('stroke', {line: line_track[roomId][userId][i].line, roomId:line_track[roomId][userId][i].roomId, userId:line_track[roomId][userId][i].userId, size: line_track[roomId][userId][i].size, penWidth: line_track[roomId][userId][i].penWidth, penColor: line_track[roomId][userId][i].penColor});
            //socket.emit('test', userId)
          }
        }
    }
  })
  socket.on('redo_server', async(roomId, userId) => {
    const room = await Room.findOne({roomId: roomId}, null, {})
    if(backup_track[roomId] !== undefined && line_track[roomId] !== undefined) {
      if(backup_track[roomId][userId] !== undefined && line_track[roomId][userId] !== undefined) {
        var line_length = line_track[roomId][userId].length
        var length = backup_track[roomId][userId].length
        var backup_length = backup_track[roomId][userId][length-1]
        if(length > 0) {
        for(var i=0; i<backup_length; i++) {
          line_track[roomId][userId].push(line_track_backup[roomId][userId][line_length + i])
        }
        backup_track[roomId][userId].pop()
          io.sockets.in(roomId).emit('reLoading2', userId)
          if(!room.isEachCanvas)
            for(var i in line_track[roomId])
              for(var j in line_track[roomId][i])
                io.sockets.in(roomId).emit('stroke', {line: line_track[roomId][i][j].line, roomId:line_track[roomId][i][j].roomId, userId: userId, size: line_track[roomId][i][j].size, penWidth: line_track[roomId][i][j].penWidth, penColor: line_track[roomId][i][j].penColor})
          else 
            for(var i in line_track[roomId][userId])
              socket.emit('stroke', {line: line_track[roomId][userId][i].line, roomId:line_track[roomId][userId][i].roomId, userId:line_track[roomId][userId][i].userId, size: line_track[roomId][userId][i].size, penWidth: line_track[roomId][userId][i].penWidth, penColor: line_track[roomId][userId][i].penColor}); 
        }
      }
    }
  })
  socket.on('nameChange_server', async(roomId, userId, isHost, userName) => {
    users = await User.findOne({userId:userId}, null, {})
    console.log(users)
    users.userName = userName
    users.save()
    io.sockets.in(roomId).emit('nameChange_script', userId, isHost, userName)
  })
  socket.on('canvasControl_server', async(roomId, userId, isCanvas, isEachCanvas) => {
    io.sockets.in(roomId).emit('canvasControl_script', userId, isCanvas, isEachCanvas)
    const room = await Room.findOne({roomId: roomId}, null, {})
    room.isCanvas = isCanvas
    room.isEachCanvas = isEachCanvas
    room.save()
  })

  socket.on('join-room', async(roomId, userId, userName) => {
    socket.userName=userName
    socket.userId = userId
    socket.roomId = roomId

    //---호스트 판별---//
    var ishost = true
    const hostUser = await User.findOne({roomId:roomId, isHost:true}, null, {})
    const room = await Room.findOne({roomId: roomId}, null, {})
    if(hostUser != null)
      ishost=false
    if(ishost) {
      room.hostId = userId
      socket.emit('setHost', userId, room.participant);
    }
    room.participant += 1
    room.save()
    io.emit('setIsCanvas', userId, room.isCanvas, room.isEachCanvas)
    //---호스트 판별 끝---//
    const user = new User({
      userName:userName,
      userId : userId,
      roomId: roomId,
      isHost: ishost,
    });
    user.save((err, user)=>{
      if(err){
          return console.error(err);
      }
      console.log(user);
    });
    socket.join(roomId)
    var msg= userName + '님이 접속하셨습니다.'  //이거 뜨는 위치 바꺼야댐
    socket.to(roomId).emit('updateMessage', { name : 'SERVER', message : msg, roomId: roomId });

    socket.to(roomId).broadcast.emit('user-connected', userId, userName)

    socket.on('disconnect', async() => {
      var flag = 0
      const room = await Room.findOne({roomId: roomId}, null, {})
      if(room.participant == 1) {
        Room.remove({roomId: roomId}).then((result)=>{
          console.log("delete room id : "+roomId);
          console.log(result);
        });
      }
      else {
        room.participant -= 1
        if(userId === room.hostId)
          flag = 1
        room.save()
      }
      if(isDisplayHost[roomId] === userId) socket.to(roomId).broadcast.emit('displayReset_script', roomId, userId) //화면공유 켠 사람이 종료시
      User.remove({userId : userId}).then(async(result)=>{
        console.log("delete user id : "+userId+"user name : "+userName);
        console.log(result);
        if(flag) {
          const newHost = await User.findOne({roomId: roomId}, null, {})
          newHost.isHost = true
          room.hostId = newHost.userId
          room.save()
          newHost.save()
          socket.to(roomId).broadcast.emit('setHost', newHost.userId, 1);
          socket.to(roomId).broadcast.emit('hostChange', newHost.userId, newHost.userName)
        }
      });
      var exit_msg = userName + '님이 퇴장하셨습니다.'
      socket.to(roomId).emit('updateMessage', { name : 'SERVER', message : exit_msg, roomId: roomId });
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
  //---캔버스 코드---
  socket.on('clearWhiteBoard', async(roomId, userId) => {
    const room = await Room.findOne({roomId: roomId}, null, {})
    if(!room.isEachCanvas) line_track[roomId] = []
    else line_track[roomId][userId] = []
    io.sockets.in(roomId).emit('reLoading', userId)
  })
  socket.on('reDrawing', async(roomId, userId) => {
    const room = await Room.findOne({roomId: roomId}, null, {})
    if(!room.isEachCanvas)
      for(var i in line_track[roomId]) {
        for(var j in line_track[roomId][i]) 
        io.sockets.in(roomId).emit('reDrawLine', userId, {line: line_track[roomId][i][j].line, roomId:line_track[roomId][i][j].roomId, userId:line_track[roomId][i][j].userId, size: line_track[roomId][i][j].size, penWidth: line_track[roomId][i][j].penWidth, penColor: line_track[roomId][i][j].penColor});
      }
    else {
      if(userId !== null && userId !== undefined)
        if(line_track[roomId][userId] !== null && line_track[roomId][userId] !== undefined)
        for(var i in line_track[roomId][userId])
          io.sockets.in(roomId).emit('reDrawLine', userId, {line: line_track[roomId][userId][i].line, roomId:line_track[roomId][userId][i].roomId, userId:line_track[roomId][userId][i].userId, size: line_track[roomId][userId][i].size, penWidth: line_track[roomId][userId][i].penWidth, penColor: line_track[roomId][userId][i].penColor});
    }
  })
  /*
  socket.on('erase_server', (roomId, userId, click_x, click_y, width, height) => {
    var line_x = 0
    var line_y = 0
    var pos_line_x = 0
    var pos_line_y = 0
    for(var i in line_track[roomId]) {
      line_x = line_track[roomId][userId][i].line[0].x / line_track[roomId][userId][i].size[0]
      line_y = line_track[roomId][userId][i].line[0].y / line_track[roomId][userId][i].size[1]
      pos_line_x = line_track[roomId][userId][i].line[1].x / line_track[roomId][userId][i].size[0]
      pos_line_y = line_track[roomId][userId][i].line[1].y / line_track[roomId][userId][i].size[1]
      var deg_x = (pos_line_x - line_x)
      var deg_y = (pos_line_y - line_y)
      var result_x = click_x/width - line_x
      var result_y = click_y/height - line_y
      //deg_x, deg_y 같을 경우 고려
      console.log(click_y, height)
     // console.log('[' + result_y, parseInt((result_x*deg_y)/deg_x) + ']'+ i)  
      if(result_y < (result_x*deg_y)/deg_x + 0.005 && result_y > (result_x*deg_y)/deg_x - 0.005)
        line_track[roomId].splice(i,1) 
    }
    io.sockets.in(roomId).emit('reLoading', userId)
    for(var i in line_track[roomId])
     io.sockets.in(roomId).emit('stroke', {line: line_track[roomId][userId][i].line, roomId:line_track[roomId][userId][i].roomId, userId: userId, size: line_track[roomId][userId][i].size, penWidth: line_track[roomId][userId][i].penWidth, penColor: line_track[roomId][userId][i].penColor}) 
  })
  */
  /*
  for(var i in line_track[roomId]) {
    socket.emit('drawLine', {line: line_track[roomId][i].line, roomId:line_track[roomId][i].roomId});
  } //트랙보고 새로 들어온 사람이 원래 그렸던 그림 볼 수 있도록
  */
  socket.on('drawLine', data => {
    if(line_track[data.roomId] === undefined) {
      line_track[data.roomId] = new Array(0)
    }
    if(line_track_backup[data.roomId] === undefined) {
      line_track_backup[data.roomId] = new Array(0)
    }
    if(backup_track[data.roomId] === undefined) {
      backup_track[data.roomId] = new Array(0)
    }
    if(line_track[data.roomId][data.userId] === undefined)
      line_track[data.roomId][data.userId] = new Array(0)
    if(line_track_backup[data.roomId][data.userId] === undefined)
      line_track_backup[data.roomId][data.userId] = new Array(0)
    if(backup_track[data.roomId][data.userId] === undefined)
      backup_track[data.roomId][data.userId] = new Array(0)
    if(line_track[data.roomId][data.userId].length !== line_track_backup[data.roomId][data.userId].length) {
      line_track_backup[data.roomId][data.userId] = line_track[data.roomId][data.userId].slice()
      backup_track[data.roomId][data.userId] = new Array(0)
    }
    const dt ={
      line: data.line,
      roomId: data.roomId,
      size: data.size,
      penWidth: data.penWidth,
      penColor: data.penColor,
      userId: data.userId
    }
    line_track[data.roomId][data.userId].push(dt)
    line_track_backup[data.roomId][data.userId].push(dt)
    io.emit('drawLine', {line: data.line, roomId:data.roomId, userId: data.userId, size: data.size, penWidth:data.penWidth, penColor: data.penColor})
  })
  //---캔버스 코드---

})

server.listen(443)
