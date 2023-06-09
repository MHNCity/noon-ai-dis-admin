const express = require("express");
const asyncify = require('express-asyncify');
const app = asyncify(express());
const path = require("path");
const fs = require('fs-extra');
const pool = require('../user_modules/db.js').pool
const dateModule = require('../user_modules/date');
const CryptoJS = require('crypto-js');
const moment = require('moment');
const request = require('request');
const parser = require('fast-xml-parser');
const he = require('he');
const exec = require('child_process').exec
const mysql = require('mysql2/promise');

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
const allowedExtensions = ['.png', '.jpg', '.jpeg', '.bmp', 'mp4']

const logger = require('../logger');
const morganMiddleware = require('../morgan-middleware');
app.use(morganMiddleware);

function apiLogFormat(method, api, logStream) {
    return `[NCP-API] ${method} ${api} - ${logStream}`;
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

let cron = require('node-cron')

cron.schedule('0 0 * * *', async () => {
    let yesterday = moment().subtract(1, 'days').toDate()
    yesterday = moment(yesterday).format('YYYY-MM-DD')
    let normalLog = `${yesterday}.log`
    let exceptionLog = `${yesterday}.exception.log`

    let logFileKey = [`admin_page/${yesterday}/${normalLog}`, `admin_page/${yesterday}/${exceptionLog}`]
    let logFilePath = [`/app/node/logs/${normalLog}`, `/app/node/logs/${exceptionLog}`];

    let bucket_name = 'dis-log'

    if(process.env.NODE_ENV === 'service') {
        //폴더 생성
        await s3.putObject({
            Bucket: bucket_name,
            Key: `admin_page/${yesterday}/`
        }).promise();

        //로그파일 업로드
        for(let i = 0; i < 2; i++) {
            await s3.putObject({
                Bucket: bucket_name,
                Key: logFileKey[i],
                Body: fs.createReadStream(logFilePath[i])
            }).promise();
        }
        logger.info('[CRONTAB] 일단위 어드민 페이지 로그 Object Storage 백업')
    }
});

exports.getDatabaseInstanceNo = async (req, res) => {
    if(process.env.NODE_ENV === 'dev') {
        var objJson = { 'message': 'success', 'log': 'getCloudMysqlDatabaseList success', result: null };
        logger.info(apiLogFormat('GET', '/database/instanceNumber', ` 데이터베이스 Instance No 조회 완료`))
        console.log(apiLogFormat('GET', '/database/instanceNumber', ` 데이터베이스 Instance No 조회 완료`))
        res.json(objJson);
    }
    else {
        var timestamp = new Date().getTime();
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

        // API 서버 정보
        var apiServer = "https://ncloud.apigw.gov-ntruss.com"

        var url = "/vmysql/v2/getCloudMysqlInstanceList";

        var method = "GET";
        var space = " ";
        var newLine = "\n";

        var hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretAccessKey);
        var message = method + space + url + newLine + timestamp + newLine + accessKeyId;
        hmac.update(message);

        var hash = hmac.finalize();

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
            var xml = response.body;
            const xmlParser = new parser.XMLParser();

            var xmlToJson = xmlParser.parse(xml);
            var result = xmlToJson['getCloudMysqlInstanceListResponse']['returnMessage'];
            var cloudMysqlInstanceNo = xmlToJson['getCloudMysqlInstanceListResponse']['cloudMysqlInstanceList']['cloudMysqlInstance']['cloudMysqlInstanceNo'];

            if (result == 'success') {
                var objJson = { 'message': 'success', 'log': 'getCloudMysqlDatabaseList success', result: cloudMysqlInstanceNo };
                logger.info(apiLogFormat('GET', '/database/instanceNumber', ` 데이터베이스 Instance No 조회 완료`))
                console.log(apiLogFormat('GET', '/database/instanceNumber', ` 데이터베이스 Instance No 조회 완료`))
                res.json(objJson);
            } else {
                var objJson = { 'message': 'fail', 'log': result };
                logger.error(apiLogFormat('GET', '/database/instanceNumber', ` ${result}`))
                console.error(apiLogFormat('GET', '/database/instanceNumber', ` ${result}`))
                res.json(objJson);
            }
        });
    }
}

