import { IDevice, IUser } from "models/basicModels";
import { IDeviceRightsRequest } from "models/frontendModels";
import { deviceServiceSingletonFactory, userPermissionServiceSingletonFactory, userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";
import { DeviceService } from "../../../services/deviceService";
import { UserPermissionService } from "services/userPermissionService";

var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();
var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();
var userPermissionService: UserPermissionService = userPermissionServiceSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    let request: IDeviceRightsRequest = req.body;
    console.log('get user perms');
    
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

    try{
        let result = await userPermissionService.getUsersRightsToDevice(admin.id, device);
        res.json(result);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
});

module.exports = router;