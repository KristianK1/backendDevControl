import { IChangeDeviceAdminReq } from "../../../models/API/deviceCreateAlterReqRes";
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { IDevice, IUser } from "models/basicModels";
import { DBSingletonFactory } from "../../../firestoreDB/singletonService";
import { Db } from "firestoreDB/db";
import { userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";

var express = require('express');
var router = express.Router();

var db: Db = DBSingletonFactory.getInstance();
var userService: UserService = userServiceSingletonFactory.getInstance();
var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {

    var changeDeviceAdminReq: IChangeDeviceAdminReq = req.body;
    console.log("change admin request");
    console.log(changeDeviceAdminReq);

    let device: IDevice;
    try {
        device = await db.getDevicebyId(changeDeviceAdminReq.deviceId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    let admin: IUser;
    try {
        admin = await userService.getUserByToken(changeDeviceAdminReq.authToken, true);
    } catch (e) {
        console.log("change admin request - ERROR1");
        res.status(400);
        res.send(e.message);
        return;
    }

    if(admin.id !== device.userAdminId){
        console.log("change admin request - ERROR1.5");
        res.status(400);
        res.send('User isn\'t admin');
    }

    try {
        await db.getUserbyId(changeDeviceAdminReq.userAdminId);
    } catch (e) {
        console.log("change admin request - ERROR2");
        res.status(400);
        res.send(e.message);
        return;
    }

    try {
        await db.changeDeviceAdmin(changeDeviceAdminReq.deviceId, changeDeviceAdminReq.userAdminId);
        await db.addUserRightToDevice(admin, device.id, false)
        wsServer.emitDeviceRegistrationById(changeDeviceAdminReq.deviceId);
        wsServer.emitUserRightUpdate(admin.id, changeDeviceAdminReq.deviceId)
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
