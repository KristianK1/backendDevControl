import { IDeleteUserRightFieldReq } from "models/API/UserRightAlterReqRes";
import { IDevice, IUser } from "models/basicModels";
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { DBSingletonFactory } from "../../../firestoreDB/singletonService";
import { Db } from "firestoreDB/db";
import { deviceServiceSingletonFactory, userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";
import { DeviceService } from "../../../services/deviceService";

var express = require('express');
var router = express.Router();

var db: Db = DBSingletonFactory.getInstance();
var userService: UserService = userServiceSingletonFactory.getInstance();
var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();

var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    let request: IDeleteUserRightFieldReq = req.body;

    let admin: IUser;
    try {
        admin = await userService.getUserByToken(request.authToken, true);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    let device: IDevice;
    try {
        device = await deviceService.getDevicebyId(request.deviceId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    if (device.userAdminId != admin.id) {
        res.status(400);
        res.send('User isn\'t admin');
        return;
    }

    let user: IUser;
    try {
        user = await userService.getUserbyId(request.userId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    
    try {
        await db.deleteUserRightToField(user, request.deviceId, request.groupId, request.fieldId);
        wsServer.emitUserRightUpdate(user.id, request.deviceId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    res.sendStatus(200);
});

module.exports = router;