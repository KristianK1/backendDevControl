import { Db } from "../firestoreDB/db";
import { DBSingletonFactory } from "../firestoreDB/singletonService";
import { EMCTriggerType, ENumericTriggerType, ERGBTriggerType_numeric, ETextTriggerType, ETriggerResponseType, ETriggerSourceType, ETriggerTimeType, IBooleanTrigger, IMCTrigger, INumericTrigger, IRGBTrigger, ITextTrigger, ITrigger, ITriggerEmailResponse, ITriggerMobileNotificationResponse, ITriggerSettingValueResponse_fieldInGroup, ITriggerSettingsValueResponse_fieldInComplexGroup, ITriggerSourceAdress_fieldInComplexGroup, ITriggerSourceAdress_fieldInGroup, ITriggerTimeSourceData } from "../models/triggerModels";
import { IDevice, IDeviceFieldBasic, IDeviceFieldButton, IDeviceFieldMultipleChoice, IDeviceFieldNumeric, IDeviceFieldRGB, IDeviceFieldText } from "../models/basicModels";
import { bridge_checkUserRightToComplexGroup, bridge_checkUserRightToField, bridge_getDevicebyId, bridge_getUserbyId, bridge_tryToChangeDeviceFieldValue, bridge_tryToChangeFieldValueInComplexGroup } from "./serviceBridge";
import { getComplexGroup, getComplexGroupState, getDeviceField, getDeviceFieldGroup, getFieldInComplexGroup } from "../firestoreDB/deviceStructureFunctions";
import { ERightType } from "../models/userRightsModels";

export class TriggerService {
    private db: Db;

    constructor() {
        this.db = DBSingletonFactory.getInstance();
    }

    async saveTrigger(triggerData: ITrigger) {
        await this.db.saveTrigger(triggerData);
    }

    async getAllTriggersForUser(userId: number) {
        let triggers: ITrigger[] = await this.db.getAllTriggers();
        let myTriggers: ITrigger[] = [];
        for (let trigger of triggers) {
            if (trigger.userId === userId) {
                myTriggers.push(trigger);
            }
        }
        return myTriggers;
    }

    async getTriggerbyId(triggerId: number) {
        return await this.db.getTriggerbyId(triggerId);
    }

    async deleteTrigger(triggerData: ITrigger) {
        return await this.db.deleteTrigger(triggerData);
    }

