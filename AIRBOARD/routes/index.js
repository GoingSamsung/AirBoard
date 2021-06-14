const express = require("express")
const router = express.Router()
const fs = require('fs')

const { v4: uuidV4 } = require('uuid')

const mongoose = require("mongoose")
const Room = require('../models/room')
const Account = require("../models/account")

const crypto = require("crypto")

const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy

const User = require('../models/user')


var nodemailer = require('nodemailer');
var smtpTransporter = require('nodemailer-smtp-transport');

var smtpTransport = nodemailer.createTransport(smtpTransporter({
    service: 'Gmail',
    host: 'smtp.gmail.com',
    auth: {
        user: 'ajou.goingsamsung@gmail.com',
        pass: '5y3v$Qy#dB22n&!F'
    }
}))

function forwardAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    res.render('home', {log_message: '로그인', log_func: '/login', need_signup: true
    ,name: ''})
}

//로그인에 성공할 시 serializeUser 메서드를 통해서 사용자 정보를 세션에 저장
passport.serializeUser(function (account, done) {
    done(null, account)
})

//사용자 인증 후 요청이 있을 때마다 호출
passport.deserializeUser(function (account, done) {
    done(null, account)
})

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true//request callback 여부
},
    function (req, email, password, done) {
        Account.findOne({ email: email, password: crypto.createHash('sha512').update(password).digest('base64') }, function (err, account) {
            if (err) {
                throw err
            } else if (!account) {
                return done(null, false, req.flash('login_message', '이메일 또는 비밀번호를 확인하세요.')) // 로그인 실패
            } else {
                return done(null, account) // 로그인 성공
            }
        })
    }
))

router.get('/', forwardAuthenticated, (req, res) => {
    res.render('home', {log_message: '로그아웃', log_func: '/logout', need_signup: false, 
    name: req.user.name})
})

router.get('/signup', (req, res) => {
    res.render("signup")
})


router.post('/addGes', async(req,res)=>{
    const user = await Account.findOne({email: req.user.email})
    var ret = []
    var thu = []
    var ind = []
    var mid = []
    var rin = []
    var pin = []
    thu.push(req.body.ThumbCurl), thu.push(req.body.ThumbCurlNum), thu.push(req.body.ThumbDir), thu.push(req.body.ThumbDirNum)
    ind.push(req.body.IndexCurl), ind.push(req.body.IndexCurlNum), ind.push(req.body.IndexDir), ind.push(req.body.IndexDirNum)
    mid.push(req.body.MiddleCurl), mid.push(req.body.MiddleCurlNum), mid.push(req.body.MiddleDir), mid.push(req.body.MiddleDirNum)
    rin.push(req.body.RingCurl), rin.push(req.body.RingCurlNum), rin.push(req.body.RingDir), rin.push(req.body.RingDirNum)
    pin.push(req.body.PinkyCurl), pin.push(req.body.PinkyCurlNum), pin.push(req.body.PinkyDir), pin.push(req.body.PinkyDirNum)
    ret.push(thu),ret.push(ind),ret.push(mid),ret.push(rin),ret.push(pin)
    user.customGes = ret
    user.save()
    res.redirect('/')
})

router.post('/changeName', async(req, res) => {
    const user = await Account.findOne({email: req.body.email}, null, {})
    user.name = req.body.nextName
    user.save()
    req.user.name = user.name
    res.redirect('/')
})

router.get("/login", (req, res) => res.render("login", { message: req.flash("login_message") }));

router.get("/identify", (req, res) => res.render("identify"));

router.get('/requestPasswordReset', (req, res) => {
    Account.find({ email: req.query.email })
        .exec()
        .then((accounts) => {
            if (accounts.length === 1) {
                const url = `${req.protocol}://${req.get('host')}/home/confirmEmail?key=${accounts[0].verificationKey}`;
                const mailOption = {
                    from: 'ajou.goingsamsung@gmail.com',
                    to: accounts[0].email,
                    subject: '[AirBoard] 비밀번호 재설정 요청',
                    html: `비밀번호 재설정을 위해 URL을 클릭해주세요.\nURL: ${url}`,
                };

                smtpTransport.sendMail(mailOption, function (err, res) {
                    if (err) { console.log(err); }
                    else { console.log(`Email successfully sent to ${req.query.email}.`); }
                    smtpTransport.close();
                });

                res.send('<script type="text/javascript">alert("이메일을 확인하세요."); window.location="/home//login"; </script>');
            } else {
                res.send('<script type="text/javascript">alert("가입되지 않은 이메일입니다."); window.location="/home/signup"; </script>')
            }
        })
});

