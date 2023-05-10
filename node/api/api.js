const express = require("express");
const asyncify = require('express-asyncify');
const router = express.Router();
const app = asyncify(express());

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const { isLoggedIn, isNotLoggedIn } = require('../user_modules/middlewares.js');
const DISApiController = require('../controller/DIS.Api.Controller');

router.get('/user', isLoggedIn, DISApiController.userInfo);         //유틸 API
router.get('/env', DISApiController.curEnvironment);

/* 회원가입 */
router.get('/tenant', DISApiController.tenantList);
// router.post('/signup/sub-account', DISApiController.subAccountSignup);

// /* 로그인, 로그아웃 */

// /* request read, write */
router.get("/signup/request", isLoggedIn, DISApiController.requestList);
router.post("/signup/accept", isLoggedIn, DISApiController.acceptSignup);
router.post("/signup/reject", isLoggedIn, DISApiController.rejectSignup);

//서비스 미터링
// router.get("/usage", isLoggedIn, DISApiController.getMonthUsage); //유틸 API

module.exports = router;