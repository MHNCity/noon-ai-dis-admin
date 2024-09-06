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
const CryptoJS = require("crypto-js");

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const passport = require('passport');
const bcrypt = require('bcryptjs');

const logger = require('../logger/index.js');
const morganMiddleware = require('../morgan-middleware/index.js');
app.use(morganMiddleware);

function apiLogFormat(req, method, api, logStream) {
    if(req.session.passport) {
        let accountName = req.session.passport.user.account_name;
        let userName = req.session.passport.user.user_name;
        return `[AUTH-API] [${accountName} ${userName}] ${method} ${api} - ${logStream}`;
    }
    else {
        return `[AUTH-API] [비로그인] ${method} ${api} - ${logStream}`;
    }
}

exports.firstLogin = async (req, res, next) => {
    if (req.session.passport == undefined) {
        let account_name = req.body.account_name;
        let password = req.body.password;
        let sql = "SELECT * FROM admin WHERE account_name = ?";

        try {
            const conn = await adminPool.getConnection();
            const results = await conn.query(sql, [account_name]);

            const user = results[0][0];
            const user_id = user.id;

            if (user) {
                const curDatetime = moment().format('YYYY-MM-DD HH:mm:ss');
                const userPassword = user.password;
                const isPasswordValid = bcrypt.compareSync(password, userPassword);

                if (!isPasswordValid) {
                    let sql2 = `INSERT INTO login_log (user_id, status_code, fail_reason, login_date) values (?, ?, ?, ?)`;
                    await conn.query(sql2, [user_id, 0, 1, curDatetime]);

                    logger.info(apiLogFormat(req, 'POST', '/first-login', ` body: account_name=${account_name} | ${account_name} 로그인 시도 - 패스워드 불일치`))
                    console.log(apiLogFormat(req, 'POST', '/first-login', ` body: account_name=${account_name} | ${account_name} 로그인 시도 - 패스워드 불일치`))

                    let objJson = { message: "login failed", statusCode: 400 };
                    res.status(400).json(objJson);
                }
                else {
                    logger.info(apiLogFormat(req, 'POST', '/first-login', ` body: account_name=${account_name} | ${account_name} 패스워드 일치`))
                    console.log(apiLogFormat(req, 'POST', '/first-login', ` body: account_name=${account_name} | ${account_name} 패스워드 일치`))

                    // 비밀번호 변경이 90일이 초과했는지 확인
                    let passwordLastDate = user.password_date;
                    passwordLastDate = new Date(passwordLastDate)
                    // UTC 시간으로 간주하고, 9시간을 더해 KST로 변환
                    let kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로 변환
                    passwordLastDate = new Date(passwordLastDate.getTime() + kstOffset);

                    let nowLoginDate = new Date();
                    nowLoginDate = new Date(nowLoginDate.getTime() + kstOffset);

                    let ninetyDaysInMillis = 90 * 24 * 60 * 60 * 1000;

                    let timeDifference = nowLoginDate - passwordLastDate;

                    let isOverNinetyDays = timeDifference > ninetyDaysInMillis;

                    console.log(isOverNinetyDays)

                    if(isOverNinetyDays==true){
                        logger.info(apiLogFormat(req, 'POST', '/first-login', ` body: account_name=${account_name} | ${account_name} 패스워드 90일 초과`))
                        console.log(apiLogFormat(req, 'POST', '/first-login', ` body: account_name=${account_name} | ${account_name} 패스워드 90일 초과`))
                        let objJson = {
                            message: "password over 90days",
                            statusCode: 200
                        };
                        res.status(200).json(objJson);
                        conn.release();
                    }
                    else{
                        logger.info(apiLogFormat(req, 'POST', '/first-login', ` body: account_name=${account_name} | ${account_name} 1차 로그인 완료`))
                        console.log(apiLogFormat(req, 'POST', '/first-login', ` body: account_name=${account_name} | ${account_name} 1차 로그인 완료`))
                        let objJson = {
                            message: "login success",
                            statusCode: 200,
                            admin_email: user.email
                        };
                        res.status(200).json(objJson);
                        conn.release();
                    }
                }
                conn.release();
            }
            else {
                logger.info(apiLogFormat(req, 'POST', '/first-login', ` body: account_name=${account_name} | ${account_name} 유저 존재하지 않음`))
                console.log(apiLogFormat(req, 'POST', '/first-login', ` body: account_name=${account_name} | ${account_name} 유저 존재하지 않음`))

                let objJson = { message: "login failed", statusCode: 400 };
                res.status(400).json(objJson);
            }
        } catch (err) {
            console.log(err);
            logger.error(apiLogFormat(req, 'POST', '/first-login', ` ${err}`))
            console.error(apiLogFormat(req, 'POST', '/first-login', ` ${err}`))

            let objJson = { message: "error", statusCode: 500 };
            res.status(500).json(objJson);
        }
    }
    else {
        let objJson = { message: "already login", statusCode: 400 };
        logger.info(apiLogFormat(req, 'POST', '/first-login', ` 이미 로그인중인 사용자`))
        console.log(apiLogFormat(req, 'POST', '/first-login', ` 이미 로그인중인 사용자`))
        res.status(400).json(objJson);
    }
}

