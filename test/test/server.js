const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')

app.set('view engine', 'ejs')
app.use(express.static('public'))

app.get('/', (req, res) => {
  // uuid를 통해 방 고유번호로 redirect
  res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room })
})

io.on('connection', socket => {
  //io는 socket.io 패키지를 import한 변수
  socket.on('join-room', (roomId, userId) => {
    //scripts.js에 있는 emit('join room')을 받음
    //socket은 커넥션이 성공했을 때 커넥션에 대한 정보를 담고 있는 변수
    socket.join(roomId)
    //그냥 room에 바인딩
    socket.to(roomId).broadcast.emit('user-connected', userId)
    //scripts.js에 있는 user-connected로 보내
    //밑이랑 동일

    socket.on('disconnect', () => {
      //끊겼을 때 이벤트 리스너
      //나를 제외한 다른 클라이언트들에게 이벤트 보내기 socket.broadcast.emit('이벤트명',{메세지});
      //broadcast없으면 나를 포함
      //sockets(socket_id).emit하면 특정 소켓한테 이벤트 보냄
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
})

server.listen(3000)
