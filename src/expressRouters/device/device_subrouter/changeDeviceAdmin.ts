import { deviceDBSingletonFactory, usersDBSingletonFactory } from "../../../firestoreDB/singletonService";
import { DeviceDB } from "../../../firestoreDB/devices/deviceDB";
import { UsersDB } from "../../../firestoreDB/users/userDB";
import { IChangeDeviceAdminReq } from "../../../models/API/deviceCreateAlterReqRes";
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";

var express = require('express');
var router = express.Router();

var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
var userDb: UsersDB = usersDBSingletonFactory.getInstance();
var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {

    var changeDeviceAdminReq: IChangeDeviceAdminReq = req.body;
    console.log("change admin request");
    console.log(changeDeviceAdminReq);

    try {
        await userDb.getUserByToken(changeDeviceAdminReq.authToken, true);
    } catch (e) {
        console.log("change admin request - ERROR1");
        res.status(400);
        res.send(e.message);
        return;
    }

    try {
        await userDb.getUserbyId(changeDeviceAdminReq.userAdminId);
    } catch (e) {
        console.log("change admin request - ERROR2");
        res.status(400);
        res.send(e.message);
        return;
    }

    try {
        await deviceDb.changeDeviceAdmin(changeDeviceAdminReq.deviceId, changeDeviceAdminReq.userAdminId);
        wsServer.emitDeviceRegistrationById(changeDeviceAdminReq.deviceId);
    } catch (e) {
        console.log("change admin request - ERROR3");
        console.log(e.message);
        
        res.status(400);
        res.send(e.message);
        return;
    }
    console.log("change admin request END");

    res.sendStatus(200);
});

module.exports = router;
