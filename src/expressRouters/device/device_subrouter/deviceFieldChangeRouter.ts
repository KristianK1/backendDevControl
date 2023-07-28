import { IChangeDeviceField_Device, IChangeDeviceField_User } from "models/API/deviceCreateAlterReqRes";
import { IUser } from "models/basicModels";
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { ERightType } from "../../../models/userRightsModels";
import { DBSingletonFactory } from "../../../firestoreDB/singletonService";
import { Db } from "firestoreDB/db";
import { deviceServiceSingletonFactory, userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";
import { DeviceService } from "../../../services/deviceService";

var express = require('express');
var router = express.Router();

var db: Db = DBSingletonFactory.getInstance();
var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();
var userService: UserService = userServiceSingletonFactory.getInstance();

var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/device', async (req: any, res: any) => {
    let request: IChangeDeviceField_Device = req.body;
    try {
        await deviceService.changeDeviceFieldValueFromDevice(request.deviceKey, request.groupId, request.fieldId, request.fieldValue)
        let id = (await deviceService.getDevicebyKey(request.deviceKey)).id;
        wsServer.emitFieldChanged(id, request.groupId, request.fieldId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

router.post('/user', async (req: any, res: any) => {
    let request: IChangeDeviceField_User = req.body;
    let user: IUser;
    try {
        user = await userService.getUserByToken(request.authToken, false);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }

    let right = await db.checkUserRightToField(user, request.deviceId, request.groupId, request.fieldId);
    if (right !== ERightType.Write) {
        res.status(400);
        res.send('User doesn\'t have write rights to this field');
        return;
    }

    try {
        await deviceService.changeDeviceFieldValueFromUser(request.deviceId, request.groupId, request.fieldId, request.fieldValue);
        wsServer.emitFieldChanged(request.deviceId, request.groupId, request.fieldId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;