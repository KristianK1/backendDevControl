import { IDevice, IUser } from "../../../models/basicModels";
import { MyWebSocketServer } from "WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { deviceServiceSingletonFactory, userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";
import { DeviceService } from "../../../services/deviceService";
import { IRenameDeviceReq } from "models/API/deviceCreateAlterReqRes";

var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();
var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();

var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    var renameDeviceReq: IRenameDeviceReq = req.body;
    let user: IUser;
    try {
        user = await userService.getUserByToken(renameDeviceReq.authToken, true);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }
    
    let device: IDevice;
    try {
        device = await deviceService.getDevicebyId(renameDeviceReq.deviceId);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }

    if(device.userAdminId != user.id){
        res.status(400);
        res.send('User isn\'t admin');
        return;
    }

    try {
        await deviceService.renameDevice(renameDeviceReq.deviceId, renameDeviceReq.deviceName);
        wsServer.emitDeviceRegistration(device.deviceKey);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;