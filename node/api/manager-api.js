const express = require("express");
const asyncify = require('express-asyncify');
const router = express.Router();
const app = asyncify(express());

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const { isLoggedIn, isNotLoggedIn } = require('../user_modules/middlewares.js');
const ManagerApiController = require('../controller/Manager.Api.Controller.js');

// /* 로그인, 로그아웃 */
router.get('/', isLoggedIn, ManagerApiController.getManagerList);
router.post('/', isLoggedIn, ManagerApiController.createManager);
router.delete('/', isLoggedIn, ManagerApiController.deleteManager);
router.post('/init-password', isLoggedIn, ManagerApiController.initPassword);
router.post('/unlock', isLoggedIn, ManagerApiController.unlock);

module.exports = router;