exports.createDatabase = async (req, res) => {
    let databaseName = `dis-tenant-${req.params.id}`;

    if (process.env.NODE_ENV === 'dev') {
        databaseName = 'dev-' + databaseName;
        let sql = `CREATE DATABASE \`${databaseName}\`;`
        const conn = await pool.getConnection();
        await conn.query(sql);
        var objJson = { 'message': 'success', 'log': 'Database ' + databaseName + ' create success' };
        logger.info(apiLogFormat('GET', '/createDatabase', ` ${databaseName} 생성 완료`));
        console.log(apiLogFormat('GET', '/createDatabase', ` ${databaseName} 생성 완료`));
        res.status(200).json(objJson);
    }
    else {
        var cloudMysqlInstanceNo = req.params.instanceNo;
        var timestamp = new Date().getTime();

        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

        // API 서버 정보
        var apiServer = "https://ncloud.apigw.gov-ntruss.com"

        var url = "/vmysql/v2/addCloudMysqlDatabaseList";
        url = url + "?regionCode=KR&cloudMysqlInstanceNo=" + cloudMysqlInstanceNo + "&cloudMysqlDatabaseNameList.1=" + databaseName;

        var method = "GET";
        var space = " ";
        var newLine = "\n";

        var hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretAccessKey);
        var message = method + space + url + newLine + timestamp + newLine + accessKeyId;
        hmac.update(message);

        var hash = hmac.finalize();

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
            var xml = response.body;
            const xmlParser = new parser.XMLParser();

            var xmlToJson = xmlParser.parse(xml);
            var result = xmlToJson['addCloudMysqlDatabaseListResponse']['returnMessage'];

            if (result == 'success') {
                let objJson = { 'message': 'success', 'log': 'Database ' + databaseName + ' create success' };
                logger.info(apiLogFormat('GET', '/createDatabase', ` ${databaseName} 생성 완료`));
                console.log(apiLogFormat('GET', '/createDatabase', ` ${databaseName} 생성 완료`));
                res.status(200).json(objJson);
            } else {
                let objJson = { 'message': 'fail', 'log': result };
                logger.error(apiLogFormat('GET', '/createDatabase', ` ${result}`));
                console.error(apiLogFormat('GET', '/createDatabase', ` ${result}`));
                res.status(400).json(objJson);
            }
        });
    }
}

