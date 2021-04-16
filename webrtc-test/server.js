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

///JB
var childProcess = require("child_process");
(function() {
  var oldSpawn = childProcess.spawn;
  function mySpawn() {
      console.log('spawn called');
      console.log(arguments);
      var result = oldSpawn.apply(this, arguments);
      return result;
  }
  childProcess.spawn = mySpawn;
})();

const result_02 = childProcess.spawn('python', ['test2.py']); 
    //console.log(result_02);
    result_02.stdout.on('data', (result)=>{
      console.log(result.toString());
    });

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

app.get('/', (req, res) => {
  res.render('home');
})

app.get('/newroom', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room })
})

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

  socket.on('imageSend', (roomId, userId, image) => { //화면 공유용
    io.emit('drawImage', roomId, userId, image)
  })
  socket.on('drawPause_script', (tf, roomId) => {
    io.emit('drawPause_server', tf, roomId)
  })
  socket.on('isDisplaying_script', (tf, roomId) => {
    io.emit('isDisplaying_server', tf, roomId)
  })
  socket.on('sendMessage', function(data){ 
    data.name = socket.userName;
    io.sockets.emit('updateMessage', data); 
  });
  socket.on('display_connect', (roomId, userId) => {
    io.emit('display_connected', roomId, userId)
  })
  socket.on('new_display_connect', (roomId, userId, newUserId) => {
    io.emit('new_display_connected', roomId, userId, newUserId)
  })
  socket.on('stream_play', (userId, roomId, isCam) => {
    io.emit('streamPlay', userId, roomId, isCam)
  })

  socket.on('getName', async (userId) =>{ //유저 이름 달아줌
    users = await User.findOne({userId:userId}, null, {})
    if(users.isHost)
      socket.emit('setName', userId, users.userName+'(호스트)') //호스트 문구 처리는 나중에 더 이쁘게
    else
      socket.emit('setName', userId, users.userName)
  })
  socket.on('pauseServer', (userId, isPause) => {
    io.emit('pause', userId, isPause)
  })

  socket.on('isConnect', async(videoCnt, roomId) => { //---연결 버그 확인중
    const user = await User.find({roomid:roomId}, null, {})
    if(videoCnt == user.length)
      socket.emit('connectResult', true)
    else
      socket.emit('connectResult', false)
  })

  socket.on('join-room', async(roomId, userId, userName) => {
    socket.userName=userName
    socket.userId = userId
    socket.roomId = roomId

    /*
    const result_02 = childProcess.spawn('python', ['test.py', 'test']); 
    //console.log(result_02);
    result_02.stdout.on('data', (result)=>{
      console.log(result.toString());
    });
    */

    //---호스트 판별---//
    var ishost = true
    const hostUser = await User.findOne({roomid:roomId, isHost:true}, null, {})
    if(hostUser != null)
      ishost=false
    //---호스트 판별 끝---//
    const user = new User({
      userName:userName,
      userId : userId,
      roomid:roomId,
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
  socket.on('clearWhiteBoard', (roomId) => {
    line_track[roomId]=[]
    io.emit('reLoading', roomId)
  })
  socket.on('reDrawing', (roomId) => {
    for(var i in line_track[roomId]) {
      socket.emit('drawLine', {line: line_track[roomId][i].line, roomId:line_track[roomId][i].roomId});
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
      roomId: data.roomId
    }
    dt.line = data.line
    dt.roomId = data.roomId
    line_track[data.roomId].push(dt)
    io.emit('drawLine', {line: data.line, roomId:data.roomId})
  })
  //---캔버스 코드---

})

server.listen(443)
