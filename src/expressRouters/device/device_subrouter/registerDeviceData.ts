import { deviceDBSingletonFactory, usersDBSingletonFactory } from "../../../firestoreDB/singletonService";
import { DeviceDB } from "../../../firestoreDB/devices/deviceDB";
import { UsersDB } from "../../../firestoreDB/users/userDB";
import { IAddDeviceReq, IRegisterDeviceDataReq } from "../../../models/API/deviceCreateAlterReqRes";

var express = require('express');
var router = express.Router();

var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
var userDb: UsersDB = usersDBSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    var registerDeviceDataReq: IRegisterDeviceDataReq = req.body;
    try {
        await deviceDb.getDeviceByKey(registerDeviceDataReq.deviceData.deviceKey);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    // let id = await deviceDb.addDevice(addDeviceReq.deviceName, addDeviceReq.userAdminId, addDeviceReq.deviceKey);
    // res.send(`${id}`);
});

module.exports = router;