    async checkValidityOfTrigger(triggerData: ITrigger): Promise<void> {
        let user = await bridge_getUserbyId(triggerData.userId);
        let sourceDeviceData: IDevice;
        let field: IDeviceFieldBasic;

        switch (triggerData.sourceType) {
            case ETriggerSourceType.FieldInGroup:
                let sourceAdress_field_group = triggerData.sourceData as ITriggerSourceAdress_fieldInGroup;

                sourceDeviceData = await bridge_getDevicebyId(sourceAdress_field_group.deviceId);
                let group = getDeviceFieldGroup(sourceDeviceData, sourceAdress_field_group.groupId);
                field = getDeviceField(group, sourceAdress_field_group.fieldId);

                let rightToField = await bridge_checkUserRightToField(user, sourceAdress_field_group.deviceId, sourceAdress_field_group.groupId, sourceAdress_field_group.fieldId);

                if (rightToField === ERightType.None) {
                    // throw ({ message: 'User doesn\'t have rights' });
                    throw ({ message: 'User doesn\'t have rights' });
                }

                await this.checkTriggerSourceValueValidity(triggerData, field);
                break;
            case ETriggerSourceType.FieldInComplexGroup:
                let sourceAdress_field_complexGroup = triggerData.sourceData as ITriggerSourceAdress_fieldInComplexGroup;

                sourceDeviceData = await bridge_getDevicebyId(sourceAdress_field_complexGroup.deviceId);
                let complexGroup = getComplexGroup(sourceDeviceData, sourceAdress_field_complexGroup.complexGroupId);
                let state = getComplexGroupState(complexGroup, sourceAdress_field_complexGroup.stateId);
                field = getFieldInComplexGroup(state, sourceAdress_field_complexGroup.fieldId);

                let rightToField_CG = await bridge_checkUserRightToComplexGroup(user, sourceAdress_field_complexGroup.deviceId, sourceAdress_field_complexGroup.complexGroupId);

                if (rightToField_CG === ERightType.None) {
                    throw ({ message: 'User doesn\'t have rights' });
                }

                await this.checkTriggerSourceValueValidity(triggerData, field);
                break;
            case ETriggerSourceType.TimeTrigger:

                break;
            default:
                throw ({ message: 'Wrong data' });
        }

        let responseDeviceData: IDevice;
        switch (triggerData.responseType) {
            case ETriggerResponseType.Email:
                let emailSettings = triggerData.responseSettings as ITriggerEmailResponse;
                if (user.email === '') {
                    throw ({ message: 'User doesn\'t have an email adress' })
                }
                break;

            case ETriggerResponseType.MobileNotification:
                let mobNotSettings = triggerData.responseSettings as ITriggerMobileNotificationResponse;
                break;

            case ETriggerResponseType.SettingValue_fieldInGroup:
                let adressG = triggerData.responseSettings as ITriggerSettingValueResponse_fieldInGroup;
                let fieldPermission = await bridge_checkUserRightToField(user, adressG.deviceId, adressG.groupId, adressG.fieldId);

                if (fieldPermission !== ERightType.Write) {
                    throw ({ message: 'User doesn\'t have write permission on target' });
                }

                responseDeviceData = await bridge_getDevicebyId(adressG.deviceId);
                let group = getDeviceFieldGroup(responseDeviceData, adressG.groupId);
                let fieldInGroup = getDeviceField(group, adressG.fieldId);
                await bridge_tryToChangeDeviceFieldValue(adressG.deviceId, adressG.groupId, fieldInGroup, adressG.value, true);
                break;

            case ETriggerResponseType.SettingValue_fieldInComplexGroup:
                let adressCG = triggerData.responseSettings as ITriggerSettingsValueResponse_fieldInComplexGroup;
                let complexGroupPermission = await bridge_checkUserRightToComplexGroup(user, adressCG.deviceId, adressCG.complexGroupId);

                if (complexGroupPermission !== ERightType.Write) {
                    throw ({ message: 'User doesn\'t have write permission on target' });
                }

                responseDeviceData = await bridge_getDevicebyId(adressCG.deviceId);
                let complexGroup = getComplexGroup(responseDeviceData, adressCG.complexGroupId);
                let complexGroupState = getComplexGroupState(complexGroup, adressCG.complexGroupState);
                let fieldInComplexGroup = getFieldInComplexGroup(complexGroupState, adressCG.fieldId);
                await bridge_tryToChangeFieldValueInComplexGroup(adressCG.deviceId, adressCG.complexGroupId, adressCG.complexGroupState, fieldInComplexGroup, adressCG.value, true)
                break;
        }
    }

    async checkValidityOfTriggers() {
        let triggers = await this.db.getAllTriggers();
        for (let trigger of triggers) {
            try {
                await this.checkValidityOfTrigger(trigger);
            } catch (e) {

            }
        }
    }

    private async checkTriggerTargerValidity(triggerData: ITrigger) {
        let device: IDevice;
        switch (triggerData.responseType) {
            case ETriggerResponseType.Email:
                let emailSettings = triggerData.responseSettings as ITriggerEmailResponse;

                break;
            case ETriggerResponseType.MobileNotification:
                let mobNotSettings = triggerData.responseSettings as ITriggerMobileNotificationResponse;

                break;
            case ETriggerResponseType.SettingValue_fieldInGroup:
                let Gsettings = triggerData.responseSettings as ITriggerSettingValueResponse_fieldInGroup;
                device = await bridge_getDevicebyId(Gsettings.deviceId);
                let group = getDeviceFieldGroup(device, Gsettings.groupId);
                let fieldInGroup = getDeviceField(group, Gsettings.fieldId);

                await bridge_tryToChangeDeviceFieldValue(Gsettings.deviceId, Gsettings.groupId, fieldInGroup, Gsettings.value);
                break;
            case ETriggerResponseType.SettingValue_fieldInComplexGroup:
                let CGsettings = triggerData.responseSettings as ITriggerSettingsValueResponse_fieldInComplexGroup;
                device = await bridge_getDevicebyId(CGsettings.deviceId);
                let complexGroup = getComplexGroup(device, CGsettings.complexGroupId);
                let complexGroupState = getComplexGroupState(complexGroup, CGsettings.complexGroupState);
                let fieldInComplexGroup = getFieldInComplexGroup(complexGroupState, CGsettings.fieldId);
                await bridge_tryToChangeFieldValueInComplexGroup(CGsettings.deviceId, CGsettings.complexGroupId, CGsettings.complexGroupState, fieldInComplexGroup, CGsettings.value, true);
                break;

        }
    }

