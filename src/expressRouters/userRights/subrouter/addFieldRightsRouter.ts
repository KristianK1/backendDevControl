import { IAddUserRightFieldReq } from "models/API/UserRightAlterReqRes";
import { IDevice, IUser } from "models/basicModels";
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
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

router.post('/', async (req: any, res: any) => {
    let request: IAddUserRightFieldReq = req.body;
    console.log("field rights router");

    if (typeof request.readOnly !== "boolean") {
        res.status(400);
        res.send('readOnly property must be boolean');
        return;
    }

    let admin: IUser;
    try {
        admin = await userService.getUserByToken(request.authToken, true);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    let device: IDevice;
    try {
        device = await deviceService.getDevicebyId(request.deviceId);
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

    let user: IUser;
    try {
        user = await userService.getUserbyId(request.userId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    if (user.id === admin.id) {
        res.status(400);
        res.send('Admin can\'t set rights for himself');
        return;
    }

    if (!(await deviceService.checkDoesFieldExist(request.deviceId, request.groupId, request.fieldId))) {
        res.status(400);
        res.send('Field doesn\'t exist');
        return;
    }

    try {
        await userPermissionService.addUserRightToField(user, request.deviceId, request.groupId, request.fieldId, request.readOnly);

        if (request.readOnly) {
            await triggerService.checkValidityOfTriggersForUser(user.id);
        }
        wsServer.emitUserRightUpdate(user.id);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    res.sendStatus(200);
});

module.exports = router;