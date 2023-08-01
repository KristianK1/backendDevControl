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

    let triggerData: ITrigger = request.trigger;

    let deviceData: IDevice;
    let field: IDeviceFieldBasic;

    switch (triggerData.sourceType) {
        case ETriggerSourceType.FieldInGroup:
            let sourceAdress_field_group = triggerData.sourceData as ITriggerSourceAdress_fieldInGroup;

            deviceData = await deviceService.getDevicebyId(sourceAdress_field_group.deviceId);
            let group = getDeviceFieldGroup(deviceData, sourceAdress_field_group.groupId);
            field = getDeviceField(group, sourceAdress_field_group.fieldId);

            let rightToField = await userPermissionService.checkUserRightToField(user, sourceAdress_field_group.deviceId, sourceAdress_field_group.groupId, sourceAdress_field_group.fieldId);

            if (rightToField === ERightType.None) {
                // throw ({ message: 'User doesn\'t have rights' });
                res.status(400);
                res.send('User doesn\'t have rights');
                return;
            }

            try {
                await triggerService.checkTriggerSourceValueValidity(triggerData, field);
            } catch (e) {
                res.status(400);
                res.send(e.message)
                return;
            }
            break;
        case ETriggerSourceType.FieldInComplexGroup:
            let sourceAdress_field_complexGroup = triggerData.sourceData as ITriggerSourceAdress_fieldInComplexGroup;

            deviceData = await deviceService.getDevicebyId(sourceAdress_field_complexGroup.deviceId);
            let complexGroup = getComplexGroup(deviceData, sourceAdress_field_complexGroup.complexGroupId);
            let state = getComplexGroupState(complexGroup, sourceAdress_field_complexGroup.stateId);
            field = getFieldInComplexGroup(state, sourceAdress_field_complexGroup.fieldId);

            let rightToField_CG = await userPermissionService.checkUserRightToComplexGroup(user, sourceAdress_field_complexGroup.deviceId, sourceAdress_field_complexGroup.complexGroupId);

            if (rightToField_CG === ERightType.None) {
                // throw ({ message: 'User doesn\'t have rights' })
                res.status(400);
                res.send('User doesn\'t have rights');
                return;
            }

            try {
                await triggerService.checkTriggerSourceValueValidity(triggerData, field);
            } catch (e) {
                res.status(400);
                res.send(e.message)
                return;
            }

            break;
        case ETriggerSourceType.TimeTrigger:

            break;
        default:
            res.status(400);
            res.send('Wrong data');
            return;
    }

    switch (triggerData.responseType) {
        case ETriggerResponseType.Email:
            let emailSettings = triggerData.responseSettings as ITriggerEmailResponse;
            if (user.email === '') {
                res.status(400);
                res.send('User doesn\'t have an email adress');
                return;
            }
            break;

        case ETriggerResponseType.MobileNotification:
            let mobNotSettings = triggerData.responseSettings as ITriggerMobileNotificationResponse;
            break;

        case ETriggerResponseType.SettingValue_fieldInGroup:
            let fieldInGroupResponseSettings = triggerData.responseSettings as ITriggerSettingValueResponse_fieldInGroup;
            let fieldPermission = await userPermissionService.checkUserRightToField(user, fieldInGroupResponseSettings.deviceId, fieldInGroupResponseSettings.groupId, fieldInGroupResponseSettings.fieldId);

            if (fieldPermission !== ERightType.Write) {
                res.status(400);
                res.send('User doesn\'t have write permission on target');
                return;
            }
            break;

        case ETriggerResponseType.SettingValue_fieldInComplexGroup:
            let fieldInComplexGroupResponseSettings = triggerData.responseSettings as ITriggerSettingsValueResponse_fieldInComplexGroup;
            let complexGroupPermission = await userPermissionService.checkUserRightToComplexGroup(user, fieldInComplexGroupResponseSettings.deviceId, fieldInComplexGroupResponseSettings.complexGroupId);

            if (complexGroupPermission !== ERightType.Write) {
                res.status(400);
                res.send('User doesn\'t have write permission on target');
                return;
            }
            break;
    }
    try{
        await triggerService.saveTrigger(triggerData);
    }catch(e){
        res.status(400);
        res.send('Not saved');
        return;
    }

    res.sendStatus(200);

});

module.exports = router;