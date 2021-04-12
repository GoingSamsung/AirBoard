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

app.get('/', (req, res) => {
  res.render('home');
})

app.get('/newroom', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room })
})

io.on('connection', socket => {
  socket.on('sendMessage', function(data){ 
    data.name = socket.userName;
    io.sockets.emit('updateMessage', data); 
  });

  socket.on('getName', async (userId) =>{ //유저 이름 달아줌
    users = await User.findOne({userId:userId}, null, {})
    if(users.isHost)
      socket.emit('setName', userId, users.userName+'(호스트)') //호스트 문구 처리는 나중에 더 이쁘게
    else
      socket.emit('setName', userId, users.userName)
  })

  socket.on('join-room', async(roomId, userId, userName) => {
    socket.userName=userName
    socket.userId = userId
    socket.roomId = roomId

    //---호스트 판별---//
    var ishost = true
    hostUser = await User.findOne({roomid:roomId, isHost:true}, null, {})
    console.log(hostUser)
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
    socket.emit('userIdSet', userId)
    var msg= userName + '님이 접속하셨습니다.'  //이거 뜨는 위치 바꺼야댐
    socket.to(roomId).emit('updateMessage', { name : 'SERVER', message : msg, roomId: roomId });

    socket.join(roomId)
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
  socket.on('reDrawing', () => {
    for(var i in line_track) {
      socket.emit('drawLine', {line: line_track[i].line, roomId:line_track[i].roomId});
    }
  })

  for(var i in line_track) {
    socket.emit('drawLine', {line: line_track[i].line, roomId:line_track[i].roomId});
  } //트랙보고 새로 들어온 사람이 원래 그렸던 그림 볼 수 있도록

  socket.on('drawLine', data => {
    const dt ={
      line: data.line,
      roomId: data.roomId
    }
    dt.line = data.line
    dt.roomId = data.roomId
    line_track.push(dt)
    io.emit('drawLine', {line: data.line, roomId:data.roomId})
  })
  //---캔버스 코드---

})

server.listen(443)
