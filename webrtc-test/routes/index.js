const express = require("express");
const router = express.Router();
const fs = require('fs')

const { v4: uuidV4 } = require('uuid');

const mongoose = require("mongoose");
const Room = require('../models/room');
const Account = require("../models/account");

const crypto = require("crypto");

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

function forwardAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    res.render('home', {log_message: '로그인', log_func: '/login', need_signup: true
    ,name: ''})
}

//로그인에 성공할 시 serializeUser 메서드를 통해서 사용자 정보를 세션에 저장
passport.serializeUser(function (account, done) {
    done(null, account);
});

//사용자 인증 후 요청이 있을 때마다 호출
passport.deserializeUser(function (account, done) {
    done(null, account);
});

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true//request callback 여부
},
    function (req, email, password, done) {
        Account.findOne({ email: email, password: crypto.createHash('sha512').update(password).digest('base64') }, function (err, account) {
            if (err) {
                throw err;
            } else if (!account) {
                return done(null, false, req.flash('login_message', '이메일 또는 비밀번호를 확인하세요.')); // 로그인 실패
            } else {
                return done(null, account); // 로그인 성공
            }
        });
    }
));

router.get('/', forwardAuthenticated, (req, res) => {
    res.render('home', {log_message: '로그아웃', log_func: '/logout', need_signup: false, 
    name: req.user.name});
})

router.get('/signup', (req, res) => {
    res.render("signup");
});

router.get("/login", (req, res) => res.render("login", { message: req.flash("login_message") }));

router.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/'); //로그아웃 후 '/'로 이동
});

router.post("/signup", (req, res, next) => {
    if(req.body.email === '') res.send('<script type="text/javascript">alert("이메일을 입력해주세요."); window.location="/signup"; </script>')
    else if(req.body.password === '') res.send('<script type="text/javascript">alert("비밀번호를 입력해주세요."); window.location="/signup"; </script>')
    else if(req.body.name === '') res.send('<script type="text/javascript">alert("이름을 입력해주세요."); window.location="/signup"; </script>')
    else {
    Account.find({ email: req.body.email })
        .exec()
        .then(accounts => {
            if (accounts.length >= 1) {
                res.send('<script type="text/javascript">alert("이미 존재하는 이메일입니다."); window.location="/signup"; </script>')
            } else {
                const account = new Account({
                    _id: new mongoose.Types.ObjectId(),
                    name: req.body.name,
                    email: req.body.email,
                    password: crypto.createHash("sha512").update(req.body.password).digest("base64")
                })
                account
                    .save()
                    .then(result => {
                        console.log(result)
                        res.redirect("/")
                    })
                    .catch(err => {
                        console.log(err)
                    })
            }
        })
    }
})

// router.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }), function (req, res) {
//     res.redirect('/', {email: (req == null ? "" : req.body.email)});
// });

router.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

router.get('/newroom', (req, res) => {
    var newRoomId = uuidV4()
    const room = new Room({
        roomId: newRoomId,
    });
    room.save((err, room) => {
        if (err) return console.error(err);
    });
    res.redirect(`/${newRoomId}`)
})

router.get('/:room', async(req, res) => {
    const room = await Room.findOne({roomId: req.params.room}, null, {})
    if(room !== null) {
        if(req.user === undefined) res.render('room', { roomId: req.params.room, name: ''})
        else res.render('room', { roomId: req.params.room, name: req.user.name})
    }
    else res.render("noPage",{message:"존재하지 않는 회의실 주소입니다"})
})

router.post('/joinroom', (req, res) => {
    var tmp = req.body.address.split("/");
    if(tmp[2]=='airboard.ga'){
      res.redirect(`/${tmp[3]}`);
    }
    else{
      res.render("noPage",{message:"존재하지 않는 회의실 주소입니다"})
    }
})

router.get('/home/quit', async (req, res) => {
    res.render("noPage",{message:"호스트에 의해 강제 퇴장 당했습니다"});
})

router.get('/controlUser/:room/:userId/:flag', async (req, res) => {
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

router.get('/address/:room', (req, res) => {
    res.render('address', { roomId: req.params.room })
})

router.get('/userlist/:room', (req, res) => {
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

router.get('/img/:fileName', (req, res) => {
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

module.exports = router;