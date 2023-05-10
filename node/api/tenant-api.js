const express = require("express");
const asyncify = require('express-asyncify');
const router = express.Router();
const app = asyncify(express());

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const { isLoggedIn, isNotLoggedIn } = require('../user_modules/middlewares.js');
const TenantApiController = require('../controller/Tenant.Api.Controller.js');

// /* 로그인, 로그아웃 */
router.delete('/account', isLoggedIn, TenantApiController.deleteTenantAccount);
router.delete('/database', isLoggedIn, TenantApiController.deleteTenantDatabase);
router.delete('/bucket', isLoggedIn, TenantApiController.deleteTenantBucket);

module.exports = router;