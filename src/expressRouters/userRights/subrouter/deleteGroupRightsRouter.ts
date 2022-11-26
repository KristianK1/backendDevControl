import { DeviceDB } from "firestoreDB/devices/deviceDB";
import { deviceDBSingletonFactory, usersDBSingletonFactory } from "firestoreDB/singletonService";
import { UsersDB } from "firestoreDB/users/userDB";
import { IAddUserRightDeviceReq, IDeleteUserRightDeviceReq, IDeleteUserRightGroupReq } from "models/API/UserRightAlterReqRes";
import { IDevice, IUser } from "models/basicModels";

var express = require('express');
var router = express.Router();

var userDB: UsersDB = usersDBSingletonFactory.getInstance();
var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    let request: IDeleteUserRightGroupReq = req.body;

    let user: IUser;
    try {
        user = await userDB.getUserByToken(request.authToken, true);
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

    if (device.userAdminId != user.id) {
        res.status(400);
        res.send('User isn\'t admin');
        return;
    }

    try {
        await userDB.deleteUserRightToGroup(user, request.deviceId, request.groupId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
});

module.exports = router;