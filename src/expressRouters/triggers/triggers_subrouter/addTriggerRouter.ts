import { emailServiceSingletonFactory } from "emailService/emailService";
import { DeviceDB } from "firestoreDB/devices/deviceDB";
import { deviceDBSingletonFactory, usersDBSingletonFactory } from "firestoreDB/singletonService";
import { UsersDB } from "firestoreDB/users/userDB";
import { IAddTriggerReq } from "models/API/triggersReqRes";
import { IDeviceFieldBasic, IUser } from "models/basicModels";
import { ETriggerResponseType, ETriggerSourceType, ITrigger, ITriggerSourceAdress_fieldInComplexGroup, ITriggerSourceAdress_fieldInGroup } from "models/triggerModels";
import { ERightType } from "models/userRightsModels";

var express = require('express');
var router = express.Router();

var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
var userDb: UsersDB = usersDBSingletonFactory.getInstance();
var emailService = emailServiceSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    let request: IAddTriggerReq = req.body;

    let user: IUser;
    try {
        user = await userDb.getUserByToken(request.authToken, false);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }

    let trigger: ITrigger = request.trigger;

    let device = await deviceDb.getDevicebyId(trigger.sourceDeviceId);

    switch (trigger.sourceType) {
        case ETriggerSourceType.FieldInGroup:
            let sourceAdress_group = trigger.sourceAdress as ITriggerSourceAdress_fieldInGroup;
            let group = deviceDb.getDeviceFieldGroup(device, sourceAdress_group.groupId);
            let field_in_group = deviceDb.getDeviceField(group, sourceAdress_group.fieldId);

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

            let rightToField = await userDb.checkUserRightToField(user, trigger.sourceDeviceId, sourceAdress_group.groupId, sourceAdress_group.fieldId);
            if (rightToField === ERightType.None) {
                throw ({ message: 'User doesn\'t have rights' })
            }
            break;
        case ETriggerSourceType.FieldInComplexGroup:
            let sourceAdress_complexGroup = trigger.sourceAdress as ITriggerSourceAdress_fieldInComplexGroup;
            let complexGroup = deviceDb.getComplexGroup(device, sourceAdress_complexGroup.complexGroupId);
            let state = deviceDb.getComplexGroupState(complexGroup, sourceAdress_complexGroup.stateId);
            let field_in_complex_group = deviceDb.getFieldInComplexGroup(state, sourceAdress_complexGroup.fieldId);

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

            let rightToField_CG = await userDb.checkUserRightToComplexGroup(user, trigger.sourceDeviceId, sourceAdress_complexGroup.complexGroupId);
            if (rightToField_CG === ERightType.None) {
                throw ({ message: 'User doesn\'t have rights' })
            }

            break;
        default:
            throw ({ message: 'Wront data' });
    }

    switch(trigger.responseType) {
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