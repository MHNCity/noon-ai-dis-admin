const express = require("express");
const asyncify = require('express-asyncify');
const router = express.Router();
const app = asyncify(express());
const request = require("request")
const moment = require('moment');
require('moment-timezone');
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

function apiLogFormat(method, api, logStream) {
    return `[DIS-API] ${method} ${api} - ${logStream}`;
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

        logger.info(apiLogFormat('GET', '/manager', ` 관리자 계정 정보 요청 완료`))
        console.log(apiLogFormat('GET', '/manager', ` 관리자 계정 정보 요청 완료`))
        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
        logger.error(apiLogFormat('GET', '/manager', ` ${err}`))
        console.error(apiLogFormat('GET', '/manager', ` ${err}`))

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

        logger.info(apiLogFormat('POST', '/manager', ` 관리자 계정 생성 완료`))
        console.log(apiLogFormat('POST', '/manager', ` 관리자 계정 생성 완료`))
        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
        logger.error(apiLogFormat('POST', '/manager', ` ${err}`))
        console.error(apiLogFormat('POST', '/manager', ` ${err}`))

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

        logger.info(apiLogFormat('DELETE', '/manager', ` 관리자 계정 삭제 완료`))
        console.log(apiLogFormat('DELETE', '/manager', ` 관리자 계정 삭제 완료`))
        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
        logger.error(apiLogFormat('DELETE', '/manager', ` ${err}`))
        console.error(apiLogFormat('DELETE', '/manager', ` ${err}`))

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

        logger.info(apiLogFormat('GET', '/manager/init-password', ` 관리자 비밀번호 변경 완료`))
        console.log(apiLogFormat('GET', '/manager/init-password', ` 관리자 비밀번호 변경 완료`))
        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
        logger.error(apiLogFormat('GET', '/manager/init-password', ` ${err}`))
        console.error(apiLogFormat('GET', '/manager/init-password', ` ${err}`))

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

        logger.info(apiLogFormat('GET', '/manager/unlock', ` 관리자 계정 잠금 해제 완료`))
        console.log(apiLogFormat('GET', '/manager/unlock', ` 관리자 계정 잠금 해제 완료`))
        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
        logger.error(apiLogFormat('GET', '/manager/unlock', ` ${err}`))
        console.error(apiLogFormat('GET', '/manager/unlock', ` ${err}`))

        let objJson = { message: "error", statusCode: 500 };
        res.status(500).json(objJson);
    }
}