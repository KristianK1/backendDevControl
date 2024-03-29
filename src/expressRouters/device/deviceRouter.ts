var express = require('express');
var router = express.Router();

var addDeviceRouter = require('./device_subrouter/addDevice.ts')
router.use('/addDevice', addDeviceRouter);

var renameDeviceRouter = require('./device_subrouter/renameDevice.ts')
router.use('/renameDevice', renameDeviceRouter);

var changeDeviceAdminRouter = require('./device_subrouter/changeDeviceAdmin.ts')
router.use('/changeAdmin', changeDeviceAdminRouter);

var deleteDeviceRouter = require('./device_subrouter/deleteDevice.ts');
router.use('/deleteDevice', deleteDeviceRouter);

var registerDeviceDataRouter = require('./device_subrouter/registerDeviceData.ts');
router.use('/registerDeviceData', registerDeviceDataRouter)

var changeFieldValueRouter = require('./device_subrouter/deviceFieldChangeRouter.ts');
router.use('/changeField', changeFieldValueRouter);

var changeComplexGroupStateRouter = require('./device_subrouter/deviceComplexGroupStateChangeRouter.ts');
router.use('/changeComplexGroupState', changeComplexGroupStateRouter);

var changeFieldInComplexGroupRouter = require('./device_subrouter/deviceComplexGroupFieldChangeRouter.ts');
router.use('/fieldInComplexGroupState', changeFieldInComplexGroupRouter);

module.exports = router;