exports.passwordCheck = async (req, res) => {
    let account_name = req.body.account_name;
    let password = req.body.password;
    let sql = "SELECT * FROM admin WHERE account_name = ?";

    try {
        const conn = await adminPool.getConnection();
        const results = await conn.query(sql, [account_name]);

        const user = results[0][0];

        if (user) {
            const userPassword = user.password;
            const isPasswordValid = bcrypt.compareSync(password, userPassword);

            if (!isPasswordValid) {
                logger.info(apiLogFormat(req, 'POST', '/passwordCheck', ` body: account_name=${account_name}, password | ${account_name} 패스워드 불일치`))
                console.log(apiLogFormat(req, 'POST', '/passwordCheck', ` body: account_name=${account_name}, password | ${account_name} 패스워드 불일치`))

                let objJson = { message: "login failed", statusCode: 400 };
                res.status(400).json(objJson);
            }
            else {
                let objJson = {
                    message: "success",
                    statusCode: 200,
                };

                logger.info(apiLogFormat(req, 'POST', '/passwordCheck', ` body: account_name=${account_name}, password | ${account_name} 비밀번호 확인 완료`))
                console.log(apiLogFormat(req, 'POST', '/passwordCheck', ` body: account_name=${account_name}, password | ${account_name} 비밀번호 확인 완료`))

                res.status(200).json(objJson);
            }
            conn.release();
        }
        else {
            logger.info(apiLogFormat(req, 'POST', '/passwordCheck', ` body: account_name=${account_name}, password | ${account_name} 유저 존재하지 않음`))
            console.log(apiLogFormat(req, 'POST', '/passwordCheck', ` body: account_name=${account_name}, password | ${account_name} 유저 존재하지 않음`))

            let objJson = { message: "login failed", statusCode: 400 };
            res.status(400).json(objJson);
        }
    } catch (err) {
        console.log(err);
        logger.error(apiLogFormat(req, 'POST', '/passwordCheck', ` ${err}`))
        console.error(apiLogFormat(req, 'POST', '/passwordCheck', ` ${err}`))

        let objJson = { message: "error", statusCode: 500 };
        res.status(500).json(objJson);
    }
}

