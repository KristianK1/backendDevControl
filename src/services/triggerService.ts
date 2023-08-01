import { Db } from "../firestoreDB/db";
import { DBSingletonFactory } from "../firestoreDB/singletonService";
import { EMCTriggerType, ENumericTriggerType, ERGBTriggerType_numeric, ETextTriggerType, ETriggerSourceType, IBooleanTrigger, IMCTrigger, INumericTrigger, IRGBTrigger, ITextTrigger, ITrigger } from "../models/triggerModels";
import { IDevice, IDeviceFieldBasic, IDeviceFieldButton, IDeviceFieldMultipleChoice, IDeviceFieldNumeric, IDeviceFieldRGB, IDeviceFieldText } from "../models/basicModels";

export class TriggerService {
    private db: Db;

    constructor() {
        this.db = DBSingletonFactory.getInstance();
    }

    async saveTrigger(triggerData: ITrigger) {
        await this.db.saveTrigger(triggerData);
    }

    async checkTriggerSourceValueValidity(triggerData: ITrigger, field: IDeviceFieldBasic) {

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
                return (settings.value < field.maxValue)
            case ENumericTriggerType.Smaller:
                return (settings.value < field.minValue)
            case ENumericTriggerType.Equal:
                return true;
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