router.get('/confirmEmail', function (req,res) {
    Account.find({ verificationKey: req.query.key }).exec().then((accounts) => {
        if (accounts.length == 1) {
            res.send(`<script type="text/javascript">alert("비밀번호를 변경하세요."); window.location="/home/resetPassword?key=${req.query.key}"; </script>`)
        } else {
            res.send('<script type="text/javascript">alert("잘못된 접근입니다."); window.location="/home"; </script>')
        }
    })
});

router.get('/resetPassword', (req, res) => {
    Account.find({ verificationKey: req.query.key }).exec().then((accounts) => {
        if (accounts.length == 1) {
            res.render("resetPassword", {account: accounts[0] });
        } else {
            res.send('<script type="text/javascript">alert("잘못된 접근입니다."); window.location="/home"; </script>');
        }
    });
});

router.post('/submitNewPassword', (req, res) => {
    console.log(req.body);
    Account.find({ email: req.body.email, verificationKey: req.body.verificationKey }).exec().then((accounts) => {
        if (accounts.length == 1) {
            const hexEncodedString = crypto.randomBytes(256).toString('hex').substr(100, 5);
            const base64EncodedString = crypto.randomBytes(256).toString('base64').substr(50, 5);
            const newVerificationKey = hexEncodedString + base64EncodedString;

            accounts[0].password = crypto.createHash("sha512").update(req.body.password).digest("base64");
            accounts[0].verificationKey = newVerificationKey;

            accounts[0].save();

            console.log(accounts[0]);

            res.send('<script type="text/javascript">alert("비밀번호가 변경되었습니다."); window.location="/home/login"; </script>');
        } else {
            res.send('<script type="text/javascript">alert("잘못된 접근입니다."); window.location="/home"; </script>');
        }
    }); 
})

router.get('/logout', function (req, res) {
    req.logout()
    res.redirect('/') //로그아웃 후 '/'로 이동
})

router.post('/signup', (req, res, next) => {
    if(req.body.email === '') res.send('<script type="text/javascript">alert("이메일을 입력해주세요."); window.location="/home/signup"; </script>')
    else if(req.body.password === '') res.send('<script type="text/javascript">alert("비밀번호를 입력해주세요."); window.location="/home/signup"; </script>')
    else if(req.body.name === '') res.send('<script type="text/javascript">alert("이름을 입력해주세요."); window.location="/home/signup"; </script>')
    else {
    Account.find({ email: req.body.email })
        .exec()
        .then(accounts => {
            if (accounts.length >= 1) {
                res.send('<script type="text/javascript">alert("이미 존재하는 이메일입니다."); window.location="/home/signup"; </script>')
            } else {
                const hexEncodedString = crypto.randomBytes(256).toString('hex').substr(100, 5);
                const base64EncodedString = crypto.randomBytes(256).toString('base64').substr(50, 5);
                const verificationKey = hexEncodedString + base64EncodedString;
                const account = new Account({
                    _id: new mongoose.Types.ObjectId(),
                    name: req.body.name,
                    email: req.body.email,
                    password: crypto.createHash("sha512").update(req.body.password).digest("base64"),
                    verificationKey: verificationKey
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

router.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/home/login',
    failureFlash: true,

}))

router.get('/newroom', (req, res) => {
    var newRoomId = uuidV4()
    const room = new Room({
        roomId: newRoomId,
    })
    room.save((err, room) => {
        if (err) return console.error(err)
    })
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
    var tmp = req.body.address.split("/")
    if(tmp[2]=='airboard.ga'){
      res.redirect(`/${tmp[3]}`)
    }
    else{
      res.render("noPage",{message:"존재하지 않는 회의실 주소입니다"})
    }
})

module.exports = router