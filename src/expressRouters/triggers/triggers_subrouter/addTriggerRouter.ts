import { IAddTriggerReq } from "../../../models/API/triggersReqRes";
import { IUser } from "models/basicModels";
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

router.post('/', async (req: any, res: any) => {
    let request: IAddTriggerReq = req.body;
    console.log(request)
    let user: IUser;
    try {
        user = await userService.getUserByToken(request.authToken, false);
        request.trigger.userId = user.id;
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }
    console.log('xx1')
    let triggerData = request.trigger;

    try{
        await triggerService.checkValidityOfTrigger(triggerData);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    console.log('xx2')
    try {
        await triggerService.saveTrigger(triggerData);
    } catch (e) {
        res.status(400);
        res.send('Not saved');
        return;
    }
    console.log('xx3')
    res.sendStatus(200);

});

module.exports = router;