import { DeviceDB } from 'firestoreDB/devices/deviceDB';
import { deviceDBSingletonFactory, usersDBSingletonFactory } from '../../../firestoreDB/singletonService';
import { UsersDB } from 'firestoreDB/users/userDB';
import { IDeleteUserRequest } from '../../../models/API/loginRegisterReqRes';
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { IDevice, IUser } from '../../../models/basicModels';
import { ELogoutReasons } from '../../../models/frontendModels';

var express = require('express');
var router = express.Router();

var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
var userDb: UsersDB = usersDBSingletonFactory.getInstance();
var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();


router.post('/', async (req: any, res: any) => {
    const deleteReq: IDeleteUserRequest = req.body;
    let devices: IDevice[];
    let user: IUser;

    try {
        devices = await deviceDb.getDevices()
        user = await userDb.getUserByToken(deleteReq.authToken, false);
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
        res.send('User is admin');
        return;
    }
    let loginResponse;
    try {
        loginResponse = await userDb.deleteUser(deleteReq.authToken);
        await wsServer.logoutAllUsersSessions(user.id, ELogoutReasons.DeletedUser);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.json(loginResponse);
});

module.exports = router;