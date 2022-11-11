import { deviceDBSingletonFactory, usersDBSingletonFactory } from "../../../firestoreDB/singletonService";
import { DeviceDB } from "../../../firestoreDB/devices/deviceDB";
import { UsersDB } from "../../../firestoreDB/users/userDB";
import { IAddDeviceReq, IRegisterDeviceDataReq } from "../../../models/API/deviceCreateAlterReqRes";
import { IDevice } from "models/basicModels";

var express = require('express');
var router = express.Router();

var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
var userDb: UsersDB = usersDBSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    var registerDeviceDataReq: IDevice = req.body;
    console.log('deviceData registration');
    
    try {
        await deviceDb.registerDeviceData(registerDeviceDataReq);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;
