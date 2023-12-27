import { Db } from "../firestoreDB/db";
import { DBSingletonFactory } from "../firestoreDB/singletonService";
import { EMCTriggerType, ENumericTriggerType, ERGBTriggerType_context, ERGBTriggerType_numeric, ETextTriggerType, ETrigRespType, ETrigSourceType, ETriggerTimeType, IBoolTrig, IMCTrig, INumTrig, IRGBTrig, ITextTrig, ITrigger, ITrigRespEmail, ITrigRespMobNot, ITrigRespFG, ITrigRespFCG, ITrigSourceFCG, ITrigSourceFG, ITrigSourceTime } from "../models/triggerModels";
import { IDevice, IDeviceFieldBasic, IDeviceFieldButton, IDeviceFieldMultipleChoice, IDeviceFieldNumeric, IDeviceFieldRGB, IDeviceFieldText, IRGB } from "../models/basicModels";
import { bridge_checkUserRightToComplexGroup, bridge_checkUserRightToField, bridge_getDevicebyId, bridge_getDevicebyKey, bridge_getUserbyId, bridge_getUsersFirebaseTokens, bridge_tryToChangeDeviceFieldValue, bridge_tryToChangeFieldValueInComplexGroup } from "./serviceBridge";
import { getComplexGroup, getComplexGroupState, getDeviceField, getDeviceFieldGroup, getFieldInComplexGroup } from "../firestoreDB/deviceStructureFunctions";
import { ERightType } from "../models/userRightsModels";
import { EmailService, emailServiceSingletonFactory } from "../emailService/emailService";
import { ISOToUNIX, UNIXToISO, getCurrentTimeISO, getCurrentTimeUNIX } from "../generalStuff/timeHandlers";
import { MyWebSocketServer } from "WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../WSRouters/WSRouterSingletonFactory";
import { firebaseNotificationsSingletonFactory } from "../firebaseNotifications/firebaseNotifications_singletonService";


export class TriggerService {
    private db: Db;
    private emailService: EmailService;
    private wsServer: MyWebSocketServer;

    static TimeTrigger_checkInterval = 5; //static af (minutes)

    static TimeTrigger_newInterval_check = 30; //seconds
    private lastCheckedInterval: number;

    constructor() {
        this.db = DBSingletonFactory.getInstance();
        this.emailService = emailServiceSingletonFactory.getInstance();
        this.wsServer = wsServerSingletonFactory.getInstance();

        setInterval(() => {
            this.checkForNewTriggerTimeInterval();
        }, 1000 * TriggerService.TimeTrigger_newInterval_check);
    }

