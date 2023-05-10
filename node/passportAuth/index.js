const passport = require('passport');
const login = require('./loginStrategy');

module.exports = () => {
    passport.serializeUser(function(user, done) {
        done(null, user);
        // done(null, {id : data.user.id, accessToken : data.accessToken});
    });
    
    passport.deserializeUser(function(user, done) {
        done(null, user);
    });

    login();
}