/**
 * index.js
 *
 * 루트 노드 서버
 * 가상 호스트를 이용해 라우팅 처리
 */

// 애플리케이션 생성
const express = require('express');
const vhost = require('vhost');
const cors = require('cors');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
const cookieParser = require('cookie-parser');
app.use(cookieParser());

const logger = require('./logger');
const db = require('./user_modules/db');
const mysql2 = require('mysql2/promise');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
var passport = require('passport');
var passportConfig = require('./passportAuth');

const cron = require('node-cron');
const moment = require('moment');

// cron.schedule('0 0 * * *', () => {
//   logger.info('cron 호출')
// });

// cron.schedule('*/3 * * * * *', () => {
//     let yesterday = moment().subtract(1, 'days').toDate()
//     yesterday = moment(yesterday).format('YYYY-MM-DD')
//     console.log(`ls logs | grep ${yesterday}*`)
//     let exec = require('child_process').exec
//     exec(`ls logs | grep ${yesterday}*`, (err, out, stderr) => {
//         console.log(out)
//     })
//     // logger.info('cron 호출')
// });

const options = db.adminConfig;
const connection = mysql2.createPool(options);
var sessionStore = new MySQLStore({}, connection);

app.use(session({
    secret: "asdfasffdas",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        maxAge: 1000 * 60 * 60, // 쿠키 유효기간 1시간
    },
}))

passportConfig();
app.use(passport.initialize());
app.use(passport.session());

/* 화이트 리스트 */
var whitelist = ['http://127.0.0.1:5000', 'http://dis.noonai.kr']
var corsOptions = {
    origin: function (origin, callback) {
        var isWhitelisted = whitelist.indexOf(origin) !== -1;
        callback(null, isWhitelisted);
    },
    credentials: true
}
app.use(cors(corsOptions));

//생성할 앱 목록
const appList = [
    { domain: '127.0.0.1', servername: 'LocalWebApp', path: '/web/', app: require('./www/www.js') },   // Web App 설정 
    { domain: '127.0.0.1', servername: 'LocalWebAPI', path: '/api/', app: require('./api/api.js') },  // Web API 설정
    { domain: '127.0.0.1', servername: 'LocalWebAPI', path: '/api/', app: require('./api/ncp-api.js') },  // Web API 설정
    { domain: '127.0.0.1', servername: 'LocalWebAPI', path: '/api/auth', app: require('./api/auth-api.js') },  // Web API 설정
    { domain: '127.0.0.1', servername: 'LocalWebAPI', path: '/api/manager', app: require('./api/manager-api.js') },  // Web API 설정
    { domain: '127.0.0.1', servername: 'LocalWebAPI', path: '/api/tenant', app: require('./api/tenant-api.js') },  // Web API 설정

    { domain: '192.168.0.9', servername: 'LocalWebApp', path: '/web/', app: require('./www/www.js') },   // Web App 설정 
    { domain: '192.168.0.9', servername: 'LocalWebAPI', path: '/api/', app: require('./api/api.js') },  // Web API 설정
    { domain: '192.168.0.9', servername: 'LocalWebAPI', path: '/api/', app: require('./api/ncp-api.js') },  // Web API 설정
    { domain: '192.168.0.9', servername: 'LocalWebAPI', path: '/api/auth', app: require('./api/auth-api.js') },  // Web API 설정
    { domain: '192.168.0.9', servername: 'LocalWebAPI', path: '/api/manager', app: require('./api/manager-api.js') },  // Web API 설정
    { domain: '192.168.0.9', servername: 'LocalWebAPI', path: '/api/tenant', app: require('./api/tenant-api.js') },  // Web API 설정

    { domain: '223.130.173.198', servername: 'LocalWebApp', path: '/web/', app: require('./www/www.js') },   // Web App 설정 
    { domain: '223.130.173.198', servername: 'LocalWebAPI', path: '/api/', app: require('./api/api.js') },  // Web API 설정
    { domain: '223.130.173.198', servername: 'LocalWebAPI', path: '/api/', app: require('./api/ncp-api.js') },  // Web API 설정
    { domain: '223.130.173.198', servername: 'LocalWebAPI', path: '/api/auth', app: require('./api/auth-api.js') },  // Web API 설정
    { domain: '223.130.173.198', servername: 'LocalWebAPI', path: '/api/manager', app: require('./api/manager-api.js') },  // Web API 설정
    { domain: '223.130.173.198', servername: 'LocalWebAPI', path: '/api/tenant', app: require('./api/tenant-api.js') },  // Web API 설정
];

//
appList.forEach((val) => {
    if (val.servername.toLowerCase() == 'localwebapp') {
        app.use(val.path, val.app);
        app.use(vhost(val.domain, val.app));
    } else {
        app.use(val.path, val.app);
        app.use(vhost(val.domain, val.app));
    }
});

//Live라면 인증서 가져와서 서버 구동    
if (process.env.NODE_ENV === 'service') {
    app.listen(process.env.PORT || 5000, () => {
        console.log('운영 모드 http 가상 서버 실행: 5000');
    });
} else {
    app.listen(process.env.PORT || 5000, () => {
        console.log('디버그 모드 http 가상 서버 실행: 5000');
    });
}