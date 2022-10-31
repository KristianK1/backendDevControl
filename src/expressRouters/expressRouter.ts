var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');


router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

var userAuthRouter = require('./userAuths/userAuthRouter.ts');
router.use('/userAuth', userAuthRouter);

var deviceRouter = require('./device/deviceRouter.ts');
router.use('/device', deviceRouter);

var deviceFieldChangeRouter = require('./device/deviceRouter.ts');
router.use('/deviceFieldChange', deviceFieldChangeRouter);
//add more use-s

module.exports = router;