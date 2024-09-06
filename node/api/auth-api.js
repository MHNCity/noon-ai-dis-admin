const express = require("express");
const asyncify = require('express-asyncify');
const router = express.Router();
const app = asyncify(express());

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const { isLoggedIn, isNotLoggedIn } = require('../user_modules/middlewares.js');
const AuthApiController = require('../controller/Auth.Api.Controller.js');

// /* 로그인, 로그아웃 */
router.post('/login', isNotLoggedIn, AuthApiController.login);
router.get('/logout', isLoggedIn, AuthApiController.logout);
router.post("/first-login", AuthApiController.firstLogin);
router.post("/passwordCheck", AuthApiController.passwordCheck);
router.post("/secondary-email-send", isNotLoggedIn, AuthApiController.generateSecondaryToken); //유틸 API

/**
 * 관리자 계정 1차 로그인 시 비밀번호 변경한지 90일 이상이면 비밀번호 변경하는 API
 */
router.post("/password-change", AuthApiController.passwordChange);

router.post("/selectLockStatus", isNotLoggedIn, AuthApiController.selectLockStatus);
router.put("/failCount/plus", isNotLoggedIn, AuthApiController.plusLoginFailCount);
router.put("/failCount/clear", isNotLoggedIn, AuthApiController.updateClearLoginFailCount);
router.put("/lockStatus", isNotLoggedIn, AuthApiController.updateLockStatus);
router.put("/lockCount/clear", isNotLoggedIn, AuthApiController.updateClearLockCount);

router.get("/test", AuthApiController.test);

module.exports = router;