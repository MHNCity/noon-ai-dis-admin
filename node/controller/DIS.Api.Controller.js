const express = require("express");
const asyncify = require('express-asyncify');
const router = express.Router();
const app = asyncify(express());
const request = require("request")
const moment = require('moment');
require('moment-timezone');
const fs = require('fs-extra');
const path = require("path");
var os = require('os');
const pool = require('../user_modules/db.js').pool
const adminPool = require('../user_modules/db.js').adminPool

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const passport = require('passport');
const bcrypt = require('bcryptjs');

const logger = require('../logger');
const morganMiddleware = require('../morgan-middleware');
app.use(morganMiddleware);

function apiLogFormat(req, method, api, logStream) {
    if(req.session.passport) {
        let accountName = req.session.passport.user.account_name;
        let userName = req.session.passport.user.user_name;
        return `[DIS-API] [${accountName} ${userName}] ${method} ${api} - ${logStream}`;    
    }
    else {
        return `[DIS-API] [비로그인] ${method} ${api} - ${logStream}`;
    }
}

function getKoreanTime() {
    let date = new Date();

    let utc = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);

    let KR_TIME_DIFF = 9 * 60 * 60 * 1000;

    let koreanTime = new Date(utc + (KR_TIME_DIFF));

    // 원하는 형식으로 출력
    let eventDate = `${koreanTime.getFullYear()}-${(koreanTime.getMonth() + 1).toString().padStart(2, '0')}-${koreanTime.getDate().toString().padStart(2, '0')}`;
    let eventTime = `${koreanTime.getHours().toString().padStart(2, '0')}:${koreanTime.getMinutes().toString().padStart(2, '0')}:${koreanTime.getSeconds().toString().padStart(2, '0')}`;

    return { "date": eventDate, "time": eventTime }
}  

function logAction(action, apiName, message) {
    // 오늘 날짜를 YYYY-MM-DD 형식으로 가져오기
    const today = getKoreanTime(); // '2024-09-23' 같은 형식
    // 환경 변수에 따른 기본 로그 디렉토리 설정
    const baseLogDir = `${process.cwd()}/logs`
  
    // 최종 로그 디렉토리 (날짜 및 액션에 맞춰 생성)
    const logDir = path.join(baseLogDir, today["date"], action); // 예: logs/2024-09-23/access
  
    // 로그 파일 경로 설정
    const logFilePath = path.join(logDir, `${action}.log`); // logs/2024-09-23/access/access.log
  
    try {
      // 로그 디렉토리가 없으면 생성 (동기적으로)
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
  
      // 로그 메시지에 날짜, 시간, API 이름, 메시지 추가
      const logMessage = `${today["date"]} ${today["time"]} - [API: ${apiName}] - ${message}\n`;
  
      // 로그 파일에 이어쓰기 (없으면 새로 생성)
      fs.appendFileSync(logFilePath, logMessage, 'utf8');
      
      console.log(`Log written to ${logFilePath}`);
    } catch (err) {
      console.error('Error writing log:', err);
    }
}

exports.userInfo = async (req, res) => {
    var userInfo = req.session.passport.user;
    logger.info(apiLogFormat(req, 'GET', '/user', ` 로그인 세션에서 현재 접속한 유저 정보조회 완료`))
    console.log(apiLogFormat(req, 'GET', '/user', ` 로그인 세션에서 현재 접속한 유저 정보조회 완료`))
    res.status(200).json(userInfo);
}

exports.curEnvironment = async (req, res) => {
    let env;
    if (process.env.NODE_ENV == 'dev') env = 'dev';
    else if (process.env.NODE_ENV == 'service') env = 'service'

    let objJson = { message: 'success', env: env }
    logger.info(apiLogFormat(req, 'GET', '/env', ` 현재 접속환경: ${env} | 환경변수 조회 완료`))
    console.log(apiLogFormat(req, 'GET', '/env', ` 현재 접속환경: ${env} | 환경변수 조회 완료`))
    res.status(200).json(objJson);
}

exports.requestList = async (req, res) => {
    try {
        const conn = await pool.getConnection();
        let sql = "select * from signup_request";
        let results = await conn.query(sql);

        logger.info(apiLogFormat(req, 'GET', '/signup/request', ` 가입요청 목록 전체 조회 완료`))
        console.log(apiLogFormat(req, 'GET', '/signup/request', ` 가입요청 목록 전체 조회 완료`))

        res.status(200).json(results[0]);
        conn.release();
    } catch (err) {
            console.log(err);
        let objJson = { 'message': 'error' };

        logger.error(apiLogFormat(req, 'GET', '/signup/request', ` ${err}`))
        console.error(apiLogFormat(req, 'GET', '/signup/request', ` ${err}`))

        res.status(400).json(objJson);
    }
}

