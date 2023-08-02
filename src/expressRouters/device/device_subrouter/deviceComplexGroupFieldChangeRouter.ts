import { IChangeComplexGroupField_Device, IChangeComplexGroupField_User } from "models/API/deviceCreateAlterReqRes";
import { IUser } from "models/basicModels";
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { ERightType } from "../../../models/userRightsModels";
import { deviceServiceSingletonFactory, triggerServiceSingletonFactory, userPermissionServiceSingletonFactory, userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";
import { DeviceService } from "../../../services/deviceService";
import { UserPermissionService } from "services/userPermissionService";
import { TriggerService } from "../../../services/triggerService";

var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();
var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();
var userPermissionService: UserPermissionService = userPermissionServiceSingletonFactory.getInstance();
var triggerService: TriggerService = triggerServiceSingletonFactory.getInstance();

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

    let right = await userPermissionService.checkUserRightToComplexGroup(user, request.deviceId, request.groupId);
    if (right !== ERightType.Write) {
        res.status(400);
        res.send('User doesn\'t have write rights to this complex group');
        return;
    }

    try {
        let oldValue = await deviceService.changeFieldValueInComplexGroupFromUser(request.deviceId, request.groupId, request.stateId, request.fieldId, request.fieldValue);
        await triggerService.checkTriggersForFieldInComplexGroup(request.deviceId, request.groupId, request.stateId, request.fieldId, oldValue);
        wsServer.emitComplexGroupChanged(request.deviceId, request.groupId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;