    async saveTrigger(triggerData: ITrigger) {
        await this.db.saveTrigger(triggerData);
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
            case ETrigSourceType.FieldInGroup:
                let sourceAdress_field_group = triggerData.sourceData as ITrigSourceFG;

                sourceDeviceData = await bridge_getDevicebyId(sourceAdress_field_group.deviceId);
                let group = getDeviceFieldGroup(sourceDeviceData, sourceAdress_field_group.groupId);
                field = getDeviceField(group, sourceAdress_field_group.fieldId);

                let rightToField = await bridge_checkUserRightToField(user, sourceAdress_field_group.deviceId, sourceAdress_field_group.groupId, sourceAdress_field_group.fieldId);
                console.log(rightToField);
                if (rightToField === ERightType.None) {
                    throw ({ message: 'User doesn\'t have rights' });
                }

                await this.checkTriggerSourceValueValidity(triggerData, field);
                console.log('yy1');

                break;
            case ETrigSourceType.FieldInComplexGroup:
                let sourceAdress_field_complexGroup = triggerData.sourceData as ITrigSourceFCG;

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
            case ETrigSourceType.TimeTrigger:

                break;
            default:
                throw ({ message: 'Wrong data' });
        }

        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        let responseDeviceData: IDevice;
        switch (triggerData.responseType) {
            case ETrigRespType.Email:
                let emailSettings = triggerData.responseSettings as ITrigRespEmail;
                if (user.email === '') {
                    throw ({ message: 'User doesn\'t have an email adress' })
                }
                break;

            case ETrigRespType.MobileNotification:
                let mobNotSettings = triggerData.responseSettings as ITrigRespMobNot;
                break;

            case ETrigRespType.SettingValue_fieldInGroup:
                let adressG = triggerData.responseSettings as ITrigRespFG;
                let fieldPermission = await bridge_checkUserRightToField(user, adressG.deviceId, adressG.groupId, adressG.fieldId);

                if (fieldPermission !== ERightType.Write) {
                    throw ({ message: 'User doesn\'t have write permission on target' });
                }

                responseDeviceData = await bridge_getDevicebyId(adressG.deviceId);
                let group = getDeviceFieldGroup(responseDeviceData, adressG.groupId);
                let fieldInGroup = getDeviceField(group, adressG.fieldId);
                await bridge_tryToChangeDeviceFieldValue(adressG.deviceId, adressG.groupId, fieldInGroup, adressG.value, true);
                break;

            case ETrigRespType.SettingValue_fieldInComplexGroup:
                let adressCG = triggerData.responseSettings as ITrigRespFCG;
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
    async checkValidityOfTriggersForUser(userId: number) {
        let triggers: ITrigger[] = await this.getAllTriggersForUser(userId);
        for (let trigger of triggers) {
            try {
                await this.checkValidityOfTrigger(trigger);
            } catch (e) {
                await this.deleteTrigger(trigger);
            }
        }
    }


    async checkValidityOfTriggers() {
        let triggers = await this.db.getAllTriggers();
        for (let trigger of triggers) {
            try {
                await this.checkValidityOfTrigger(trigger);
            } catch (e) {
                await this.deleteTrigger(trigger);
            }
        }
    }

    //call this
    async checkTriggersForFieldInGroup(deviceId: number, groupId: number, fieldId: number, oldValue: any) {
        let triggers = await this.findTriggersForFieldInGroup(deviceId, groupId, fieldId);
        let device = await bridge_getDevicebyId(deviceId);
        let group = getDeviceFieldGroup(device, groupId);
        let field = getDeviceField(group, fieldId);

        await this.checkTrigger(triggers, field, oldValue);
    }

    //call this
    async checkTriggersForFieldInComplexGroup(deviceId: number, complexGroupId: number, stateId: number, fieldId: number, oldValue: any) {
        let triggers = await this.findTriggersForFieldInComplexGroup(deviceId, complexGroupId, stateId, fieldId);
        let device = await bridge_getDevicebyId(deviceId);
        let complexGroup = getComplexGroup(device, complexGroupId);
        let complexState = getComplexGroupState(complexGroup, stateId);
        let field = getFieldInComplexGroup(complexState, fieldId);

        await this.checkTrigger(triggers, field, oldValue);
    }

    private async checkTrigger(triggers: ITrigger[], field: IDeviceFieldBasic, oldValue: any) {
        for (let trigger of triggers) {
            switch (trigger.fieldType) {
                case 'numeric':
                    let numField = field.fieldValue as IDeviceFieldNumeric;
                    let numTrigger = trigger.settings as INumTrig;
                    if (this.checkTrigger_numeric(numField, numTrigger, oldValue)) {
                        await this.kickOffTrigger(trigger);
                    }
                    break;
                case 'text':
                    let textField = field.fieldValue as IDeviceFieldText;
                    let textTrigger = trigger.settings as ITextTrig;
                    if (this.checkTrigger_text(textField, textTrigger, oldValue)) {
                        await this.kickOffTrigger(trigger);
                    }
                    break;
                case 'button':
                    let buttonField = field.fieldValue as IDeviceFieldButton;
                    let buttonTrigger = trigger.settings as IBoolTrig;
                    if (this.checkTrigger_button(buttonField, buttonTrigger, oldValue)) {
                        await this.kickOffTrigger(trigger);
                    }
                    break;
                case 'multipleChoice':
                    let mcField = field.fieldValue as IDeviceFieldMultipleChoice;
                    let mcTrigger = trigger.settings as IMCTrig;
                    if (this.checkTrigger_MC(mcField, mcTrigger, oldValue)) {
                        await this.kickOffTrigger(trigger);
                    }
                    break;
                case 'RGB':
                    let rgbField = field.fieldValue as IDeviceFieldRGB;
                    let rgbTrigger = trigger.settings as IRGBTrig;
                    if (this.checkTrigger_RGB(rgbField, rgbTrigger, oldValue)) {
                        await this.kickOffTrigger(trigger);
                    }
                    break;

            }
        }
    }

    async findTriggersForFieldInGroup(deviceId: number, groupId: number, fieldId: number) {
        let triggers = await this.db.getAllTriggersForDeviceSource();
        let foundTriggers: ITrigger[] = [];
        for (let trigger of triggers) {
            if (trigger.sourceType === ETrigSourceType.FieldInGroup) {
                let sourceSettings = trigger.sourceData as ITrigSourceFG;
                if (sourceSettings.deviceId === deviceId && sourceSettings.groupId === groupId && sourceSettings.fieldId === fieldId) {
                    foundTriggers.push(trigger);
                }
            }
        }
        return foundTriggers;
    }

    async findTriggersForFieldInComplexGroup(deviceId: number, complexGroupId: number, stateId: number, fieldId: number) {
        let triggers = await this.db.getAllTriggersForDeviceSource();
        let foundTriggers: ITrigger[] = [];
        for (let trigger of triggers) {
            if (trigger.sourceType === ETrigSourceType.FieldInComplexGroup) {
                let sourceSettings = trigger.sourceData as ITrigSourceFCG;
                if (sourceSettings.deviceId === deviceId && sourceSettings.complexGroupId === complexGroupId && sourceSettings.stateId === stateId && sourceSettings.fieldId === fieldId) {
                    foundTriggers.push(trigger);
                }
            }
        }
        return foundTriggers;
    }

    private async checkForNewTriggerTimeInterval() {
        let lastPeriod = this.getTimeTriggerTimestampFromTimeStamp();

        if (!this.lastCheckedInterval) {
            this.lastCheckedInterval = lastPeriod;
        }
        if (lastPeriod !== this.lastCheckedInterval) {
            this.lastCheckedInterval = lastPeriod;
            if (!!process.env.PORT) {
                this.kickOffTimeTriggers();
            }
            else {
                setTimeout(() => {
                    this.kickOffTimeTriggers();
                }, 1000 * TriggerService.TimeTrigger_newInterval_check * 1.5);
            }
        }
    }

    private getTimeTriggerTimestampFromTimeStamp(iso?: string): number {
        let time: number;
        if (iso === undefined || iso === null) {
            time = getCurrentTimeUNIX();
        }
        else if (iso?.length === 0) {
            return 0;
        } else {
            time = ISOToUNIX(iso);
        }
        let NofPeriods = Math.floor(time / 1000 / 60 / TriggerService.TimeTrigger_checkInterval);
        let lastPeriod = NofPeriods * 1000 * 60 * TriggerService.TimeTrigger_checkInterval;
        console.log('time transformation result: ' + UNIXToISO(lastPeriod));
        return lastPeriod
    }

    private async kickOffTimeTriggers() {
        let remainingTriggers: ITrigger[] = await this.db.getAllTimeTriggers();
        for (let i = 0; i < remainingTriggers.length; i++) {
            // console.log(remainingTriggers[i]);

            let triggg = await this.db.getTriggerbyId(remainingTriggers[i].id);

            let kickOff = this.checkTimeTrigger(triggg, this.lastCheckedInterval);
            if (kickOff) {
                let trigg: ITrigger = JSON.parse(JSON.stringify(triggg));
                await this.db.updateTriggerLastKicked(trigg.id, getCurrentTimeISO());
                try {
                    await this.kickOffTrigger(trigg);
                } catch (e) {
                    console.log('Time trigger kick off failed tId#' + trigg.id);
                    console.log(e);
                }
                remainingTriggers.splice(i, 1);
                i--;
            }
        }
    }

    checkTimeTrigger(trigger: ITrigger, currentTime: number) {
        let timeSettings = trigger.sourceData as ITrigSourceTime;
        let firstTimeStampUNIX = ISOToUNIX(timeSettings.firstTimeStamp);

        let nextDays: number;
        switch (timeSettings.type) {
            case ETriggerTimeType.Once:
                if (firstTimeStampUNIX === currentTime && (this.getTimeTriggerTimestampFromTimeStamp() !== this.getTimeTriggerTimestampFromTimeStamp(timeSettings.lastRunTimestamp))) return true;
                break;
            case ETriggerTimeType.Daily:
                nextDays = firstTimeStampUNIX;
                while (nextDays <= currentTime) {
                    if (nextDays === currentTime && (this.getTimeTriggerTimestampFromTimeStamp() !== this.getTimeTriggerTimestampFromTimeStamp(timeSettings.lastRunTimestamp))) return true;
                    nextDays = nextDays + 1000 * 3600 * 24;
                }
                break;
            case ETriggerTimeType.Weekly:
                nextDays = firstTimeStampUNIX;
                while (nextDays <= currentTime) {
                    if (nextDays === currentTime && (this.getTimeTriggerTimestampFromTimeStamp() !== this.getTimeTriggerTimestampFromTimeStamp(timeSettings.lastRunTimestamp))) return true;
                    nextDays = nextDays + 1000 * 3600 * 24 * 7;
                }
                break;
        }
        return false;
    }

    // private async checkTriggerTargerValidity(triggerData: ITrigger) {
    //     let device: IDevice;
    //     switch (triggerData.responseType) {
    //         case ETriggerResponseType.Email:
    //             let emailSettings = triggerData.responseSettings as ITriggerEmailResponse;

    //             break;
    //         case ETriggerResponseType.MobileNotification:
    //             let mobNotSettings = triggerData.responseSettings as ITriggerMobileNotificationResponse;

    //             break;
    //         case ETriggerResponseType.SettingValue_fieldInGroup:
    //             let Gsettings = triggerData.responseSettings as ITriggerSettingValueResponse_fieldInGroup;
    //             device = await bridge_getDevicebyId(Gsettings.deviceId);
    //             let group = getDeviceFieldGroup(device, Gsettings.groupId);
    //             let fieldInGroup = getDeviceField(group, Gsettings.fieldId);

    //             await bridge_tryToChangeDeviceFieldValue(Gsettings.deviceId, Gsettings.groupId, fieldInGroup, Gsettings.value);
    //             break;
    //         case ETriggerResponseType.SettingValue_fieldInComplexGroup:
    //             let CGsettings = triggerData.responseSettings as ITriggerSettingsValueResponse_fieldInComplexGroup;
    //             device = await bridge_getDevicebyId(CGsettings.deviceId);
    //             let complexGroup = getComplexGroup(device, CGsettings.complexGroupId);
    //             let complexGroupState = getComplexGroupState(complexGroup, CGsettings.complexGroupState);
    //             let fieldInComplexGroup = getFieldInComplexGroup(complexGroupState, CGsettings.fieldId);
    //             await bridge_tryToChangeFieldValueInComplexGroup(CGsettings.deviceId, CGsettings.complexGroupId, CGsettings.complexGroupState, fieldInComplexGroup, CGsettings.value, true);
    //             break;

    //     }
    // }

    async kickOffTrigger(triggerData: ITrigger) {
        switch (triggerData.responseType) {
            case ETrigRespType.Email:
                await this.emailService.sendTriggerResponseEmail(triggerData);
                break;
            case ETrigRespType.MobileNotification:
                let userFirebaseTokens = await bridge_getUsersFirebaseTokens(triggerData.userId);
                let responseSettings = triggerData.responseSettings as ITrigRespMobNot;
                await firebaseNotificationsSingletonFactory.getInstance().sendNotifications(userFirebaseTokens, responseSettings.notificationTitle, responseSettings.notificationText)
                break;
            case ETrigRespType.SettingValue_fieldInGroup:
                let Gresponse = triggerData.responseSettings as ITrigRespFG;
                let Gdevice = await bridge_getDevicebyId(Gresponse.deviceId);
                let Ggroup = getDeviceFieldGroup(Gdevice, Gresponse.groupId);
                let Gfield = getDeviceField(Ggroup, Gresponse.fieldId);
                await bridge_tryToChangeDeviceFieldValue(Gresponse.deviceId, Gresponse.groupId, Gfield, Gresponse.value);
                this.wsServer.emitFieldChanged(Gresponse.deviceId, Gresponse.groupId, Gresponse.fieldId);

                break;
            case ETrigRespType.SettingValue_fieldInComplexGroup:
                let CGresponse = triggerData.responseSettings as ITrigRespFCG
                let CGdevice = await bridge_getDevicebyId(CGresponse.deviceId);
                let CGgroup = getComplexGroup(CGdevice, CGresponse.complexGroupId);
                let CGstate = getComplexGroupState(CGgroup, CGresponse.complexGroupState);
                let CGfield = getFieldInComplexGroup(CGstate, CGresponse.fieldId);
                await bridge_tryToChangeFieldValueInComplexGroup(CGresponse.deviceId, CGresponse.complexGroupId, CGresponse.complexGroupState, CGfield, CGresponse.value);
                this.wsServer.emitComplexGroupChanged(CGresponse.deviceId, CGresponse.complexGroupId);
                break;
        }
    }



    private async checkTriggerSourceValueValidity(triggerData: ITrigger, field: IDeviceFieldBasic) {

        switch (field.fieldType) {
            case "numeric":
                if (triggerData.fieldType != 'numeric') throw ({ message: 'wrong field type' });
                console.log('zz1');
                let numericSettings = triggerData.settings as INumTrig;
                let numericField = field.fieldValue as IDeviceFieldNumeric;
                console.log('zz2');
                if (!this.checkNumericTriggerSettings(numericField, numericSettings)) {
                    throw ({ message: 'Incorrect numeric settings' });
                }
                console.log('zz3');
                break;

            case "text":
                if (triggerData.fieldType != 'text') throw ({ message: 'wrong field type' });

                let textSettings = triggerData.settings as ITextTrig;
                let textField = field.fieldValue as IDeviceFieldText;

                if (!this.checkTextTriggerSettings(textField, textSettings)) {
                    throw ({ message: 'Incorrect text settings' });
                }

                break;
            case "button":
                if (triggerData.fieldType != 'button') throw ({ message: 'wrong field type' });

                let buttonSettings = triggerData.settings as IBoolTrig;
                let buttonField = field.fieldValue as IDeviceFieldButton;

                if (!this.checkButtonTriggerSettings(buttonField, buttonSettings)) {
                    throw ({ message: 'Incorrect button settings' });
                }
                break;
            case "multipleChoice":
                if (triggerData.fieldType != 'multipleChoice') throw ({ message: 'wrong field type' });

                let MCSettings = triggerData.settings as IMCTrig;
                let MCField = field.fieldValue as IDeviceFieldMultipleChoice;

                if (!this.checkMCTriggerSettings(MCField, MCSettings)) {
                    throw ({ message: 'Incorrect Multiple choice settings' });
                }
                break;
            case "RGB":
                if (triggerData.fieldType != 'RGB') throw ({ message: 'wrong field type' });

                let RGBSettings = triggerData.settings as IRGBTrig;
                let RGBField = field.fieldValue as IDeviceFieldRGB;

                if (!this.checkRGBTriggerSettings(RGBField, RGBSettings)) {
                    throw ({ message: 'Incorrect RGB settings' });
                }

                break;
        }
    }

    private checkNumericTriggerSettings(field: IDeviceFieldNumeric, settings: INumTrig): boolean {
        switch (settings.type) {
            case ENumericTriggerType.Bigger:
                return (settings.value < field.maxValue && settings.value > field.minValue)
            case ENumericTriggerType.Smaller:
                return (settings.value < field.maxValue && settings.value > field.minValue)
            case ENumericTriggerType.Equal:
                return (settings.value > field.minValue && settings.value < field.maxValue)
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
    }

    private checkTextTriggerSettings(field: IDeviceFieldText, settings: ITextTrig) {
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

    private checkMCTriggerSettings(field: IDeviceFieldMultipleChoice, settings: IMCTrig) {
        switch (settings.type) {
            case EMCTriggerType.IsEqualTo:
                return (settings.value >= 0 && settings.value < field.values.length);
            case EMCTriggerType.IsNotEqualTo:
                return (settings.value >= 0 && settings.value < field.values.length);

        }
    }

    private checkButtonTriggerSettings(field: IDeviceFieldButton, settings: IBoolTrig) {
        return true;
    }

    private checkRGBTriggerSettings(field: IDeviceFieldRGB, settings: IRGBTrig) {
        switch (settings.type) {
            case ERGBTriggerType_numeric.Bigger:
                return (settings.value < 255)

            case ERGBTriggerType_numeric.Smaller:
                return (settings.value > 0)

            case ERGBTriggerType_numeric.Equal:
                return (settings.value >= 0 && settings.value <= 255);
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

    checkTrigger_numeric(field: IDeviceFieldNumeric, triggerData: INumTrig, oldValue: number): boolean {
        switch (triggerData.type) {
            case ENumericTriggerType.Bigger:
                if (
                    field.fieldValue > triggerData.value &&
                    oldValue <= triggerData.value
                ) {
                    return true;
                }
                break;
            case ENumericTriggerType.Smaller:
                if (
                    field.fieldValue < triggerData.value &&
                    oldValue >= triggerData.value
                ) {
                    return true;
                }
                break;
            case ENumericTriggerType.Equal:
                if (
                    field.fieldValue === triggerData.value &&
                    oldValue !== triggerData.value
                ) {
                    return true;
                }
                break;
            case ENumericTriggerType.Inbetween:
                if (!triggerData.second_value) throw ({ message: 'Incorrect trigger' });
                if (
                    field.fieldValue >= triggerData.value && field.fieldValue <= triggerData.second_value &&
                    !(oldValue >= triggerData.value && oldValue <= triggerData.second_value)
                ) {
                    return true;
                }
                break;
            case ENumericTriggerType.NotInBetween:
                console.log('check not in bet');
                
                if (!triggerData.second_value) throw ({ message: 'Incorrect trigger' });
                console.log('check not in bet2');

                if (
                    field.fieldValue < triggerData.value || field.fieldValue > triggerData.second_value &&
                    !(oldValue < triggerData.value && oldValue > triggerData.second_value)
                ) {
                    console.log('34tzrwsdfs');
                    return true;
                }
                break;
        }
        return false;
    }

    checkTrigger_text(field: IDeviceFieldText, triggerData: ITextTrig, oldValue: string): boolean {
        switch (triggerData.type) {
            case ETextTriggerType.StartsWith:
                if (field.fieldValue.startsWith(triggerData.value) && !field.fieldValue.startsWith(oldValue)) {
                    return true;
                }
                break;
            case ETextTriggerType.EndsWith:
                if (field.fieldValue.endsWith(triggerData.value) && !field.fieldValue.endsWith(oldValue)) {
                    return true;
                }
                break;
            case ETextTriggerType.Contains:
                if (field.fieldValue.includes(triggerData.value) && !field.fieldValue.includes(oldValue)) {
                    return true;
                }
                break;
            case ETextTriggerType.IsEqualTo:
                if (field.fieldValue === triggerData.value && field.fieldValue !== oldValue) {
                    return true;
                }
                break;
            case ETextTriggerType.IsNotEqualTo:
                if (field.fieldValue !== triggerData.value && field.fieldValue === oldValue) {
                    return true;
                }
                break;
        }
        return false;
    }

    checkTrigger_button(field: IDeviceFieldButton, triggerData: IBoolTrig, oldValue: boolean): boolean {
        return (field.fieldValue === triggerData.value && oldValue !== triggerData.value);
    }

    checkTrigger_MC(field: IDeviceFieldMultipleChoice, triggerData: IMCTrig, oldValue: number): boolean {
        switch (triggerData.type) {
            case EMCTriggerType.IsEqualTo:
                if (field.fieldValue === triggerData.value && oldValue !== triggerData.value) {
                    return true;
                }
                break;
            case EMCTriggerType.IsNotEqualTo:
                if (field.fieldValue !== triggerData.value && oldValue === triggerData.value) {
                    return true;
                }
                break;
        }
        return false;
    }

    checkTrigger_RGB(field: IDeviceFieldRGB, triggerData: IRGBTrig, oldValue: IRGB): boolean {
        let neww: number;
        let old: number;
        switch (triggerData.contextType) {
            case ERGBTriggerType_context.R:
                neww = field.R;
                old = oldValue.R;
                break;
            case ERGBTriggerType_context.G:
                neww = field.G;
                old = oldValue.G;
                break;
            case ERGBTriggerType_context.B:
                neww = field.B;
                old = oldValue.B;
                break;
        }

        switch (triggerData.type) {
            case ERGBTriggerType_numeric.Bigger:
                if (
                    neww > triggerData.value &&
                    old <= triggerData.value
                ) {
                    return true;
                }
                break;
            case ERGBTriggerType_numeric.Smaller:
                if (
                    neww < triggerData.value &&
                    old >= triggerData.value
                ) {
                    return true;
                }
                break;
            case ERGBTriggerType_numeric.Equal:
                if (
                    neww === triggerData.value &&
                    old !== triggerData.value
                ) {
                    return true;
                }
                break;
            case ERGBTriggerType_numeric.Inbetween:
                if (!triggerData.second_value) throw ({ message: 'Incorrect trigger' });
                if (
                    neww >= triggerData.value || neww <= triggerData.second_value &&
                    !(old >= triggerData.value && old <= triggerData.second_value)
                ) {
                    return true;
                }
                break;
            case ERGBTriggerType_numeric.NotInBetween:
                if (!triggerData.second_value) throw ({ message: 'Incorrect trigger' });
                if (
                    neww < triggerData.value &&
                    neww > triggerData.second_value &&
                    !(old < triggerData.value && old > triggerData.second_value)
                ) {
                    return true;
                }
                break;
        }

        return false;
    }
}