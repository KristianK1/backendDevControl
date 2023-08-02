import { IAddTriggerReq } from "../../../models/API/triggersReqRes";
import { IDevice, IDeviceFieldBasic, IUser } from "models/basicModels";
import { ETriggerResponseType, ETriggerSourceType, ITrigger, ITriggerEmailResponse, ITriggerMobileNotificationResponse, ITriggerSettingValueResponse_fieldInGroup, ITriggerSettingsValueResponse_fieldInComplexGroup, ITriggerSourceAdress_fieldInComplexGroup, ITriggerSourceAdress_fieldInGroup } from "../../../models/triggerModels";
import { ERightType } from "../../../models/userRightsModels";
import { deviceServiceSingletonFactory, triggerServiceSingletonFactory, userPermissionServiceSingletonFactory, userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";
import { DeviceService } from "../../../services/deviceService";
import { UserPermissionService } from "services/userPermissionService";
import { getComplexGroup, getComplexGroupState, getDeviceField, getDeviceFieldGroup, getFieldInComplexGroup } from "../../../firestoreDB/deviceStructureFunctions";
import { TriggerService } from "../../../services/triggerService";
import { log } from "console";

var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();
var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();
var userPermissionService: UserPermissionService = userPermissionServiceSingletonFactory.getInstance();
var triggerService: TriggerService = triggerServiceSingletonFactory.getInstance();

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

    let triggerData = request.trigger;

    try{
        await triggerService.checkValidityOfTrigger(triggerData);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    try {
        await triggerService.saveTrigger(triggerData);
    } catch (e) {
        res.status(400);
        res.send('Not saved');
        return;
    }

    res.sendStatus(200);

});

module.exports = router;