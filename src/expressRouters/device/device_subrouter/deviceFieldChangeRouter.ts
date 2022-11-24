import { deviceDBSingletonFactory, usersDBSingletonFactory } from "../../../firestoreDB/singletonService";
import { DeviceDB } from "../../../firestoreDB/devices/deviceDB";
import { UsersDB } from "../../../firestoreDB/users/userDB";
import { IChangeDeviceField_Device, IChangeDeviceField_User } from "models/API/deviceCreateAlterReqRes";
import { IUser } from "models/basicModels";

var express = require('express');
var router = express.Router();

var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
var userDb: UsersDB = usersDBSingletonFactory.getInstance();

var express = require('express');
var router = express.Router();

router.post('/device', async (req: any, res: any) => {
    let changeFieldRequest: IChangeDeviceField_Device = req.body;
    try {
        await deviceDb.changeDeviceFieldValueFromDevice(changeFieldRequest.deviceKey, changeFieldRequest.groupId, changeFieldRequest.fieldId, changeFieldRequest.fieldValue)
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

router.post('/user', async (req: any, res: any) => {
    let changeFieldRequest: IChangeDeviceField_User = req.body;
    let user: IUser;
    try {
        user = await userDb.getUserByToken(changeFieldRequest.authToken, false);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }

    try {
        await deviceDb.changeDeviceFieldValueFromUser(changeFieldRequest.deviceId, changeFieldRequest.groupId, changeFieldRequest.fieldId, changeFieldRequest.fieldValue)
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;