import { IAddUserRightComplexGroupReq } from "models/API/UserRightAlterReqRes";
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
    let request: IAddUserRightComplexGroupReq = req.body;

    if (typeof request.readOnly !== "boolean") {
        res.status(400);
        res.send('readOnly property must be boolean');
        return;
    }

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

    if(!(await deviceService.checkDoesGroupExist(request.deviceId, request.complexGroupId))){
        res.status(400);
        res.send('Complex group doesn\'t exist');
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

    if (user.id === admin.id) {
        res.status(400);
        res.send('Admin can\'t set rights for himself');
        return;
    }

    try {
        await db.addUserRightToComplexGroup(user, request.deviceId, request.complexGroupId, request.readOnly);
        wsServer.emitUserRightUpdate(user.id, request.deviceId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    res.sendStatus(200);
});

module.exports = router;