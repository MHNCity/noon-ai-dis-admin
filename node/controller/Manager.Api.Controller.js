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
        return `[MANAGER-API] [${accountName} ${userName}] ${method} ${api} - ${logStream}`;    
    }
    else {
        return `[MANAGER-API] [비로그인] ${method} ${api} - ${logStream}`;
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

exports.getManagerList = async (req, res) => {
    let sql = "SELECT id, user_name, account_name, last_login, password_date, is_lock FROM admin";
    try {
        const conn = await adminPool.getConnection();
        const results = await conn.query(sql);

        let objJson = {
            message: 'success',
            result: results[0],
        }

        logger.info(apiLogFormat(req, 'GET', '/manager', ` ${results[0].length}개의 계정 존재 | 어드민 페이지 관리자 계정 목록 조회 완료`))
        console.log(apiLogFormat(req, 'GET', '/manager', ` ${results[0].length}개의 계정 존재 | 어드민 페이지 관리자 계정 목록 조회 완료`))
        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
        console.log(err);
        logger.error(apiLogFormat(req, 'GET', '/manager', ` ${err}`))
        console.error(apiLogFormat(req, 'GET', '/manager', ` ${err}`))

        let objJson = { message: "error", statusCode: 500 };
        res.status(500).json(objJson);
    }
}

exports.createManager = async (req, res) => {
    const { account_name, password, email, user_name } = req.body;
    try {
        let sql = `INSERT INTO admin (account_name, password, email, user_name, register_date, password_date) values (?, ?, ?, ?, ?, ?)`;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = bcrypt.hashSync(password, salt)
        const curDatetime = moment().format('YYYY-MM-DD HH:mm:ss');

        const conn = await adminPool.getConnection();
        const results = await conn.query(sql, [account_name, hashedPassword, email, user_name, curDatetime, curDatetime])

        let objJson = {
            message: 'success',
        }

        logAction("create", "/manager", `[POST] body: account_name=${account_name}, password, email=${email}, user_name=${user_name } | 관리자 계정 생성 완료`)
        logger.info(apiLogFormat(req, 'POST', '/manager', ` body: account_name=${account_name}, password, email=${email}, user_name=${user_name } | 관리자 계정 생성 완료`))
        console.log(apiLogFormat(req, 'POST', '/manager', ` body: account_name=${account_name}, password, email=${email}, user_name=${user_name } | 관리자 계정 생성 완료`))
        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
        console.log(err);
        logAction("create_error", "/manager", `[POST] ${err}`)
        logger.error(apiLogFormat(req, 'POST', '/manager', ` ${err}`))
        console.error(apiLogFormat(req, 'POST', '/manager', ` ${err}`))

        let objJson = { message: "error", statusCode: 500 };
        res.status(500).json(objJson);
    }
}

exports.deleteManager = async (req, res) => {
    let user_id = req.body.user_id;
    try {
        let sql = "DELETE FROM admin WHERE id = ?"
        const conn = await adminPool.getConnection();
        await conn.query(sql, [user_id]);

        let objJson = {
            message: 'success',
        }

        logAction("delete", "/manager", `[DELETE] body: user_id=${user_id} | 관리자 계정 삭제 완료`)
        logger.info(apiLogFormat(req, 'DELETE', '/manager', ` body: user_id=${user_id} | 관리자 계정 삭제 완료`))
        console.log(apiLogFormat(req, 'DELETE', '/manager', ` body: user_id=${user_id} | 관리자 계정 삭제 완료`))
        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
        console.log(err);
        logAction("delete_error", "/manager", `[DELETE] ${err}`)
        logger.error(apiLogFormat(req, 'DELETE', '/manager', ` ${err}`))
        console.error(apiLogFormat(req, 'DELETE', '/manager', ` ${err}`))

        let objJson = { message: "error", statusCode: 500 };
        res.status(500).json(objJson);
    }
}

exports.initPassword = async (req, res) => {
    try {
        let user_id = req.body.user_id;
        let password = req.body.password;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = bcrypt.hashSync(password, salt)
        const curDatetime = moment().format('YYYY-MM-DD HH:mm:ss');

        let sql = "UPDATE admin set password = ?, password_date = ? WHERE id = ?";

        const conn = await adminPool.getConnection();
        await conn.query(sql, [hashedPassword, curDatetime, user_id]);

        let objJson = {
            message: 'success',
        }

        logAction("modify", "/manager/init-password", `[POST] body: user_id=${user_id}, password | 관리자 비밀번호 변경 완료`)
        logger.info(apiLogFormat(req, 'POST', '/manager/init-password', ` body: user_id=${user_id}, password | 관리자 비밀번호 변경 완료`))
        console.log(apiLogFormat(req, 'POST', '/manager/init-password', ` body: user_id=${user_id}, password | 관리자 비밀번호 변경 완료`))
        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
        console.log(err);
        logAction("modify_error", "/manager/init-password", `[POST] ${err}`)
        logger.error(apiLogFormat(req, 'POST', '/manager/init-password', ` ${err}`))
        console.error(apiLogFormat(req, 'POST', '/manager/init-password', ` ${err}`))

        let objJson = { message: "error", statusCode: 500 };
        res.status(500).json(objJson);
    }
}

exports.unlock = async (req, res) => {
    try {
        let user_id = req.body.user_id;

        let sql = "UPDATE admin set is_lock = 0 WHERE id = ?";

        const conn = await adminPool.getConnection();
        await conn.query(sql, [user_id]);

        let objJson = {
            message: 'success',
        }

        logAction("modify", "/manager/unlock", `[POST] body: user_id=${user_id}, password | 관리자 계정 잠금 해제 완료`)
        logger.info(apiLogFormat(req, 'POST', '/manager/unlock', ` body: user_id=${user_id} | 관리자 계정 잠금 해제 완료`))
        console.log(apiLogFormat(req, 'POST', '/manager/unlock', ` body: user_id=${user_id} | 관리자 계정 잠금 해제 완료`))
        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
        console.log(err);
        logAction("modify_error", "/manager/unlock", `[POST] ${err}`)
        logger.error(apiLogFormat(req, 'POST', '/manager/unlock', ` ${err}`))
        console.error(apiLogFormat(req, 'POST', '/manager/unlock', ` ${err}`))

        let objJson = { message: "error", statusCode: 500 };
        res.status(500).json(objJson);
    }
}