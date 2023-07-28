import { IChangeDeviceAdminReq } from "../../../models/API/deviceCreateAlterReqRes";
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { IDevice, IUser } from "models/basicModels";
import { deviceServiceSingletonFactory, userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";
import { DeviceService } from "../../../services/deviceService";

var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();
var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();

var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {

    var changeDeviceAdminReq: IChangeDeviceAdminReq = req.body;
    console.log("change admin request");
    console.log(changeDeviceAdminReq);

    let device: IDevice;
    try {
        device = await deviceService.getDevicebyId(changeDeviceAdminReq.deviceId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    let admin: IUser;
    try {
        admin = await userService.getUserByToken(changeDeviceAdminReq.authToken, true);
    } catch (e) {
        console.log("change admin request - ERROR1");
        res.status(400);
        res.send(e.message);
        return;
    }

    if(admin.id !== device.userAdminId){
        console.log("change admin request - ERROR1.5");
        res.status(400);
        res.send('User isn\'t admin');
    }

    try {
        await userService.getUserbyId(changeDeviceAdminReq.userAdminId);
    } catch (e) {
        console.log("change admin request - ERROR2");
        res.status(400);
        res.send(e.message);
        return;
    }

    try {
        await deviceService.changeDeviceAdmin(changeDeviceAdminReq.deviceId, changeDeviceAdminReq.userAdminId);
        wsServer.emitDeviceRegistrationById(changeDeviceAdminReq.deviceId); //TODO jel treba oboje
        wsServer.emitUserRightUpdate(admin.id, changeDeviceAdminReq.deviceId)
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    res.sendStatus(200);
});

module.exports = router;