exports.createTable = async (req, res) => {
    let tenantId = req.params.id;
    let envPre = (process.env.NODE_ENV == 'dev') ? 'dev-' : '';
    let databaseName = `${envPre}dis-tenant-${tenantId}`;
    let bucketName = `${envPre}tenant-${tenantId}`;
    let IPAddressRange = (process.env.NODE_ENV == 'dev') ? `%` : `%`;

    var sql = `CREATE TABLE password_reset (
        id int PRIMARY KEY NOT NULL AUTO_INCREMENT,
        account_name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        token text NOT NULL,
        request_datetime datetime NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`

    var sql1 = `CREATE TABLE auth (
        id int PRIMARY KEY NOT NULL AUTO_INCREMENT,
        tenant varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        account_name varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        bucket_access_list varchar(255) NOT NULL,
        bucket_access_auth varchar(20) NOT NULL,
        db_access_list varchar(255) NOT NULL,
        db_access_auth varchar(20) NOT NULL,
        encrypt_auth tinyint NOT NULL,
        decrypt_auth tinyint NOT NULL,
        auth_log blob DEFAULT NULL,
        master tinyint NOT NULL DEFAULT '0',
        date date NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`;

    var sql2 = `CREATE TABLE dec_request_list (
        id int PRIMARY KEY NOT NULL AUTO_INCREMENT,
        fk_enc_request_id int NOT NULL,
        fk_sub_account_id int NOT NULL,
        fk_rsa_key_pair_id int NOT NULL,
        fk_account_auth_id int NOT NULL,
        account_name varchar(100) NOT NULL,
        user_name varchar(255) NOT NULL,
        bucket_directory varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        key_name varchar(255) NOT NULL,
        request_file_list blob NOT NULL,
        result_file_list blob DEFAULT NULL,
        file_type varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        file_count int NOT NULL,
        request_date date NOT NULL,
        request_time time NOT NULL,
        request_datetime datetime NOT NULL,
        reception_datetime datetime DEFAULT NULL,
        health_check_process varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
        decrypt_progress varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '0%',
        upload_process varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
        status varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
        save_directory varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
        decrypt_log blob DEFAULT NULL,
        complete int NOT NULL DEFAULT '0',
        complete_date date DEFAULT NULL,
        complete_time time DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`;

    var sql3 = `CREATE TABLE enc_request_list (
        id int PRIMARY KEY NOT NULL AUTO_INCREMENT,
        fk_sub_account_id int NOT NULL,
        fk_rsa_key_pair_id int NOT NULL,
        account_name varchar(255) NOT NULL,
        user_name varchar(255) DEFAULT NULL,
        key_name varchar(255) NOT NULL,
        file_directory varchar(255) NOT NULL,
        encrypt_directory varchar(255) NOT NULL,
        restoration tinyint NOT NULL,
        encrypt_object blob,
        request_file_list blob NOT NULL,
        result_file_list blob DEFAULT NULL,
        file_type varchar(255) NOT NULL,
        file_count int NOT NULL,
        bin blob DEFAULT NULL,
        random tinyint NOT NULL DEFAULT '1',
        request_date date NOT NULL,
        request_time time NOT NULL,
        request_datetime datetime NOT NULL,
        reception_datetime datetime DEFAULT NULL,
        processing_time varchar(30) DEFAULT NULL,
        health_check_process varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
        encrypt_progress varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '0%',
        upload_process varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
        status varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
        encrypt_log blob DEFAULT NULL,
        complete tinyint NOT NULL DEFAULT '0',
        complete_date date DEFAULT NULL,
        complete_time time DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`;

    var sql4 = `CREATE TABLE rsa_key_pair (
        id int PRIMARY KEY NOT NULL AUTO_INCREMENT,
        account_name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        user_name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
        key_name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
        blob_public_key blob NOT NULL,
        generated_date date NOT NULL,
        generated_time time NOT NULL,
        key_memo varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
        expiry_datetime datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expiry_notification tinyint NOT NULL DEFAULT '1',
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`;

    var sql5 = `CREATE TABLE sub_account (
        id int PRIMARY KEY NOT NULL AUTO_INCREMENT,
        tenant_id int NOT NULL,
        company_name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        account_name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        password varchar(255) NOT NULL,
        salt varchar(255) NOT NULL,
        telephone varchar(255) DEFAULT NULL,
        email varchar(255) NOT NULL,
        user_name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        fk_auth_id int DEFAULT NULL,
        register_date datetime NOT NULL,
        login_fail_count int NOT NULL DEFAULT '0',
        lock_count int NOT NULL DEFAULT '0',
        is_lock int NOT NULL DEFAULT '0',
        password_date datetime DEFAULT NULL,
        latest_try_login_date datetime DEFAULT NULL,
        self_auth tinyint NOT NULL DEFAULT '0',
        last_login datetime DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`;

    var sql6 = `SELECT * FROM tenant WHERE id = ?`;
    var sql7 = `INSERT INTO auth (tenant, account_name, bucket_access_list, bucket_access_auth, db_access_list, db_access_auth, encrypt_auth, decrypt_auth, master, date) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    var env = (process.env.NODE_ENV == 'dev') ? '-dev' : '';
    var sql8 = `CREATE TABLE \`meter${env}-dis-tenant-${req.params.id}\` (
        id int PRIMARY KEY NOT NULL AUTO_INCREMENT,
        fk_sub_account_id int NOT NULL,
        account_name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        user_name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        request_type varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        restoration tinyint NOT NULL DEFAULT '0',
        request_id int NOT NULL,
        file_name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        file_type varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        file_extension varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        frame int DEFAULT NULL,
        person int DEFAULT NULL,
        face int DEFAULT NULL,
        license_plate int DEFAULT NULL,
        file_size int DEFAULT NULL,
        file_width int DEFAULT NULL,
        file_height int DEFAULT NULL,
        complete tinyint NOT NULL DEFAULT '0',
        result_file_name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
        result_file_size int DEFAULT NULL,
        request_date date DEFAULT NULL,
        request_time time DEFAULT NULL,
        complete_date date DEFAULT NULL,
        complete_time time DEFAULT NULL,
        service_charge int NOT NULL DEFAULT '0', 
        billed tinyint NOT NULL DEFAULT '0'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`;

    var sql9 = `CREATE VIEW enc_request_list_view AS
    SELECT id, fk_sub_account_id, key_name, restoration, request_file_list, file_type, request_date, status, complete
    FROM enc_request_list;`;

    var sql10 = `CREATE VIEW dec_request_list_view AS
    SELECT id, fk_sub_account_id, request_file_list, file_type, request_date, status, complete
    FROM dec_request_list;`;

    var sql11 = `CREATE TABLE dec_thumbnail (
        id int NOT NULL,
        fk_enc_request_id int NOT NULL,
        fk_sub_account_id int NOT NULL,
        fk_rsa_key_pair_id int NOT NULL,
        fk_account_auth_id int NOT NULL,
        account_name varchar(100) NOT NULL,
        user_name varchar(255) NOT NULL,
        bucket_directory varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        key_name varchar(255) NOT NULL,
        request_file_list blob NOT NULL,
        thumbnail_result blob,
        file_type varchar(255) NOT NULL,
        file_count int NOT NULL,
        request_date date NOT NULL,
        request_time time NOT NULL,
        reception_datetime datetime DEFAULT NULL,
        status varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
        nas_directory varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
        thumbnail_log blob,
        complete int NOT NULL DEFAULT '0',
        complete_date date DEFAULT NULL,
        complete_time time DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`

    var sql12 = `CREATE TABLE clean_fail_request (
        id int NOT NULL,
        reception_datetime datetime NOT NULL,
        request_type varchar(50) NOT NULL,
        request_id int NOT NULL,
        failed_process varchar(50) NOT NULL,
        step_status varchar(20) NOT NULL,
        error_log blob NOT NULL,
        key_exist tinyint(1) NOT NULL DEFAULT '0',
        clean_key tinyint(1) DEFAULT '0',
        upload_exist tinyint(1) NOT NULL DEFAULT '0',
        clean_upload tinyint(1) NOT NULL DEFAULT '0',
        result_exist tinyint(1) NOT NULL DEFAULT '0',
        clean_result tinyint(1) NOT NULL DEFAULT '0',
        clean_log blob,
        retry int NOT NULL DEFAULT '0',
        complete int NOT NULL DEFAULT '0',
        complete_datetime datetime DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`

    var sql13 = `
    CREATE USER '${envPre}tenant-${tenantId}'@'${IPAddressRange}' IDENTIFIED WITH mysql_native_password BY '${process.env.DATABASE_PASSWORD}';
    ALTER USER '${envPre}tenant-${tenantId}'@'${IPAddressRange}' REQUIRE NONE WITH MAX_QUERIES_PER_HOUR 0 MAX_CONNECTIONS_PER_HOUR 0 MAX_UPDATES_PER_HOUR 0 MAX_USER_CONNECTIONS 0;
    GRANT ALL PRIVILEGES ON \`${databaseName}\`.* TO '${envPre}tenant-${tenantId}'@'${IPAddressRange}'; ALTER USER '${envPre}tenant-${tenantId}'@'${IPAddressRange}' ;
    GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, REFERENCES, INDEX, ALTER, CREATE VIEW, TRIGGER, SHOW VIEW ON \`${envPre}dis-metering\`.\`meter${env}-dis-tenant-${tenantId}\` TO '${envPre}tenant-${tenantId}'@'${IPAddressRange}'; ALTER USER '${envPre}tenant-${tenantId}'@'${IPAddressRange}' ;
    `

    var sql14 = `CREATE TABLE archived_enc_request_list LIKE enc_request_list;`
    var sql15 = `CREATE TABLE archived_dec_request_list LIKE dec_request_list;`
    var sql16 = `CREATE TABLE enc_request_log (
        id int PRIMARY KEY NOT NULL AUTO_INCREMENT,
        fk_enc_request_list_id int NOT NULL,
        fk_enc_request_list_sub_account_id int NOT NULL,
        request_file_list blob NOT NULL,
        restoration tinyint NOT NULL DEFAULT '0',
        file_type varchar(255) DEFAULT NULL,
        request_date date NOT NULL,
        request_time time NOT NULL,
        request_datetime datetime NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
    var sql17 = `CREATE TABLE dec_request_log (
        id int PRIMARY KEY NOT NULL AUTO_INCREMENT,
        fk_dec_request_list_id int NOT NULL,
        fk_enc_request_list_id int NOT NULL,
        fk_dec_request_list_sub_account_id int NOT NULL,
        request_file_list blob NOT NULL,
        file_type varchar(255) DEFAULT NULL,
        request_date date NOT NULL,
        request_time time NOT NULL,
        request_datetime datetime NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
    var sql18 = `CREATE TABLE archived_enc_request_log LIKE enc_request_log;`
    var sql19 = `CREATE TABLE archived_dec_request_log LIKE dec_request_log;`

    let lifeCycle = (process.env.NODE_ENV == 'dev') ? 1 : 90;
    let deletelifeCycle = (process.env.NODE_ENV == 'dev') ? 3 : 365;
    var sql20 = `
        CREATE EVENT archive_old_enc_request_list
        ON SCHEDULE
        EVERY 1 DAY
        STARTS CURRENT_TIMESTAMP
        DO
        BEGIN
            INSERT INTO archived_enc_request_list
            SELECT * FROM enc_request_list WHERE request_datetime <= DATE_SUB(NOW(), INTERVAL ${lifeCycle} DAY);
            DELETE FROM enc_request_list WHERE request_datetime <= DATE_SUB(NOW(), INTERVAL ${lifeCycle} DAY);
        END
    `
    var sql21 = `
        CREATE EVENT archive_old_enc_request_log
        ON SCHEDULE
        EVERY 1 DAY
        STARTS CURRENT_TIMESTAMP
        DO
        BEGIN
            INSERT INTO archived_enc_request_log
            SELECT * FROM enc_request_log WHERE request_datetime <= DATE_SUB(NOW(), INTERVAL ${lifeCycle} DAY);
            DELETE FROM enc_request_log WHERE request_datetime <= DATE_SUB(NOW(), INTERVAL ${lifeCycle} DAY);
        END
    `
    var sql22 = `
        CREATE EVENT archive_old_dec_request_list
        ON SCHEDULE
        EVERY 1 DAY
        STARTS CURRENT_TIMESTAMP
        DO
        BEGIN
            INSERT INTO archived_dec_request_list
            SELECT * FROM dec_request_list WHERE request_datetime <= DATE_SUB(NOW(), INTERVAL ${lifeCycle} DAY);
            DELETE FROM dec_request_list WHERE request_datetime <= DATE_SUB(NOW(), INTERVAL ${lifeCycle} DAY);
        END
    `

    var sql23 = `
        CREATE EVENT archive_old_dec_request_log
        ON SCHEDULE
        EVERY 1 DAY
        STARTS CURRENT_TIMESTAMP
        DO
        BEGIN
            INSERT INTO archived_dec_request_log
            SELECT * FROM dec_request_log WHERE request_datetime <= DATE_SUB(NOW(), INTERVAL ${lifeCycle} DAY);
            DELETE FROM dec_request_log WHERE request_datetime <= DATE_SUB(NOW(), INTERVAL ${lifeCycle} DAY);
        END
    `

    var sql24 = `
        CREATE EVENT delete_archived_dec_request_list
        ON SCHEDULE
        EVERY 1 DAY
        STARTS CURRENT_TIMESTAMP
        DO
            DELETE FROM archived_dec_request_list WHERE request_datetime <= DATE_SUB(NOW(), INTERVAL ${deletelifeCycle} DAY);
    `

    var sql25 = `
        CREATE EVENT delete_archived_dec_request_log
        ON SCHEDULE
        EVERY 1 DAY
        STARTS CURRENT_TIMESTAMP
        DO
            DELETE FROM archived_dec_request_log WHERE request_datetime <= DATE_SUB(NOW(), INTERVAL ${deletelifeCycle} DAY);
    `

    var sql26 = `
        CREATE EVENT delete_archived_enc_request_list
        ON SCHEDULE
        EVERY 1 DAY
        STARTS CURRENT_TIMESTAMP
        DO
            DELETE FROM archived_enc_request_list WHERE request_datetime <= DATE_SUB(NOW(), INTERVAL ${deletelifeCycle} DAY);
    `

    var sql27 = `
        CREATE EVENT delete_archived_enc_request_log
        ON SCHEDULE
        EVERY 1 DAY
        STARTS CURRENT_TIMESTAMP
        DO
            DELETE FROM archived_enc_request_log WHERE request_datetime <= DATE_SUB(NOW(), INTERVAL ${deletelifeCycle} DAY);
    `
    
    const requestDate = moment().format('YYYY-MM-DD');

    var tenantConfig =
    {
        host: process.env.DATABASE_ENDPOINT,
        port: 3306,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: databaseName,
        multipleStatements: true,
        connectionLimit: 30
    };

    var metering_database = 'dis-metering';
    var meteringConfig =
    {
        host: process.env.DATABASE_ENDPOINT,
        port: 3306,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: (process.env.NODE_ENV == 'dev') ? 'dev-' + metering_database : metering_database,
        multipleStatements: true,
        connectionLimit: 30
    };

    const subConn = await mysql.createConnection(tenantConfig);
    const conn = await pool.getConnection();
    const meterConn = await mysql.createConnection(meteringConfig);

    let objJson = {
        msg: '',
        result: null
    }

    try {
        await subConn.query(sql);
        await subConn.query(sql1);
        await subConn.query(sql2);
        await subConn.query(sql3);
        await subConn.query(sql4);
        await subConn.query(sql5);
        const [result] = await conn.query(sql6, [req.params.id]);

        await subConn.query(sql7, [databaseName, result[0].account_name, "'" + bucketName + "'", '111', "'" + databaseName + "'", '1111', 1, 1, 1, requestDate]);
        await meterConn.query(sql8);
        await subConn.query(sql9);
        await subConn.query(sql10);
        await subConn.query(sql11);
        await subConn.query(sql12);
        await conn.query(sql13);
        await subConn.query(sql14);
        await subConn.query(sql15);
        await subConn.query(sql16);
        await subConn.query(sql17);
        await subConn.query(sql18);
        await subConn.query(sql19);

        //스케줄링 20 ~ 27
        await subConn.query(sql20);
        await subConn.query(sql21);
        await subConn.query(sql22);
        await subConn.query(sql23);
        await subConn.query(sql24);
        await subConn.query(sql25);
        await subConn.query(sql26);
        await subConn.query(sql27);
        objJson.msg = 'success';
        logger.info(apiLogFormat('GET', '/createTable', ` 테이블 생성 완료`));
        console.log(apiLogFormat('GET', '/createTable', ` 테이블 생성 완료`));
        conn.release();
        subConn.end();
        res.status(200).json(objJson);
    } catch (err) {
        objJson.msg = 'error';
        objJson.result = err.message;
        logger.error(apiLogFormat('GET', '/createTable', ` ${err}`));
        console.error(apiLogFormat('GET', '/createTable', ` ${err}`));
        conn.release();
        res.status(400).json(objJson);
    }
}

exports.createBucket = async (req, res) => {
    const { tenantId } = req.body;

    let bucketName = (process.env.NODE_ENV == 'dev') ? 'dev-tenant-' + tenantId : 'tenant-' + tenantId

    createS3Bucket(bucketName)
    let objJson = { 'message': 'success', 'log': 'Bucket ' + bucketName + ' create success' };
    logger.info(apiLogFormat('POST', '/bucket', ` ${bucketName} 생성 완료`))
    console.log(apiLogFormat('POST', '/bucket', ` ${bucketName} 생성 완료`))
    res.status(200).json(objJson);
}

function createS3Bucket(bucketName) {
    s3.createBucket({
        Bucket: bucketName,
        CreateBucketConfiguration: {}
    }).promise()

    s3_south.createBucket({
        Bucket: bucketName,
        CreateBucketConfiguration: {}
    }).promise()
}

exports.listBucket = async (req, res) => {
    let Buckets_kr = [];
    let Buckets_krs = [];

    await s3.listBuckets({}, function (err, data) {
        let buckets = data.Buckets;
        Buckets_kr = Array.from(buckets, bucket => bucket.Name)
    }).promise();

    await s3_south.listBuckets({}, function (err, data) {
        let buckets = data.Buckets;
        Buckets_krs = Array.from(buckets, bucket => bucket.Name)
    }).promise();

    let result = [Buckets_kr, Buckets_krs];

    let objJson = { 'message': 'success', 'log': 'bucketlist success', result: result };
    logger.info(apiLogFormat('GET', '/bucket/list', ` 버킷 목록 조회 완료`))
    console.log(apiLogFormat('GET', '/bucket/list', ` 버킷 목록 조회 완료`))
    res.status(200).json(objJson);
}

exports.getMonthUsage = async (req, res, cb) => {
    var searchMonth = req.query.searchMonth;
    var env = (process.env.NODE_ENV == 'dev') ? 'dev-' : '';

    var metering_database = 'dis-metering';
    var meteringConfig =
    {
        host: process.env.DATABASE_ENDPOINT,
        port: 3306,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: (process.env.NODE_ENV == 'dev') ? 'dev-' + metering_database : metering_database,
        multipleStatements: true,
        connectionLimit: 30
    };

    const conn = await pool.getConnection();
    const meterConn = await mysql.createConnection(meteringConfig);

    var sql = `SHOW TABLES`;
    var objJson = {

    }

    var table_name_list = []
    var tenant_info_list = []

    var [table_name] = await meterConn.query(sql);
    var [tenant_info] = await conn.query('SELECT id, company_name, owner_name, user_name FROM tenant')

    for (var i = 0; i < table_name.length; i++) table_name_list.push(table_name[i][`Tables_in_${env}dis-metering`])
    for (var i = 0; i < tenant_info.length; i++) tenant_info_list.push(tenant_info[i]);

    var objJson = {};

    for (var i = 0; i < tenant_info_list.length; i++) {
        let template = {
            company_name: tenant_info_list[i].company_name,
            owner_name: tenant_info_list[i].owner_name,
            user_name: tenant_info_list[i].user_name,
            encrypt_request_count: 0,
            decrypt_request_count: 0,
            download_request_count: 0,
            encrypt_request_charge: 0,
            decrypt_request_charge: 0,
            download_request_charge: 0,
            total_download: 0,
        }
        objJson[tenant_info_list[i].id] = template;
    }

    for (var i = 0; i < table_name_list.length; i++) {
        var tableName = table_name_list[i];
        sql = `SELECT request_type, count(*), sum(file_size), sum(service_charge) FROM \`${tableName}\` WHERE file_type!='json' AND request_date LIKE \'${searchMonth}%\' group by request_type;`
        var [result] = await meterConn.query(sql);

        if (result.length > 0) {
            var parseTableName = tableName.split('-');
            var tenantId = parseTableName[parseTableName.length - 1];
            for (var j = 0; j < result.length; j++) {
                if (result[j].request_type == 'encrypt') {
                    objJson[tenantId]['encrypt_request_count'] = result[j]['count(*)'];
                    objJson[tenantId]['encrypt_request_charge'] = result[j]['sum(service_charge)']
                    console.log(tenantId + "1번")
                }
                else if (result[j].request_type == 'decrypt') {
                    objJson[tenantId]['decrypt_request_count'] = result[j]['count(*)'];
                    objJson[tenantId]['decrypt_request_charge'] = result[j]['sum(service_charge)']
                    console.log(tenantId + "2번")
                }
                else if (result[j].request_type == 'download') {
                    objJson[tenantId]['download_request_count'] = result[j]['count(*)'];
                    objJson[tenantId]['total_download'] += result[j]['sum(file_size)'];
                    objJson[tenantId]['download_request_charge'] = result[j]['sum(service_charge)']
                    console.log(tenantId + "3번")
                }
            }
        }
    }

    logger.info(apiLogFormat('GET', '/usage', ` 월간 미터링 정보 조회 완료`))
    console.log(apiLogFormat('GET', '/usage', ` 월간 미터링 정보 조회 완료`))
    conn.release();
    res.status(200).json(objJson);
}

exports.test = async (req, res) => {
    s3.getBucketLifecycleConfiguration(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
        /*
        data = {
         Rules: [
            {
           ID: "Rule for TaxDocs/", 
           Prefix: "TaxDocs", 
           Status: "Enabled", 
           Transitions: [
              {
             Days: 365, 
             StorageClass: "STANDARD_IA"
            }
           ]
          }
         ]
        }
        */
    });
}