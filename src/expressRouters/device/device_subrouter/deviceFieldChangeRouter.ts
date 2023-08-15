import { IChangeDeviceField_Device, IChangeDeviceField_User } from "models/API/deviceCreateAlterReqRes";
import { IUser } from "models/basicModels";
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { ERightType } from "../../../models/userRightsModels";
import { deviceServiceSingletonFactory, triggerServiceSingletonFactory, userPermissionServiceSingletonFactory, userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";
import { DeviceService } from "../../../services/deviceService";
import { UserPermissionService } from "../../../services/userPermissionService";
import { TriggerService } from "../../../services/triggerService";

var express = require('express');
var router = express.Router();

var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();
var userService: UserService = userServiceSingletonFactory.getInstance();
var userPermissionService: UserPermissionService = userPermissionServiceSingletonFactory.getInstance();
var triggerService: TriggerService = triggerServiceSingletonFactory.getInstance();

var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/device', async (req: any, res: any) => {
    let request: IChangeDeviceField_Device = req.body;
    try {
        let oldValue = await deviceService.changeDeviceFieldValueFromDevice(request.deviceKey, request.groupId, request.fieldId, request.fieldValue)
        let id = (await deviceService.getDevicebyKey(request.deviceKey)).id;
        await triggerService.checkTriggersForFieldInGroup(id, request.groupId, request.fieldId, oldValue);
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

    let right = await userPermissionService.checkUserRightToField(user, request.deviceId, request.groupId, request.fieldId);
    if (right !== ERightType.Write) {
        res.status(400);
        res.send('User doesn\'t have write rights to this field');
        return;
    }

    try {
        let oldValue = await deviceService.changeDeviceFieldValueFromUser(request.deviceId, request.groupId, request.fieldId, request.fieldValue);
        await triggerService.checkTriggersForFieldInGroup(request.deviceId, request.groupId, request.fieldId, oldValue);
        wsServer.emitFieldChanged(request.deviceId, request.groupId, request.fieldId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;