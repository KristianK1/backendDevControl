import { deviceServiceSingletonFactory, triggerServiceSingletonFactory, userPermissionServiceSingletonFactory, userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";
import { DeviceService } from "../../../services/deviceService";
import { UserPermissionService } from "services/userPermissionService";
import { TriggerService } from "../../../services/triggerService";
import { IDeleteTriggersReq } from "models/API/triggersReqRes";
import { IUser } from "models/basicModels";
import { ITrigger } from "models/triggerModels";

var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();
var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();
var userPermissionService: UserPermissionService = userPermissionServiceSingletonFactory.getInstance();
var triggerService: TriggerService = triggerServiceSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    let request: IDeleteTriggersReq = req.body;

    let user: IUser;

    try {
        user = await userService.getUserByToken(request.authToken, false);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }


    let triggerData: ITrigger;
    try {
        triggerData = await triggerService.getTriggerbyId(request.triggerId);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }

    if (user.id !== triggerData.userId) {
        res.status(400);
        res.send("User is not the owner of the trigger");
        return;
    }

    try {
        await triggerService.deleteTrigger(triggerData);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }

    res.sendStatus(200);
});

module.exports = router;
