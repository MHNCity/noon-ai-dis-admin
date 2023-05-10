/**
 * 설명: Node.js -> MySQL 설정
 * 참고: https://docs.microsoft.com/ko-kr/azure/mysql/connect-nodejs
 */

const mysql = require('mysql2/promise');

var config =
{
    host: process.env.DATABASE_ENDPOINT,
    port: 3306,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: (process.env.NODE_ENV == 'dev') ? 'dev-dis' :'dis',
    multipleStatements: true,
    connectionLimit: 30
};

var adminConfig =
{
    host: process.env.DATABASE_ENDPOINT,
    port: 3306,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: 'mhncity',
    multipleStatements: true,
    connectionLimit: 30
};

function createTenantConn(tenant_id) {
    var databaseName = 'dis-tenant-' + tenant_id;
    var tenantConfig =
    {
        host: process.env.DATABASE_ENDPOINT,
        port: 3306,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: (process.env.NODE_ENV == 'dev') ? 'dev-'+databaseName : databaseName,
        multipleStatements: true,
        connectionLimit: 30
    };
    
    const conn = new mysql.createConnection(tenantConfig)
    return conn
}

function createMeteringConn() {
    var databaseName = 'dis-metering';
    var tenantConfig =
    {
        host: process.env.DATABASE_ENDPOINT,
        port: 3306,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: (process.env.NODE_ENV == 'dev') ? 'dev-'+databaseName : databaseName,
        multipleStatements: true,
        connectionLimit: 30
    };
    
    const conn = new mysql.createConnection(tenantConfig)
    return conn
}

const pool = mysql.createPool(config);
const adminPool = mysql.createPool(adminConfig);

module.exports = {
    config, adminConfig, pool, adminPool, createTenantConn, createMeteringConn
}
