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

exports.userInfo = async (req, res) => {
    var userInfo = req.session.passport.user;

    logger.info(apiLogFormat('GET', '/user', ` 유저 정보조회 완료`))
    console.log(apiLogFormat('GET', '/user', ` 유저 정보조회 완료`))
    res.status(200).json(userInfo);
}

exports.curEnvironment = async (req, res) => {
    let env;
    if (process.env.NODE_ENV == 'dev') env = 'dev';
    else if (process.env.NODE_ENV == 'service') env = 'service'

    let objJson = { message: 'success', env: env }
    logger.info(apiLogFormat('GET', '/env', ` 환경변수 조회 완료`))
    console.log(apiLogFormat('GET', '/env', ` 환경변수 조회 완료`))
    res.status(200).json(objJson);
}

exports.requestList = async (req, res) => {
    try {
        const conn = await pool.getConnection();
        let sql = "select * from signup_request";
        let results = await conn.query(sql);

        logger.info(apiLogFormat('GET', '/signup/request', ` 가입요청 목록 조회 완료`))
        console.log(apiLogFormat('GET', '/signup/request', ` 가입요청 목록 조회 완료`))

        res.status(200).json(results[0]);
        conn.release();
    } catch (err) {
            console.log(err);
        let objJson = { 'message': 'error' };

        logger.error(apiLogFormat('GET', '/signup/request', ` ${err}`))
        console.error(apiLogFormat('GET', '/signup/request', ` ${err}`))

        res.status(400).json(objJson);
    }
}

exports.acceptSignup = async (req, res) => {
    const { requestIndex } = req.body;
    try {
        let sql = "INSERT INTO tenant (company_name, account_name, password, salt, owner_name, telephone, email, user_name) select company_name, account_name, password, salt, owner_name, telephone, email, user_name FROM signup_request WHERE id = ?"
        const conn = await pool.getConnection();
        let results = await conn.query(sql, [requestIndex]);

        let sql2 = "DELETE FROM signup_request WHERE id = ?";
        await conn.query(sql2, [requestIndex])

        var objJson = { 'message': 'success', 'log': '테넌트 회원가입 완료', tenantId: results[0].insertId }

        logger.info(apiLogFormat('GET', '/signup/accept', ` 테넌트 회원가입 수락 완료`))
        console.log(apiLogFormat('GET', '/signup/accept', ` 테넌트 회원가입 수락 완료`))

        res.json(objJson);
        conn.release();
    } catch (err) {
            console.log(err);
        let objJson = { 'message': 'error' };

        logger.error(apiLogFormat('GET', '/signup/request', ` ${err}`))
        console.error(apiLogFormat('GET', '/signup/request', ` ${err}`))

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

        logger.info(apiLogFormat('GET', '/signup/reject', ` 테넌트 회원가입 거절 완료`))
        console.log(apiLogFormat('GET', '/signup/reject', ` 테넌트 회원가입 거절 완료`))

        res.json(objJson);
        conn.release();
    } catch (err) {
            console.log(err);
        let objJson = { 'message': 'error' };

        logger.error(apiLogFormat('GET', '/signup/request', ` ${err}`))
        console.error(apiLogFormat('GET', '/signup/request', ` ${err}`))

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

        logger.info(apiLogFormat('GET', '/tenant', ` 테넌트 목록 조회 완료`))
        console.log(apiLogFormat('GET', '/tenant', ` 테넌트 목록 조회 완료`))

        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
            console.log(err);
        let objJson = { 'message': 'error' };

        logger.error(apiLogFormat('GET', '/signup/request', ` ${err}`))
        console.error(apiLogFormat('GET', '/signup/request', `${err}`))

        res.status(400).json(objJson);
    }
}