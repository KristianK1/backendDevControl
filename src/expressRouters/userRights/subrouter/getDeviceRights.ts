import { DeviceDB } from "firestoreDB/devices/deviceDB";
import { deviceDBSingletonFactory, usersDBSingletonFactory } from "../../../firestoreDB/singletonService";
import { UsersDB } from "firestoreDB/users/userDB";
import { IDeleteUserRightFieldReq } from "models/API/UserRightAlterReqRes";
import { IDevice, IUser } from "models/basicModels";
import { IDeviceRightsRequest } from "models/frontendModels";

var express = require('express');
var router = express.Router();

var userDB: UsersDB = usersDBSingletonFactory.getInstance();
var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    let request: IDeviceRightsRequest = req.body;

    let admin: IUser;
    try {
        admin = await userDB.getUserByToken(request.adminToken, true);
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

    if (device.userAdminId != admin.id) {
        res.status(400);
        res.send('User isn\'t admin');
        return;
    }

    try{
        let result = await userDB.getUsersRightsToDevice(device);
        res.json(result);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }



})