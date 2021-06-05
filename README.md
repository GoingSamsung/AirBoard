# AirBoard
[![StackShare](http://img.shields.io/badge/tech-stack-0690fa.svg?style=flat)](https://stackshare.io/goingsamsung/airboard)
## 과제의 개요
AirBoard는 웹캠만 있으면 허공에서 칠판에 그리듯 필기할 수 있는 웹 서비스다. 기존의 화상회의 플랫폼 기능을 전부 갖추고 있으며, 웹캠을 이용해 필기뿐만 아니라 다양한 손동작을 인식해 제스처 명령을 수행할 수 있다.
비대면 수업을 듣다 보면 마우스를 이용해 필기하는 교수님들을 몇 번 본 적이 있다. 태블릿과 같이 적절한 입력 장치가 없어 마우스로 글씨를 쓴 것이다. 강의를 하는데 수식을 써야 한다면? 회사에서 디자인 회의를 하는데 그림을 그려야 한다면? 어쩌면 나의 소중한 아이디어를 표현하지 못해 묻히는 안타까운 상황이 일어난다. 마우스로 필기하는 것 자체가 대단히 이 직관적이고 어려운 작업이기 때문에, 수업 진행을 느리게 만들고 글씨를 알아보기도 어렵다. 이런 상황에서 새로운 입력 방식에 대해 고민해 보게 되었다. 비대면 수업이 많아지면서 코로나19로 인해 전 국민 1인 1웹캠 시대다. 우리 팀은 모두가 갖고 있는 웹캠에 대해 단순 영상 입력 장치에서 한 단계 더 나아간 활용 방법을 제시하기 위해 AirBoard를 기획했다.
AirBoard는 실시간 카메라 공유, 화면 공유, 음성 채팅, 문자 채팅 등 Google Meet나 Zoom 등에 있는 기본적인 화상 희의 기능을 전부 제공한다. AirBoard가 갖는 차별점은 웹캠을 입력 장치로 사용할 수 있다는 점이다. 허공에서 손이나 펜 등을 들고 그림을 그리면 그 궤적을 웹캠이 읽어 칠판에 글씨 쓰듯 그림을 그리거나 필기를 할 수 있다. 손이나 펜을 추적하는 영상 인식 기술이 완성되면, 다양한 손동작(제스처)를 인식해 명령을 수행하는 제스처 입력을 가능하게 할 수 있다.

## 수행방법
기본적인 영상 회의 기능을 갖춘 웹 서비스를 먼저 구축해야 한다. 실시간 카메라 공유, 화면 공유, 음성 채팅, 문자 채팅은 오픈 소스 라이브러리인 WebRTC와 Socket.io를 활용할 예정이다. 서버는 네이버 그린 루키 프로그램의 지원을 받아 사용할 예정이다. AirBoard의 핵심 기능인 웹캠을 이용한 필기 기능은 OpenCV라는 실시간 컴퓨터 비전 라이브러리를 사용할 예정이다. 기준이 되는 포인터 역할을 하는 펜, 손가락, 등을 인식하고 실시간으로 궤적을 추적한다. 궤적을 추적할 수 있으면 필기 모드일 경우 추적한 궤적에 따라 그린 그림을 화면 위에 겹쳐 보이게 해준다. 정확한 궤적 추적이 가능한 성능으로 최적화를 거친 후, 손 모양을 인식해 다양한 제스처 인식이 가능하도록 발전시킨다.

## 결과물에 대한 기대효과 및 활용방안
AirBoard는 웹캠을 새로운 입력 수단으로 사용할 수 있다는 가능성을 제시할 것이다. 웹캠을 이용해 사용자들은 화상 회의를 하면서 필기를 하거나 그림, 도형, 수식, 등을 자유롭게 그릴 수 있다. 그리고 언제든지 손 모양으로 제스처 기능을 실행할 수 있다.
최종적으론 웹캠을 이용해 필기를 하고 제스처 동작을 인식하는 코드를 오픈 소스 라이브러리로 개방할 계획이다. 다양한 개발자들이 AirBoard의 원천 기술이 되는 라이브러리를 개선하고 제스처를 추가할 수 있다. 미래에는 대화면에서 사용 가능한 Big Screen UI 용 제스처 인식 라이브러리로 발전하는 것이 목표하는 방향이다.

## 결과물
### [AirBoard](https://airboard.ga/)

## Prerequisites
You have to install [Node.js](https://nodejs.org/en/), and [MongDB](https://www.mongodb.com/) in your machine.

## Usage

- Clone the Repository.

```bash
git clone https://github.com/GoingSamsung/AirBoard.git
cd webrtc-test
```

- Install with npm.

```bash
npm i
npm i --save-dev nodemon
```
- change this part in server.js to test in local

rewrite
```javascript
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

const bodyParser = require('body-parser');   
app.use(bodyParser.urlencoded({ extended: true }));  

const mongoose = require('mongoose');
const User = require('./models/user');
const Room = require('./models/room');
```
into

```javascript
const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')
const fs = require('fs')

const mongoose = require('mongoose');
const User = require('./models/user');
const Room = require('./models/room');
```

- Run.
```bash
npm run devStart
```
- Open https://localhost:443


## Home
<img width="500" height="250" src="media/home.PNG"/>

## Room
<img width="640" height="310" src="media/room.PNG"/>

## License
[Apache License 2.0](https://github.com/GoingSamsung/AirBoard/blob/master/LICENSE)
