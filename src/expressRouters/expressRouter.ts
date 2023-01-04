var express = require('express');
var router = express.Router();

var userAuthRouter = require('./userAuths/userAuthRouter.ts');
router.use('/userAuth', userAuthRouter);

var deviceRouter = require('./device/deviceRouter.ts');
router.use('/device', deviceRouter);

var userRightsRouter = require('./userRights/userRightsRouter.ts');
router.use('/userRights', userRightsRouter);

module.exports = router;