exports.login = async (req, res, next) => {
    passport.authenticate('login', (authError, user, info) => {
        if (authError) {
            logger.error(apiLogFormat(req, 'POST', '/login', ` ${authError}`))
            console.error(apiLogFormat(req, 'POST', '/login', ` ${authError}`))
            return next(authError);
        }
        if (!user) {
            logger.info(apiLogFormat(req, "POST", "/login", `유저가 존재하지 않음`));
            console.log(
                apiLogFormat(req, "POST", "/login", `유저가 존재하지 않음`)
            );
            let objJson = { message: "login failed", statusCode: 401 };
            return res.status(401).json(objJson)
        }
        return req.login(user, (loginError) => {
            if (loginError) {
                logger.error(apiLogFormat(req, "POST", "/login", ` ${loginError}`));
                console.error(apiLogFormat(req, "POST", "/login", ` ${loginError}`));
                return next(loginError);
            }

            logger.info(apiLogFormat(req, 'POST', '/login', ` [${user.account_name}] 로그인 완료`))
            console.log(apiLogFormat(req, 'POST', '/login', ` [${user.account_name}] 로그인 완료`))
            // return res.redirect('/');
            const objJson = {message: 'login success', statusCode: 200};
            return res.status(200).json(objJson);
        });
    })(req, res, next);
}

exports.passwordChange = async (req, res) => {
    if (req.session.passport == undefined) {
        let account_name = req.body.account_name;
        let now_password = req.body.now_password;
        let new_password = req.body.new_password;
        try {
            let sql = 'SELECT * FROM admin WHERE account_name = ?';
            const conn = await adminPool.getConnection();
            const results = await conn.query(sql, [account_name]);
            const user = results[0][0];
            if(user){
                const userPassword = user.password;
                const isPasswordValid = bcrypt.compareSync(now_password, userPassword);

                if (!isPasswordValid) {
                    logger.info(apiLogFormat(req, 'POST', '/password-change', ` 비밀번호 불일치`))
                    console.log(apiLogFormat(req, 'POST', '/password-change', ` 비밀번호 불일치`))
                    let objJson = { message: 'user_input_not_match', log: 'user input password not matched', statusCode: 400 };
                    conn.release();
                    res.status(objJson.statusCode).json(objJson);
                }
                else{
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = bcrypt.hashSync(new_password, salt)
                    const curDatetime = moment().format('YYYY-MM-DD HH:mm:ss');
                    let sql2 = 'UPDATE admin SET password=?, password_date=? WHERE account_name = ?';
                    await conn.query(sql2, [hashedPassword, curDatetime, account_name]);
                    logger.info(apiLogFormat(req, 'POST', '/password-change', ` 비밀번호 변경 완료`))
                    console.log(apiLogFormat(req, 'POST', '/password-change', ` 비밀번호 변경 완료`))
                    let objJson = { message: 'success', log: 'master pw update success', statusCode: 200 }
                    conn.release();
                    res.status(objJson.statusCode).json(objJson);
                }
            }
            else{
                logger.error(
                    apiLogFormat(
                        "POST",
                        "/password-change",
                        `password change error ==> ID not found`
                    )
                );
                console.log(
                    apiLogFormat(
                        "POST",
                        "/password-change",
                        `password change error ==> ID not found`
                    )
                );
                // let objJson = { message: "login failed", reason: "ID not found", statusCode: 404 }; -------------------------
                let objJson = { message: "ID not found", statusCode: 500 };
                res.status(objJson.statusCode).json(objJson);
                conn.release();
            }
        } catch (err) {
            console.log(err);
            logger.error(apiLogFormat('POST', '/password-change', `query error ==> ${err}`))
            console.log(apiLogFormat('POST', '/password-change', `query error ==> ${err}`))
            objJson = { message: 'password-change error', statusCode: 500 };
            res.status(objJson.statusCode).json(objJson);
        }
    }
    else {
        let objJson = { message: "already password change", statusCode: 400 };
        // let objJson = { message: "Forbidden", statusCode: 403 };
        res.status(objJson.statusCode).json(objJson);
    }
};

