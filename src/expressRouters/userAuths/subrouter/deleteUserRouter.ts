import { DBSingletonFactory } from "../../../firestoreDB/singletonService";
import { Db } from "firestoreDB/db";
import { IDeleteUserRequest } from '../../../models/API/loginRegisterReqRes';
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { IDevice, IUser } from '../../../models/basicModels';
import { ELogoutReasons } from '../../../models/frontendModels';

var express = require('express');
var router = express.Router();

var db: Db = DBSingletonFactory.getInstance();
var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();


router.post('/', async (req: any, res: any) => {
    const deleteReq: IDeleteUserRequest = req.body;
    let devices: IDevice[];
    let user: IUser;

    try {
        devices = await db.getTransformedDevices()
        user = await db.getUserByToken(deleteReq.authToken, false);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    let isAdmin: boolean = false;
    devices.forEach(device => {
        if (device.userAdminId == user.id) isAdmin = true;
    });
    if (isAdmin) {
        res.status(400);
        res.send('Transfer your devices to other users or delete them.');        
        return;
    }

    try {
        await db.deleteUser(deleteReq.authToken);
        await wsServer.logoutAllUsersSessions(user.id, ELogoutReasons.DeletedUser, deleteReq.authToken);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;