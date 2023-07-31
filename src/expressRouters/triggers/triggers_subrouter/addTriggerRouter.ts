import { IAddTriggerReq } from "models/API/triggersReqRes";
import { IUser } from "models/basicModels";
import { ETriggerResponseType, ETriggerSourceType, ITrigger, ITriggerSourceAdress_fieldInComplexGroup, ITriggerSourceAdress_fieldInGroup } from "models/triggerModels";
import { ERightType } from "models/userRightsModels";
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
    let request: IAddTriggerReq = req.body;

    let user: IUser;
    try {
        user = await userService.getUserByToken(request.authToken, false);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }

    let trigger: ITrigger = request.trigger;

    let device = await deviceService.getDevicebyId(trigger.sourceDeviceId);

    

    switch (trigger.responseType) {
        case ETriggerResponseType.Email:

            break;

        case ETriggerResponseType.MobileNotification:

            break;

        case ETriggerResponseType.SettingValue_fieldInGroup:

            break;

        case ETriggerResponseType.SettingValue_fieldInComplexGroup:

            break;
    }

    //if the response is the valueSettings then check does the user have right to it.

});

module.exports = router;