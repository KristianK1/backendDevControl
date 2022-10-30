import { DeviceDB } from "../../../firestoreDB/devices/deviceDB";
import { UsersDB } from "../../../firestoreDB/users/userDB";
import { IAddFieldReq } from "../../../models/API/deviceCreateAlterReqRes";
import { IDevice, IFieldGroup, IUser } from "../../../models/basicModels";

var express = require('express');
var router = express.Router();

var deviceDBfile = require('../../../firestoreDB/devices/deviceDB.ts');
var deviceDb: DeviceDB = deviceDBfile.getDeviceDBInstance();

var userDBfile = require('../../../firestoreDB/users/userDB.ts');
var userDb: UsersDB = userDBfile.getUserDBInstance();

router.post('/', async (req, res) => {
    var addDeviceFieldReq: IAddFieldReq = req.body;

    let user: IUser;
    try {
        user = await userDb.getUserByToken(addDeviceFieldReq.authToken, true);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    let device: IDevice;
    try {
        device = await deviceDb.getDevicebyId(addDeviceFieldReq.deviceField.deviceId);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }

    let fieldGroup: IFieldGroup;
    try {
        fieldGroup = deviceDb.getDeviceFieldGroup(device, addDeviceFieldReq.deviceField.groupId);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }

    if (fieldGroup.fields) {
        let sameExists = false;
        Object.keys(fieldGroup.fields).forEach(o => {
            if (fieldGroup.fields[o].fieldName === addDeviceFieldReq.deviceField.fieldName) {
                sameExists = true;
            }
        });
        if(sameExists){
            res.status(400);
            res.send('Field with that name already exists');
            console.log('x');
            return;
        }
    }

    if (device.userAdminId != user.id) {
        res.status(400);
        res.send('User isn\'t admin');
        return;
    }

    try {
        await deviceDb.addDeviceField(addDeviceFieldReq.deviceField);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }
    res.sendStatus(200);
});

module.exports = router;