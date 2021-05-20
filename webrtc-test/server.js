const express = require('express')
const app = express()
const fs = require('fs');
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

const mongoose = require('mongoose');
const User = require('./models/user');

//로컬 테스트시 여기서 복붙
//mongoose 연결
mongoose.connect('mongodb://localhost:27017/room_user_db');
const db = mongoose.connection;
db.on('error', console.error);
db.once('open', function(){
    // CONNECTED TO MONGODB SERVER
    console.log("Connected to mongod server");
});
app.set('view engine', 'ejs')
app.use(express.static('public'))

var line_track = [] //캔버스용 라인따기
var isDisplayHost = []
app.get('/', (req, res) => {
  res.render('home');
})

app.get('/newroom', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room })
})
/*
app.get('/views/settingPage', (req, res) => {
  console.log("Hh")
  res.render('home')
})
*/
app.get('/img/:fileName', (req,res) => {
  const { fileName } = req.params
  const { range } = req.headers
  const fileStat = fs.statSync('img/nocam.mp4')
  const {size} = fileStat
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
io.on('connection', socket => {
  socket.on('getStream_server', (userId_caller, userId_callee, roomId) => {
    io.sockets.in(roomId).emit('getStream_script', userId_caller, userId_callee, roomId)
  })
  socket.on('sendStream_server', (userId_caller, userId_callee, roomId, isCam) => {
    io.sockets.in(roomId).emit('sendStream_script', userId_caller, userId_callee, roomId, isCam)
  })
  socket.on('sendMessage', function(data){ 
    data.name = socket.userName;
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
  socket.on('streamPlay_server', (userId, roomId, isCam) => {
    io.sockets.in(roomId).emit('streamPlay_script', userId, roomId, isCam)
  })
  socket.on('muteRequest_server', async(userId, roomId, isMute) => {
    io.sockets.in(roomId).emit('muteRequest_script', userId, roomId, isMute)
    const muteUser = await User.findOne({userId: userId}, null, {})
    muteUser.isMute = isMute
    muteUser.save()
  })
  socket.on('displayReset_server', (roomId, userId) => {
    io.sockets.in(roomId).emit('displayReset_script', roomId, userId)
  })
  socket.on('getName', async (userId, roomId) =>{ //유저 이름 달아줌
    users = await User.findOne({userId:userId}, null, {})
    if(users.isHost)
      io.sockets.in(roomId).emit('setName', userId, users.userName+'(호스트)') //호스트 문구 처리는 나중에 더 이쁘게
    else
      io.sockets.in(roomId).emit('setName', userId, users.userName)
  })
  socket.on('getMute', async(muteUserId, userId, roomId) => {
    users = await User.findOne({userId:muteUserId}, null, {})
    io.sockets.in(roomId).emit('setMute', users.isMute, muteUserId, userId)
  })

  socket.on('join-room', async(roomId, userId, userName) => {
    socket.userName=userName
    socket.userId = userId
    socket.roomId = roomId

    //---호스트 판별---//
    var ishost = true
    const hostUser = await User.findOne({roomid:roomId, isHost:true}, null, {})
    if(hostUser != null)
      ishost=false
    //---호스트 판별 끝---//
    const user = new User({
      userName:userName,
      userId : userId,
      roomid: roomId,
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

    socket.on('disconnect', () => {
      if(isDisplayHost[roomId] === userId) socket.to(roomId).broadcast.emit('displayReset_script', roomId, userId) //화면공유 켠 사람이 종료시
      User.remove({userId : userId}).then((result)=>{
        console.log("delete user id : "+userId+"user name : "+userName);
        console.log(result);
      });
      var exit_msg = userName + '님이 퇴장하셨습니다.'
      socket.to(roomId).emit('updateMessage', { name : 'SERVER', message : exit_msg, roomId: roomId });
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
  //---캔버스 코드---
  socket.on('clearWhiteBoard', roomId => {
    line_track[roomId]=[]
    io.sockets.in(roomId).emit('reLoading', roomId)
  })
  socket.on('reDrawing', roomId => {
    for(var i in line_track[roomId]) {
      socket.emit('drawLine', {line: line_track[roomId][i].line, roomId:line_track[roomId][i].roomId, size: line_track[roomId][i].size, penWidth: line_track[roomId][i].penWidth, penColor: line_track[roomId][i].penColor});
    }
  })
  /*
  for(var i in line_track[roomId]) {
    socket.emit('drawLine', {line: line_track[roomId][i].line, roomId:line_track[roomId][i].roomId});
  } //트랙보고 새로 들어온 사람이 원래 그렸던 그림 볼 수 있도록
  */
  socket.on('drawLine', data => {
    if(line_track[data.roomId] == undefined) {
      line_track[data.roomId] = new Array(1)
    }
    const dt ={
      line: data.line,
      roomId: data.roomId,
      size: data.size,
      penWidth: data.penWidth,
      penColor: data.penColor
    }
    line_track[data.roomId].push(dt)
    io.emit('drawLine', {line: data.line, roomId:data.roomId, size: data.size, penWidth:data.penWidth, penColor: data.penColor})
  })
  //---캔버스 코드---

})

server.listen(443)
