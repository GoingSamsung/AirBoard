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

    var msg= userName + '님이 접속하셨습니다.'
    socket.to(roomId).emit('updateMessage', { name : 'SERVER', message : msg, roomId: roomId });

    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', (userId, userName))

    socket.on('disconnect', () => {
      var exit_msg = userName + '님이 퇴장하셨습니다.'
      socket.to(roomId).emit('updateMessage', { name : 'SERVER', message : msg, roomId: roomId });
      socket.to(roomId).broadcast.emit('user-disconnected', userId, userName)
    })
  })
})
server.listen(443)
