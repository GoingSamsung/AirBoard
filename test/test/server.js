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

app.get('/', (req, res) => {
  res.render('home');
})

app.get('/:room/:userid', async(req, res)=> {
  console.log(req.params.userid)
  const user = await User.findOne({userId: req.params.userid}, null, {})
  res.json({user_name: user.userName})
})

app.post('/setStreamId/:streamId/:userId', async(req, res)=> {
  console.log(req.params)
  const user = await User.findOne({userId: req.params.userId}, null, {})
  await user.updateOne({streamId: req.params.streamId})
  console.log(user)
  res.json({message: "success!"})
})


app.get('/newroom', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room })
})

io.on('connection', socket => {
  socket.on('sendMessage', function(data){ data.name = socket.userName; io.sockets.emit('updateMessage', data); });
  socket.on('getName', async (streamId) =>{ // 건들고잇는부분
    users = await User.findOne({streamId:streamId}, null, {})
    socket.emit('setName', streamId, users.userName)
  })
  socket.on('join-room', (roomId, userId, userName, streamId) => {
    socket.userName=userName
    socket.userId = userId
    const user = new User({
      userName:userName,
      userId : userId,
      roomid:roomId,
      streamId: streamId
    });
    user.save((err, user)=>{
      if(err){
          return console.error(err);
      }
      console.log(user);
    });
    socket.emit('userIdSet', userId)
    var msg= userName + '님이 접속하셨습니다.'
    socket.to(roomId).emit('updateMessage', { name : 'SERVER', message : msg, roomId: roomId });

    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', userId, userName)

    socket.on('disconnect', () => {
      User.remove({userId : userId}).then((result)=>{
        console.log("delete user id : "+userId+"user name : "+userName);
        console.log(result);
      });
      var exit_msg = userName + '님이 퇴장하셨습니다.'
      socket.to(roomId).emit('updateMessage', { name : 'SERVER', message : msg, roomId: roomId });
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
})

server.listen(443)
