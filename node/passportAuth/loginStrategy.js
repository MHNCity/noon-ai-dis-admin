const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const pool = require('../user_modules/db').adminPool;
const moment = require('moment');

module.exports = () => {
    passport.use('login', new LocalStrategy({
        usernameField: 'account_name',
        passwordField: 'password'
    }, async (account_name, password, cb) => {
        try {
            const conn = await pool.getConnection();
            let sql = `SELECT session_id, JSON_EXTRACT(data, '$.passport') as passport FROM sessions WHERE JSON_EXTRACT(data, '$.passport.user.account_name') = ?`
            let results = await conn.query(sql, [account_name]);
            const isLogin = results[0][0];

            if(isLogin) {
                let sql = `DELETE FROM sessions WHERE session_id = ?`;
                await conn.query(sql, [isLogin.session_id]);
            }

            let sql2 = 'SELECT * FROM admin WHERE account_name = ? ';
            let results2 = await conn.query(sql2, [account_name]);

            const user = results2[0][0]
            const user_id = user.id;

            if(!user) {
                return cb({ message: 'No user found!!', statusCode: 400 }, null);
            }

            const userPassword = user.password;
            const isPasswordValid = bcrypt.compareSync(password, userPassword);
            
            // Validate user password
            if (!isPasswordValid) {
                return cb({ message: 'Email or Password is incorrect', statusCode: 400 }, null);
            }

            const curDatetime = moment().format('YYYY-MM-DD HH:mm:ss');
            let sql3 = 'UPDATE admin set last_login = ? WHERE account_name = ?';
            await conn.query(sql3, [curDatetime, account_name]);

            let sql4 = `INSERT INTO login_log (user_id, status_code, fail_reason, login_date) values (?, ?, ?, ?)`;
            await conn.query(sql4, [user_id, 1, 0, curDatetime]);
            
            user.auth = 'master';
            user.env = process.env.NODE_ENV;
            delete user.password;
            cb(null, user);
            conn.release();
        } catch (err) {
            console.error(err);
            cb(err);
            conn.release();
        }
    }));
};