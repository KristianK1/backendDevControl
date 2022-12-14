import { DeviceDB } from "firestoreDB/devices/deviceDB";
import { deviceDBSingletonFactory, usersDBSingletonFactory } from "../../../firestoreDB/singletonService";
import { UsersDB } from "firestoreDB/users/userDB";
import { IAddUserRightComplexGroupReq } from "models/API/UserRightAlterReqRes";
import { IDevice, IUser } from "models/basicModels";
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";

var express = require('express');
var router = express.Router();

var userDB: UsersDB = usersDBSingletonFactory.getInstance();
var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
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
        admin = await userDB.getUserByToken(request.authToken, true);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    let device: IDevice;
    try {
        device = await deviceDb.getDevicebyId(request.deviceId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    try {
        deviceDb.getComplexGroup(device, request.complexGroupId);
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
        user = await userDB.getUserbyId(request.userId);
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
        await userDB.addUserRightToComplexGroup(user, request.deviceId, request.complexGroupId, request.readOnly);
        wsServer.emitUserRightUpdate(user.id, request.deviceId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    res.sendStatus(200);
});

module.exports = router;