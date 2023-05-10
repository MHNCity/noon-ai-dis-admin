const express = require("express");
const asyncify = require('express-asyncify');
const app = asyncify(express());
const path = require('path');
app.use('/static', express.static(path.join(__dirname + '/static')));
app.use('/static_legacy', express.static(path.join(__dirname + '/static_legacy')));
app.use('/js', express.static(path.join(__dirname + '/js')));
app.use('/plugin', express.static(path.join(__dirname + '/plugin')));
app.use('/user_modules', express.static(path.join(__dirname + '/../user_modules')));

const { isLoggedIn, isNotLoggedIn } = require('../user_modules/middlewares.js');
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
})

// app.get('/profile', isLoggedIn, (req, res) => {
// profile이란 페이지가 로그인되어있어야만 접근해야할 경우
// });

// app.get('/join', isNotLoggedIn, (req, res) => {

// });

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get("/index", (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get("/main", isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname + '/main.html'));
});

app.get("/join", isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname + '/join.html'));
});

app.get("/usage", isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname + '/usage.html'));
});

app.get("/quit", isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname + '/quit.html'));
});

app.get("/admin_manage", isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname + '/admin_manage.html'));
});

app.get("/admin_account", isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname + '/admin_account.html'));
});

module.exports = app;