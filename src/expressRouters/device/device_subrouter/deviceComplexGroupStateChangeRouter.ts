import { IChangeComplexGroupState_Device, IChangeComplexGroupState_User } from "models/API/deviceCreateAlterReqRes";
import { IUser } from "models/basicModels";
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { ERightType } from "../../../models/userRightsModels";
import { deviceServiceSingletonFactory, userPermissionServiceSingletonFactory, userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";
import { DeviceService } from "../../../services/deviceService";
import { UserPermissionService } from "services/userPermissionService";

var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();
var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();
var userPermissionService: UserPermissionService = userPermissionServiceSingletonFactory.getInstance();

var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/device', async (req: any, res: any) => {
    let request: IChangeComplexGroupState_Device = req.body;

    try {
        await deviceService.changeComplexGroupStateFromDevice(request.deviceKey, request.groupId, request.state);
        let device = await deviceService.getDevicebyKey(request.deviceKey);
        wsServer.emitComplexGroupChanged(device.id, request.groupId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    res.sendStatus(200);
});

router.post('/user', async (req: any, res: any) => {
    console.log(req.body);
    let request: IChangeComplexGroupState_User = req.body;
    let user: IUser;
    console.log(request);

    try{
        await deviceService.getDevicebyId(request.deviceId);
    }catch (e){
        res.status(400);
        res.send(e.message);
        return;
    }

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
        await deviceService.changeComplexGroupStateFromUser(request.deviceId, request.groupId, request.state);
        wsServer.emitComplexGroupChanged(request.deviceId, request.groupId); //bez await-a
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;