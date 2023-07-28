import { emailServiceSingletonFactory } from "emailService/emailService";
import { IAddTriggerReq } from "models/API/triggersReqRes";
import { IUser } from "models/basicModels";
import { ETriggerResponseType, ETriggerSourceType, ITrigger, ITriggerSourceAdress_fieldInComplexGroup, ITriggerSourceAdress_fieldInGroup } from "models/triggerModels";
import { ERightType } from "models/userRightsModels";
import { DBSingletonFactory } from "../../../firestoreDB/singletonService";
import { Db } from "firestoreDB/db";
import { deviceServiceSingletonFactory, userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";
import { DeviceService } from "../../../services/deviceService";

var express = require('express');
var router = express.Router();

var db: Db = DBSingletonFactory.getInstance();
var userService: UserService = userServiceSingletonFactory.getInstance();
var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();
var emailService = emailServiceSingletonFactory.getInstance();

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

    switch (trigger.sourceType) {
        case ETriggerSourceType.FieldInGroup:
            let sourceAdress_group = trigger.sourceAdress as ITriggerSourceAdress_fieldInGroup;
            let group = await deviceService.getGroup(device.id, sourceAdress_group.groupId, device);
            let field_in_group = await deviceService.getField(device.id, group.id, sourceAdress_group.fieldId);

            switch (field_in_group.fieldType) {
                case "numeric":
                    if (trigger.fieldType != 'numeric') throw ({ message: 'wrong field type' })
                    break;
                case "text":
                    if (trigger.fieldType != 'text') throw ({ message: 'wrong field type' })
                    break;
                case "button":
                    if (trigger.fieldType != 'button') throw ({ message: 'wrong field type' })
                    break;
                case "multipleChoice":
                    if (trigger.fieldType != 'multipleChoice') throw ({ message: 'wrong field type' })
                    break;
                case "RGB":
                    if (trigger.fieldType != 'RGB') throw ({ message: 'wrong field type' })
                    break;
            }

            let rightToField = await db.checkUserRightToField(user, trigger.sourceDeviceId, sourceAdress_group.groupId, sourceAdress_group.fieldId);
            if (rightToField === ERightType.None) {
                throw ({ message: 'User doesn\'t have rights' })
            }
            break;
        case ETriggerSourceType.FieldInComplexGroup:
            let sourceAdress_complexGroup = trigger.sourceAdress as ITriggerSourceAdress_fieldInComplexGroup;
            let complexGroup = await deviceService.getComplexGroup(device.id, sourceAdress_complexGroup.complexGroupId, device);
            let state = await deviceService.getComplexGroupState(device.id, complexGroup.id, sourceAdress_complexGroup.stateId, device);
            let field_in_complex_group = await deviceService.getFieldInComplexGroup(device.id, complexGroup.id, state.id, sourceAdress_complexGroup.fieldId, device);

            switch (field_in_complex_group.fieldType) {
                case "numeric":
                    if (trigger.fieldType != 'numeric') throw ({ message: 'wrong field type' })
                    break;
                case "text":
                    if (trigger.fieldType != 'text') throw ({ message: 'wrong field type' })
                    break;
                case "button":
                    if (trigger.fieldType != 'button') throw ({ message: 'wrong field type' })
                    break;
                case "multipleChoice":
                    if (trigger.fieldType != 'multipleChoice') throw ({ message: 'wrong field type' })
                    break;
                case "RGB":
                    if (trigger.fieldType != 'RGB') throw ({ message: 'wrong field type' })
                    break;
            }

            let rightToField_CG = await db.checkUserRightToComplexGroup(user, trigger.sourceDeviceId, sourceAdress_complexGroup.complexGroupId);
            if (rightToField_CG === ERightType.None) {
                throw ({ message: 'User doesn\'t have rights' })
            }

            break;
        default:
            throw ({ message: 'Wront data' });
    }

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