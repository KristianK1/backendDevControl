import { deviceDBSingletonFactory, usersDBSingletonFactory } from "../../../firestoreDB/singletonService";
import { DeviceDB } from "../../../firestoreDB/devices/deviceDB";
import { UsersDB } from "../../../firestoreDB/users/userDB";
import { IDevice } from "models/basicModels";
import { getCurrentTimeUNIX } from "../../../generalStuff/timeHandlers";
import { MyWebSocketServer } from "WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";

var express = require('express');
var router = express.Router();

var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
var userDb: UsersDB = usersDBSingletonFactory.getInstance();
var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    var registerDeviceDataReq: IDevice = req.body;
    let time1 = getCurrentTimeUNIX();
    try {
        await deviceDb.registerDeviceData(registerDeviceDataReq);
        wsServer.emitDeviceRegistration(registerDeviceDataReq.deviceKey); //bez await-a
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    let time2 = getCurrentTimeUNIX();
    console.log(time2 - time1);
    res.sendStatus(200);
});

module.exports = router;
