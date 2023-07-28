import { DBSingletonFactory } from "../../../firestoreDB/singletonService";
import { Db } from "firestoreDB/db";
import { IDeleteUserRequest } from '../../../models/API/loginRegisterReqRes';
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { IDevice, IUser } from '../../../models/basicModels';
import { ELogoutReasons } from '../../../models/frontendModels';
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
    const deleteReq: IDeleteUserRequest = req.body;
    let devices: IDevice[];
    let user: IUser;

    try {
        devices = await deviceService.getDevices();
        user = await userService.getUserByToken(deleteReq.authToken, false);
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
        await userService.deleteUser(deleteReq.authToken);
        await wsServer.logoutAllUsersSessions(user.id, ELogoutReasons.DeletedUser, deleteReq.authToken);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;