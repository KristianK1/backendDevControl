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

var registerDeviceDataRouter = require('./device_subrouter/registerDeviceData');
router.use('/registerDeviceData', registerDeviceDataRouter)

var changeFieldValueRouter = require('./device_subrouter/deviceFieldChangeRouter.ts');
router.use('/changeField', changeFieldValueRouter);

var changeComplexGroupStateRouter = require('./device_subrouter/deviceComplexGroupStateChangeRouter.ts');
router.use('/changeComplexGroupState', changeComplexGroupStateRouter);


import { getCurrentTimeUNIX } from "../../generalStuff/timeHandlers";
import { deviceDBSingletonFactory } from "../../firestoreDB/singletonService";
var deviceDb = deviceDBSingletonFactory.getInstance();
router.get('/:id', async (req: any, res: any) => {
    let id = req.params.id;
    console.log(id);
    let device;
    let unix1 = getCurrentTimeUNIX();
    try {
        device = await deviceDb.getDevicebyId(id);
    } catch (e) {
        res.status(400);
        res.send(e.message);
    }
    let unix2 = getCurrentTimeUNIX();
    console.log(unix2 - unix1);

    res.json(device);
});





module.exports = router;