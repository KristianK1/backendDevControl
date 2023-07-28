import { IChangeComplexGroupField_Device, IChangeComplexGroupField_User, IChangeComplexGroupState_Device, IChangeComplexGroupState_User, IChangeDeviceField_Device, IChangeDeviceField_User } from "models/API/deviceCreateAlterReqRes";
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
var userService: UserService = userServiceSingletonFactory.getInstance();
var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();

var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/device', async (req: any, res: any) => {
    let request: IChangeComplexGroupField_Device = req.body;

    try {
        await deviceService.changeFieldValueInComplexGroupFromDevice(request.deviceKey, request.groupId, request.stateId, request.fieldId, request.fieldValue);
        let id = (await deviceService.getDevicebyKey(request.deviceKey)).id;
        wsServer.emitComplexGroupChanged(id, request.groupId);
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
        user = await userService.getUserByToken(request.authToken, false);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }

    let right = await db.checkUserRightToComplexGroup(user, request.deviceId, request.groupId);
    if (right !== ERightType.Write) {
        res.status(400);
        res.send('User doesn\'t have write rights to this complex group');
        return;
    }

    try {
        await deviceService.changeFieldValueInComplexGroupFromUser(request.deviceId, request.groupId, request.stateId, request.fieldId, request.fieldValue);
        wsServer.emitComplexGroupChanged(request.deviceId, request.groupId); //bez await-a
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;