var express = require('express');
var router = express.Router();

var userAuthRouter = require('./userAuths/userAuthRouter.ts');
router.use('/userAuth', userAuthRouter);

var deviceRouter = require('./device/deviceRouter.ts');
router.use('/device', deviceRouter);

var userRightsRouter = require('./userRights/userRightsRouter.ts');
router.use('/userRights', userRightsRouter);

var triggerRouter = require('./triggers/triggersRouter');
router.use('/triggers', triggerRouter);

module.exports = router;