exports.logout = async (req, res) => {
    logger.info(apiLogFormat(req, 'GET', '/logout', ` 관리자 ${req.session.passport.user.user_name} 로그아웃 완료`))
    console.log(apiLogFormat(req, 'GET', '/logout', ` 관리자 ${req.session.passport.user.user_name} 로그아웃 완료`))
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
}

exports.generateSecondaryToken = async (req, res) => {
    function generateRandomCode(n) {
        let str = "";
        for (let i = 0; i < n; i++) {
            str += Math.floor(Math.random() * 10);
        }
        return str;
    }

    const email_address = req.body.email
    const requestDateTime = moment().format("YYYY-MM-DD HH:mm:ss");
    let timestamp = new Date(requestDateTime).getTime();
    let verifyCode = generateRandomCode(6);

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    // API 서버 정보
    var apiServer = "https://mail.apigw.gov-ntruss.com";
    var url = "/api/v1/mails";

    var method = "POST";
    var space = " ";
    var newLine = "\n";

    var hmac = CryptoJS.algo.HMAC.create(
        CryptoJS.algo.SHA256,
        secretAccessKey
    );

    var message =
        method +
        space +
        url +
        newLine +
        timestamp +
        newLine +
        accessKeyId;
    hmac.update(message);

    var hash = hmac.finalize();

    const signingKey = hash.toString(CryptoJS.enc.Base64);

    var mail_contents = `<h2>관리자 페이지 로그인 2차 인증 번호 발송 메일입니다.</h2>\
                                                    <p>이 메일은 회원님의 로그인 2차 인증을 위해 발송된 메일입니다.<br>\
                                                    아래 인증번호를 입력하여 2차 인증을 완료해주세요.</p>\
                                                    <p>인증번호 : ${verifyCode} </p>`;

    const options = {
        uri: apiServer + url,
        json: true,
        headers: {
            "x-ncp-apigw-timestamp": timestamp,
            "x-ncp-iam-access-key": accessKeyId,
            "x-ncp-apigw-signature-v2": signingKey,
            "Content-Type": "application/json",
        },
        body: {
            senderAddress: "no-reply@mhncity.com",
            title: "[noonAI DIS] 관리자 로그인 2차 인증번호 발송",
            body: mail_contents,
            recipients: [
                {
                    address: email_address,
                    type: "R",
                },
            ],
            individual: "true",
            advertising: "false",
        },
    };

    request.post(options, function (error, response, body) {
        if (error) {
            logger.error(
                apiLogFormat(
                    req,
                    "POST",
                    "/secondary-email-send",
                    ` NCP Outbound Mailer 에러 ==> ${err}`
                )
            );
            console.error(
                apiLogFormat(
                    req,
                    "POST",
                    "/secondary-email-send",
                    ` NCP Outbound Mailer 에러 ==> ${err}`
                )
            );
            var objJson = {
                message: "fail",
                api: "NCP Cloud Outbound Mailer API",
                log: "2차 인증번호 메일 발송 실패",
            };
            res.json(objJson);
        }

        if (response.body.count == 1) {
            logger.info(
                apiLogFormat(req, "POST", "/secondary-email-send", ` body: email_address=${email_address} | ${email_address}로 2차 인증번호 발송 완료`)
            );
            console.log(
                apiLogFormat(req, "POST", "/secondary-email-send", ` body: email_address=${email_address} | ${email_address}로 2차 인증번호 발송 완료`)
            );
            var objJson = {
                message: "success",
                api: "NCP Cloud Outbound Mailer API",
                log: "2차 인증번호 메일 발송 성공",
                verifyCode: verifyCode,
            };
            res.json(objJson);
        } else {
            logger.info(
                apiLogFormat(
                    req,
                    "POST",
                    "/secondary-email-send",
                    ` body: email_address=${email_address} | ${email_address}로 메일 발송 실패`
                )
            );
            console.log(
                apiLogFormat(
                    req,
                    "POST",
                    "/secondary-email-send",
                    ` body: email_address=${email_address} | ${email_address}로 메일 발송 실패`
                )
            );
            var objJson = {
                message: "fail",
                api: "NCP Cloud Outbound Mailer API",
                log: "2차 인증번호 메일 발송 실패",
            };
            res.json(objJson);
        }
    });
}

