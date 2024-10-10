const express = require("express");
const asyncify = require('express-asyncify');
const app = asyncify(express());
const path = require("path");
const fs = require('fs-extra');
const pool = require('../user_modules/db.js').pool
const adminPool = require('../user_modules/db.js').adminPool
const CryptoJS = require('crypto-js');
const moment = require('moment');
const request = require('request');
const parser = require('fast-xml-parser');
const he = require('he');
const exec = require('child_process').exec
const deletor = require('../user_modules/aws-s3-deletor.js');

const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }))

/*
 * AWS-SDK, S3, NAS 파일 업로드 모듈
 */
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

const endpoint = new AWS.Endpoint('https://kr.object.gov-ncloudstorage.com');
const endpoint_south = new AWS.Endpoint('https://krs.object.gov-ncloudstorage.com');
const region = 'kr-standard';

const logger = require('../logger');
const morganMiddleware = require('../morgan-middleware');
app.use(morganMiddleware);

function apiLogFormat(req, method, api, logStream) {
    if(req.session.passport) {
        let accountName = req.session.passport.user.account_name;
        let userName = req.session.passport.user.user_name;
        return `[TENANT-API] [${accountName} ${userName}] ${method} ${api} - ${logStream}`;    
    }
    else {
        return `[TENANT-API] [비로그인] ${method} ${api} - ${logStream}`;
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

const s3 = new AWS.S3({
    endpoint: endpoint,
    region: region,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

const s3_south = new AWS.S3({
    endpoint: endpoint_south,
    region: region,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

exports.getDatabaseInstanceNo = async (req, res) => {
    let timestamp = new Date().getTime();

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    // API 서버 정보
    let apiServer = "https://ncloud.apigw.gov-ntruss.com"

    let url = "/vmysql/v2/getCloudMysqlInstanceList";

    let method = "GET";
    let space = " ";
    let newLine = "\n";

    let hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretAccessKey);
    let message = method + space + url + newLine + timestamp + newLine + accessKeyId;
    hmac.update(message);

    let hash = hmac.finalize();

    const signingKey = hash.toString(CryptoJS.enc.Base64);

    const options = {
        uri: apiServer + url,
        headers: {
            'x-ncp-apigw-timestamp': timestamp,
            'x-ncp-iam-access-key': accessKeyId,
            'x-ncp-apigw-signature-v2': signingKey
        }
    };

    request.get(options, function (error, response, body) {
        //callback
        let xml = response.body;
        const xmlParser = new parser.XMLParser();

        let xmlToJson = xmlParser.parse(xml);
        let result = xmlToJson['getCloudMysqlInstanceListResponse']['returnMessage'];
        let cloudMysqlInstanceNo = xmlToJson['getCloudMysqlInstanceListResponse']['cloudMysqlInstanceList']['cloudMysqlInstance']['cloudMysqlInstanceNo'];

        if (result == 'success') {
            let objJson = { 'message': 'success', 'log': 'getCloudMysqlDatabaseList success', result: cloudMysqlInstanceNo };
            logger.info(apiLogFormat(req, 'GET', '/database/instanceNumber', ` DB instanceNo=${cloudMysqlInstanceNo} | 데이터베이스 Instance No 조회 완료`))
            console.log(apiLogFormat(req, 'GET', '/database/instanceNumber', ` DB instanceNo=${cloudMysqlInstanceNo} | 데이터베이스 Instance No 조회 완료`))
            res.json(objJson);
        } else {
            let objJson = { 'message': 'fail', 'log': result };
            logger.error(apiLogFormat(req, 'GET', '/database/instanceNumber', ` ${result}`))
            console.error(apiLogFormat(req, 'GET', '/database/instanceNumber', ` ${result}`))
            res.json(objJson);
        }
    });
}

exports.deleteTenantAccount = async (req, res) => {
    const tenantId = req.body.tenantId;
    const reason_code = req.body.reason_code;
    const reason_text = req.body.reason_text;

    const curDatetime = moment().format('YYYY-MM-DD HH:mm:ss');
    let sql = `SELECT * FROM tenant WHERE id = ?`
    let sql2 = `INSERT INTO withdrawal_log (id, company_name, account_name, owner_name, telephone, email, register_date, status_code, reason_code, reason_text, withdrawal_date) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    let sql3 = `DELETE FROM tenant WHERE id = ?`

    try {
        const conn = await pool.getConnection();
        const results = await conn.query(sql, [tenantId]);
        const { company_name, account_name, owner_name, telephone, email, register_date } = results[0][0];
        await conn.query(sql2, [tenantId, company_name, account_name, owner_name, telephone, email, register_date, 1, reason_code, reason_text, curDatetime]);
        await conn.query(sql3, [tenantId]);

        logAction("delete", "/tenant/account", `[DELETE] body: tenantId=${tenantId}, reason_code=${reason_code}, reason_text=${reason_text} | 이용자 계정 삭제 완료`)
        logger.info(apiLogFormat(req, 'DELETE', '/tenant/account', ` body: tenantId=${tenantId}, reason_code=${reason_code}, reason_text=${reason_text} | 이용자 계정 삭제 완료`))
        console.log(apiLogFormat(req, 'DELETE', '/tenant/account', ` body: tenantId=${tenantId}, reason_code=${reason_code}, reason_text=${reason_text} | 이용자 계정 삭제 완료`))

        let objJson = {
            message: "success",
        }

        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
        console.log(err);
        logAction("delete_error", "/tenant/account", `[DELETE] ${err}`)
        logger.error(apiLogFormat(req, 'DELETE', '/tenant/account', ` ${err}`))
        console.error(apiLogFormat(req, 'DELETE', '/tenant/account', ` ${err}`))

        let objJson = { message: "error", statusCode: 500 };
        res.status(500).json(objJson);
    }
}

exports.deleteTenantDatabase = async (req, res) => {
    const cloudMysqlInstanceNo = req.body.cloudMysqlInstanceNo;
    const tenantId = req.body.tenantId;
    const IPAddressRange = (process.env.NODE_ENV === 'dev') ? '%' : '192.168.4.%';

    let env = (process.env.NODE_ENV == 'dev') ? 'dev-' : '';
    let databaseName = `${env}dis-tenant-${tenantId}`

    if (process.env.NODE_ENV === 'dev') {
        let sql = `DROP DATABASE \`${databaseName}\`;`
        let sql2 = `DROP USER 'tenant-${tenantId}'@'${IPAddressRange}';`
        const conn = await pool.getConnection();
        await conn.query(sql);
        await conn.query(sql2);
        let objJson = { 'message': 'success', 'log': 'Database ' + databaseName + ' delete success' };

        logAction("delete", "/tenant/database", `[DELETE] body: cloudMysqlInstanceNo=${cloudMysqlInstanceNo}, tenantId=${tenantId}, IPAddressRange=${IPAddressRange} | ${databaseName} 삭제 완료`)
        logger.info(apiLogFormat(req, 'DELETE', '/tenant/database', ` body: cloudMysqlInstanceNo=${cloudMysqlInstanceNo}, tenantId=${tenantId}, IPAddressRange=${IPAddressRange} | ${databaseName} 삭제 완료`));
        console.log(apiLogFormat(req, 'DELETE', '/tenant/database', ` body: cloudMysqlInstanceNo=${cloudMysqlInstanceNo}, tenantId=${tenantId}, IPAddressRange=${IPAddressRange} | ${databaseName} 삭제 완료`));
        res.status(200).json(objJson);
    }
    else {
        let sql = `DROP USER 'tenant-${tenantId}'@'${IPAddressRange}';`
        const conn = await pool.getConnection();
        await conn.query(sql);
        let timestamp = new Date().getTime();

        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

        // API 서버 정보
        let apiServer = "https://ncloud.apigw.gov-ntruss.com"

        let url = "/vmysql/v2/deleteCloudMysqlDatabaseList";
        url = url + "?regionCode=KR&cloudMysqlInstanceNo=" + cloudMysqlInstanceNo + "&cloudMysqlDatabaseNameList.1=" + databaseName;

        let method = "GET";
        let space = " ";
        let newLine = "\n";

        let hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretAccessKey);
        let message = method + space + url + newLine + timestamp + newLine + accessKeyId;
        hmac.update(message);

        let hash = hmac.finalize();

        const signingKey = hash.toString(CryptoJS.enc.Base64);

        const options = {
            uri: apiServer + url,
            headers: {
                'x-ncp-apigw-timestamp': timestamp,
                'x-ncp-iam-access-key': accessKeyId,
                'x-ncp-apigw-signature-v2': signingKey
            }
        };

        request.get(options, function (error, response, body) {
            //callback
            let xml = response.body;
            const xmlParser = new parser.XMLParser();

            let xmlToJson = xmlParser.parse(xml);
            let result = xmlToJson['deleteCloudMysqlDatabaseListResponse']['returnMessage'];

            if (result == 'success') {
                let objJson = { 'message': 'success', 'log': 'Database ' + databaseName + ' create success' };

                logAction("delete", "/tenant/database", `[DELETE] body: cloudMysqlInstanceNo=${cloudMysqlInstanceNo}, tenantId=${tenantId}, IPAddressRange=${IPAddressRange} | ${databaseName} 삭제 완료`)
                logger.info(apiLogFormat(req, 'DELETE', '/tenant/database', ` body: cloudMysqlInstanceNo=${cloudMysqlInstanceNo}, tenantId=${tenantId}, IPAddressRange=${IPAddressRange} | ${databaseName} 삭제 완료`));
                console.log(apiLogFormat(req, 'DELETE', '/tenant/database', ` body: cloudMysqlInstanceNo=${cloudMysqlInstanceNo}, tenantId=${tenantId}, IPAddressRange=${IPAddressRange} | ${databaseName} 삭제 완료`));
                res.status(200).json(objJson);
            } else {
                let objJson = { 'message': 'fail', 'log': result };

                logAction("delete_error", "/tenant/database", `[DELETE] ${result}`)
                logger.error(apiLogFormat(req, 'DELETE', '/tenant/database', ` ${result}`));
                console.error(apiLogFormat(req, 'DELETE', '/tenant/database', ` ${result}`));
                res.status(400).json(objJson);
            }
        });
    }
}

exports.deleteTenantBucket = async (req, res) => {
    const { tenantId } = req.body;

    let env = (process.env.NODE_ENV == 'dev') ? 'dev-' : '';
    let bucketName = `${env}tenant-${tenantId}`

    deletor.clearBucket(s3, bucketName);
    setTimeout(() => {
        deletor.deleteBucket(s3, bucketName);
    }, 3000)

    deletor.clearBucket(s3_south, bucketName);
    setTimeout(() => {
        deletor.deleteBucket(s3_south, bucketName);
    }, 3000)

    let objJson = { 'message': 'success', 'log': 'Bucket ' + bucketName + ' delete success' };

    logAction("delete", "/tenant/bucket", `[DELETE] body: tenantId=${tenantId} | ${bucketName} 삭제 완료`)
    logger.info(apiLogFormat(req, 'DELETE', '/tenant/bucket', ` body: tenantId=${tenantId} | ${bucketName} 삭제 완료`))
    console.log(apiLogFormat(req, 'DELETE', '/tenant/bucket', ` body: tenantId=${tenantId} | ${bucketName} 삭제 완료`))
    res.status(200).json(objJson);
}

// let deletor = {
//     deleteObject: function (client, deleteParams) {
//         client.deleteObject(deleteParams, function (err, data) {
//             if (err) {
//                 console.log("delete err " + deleteParams.Key);
//             } else {
//                 console.log("deleted " + deleteParams.Key);
//             }
//         });
//     },
//     listBuckets: function (client) {
//         client.listBuckets({}, function (err, data) {
//             let buckets = data.Buckets;
//             let owners = data.Owner;
//             for (let i = 0; i < buckets.length; i += 1) {
//                 let bucket = buckets[i];
//                 console.log(bucket.Name + " created on " + bucket.CreationDate);
//             }
//             for (let i = 0; i < owners.length; i += 1) {
//                 console.log(owners[i].ID + " " + owners[i].DisplayName);
//             }
//         });

//     },

//     deleteBucket: function (client, bucket) {
//         client.deleteBucket({ Bucket: bucket }, function (err, data) {
//             if (err) {
//                 console.log("error deleting bucket " + err);
//             } else {
//                 console.log("delete the bucket " + data);
//             }
//         })
//     },

//     clearBucket: function (client, bucket) {
//         let self = this;
//         client.listObjects({ Bucket: bucket }, async function (err, data) {
//             if (err) {
//                 console.log("error listing bucket objects " + err);
//                 return;
//             }
//             let items = data.Contents;
//             for (let i = 0; i < items.length; i += 1) {
//                 let deleteParams = { Bucket: bucket, Key: items[i].Key };
//                 self.deleteObject(client, deleteParams);
//             }
//         });
//     }
// };