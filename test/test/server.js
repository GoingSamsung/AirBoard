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
//mongoose.connect('mongodb://localhost:27017/room_user_db');
mongoose.connect('mongodb://user:password@49.50.161.223:27017/room_user_db'
   ,{ useNewUrlParser: true } )
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

app.get('/newroom', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room })
})

io.on('connection', socket => {
  socket.on('sendMessage', function(data){ data.name = socket.userName; io.sockets.emit('updateMessage', data); });

  socket.on('join-room', (roomId, userId, userName) => {
    socket.userName=userName

    const user = new User({
      userName:userName,
      id : userId,
      roomid:roomId
    });
    user.save((err, user)=>{
      if(err){
          return console.error(err);
      }
      console.log(user);
    });

    var msg= userName + '님이 접속하셨습니다.'
    socket.to(roomId).emit('updateMessage', { name : 'SERVER', message : msg, roomId: roomId });

    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', userId, userName)

    socket.on('disconnect', () => {
      User.deleteOne({userid : userId}).then((result)=>{
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