//현재 시간 기준으로 로그인 제한이 풀렸는지 확인
exports.selectLockStatus = async (req, res) => {
    let account_name = req.body.account_name;
    let sql = `SELECT * FROM admin WHERE account_name=?`;

    try {
        const conn = await adminPool.getConnection();
        const results = await conn.query(sql, [account_name]);

        const is_lock = results[0][0].is_lock;
        const lock_count = results[0][0].lock_count

        if (is_lock === 1) {
            const cur = moment();
            const latestTry = results[0][0].latest_try_login_date
            const latest = moment(latestTry)

            const loginable = (cur.diff(latest, "minutes") >= 15 * lock_count) ? true : false;

            const activateTime = moment(latest.add(15 * lock_count, 'minute')).format('HH:mm:ss')

            let objJson = {
                message: 'success',
                loginable: loginable,
                activateTime: activateTime,
            }
            logger.info(apiLogFormat(req, 'PUT', '/login/selectLockStatus', `body: account_name=${account_name} | ${account_name} lock status=1 확인 완료`))
            console.log(apiLogFormat(req, 'PUT', '/login/selectLockStatus', `body: account_name=${account_name} | ${account_name} lock status=1 확인 완료`))
            res.status(200).json(objJson);
        }
        else {
            let objJson = {
                message: 'success',
                loginable: true
            }
            logger.info(apiLogFormat(req, 'PUT', '/login/selectLockStatus', `body: account_name=${account_name} | ${account_name} lock status=0 확인 완료`))
            console.log(apiLogFormat(req, 'PUT', '/login/selectLockStatus', `body: account_name=${account_name} | ${account_name} lock status=0 확인 완료`))
            res.status(200).json(objJson);
        }
        conn.release();
    } catch (err) {
        console.log(err);
        logger.error(apiLogFormat(req, 'PUT', '/login/selectLockStatus', ` ${err}`))
        console.error(apiLogFormat(req, 'PUT', '/login/selectLockStatus', ` ${err}`))

        let objJson = { message: "error", statusCode: 500 };
        res.status(500).json(objJson);
    }
}

//로그인 실패시 LOGIN_FAIL_COUNT 하나 증가
exports.plusLoginFailCount = async (req, res) => {
    let account_name = req.body.account_name;

    let sql = `UPDATE admin set login_fail_count = login_fail_count + 1, latest_try_login_date = ? WHERE account_name = ?`
    let sql2 = `SELECT login_fail_count FROM admin WHERE account_name = ?`;
    const curDatetime = moment().format('YYYY-MM-DD HH:mm:ss');

    try {
        const conn = await adminPool.getConnection();
        await conn.query(sql, [curDatetime, account_name]);

        logger.info(apiLogFormat(req, 'POST', '/selectLockStatus', ` body: account_name=${account_name} | ${account_name} 로그인 시도 이력 업데이트 완료`))
        console.log(apiLogFormat(req, 'POST', '/selectLockStatus', ` body: account_name=${account_name} | ${account_name} 로그인 시도 이력 업데이트 완료`))

        const results = await conn.query(sql2, [account_name]);
        let login_fail_count = results[0][0].login_fail_count

        let objJson = {
            message: "success",
            login_fail_count: login_fail_count,
        }

        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
        console.log(err);
        logger.error(apiLogFormat(req, 'POST', '/first-login', ` ${err}`))
        console.error(apiLogFormat(req, 'POST', '/first-login', ` ${err}`))

        let objJson = { message: "error", statusCode: 500 };
        res.status(500).json(objJson);
    }
}