    private async checkTriggerSourceValueValidity(triggerData: ITrigger, field: IDeviceFieldBasic) {

        switch (field.fieldType) {
            case "numeric":
                if (triggerData.fieldType != 'numeric') throw ({ message: 'wrong field type' });

                let numericSettings = triggerData.settings as INumericTrigger;
                let numericField = field.fieldValue as IDeviceFieldNumeric;

                if (!this.checkNumericTriggerSettings(numericField, numericSettings)) {
                    throw ({ message: 'Incorrect numeric settings' });
                }
                break;

            case "text":
                if (triggerData.fieldType != 'text') throw ({ message: 'wrong field type' });

                let textSettings = triggerData.settings as ITextTrigger;
                let textField = field.fieldValue as IDeviceFieldText;

                if (!this.checkTextTriggerSettings(textField, textSettings)) {
                    throw ({ message: 'Incorrect text settings' });
                }

                break;
            case "button":
                if (triggerData.fieldType != 'button') throw ({ message: 'wrong field type' });

                let buttonSettings = triggerData.settings as IBooleanTrigger;
                let buttonField = field.fieldValue as IDeviceFieldButton;

                if (!this.checkButtonTriggerSettings(buttonField, buttonSettings)) {
                    throw ({ message: 'Incorrect button settings' });
                }
                break;
            case "multipleChoice":
                if (triggerData.fieldType != 'multipleChoice') throw ({ message: 'wrong field type' });

                let MCSettings = triggerData.settings as IMCTrigger;
                let MCField = field.fieldValue as IDeviceFieldMultipleChoice;

                if (!this.checkMCTriggerSettings(MCField, MCSettings)) {
                    throw ({ message: 'Incorrect Multiple choice settings' });
                }
                break;
            case "RGB":
                if (triggerData.fieldType != 'RGB') throw ({ message: 'wrong field type' });

                let RGBSettings = triggerData.settings as IRGBTrigger;
                let RGBField = field.fieldValue as IDeviceFieldRGB;

                if (!this.checkRGBTriggerSettings(RGBField, RGBSettings)) {
                    throw ({ message: 'Incorrect RGB settings' });
                }

                break;
        }
    }

    private checkNumericTriggerSettings(field: IDeviceFieldNumeric, settings: INumericTrigger): boolean {
        switch (settings.type) {
            case ENumericTriggerType.Bigger:
                return (settings.value < field.maxValue && settings.value > field.minValue)
            case ENumericTriggerType.Smaller:
                return (settings.value < field.minValue && settings.value < field.maxValue)
            case ENumericTriggerType.Equal:
                return (settings.value < field.minValue && settings.value < field.maxValue)
            case ENumericTriggerType.Inbetween:
                if (!settings.second_value) return false;
                for (let i = field.minValue; i <= field.maxValue; i += field.valueStep) {
                    if (i >= settings.value && i <= settings.second_value) return true;
                }
                return false;
            case ENumericTriggerType.NotInBetween:
                if (!settings.second_value) return false;
                return ((settings.value < settings.second_value) &&
                    (settings.value > field.minValue || settings.second_value < field.maxValue));
        }
        return false;
    }

    private checkTextTriggerSettings(field: IDeviceFieldText, settings: ITextTrigger) {
        switch (settings.type) {
            case ETextTriggerType.StartsWith:
                return true;
            case ETextTriggerType.EndsWith:
                return true;
            case ETextTriggerType.Contains:
                return true;
            case ETextTriggerType.IsEqualTo:
                return true;
            case ETextTriggerType.IsNotEqualTo:
                return true;
        }
        return false;
    }

    private checkMCTriggerSettings(field: IDeviceFieldMultipleChoice, settings: IMCTrigger) {
        switch (settings.type) {
            case EMCTriggerType.IsEqualTo:
                return (settings.value >= 0 && settings.value < field.values.length);
            case EMCTriggerType.IsNotEqualTo:
                return (settings.value >= 0 && settings.value < field.values.length);

        }
    }

    private checkButtonTriggerSettings(field: IDeviceFieldButton, settings: IBooleanTrigger) {
        return true;
    }

    private checkRGBTriggerSettings(field: IDeviceFieldRGB, settings: IRGBTrigger) {
        switch (settings.type) {
            case ERGBTriggerType_numeric.Bigger:
                return (settings.value < 255)

            case ERGBTriggerType_numeric.Smaller:
                return (settings.value > 0)

            case ERGBTriggerType_numeric.Equal:
                return (settings.value > 0 && settings.value < 255);
            case ERGBTriggerType_numeric.Inbetween:
                if (!settings.second_value) return false;
                for (let i = 0; i <= 255; i++) {
                    if (i >= settings.value && i <= settings.second_value) return true;
                }
                return false;
            case ERGBTriggerType_numeric.NotInBetween:
                if (!settings.second_value) return false;
                return ((settings.value < settings.second_value) &&
                    (settings.value > 0 || settings.second_value < 256));
        }
        return false;
    }
}