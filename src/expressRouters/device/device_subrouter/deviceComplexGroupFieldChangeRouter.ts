import { deviceDBSingletonFactory, usersDBSingletonFactory } from "../../../firestoreDB/singletonService";
import { DeviceDB } from "../../../firestoreDB/devices/deviceDB";
import { UsersDB } from "../../../firestoreDB/users/userDB";
import { IChangeComplexGroupField_Device, IChangeComplexGroupField_User, IChangeComplexGroupState_Device, IChangeComplexGroupState_User, IChangeDeviceField_Device, IChangeDeviceField_User } from "models/API/deviceCreateAlterReqRes";
import { IUser } from "models/basicModels";

var express = require('express');
var router = express.Router();

var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
var userDb: UsersDB = usersDBSingletonFactory.getInstance();

var express = require('express');
var router = express.Router();

router.post('/device', async (req: any, res: any) => {
    let request: IChangeComplexGroupField_Device = req.body;

    try {
        await deviceDb.changeFieldValueInComplexGroupFromDevice(request.deviceKey, request.groupId, request.stateId, request.fieldId, request.fieldValue);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    res.sendStatus(200);
});

router.post('/user', async (req: any, res: any) => {
    let request: IChangeComplexGroupField_User = req.body;
    let user: IUser;
    try {
        user = await userDb.getUserByToken(request.authToken, false);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }

    try {
        await deviceDb.changeFieldValueInComplexGroupFromUser(request.deviceId, request.groupId, request.stateId, request.fieldId, request.fieldValue);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;