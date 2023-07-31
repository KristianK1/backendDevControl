import { IAddTriggerReq } from "../../../models/API/triggersReqRes";
import { IDeviceFieldBasic, IUser } from "models/basicModels";
import { ETriggerResponseType, ETriggerSourceType, ITrigger, ITriggerEmailResponse, ITriggerMobileNotificationResponse, ITriggerSettingValueResponse_fieldInGroup, ITriggerSettingsValueResponse_fieldInComplexGroup, ITriggerSourceAdress_fieldInComplexGroup, ITriggerSourceAdress_fieldInGroup } from "models/triggerModels";
import { ERightType } from "models/userRightsModels";
import { deviceServiceSingletonFactory, triggerServiceSingletonFactory, userPermissionServiceSingletonFactory, userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";
import { DeviceService } from "../../../services/deviceService";
import { UserPermissionService } from "services/userPermissionService";
import { getComplexGroup, getComplexGroupState, getDeviceField, getDeviceFieldGroup, getFieldInComplexGroup } from "firestoreDB/deviceStructureFunctions";
import { TriggerService } from "../../../services/triggerService";

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

    let triggerData: ITrigger = request.trigger;
    let deviceData = await deviceService.getDevicebyId(triggerData.sourceDeviceId);

    let field: IDeviceFieldBasic;

    switch (triggerData.sourceType) {
        case ETriggerSourceType.FieldInGroup:
            let sourceAdress_group = triggerData.sourceAdress as ITriggerSourceAdress_fieldInGroup;
            let group = getDeviceFieldGroup(deviceData, sourceAdress_group.groupId);
            field = getDeviceField(group, sourceAdress_group.fieldId);

            let rightToField = await userPermissionService.checkUserRightToField(user, triggerData.sourceDeviceId, sourceAdress_group.groupId, sourceAdress_group.fieldId);
            if (rightToField === ERightType.None) {
                // throw ({ message: 'User doesn\'t have rights' });
                res.status(400);
                res.send('User doesn\'t have rights');
                return;
            }
            break;
        case ETriggerSourceType.FieldInComplexGroup:
            let sourceAdress_complexGroup = triggerData.sourceAdress as ITriggerSourceAdress_fieldInComplexGroup;
            let complexGroup = getComplexGroup(deviceData, sourceAdress_complexGroup.complexGroupId);
            let state = getComplexGroupState(complexGroup, sourceAdress_complexGroup.stateId);
            field = getFieldInComplexGroup(state, sourceAdress_complexGroup.fieldId);

            let rightToField_CG = await userPermissionService.checkUserRightToComplexGroup(user, triggerData.sourceDeviceId, sourceAdress_complexGroup.complexGroupId);
            if (rightToField_CG === ERightType.None) {
                // throw ({ message: 'User doesn\'t have rights' })
                res.status(400);
                res.send('User doesn\'t have rights');
                return;
            }
            break;
        default:
            // throw ({ message: 'Wrong data' });
            res.status(400);
            res.send('Wrong data');
            return;
    }

    try {
        await triggerService.checkTriggerSourceValueValidity(triggerData, field);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }


    switch (triggerData.responseType) {
        case ETriggerResponseType.Email:
            let emailSettings = triggerData.responseSettings as ITriggerEmailResponse;
        if(user.email === ''){
                res.status(400);
                res.send('User doesn\'t have an email adress');
                return;
            }
            //save trigger
            break;

        case ETriggerResponseType.MobileNotification:
            let mobNotSettings = triggerData.responseSettings as ITriggerMobileNotificationResponse;
            //save trigger
            break;

        case ETriggerResponseType.SettingValue_fieldInGroup:
            let fieldInGroupResponseSettings = triggerData.responseSettings as ITriggerSettingValueResponse_fieldInGroup;
            
            //check user (write) right to field
            //save trigger
            break;

        case ETriggerResponseType.SettingValue_fieldInComplexGroup:
            let fieldInComplexGroupResponseSettings = triggerData.responseSettings as ITriggerSettingsValueResponse_fieldInComplexGroup;

            //check user (write) right to field
            //save trigger
            break;
    }

    res.sendStatus(200);

});

module.exports = router;