exports.acceptSignup = async (req, res) => {
    const { requestIndex } = req.body;
    try {
        let sql = "INSERT INTO tenant (id, company_name, account_name, password, salt, owner_name, telephone, email, user_name) select id, company_name, account_name, password, salt, owner_name, telephone, email, user_name FROM signup_request WHERE id = ?"
        const conn = await pool.getConnection();
        let results = await conn.query(sql, [requestIndex]);

        let sql2 = "DELETE FROM signup_request WHERE id = ?";
        await conn.query(sql2, [requestIndex])

        var objJson = { 'message': 'success', 'log': '테넌트 회원가입 완료', tenantId: results[0].insertId }

        logAction("create", "/signup/accept", `[POST] body: requestIndex=${requestIndex} | ${requestIndex} 요청 건 테넌트 회원가입 수락 완료`)
        logger.info(apiLogFormat(req, 'POST', '/signup/accept', ` body: requestIndex=${requestIndex} | ${requestIndex} 요청 건 테넌트 회원가입 수락 완료`))
        console.log(apiLogFormat(req, 'POST', '/signup/accept', ` body: requestIndex=${requestIndex} | ${requestIndex} 요청 건 테넌트 회원가입 수락 완료`))

        res.json(objJson);
        conn.release();
    } catch (err) {
            console.log(err);
        let objJson = { 'message': 'error' };

        logAction("create_error", "/signup/accept", `[POST] ${err}`)
        logger.error(apiLogFormat(req, 'POST', '/signup/accept', ` ${err}`))
        console.error(apiLogFormat(req, 'POST', '/signup/accept', ` ${err}`))

        res.status(400).json(objJson);
    }
}

exports.rejectSignup = async (req, res) => {
    const { requestIndex } = req.body;
    try {
        let sql = "DELETE FROM signup_request WHERE id = ?";
        const conn = await pool.getConnection();
        await conn.query(sql, [requestIndex]);

        let objJson = { 'message': 'success' }

        logAction("create", "/signup/reject", `[POST] requestIndex=${requestIndex} | ${requestIndex} 요청 건 테넌트 회원가입 거절 완료`)
        logger.info(apiLogFormat(req, 'POST', '/signup/reject', ` body: requestIndex=${requestIndex} | ${requestIndex} 요청 건 테넌트 회원가입 거절 완료`))
        console.log(apiLogFormat(req, 'POST', '/signup/reject', ` body: requestIndex=${requestIndex} | ${requestIndex} 요청 건 테넌트 회원가입 거절 완료`))

        res.json(objJson);
        conn.release();
    } catch (err) {
            console.log(err);
        let objJson = { 'message': 'error' };

        logAction("create_error", "/signup/reject", `[POST] ${err}`)
        logger.error(apiLogFormat(req, 'POST', '/signup/reject', ` ${err}`))
        console.error(apiLogFormat(req, 'POST', '/signup/reject', ` ${err}`))

        res.status(400).json(objJson);
    }
}

exports.tenantList = async (req, res) => {
    try {
        const conn = await pool.getConnection();
        let sql = "select * from tenant";
        let results = await conn.query(sql);

        let sql2 = `SELECT schema_name FROM information_schema.schemata`;
        let results2 = await conn.query(sql2);

        let databaseList = []

        for(let i = 0; i < results2[0].length; i++) {
            databaseList.push(results2[0][i].SCHEMA_NAME)
        }

        let objJson = { message: 'success', result: results[0], databases: databaseList }

        logger.info(apiLogFormat(req, 'GET', '/tenant', ` 테넌트: ${results[0].length}명 존재함 | 테넌트 전체 목록 조회 완료`))
        console.log(apiLogFormat(req, 'GET', '/tenant', ` 테넌트: ${results[0].length}명 존재함 | 테넌트 전체 목록 조회 완료`))

        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
            console.log(err);
        let objJson = { 'message': 'error' };

        logger.error(apiLogFormat(req, 'GET', '/signup/request', ` ${err}`))
        console.error(apiLogFormat(req, 'GET', '/signup/request', `${err}`))

        res.status(400).json(objJson);
    }
}