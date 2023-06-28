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

        logger.info(apiLogFormat(req, 'DELETE', '/tenant/account', ` body: tenantId=${tenantId}, reason_code=${reason_code}, reason_text=${reason_text} | 이용자 계정 삭제 완료`))
        console.log(apiLogFormat(req, 'DELETE', '/tenant/account', ` body: tenantId=${tenantId}, reason_code=${reason_code}, reason_text=${reason_text} | 이용자 계정 삭제 완료`))

        let objJson = {
            message: "success",
        }

        res.status(200).json(objJson);
        conn.release();
    } catch (err) {
            console.log(err);
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
                logger.info(apiLogFormat(req, 'DELETE', '/tenant/database', ` body: cloudMysqlInstanceNo=${cloudMysqlInstanceNo}, tenantId=${tenantId}, IPAddressRange=${IPAddressRange} | ${databaseName} 삭제 완료`));
                console.log(apiLogFormat(req, 'DELETE', '/tenant/database', ` body: cloudMysqlInstanceNo=${cloudMysqlInstanceNo}, tenantId=${tenantId}, IPAddressRange=${IPAddressRange} | ${databaseName} 삭제 완료`));
                res.status(200).json(objJson);
            } else {
                let objJson = { 'message': 'fail', 'log': result };

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