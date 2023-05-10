const express = require("express");
const asyncify = require('express-asyncify');
const router = express.Router();
const app = asyncify(express());
const cookieParser = require('cookie-parser');
app.use(cookieParser());

const { isLoggedIn, isNotLoggedIn } = require('../user_modules/middlewares.js');
const NCPApiController = require('../controller/NCP.Api.Controller');

/*
 * NCP 스토리지 구현부
 */

router.get("/database/instanceNumber", isLoggedIn, NCPApiController.getDatabaseInstanceNo);
router.get("/createDatabase/:instanceNo/:id", isLoggedIn, NCPApiController.createDatabase);
router.get("/createTable/:id", isLoggedIn, NCPApiController.createTable);
router.post("/bucket", isLoggedIn, NCPApiController.createBucket);
router.get("/bucket/list", isLoggedIn, NCPApiController.listBucket);

router.get("/usage", isLoggedIn, NCPApiController.getMonthUsage); //유틸 API

module.exports = router;