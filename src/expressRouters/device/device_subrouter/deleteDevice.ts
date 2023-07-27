import { DBSingletonFactory } from "../../../firestoreDB/singletonService";
import { Db } from "firestoreDB/db";import { IDeleteDeviceReq } from "../../../models/API/deviceCreateAlterReqRes";
import { IDevice, IUser } from "../../../models/basicModels";
import { MyWebSocketServer } from "WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";

var express = require('express');
var router = express.Router();

var db: Db = DBSingletonFactory.getInstance();
var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    var removeDeviceReq: IDeleteDeviceReq = req.body;

    let user: IUser;
    try {
        user = await db.getUserByToken(removeDeviceReq.authToken, true);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    let device: IDevice;
    try {
        device = await db.getDevicebyId(removeDeviceReq.deviceId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    if (device.userAdminId != user.id) {
        res.status(400);
        res.send('User isn\'t admin');
        return;
    }

    try {
        let users = await db.getAllUsersWithRightToDevice(await db.getDevicebyId(removeDeviceReq.deviceId));
        await db.deleteDevice(removeDeviceReq.deviceId);
        wsServer.emitDeviceDeleted(users, removeDeviceReq.deviceId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    res.sendStatus(200);
});

module.exports = router;
