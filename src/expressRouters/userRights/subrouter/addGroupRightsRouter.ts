import { IAddUserRightGroupReq } from "models/API/UserRightAlterReqRes";
import { IDevice, IUser } from "models/basicModels";
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { DBSingletonFactory } from "../../../firestoreDB/singletonService";
import { Db } from "firestoreDB/db";

var express = require('express');
var router = express.Router();

var db: Db = DBSingletonFactory.getInstance();
var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    let request: IAddUserRightGroupReq = req.body;

    if(typeof request.readOnly !== "boolean"){
        res.status(400);
        res.send('readOnly property must be boolean');
        return;    
    }
    
    let admin: IUser;
    try {
        admin = await db.getUserByToken(request.authToken, true);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    let device: IDevice;
    try {
        device = await db.getDevicebyId(request.deviceId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    try {
        db.getDeviceFieldGroup(device, request.groupId);
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
        user = await db.getUserbyId(request.userId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    if(user.id === admin.id){
        res.status(400);
        res.send('Admin can\'t set rights for himself');
        return;
    }
    
    try {
        await db.addUserRightToGroup(user, request.deviceId,request.groupId, request.readOnly);
        wsServer.emitUserRightUpdate(user.id, request.deviceId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    res.sendStatus(200);
});

module.exports = router;