//LOGIN_TRY_COUNT가 일정 횟수 넘는 row에 대해 IS_LOCK 업데이트
exports.updateLockStatus = async (req, res) => {
    let account_name = req.body.account_name;
    let lock_count = req.body.lock_count;
    let sql = `UPDATE admin set is_lock = 1, lock_count = ? WHERE account_name = ?`

    try {
        const conn = await adminPool.getConnection();
        await conn.query(sql, [lock_count, account_name]);

        logger.info(apiLogFormat(req, 'PUT', '/login/lockStatus', ` body: account_name=${account_name} lock_count=${lock_count} | ${account_name} 로그인 잠금`))
        console.log(apiLogFormat(req, 'PUT', '/login/lockStatus', ` body: account_name=${account_name} lock_count=${lock_count} | ${account_name} 로그인 잠금`))

        let objJson = {
            message: "success",
        }

        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
        console.log(err);
        logger.error(apiLogFormat(req, 'PUT', '/login/lockStatus', ` ${err}`))
        console.error(apiLogFormat(req, 'PUT', '/login/lockStatus', ` ${err}`))

        let objJson = { message: "error", statusCode: 500 };
        res.status(500).json(objJson);
    }
}

//LOGIN_TRY_COUNT를 0으로, IS_LOCK을 0으로 초기화
exports.updateClearLoginFailCount = async (req, res) => {
    let account_name = req.body.account_name;
    let sql = `UPDATE admin set login_fail_count = 0 WHERE account_name = ?`

    try {
        const conn = await adminPool.getConnection();
        await conn.query(sql, [account_name]);

        logger.info(apiLogFormat(req, 'PUT', '/login/failCount/clear', ` body: account_name=${account_name} | ${account_name} 로그인 실패 횟수 0 초기화`))
        console.log(apiLogFormat(req, 'PUT', '/login/failCount/clear', ` body; account_name=${account_name} | ${account_name} 로그인 실패 횟수 0 초기화`))

        let objJson = {
            message: "success",
        }

        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
        console.log(err);
        logger.error(apiLogFormat(req, 'PUT', '/login/failCount/clear', ` ${err}`))
        console.error(apiLogFormat(req, 'PUT', '/login/failCount/clear', ` ${err}`))

        let objJson = { message: "error", statusCode: 500 };
        res.status(500).json(objJson);
    }
}

//LOCK_COUNT, IS_LOCK를 0으로 초기화
exports.updateClearLockCount = async (req, res) => {
    let account_name = req.body.account_name;
    let sql = `UPDATE admin set lock_count = 0, is_lock = 0 WHERE account_name = ?`

    try {
        const conn = await adminPool.getConnection();
        await conn.query(sql, [account_name]);

        logger.info(apiLogFormat(req, 'PUT', '/login/lockCount', ` body; account_name=${account_name} | ${account_name} lock_count 0 초기화`))
        console.log(apiLogFormat(req, 'PUT', '/login/lockCount', ` body; account_name=${account_name} | ${account_name} lock_count 0 초기화`))

        let objJson = {
            message: "success",
        }

        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
        console.log(err);
        logger.error(apiLogFormat(req, 'PUT', '/login/lockCount', ` ${err}`))
        console.error(apiLogFormat(req, 'PUT', '/login/lockCount', ` ${err}`))

        let objJson = { message: "error", statusCode: 500 };
        res.status(500).json(objJson);
    }
}

exports.test = async (req, res) => {
    let sql = `SELECT * FROM admin WHERE account_name='minhyeong' AND is_lock=1`;

    try {
        const conn = await adminPool.getConnection();
        const results = await conn.query(sql);

        const cur = moment();
        const latestTry = results[0][0].latest_try_login_date
        const latest = moment(latestTry)

        const loginable = (cur.diff(latest, "minutes") >= 15) ? true : false;

        let objJson = {
            message: 'success',
            loginable: loginable
        }

        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
        console.log(err);
        console.log(err);
    }
}