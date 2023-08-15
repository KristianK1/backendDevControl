import { IComplexFieldGroup, IComplexFieldGroupState, IDevice, IDeviceFieldBasic, IDeviceFieldMultipleChoice, IDeviceFieldNumeric, IFieldGroup } from "models/basicModels";

export function compareFields(fieldNew: IDeviceFieldBasic, fieldOld: IDeviceFieldBasic): boolean {
    if (!fieldNew) throw ({ message: 'fieldNew is undefined/null' });
    if (!fieldOld) return false;
    try {
        if (fieldNew.fieldType !== fieldOld.fieldType) return false;

        // if (fieldNew.id !== fieldOld.id) return false;


        if (fieldNew.fieldValue.fieldDirection !== fieldOld.fieldValue.fieldDirection) return false;

        if (fieldNew.fieldType === 'numeric') {
            let fieldValueNew: IDeviceFieldNumeric = fieldNew.fieldValue as IDeviceFieldNumeric;
            let fieldValueOld: IDeviceFieldNumeric = fieldOld.fieldValue as IDeviceFieldNumeric;
            if (fieldValueNew.minValue !== fieldValueOld.minValue) return false;
            if (fieldValueNew.maxValue !== fieldValueOld.maxValue) return false;
            if (fieldValueNew.valueStep !== fieldValueOld.valueStep) return false;
            if (fieldValueNew.prefix !== fieldValueOld.prefix) return false;
            if (fieldValueNew.sufix !== fieldValueOld.sufix) return false;

            // if (fieldValueNew.fieldValue !== fieldValueOld.fieldValue) return false;            
        }

        /*
        if (fieldNew.fieldType === 'text') {
            let fieldValueNew: IDeviceFieldText = fieldNew.fieldValue as IDeviceFieldText;
            let fieldValueOld: IDeviceFieldText = fieldNew.fieldValue as IDeviceFieldText;
            // if (fieldValueNew.fieldValue !== fieldValueOld.fieldValue) return false;
        }

        if (fieldNew.fieldType === 'button') {
            let fieldValueNew: IDeviceFieldButton = fieldNew.fieldValue as IDeviceFieldButton;
            let fieldValueOld: IDeviceFieldButton = fieldNew.fieldValue as IDeviceFieldButton;
            // if (fieldValueNew.fieldValue !== fieldValueOld.fieldValue) return false;
        }
        */

        //RGB takoder svedno

        if (fieldNew.fieldType === 'multipleChoice') {
            let fieldValueNew: IDeviceFieldMultipleChoice = fieldNew.fieldValue as IDeviceFieldMultipleChoice;
            let fieldValueOld: IDeviceFieldMultipleChoice = fieldOld.fieldValue as IDeviceFieldMultipleChoice;
            if (fieldValueNew.values.length !== fieldValueOld.values.length) {
                return false;
            }
            for (let i = 0; i < fieldValueNew.values.length; i++) {
                if (fieldValueNew.values[i] !== fieldValueOld.values[i]) return false;
            }
        }

    } catch {
        return false;
    }

    return true;
}

export function getDeviceFieldGroup(device: IDevice, groupId: number): IFieldGroup {
    for (let group of device.deviceFieldGroups) {
        if (group.id === groupId) return group;
    }
    throw ({ message: 'get: Device field doesn\'t exist' });
}

export function getDeviceField(groupField: IFieldGroup, fieldId: number): IDeviceFieldBasic {
    for (let field of groupField.fields) {
        if (field.id === fieldId) return field;
    }
    throw ({ message: 'get: Field doesn\'t exist' });
}

export function getComplexGroup(device: IDevice, groupId: number): IComplexFieldGroup {
    for (let complexGroup of device.deviceFieldComplexGroups) {
        if (complexGroup.id === groupId) return complexGroup;
    }
    throw ({ message: 'get: Complex group doesn\'t exist' });
}


export function getComplexGroupState(group: IComplexFieldGroup, stateId: number): IComplexFieldGroupState {
    for (let state of group.fieldGroupStates) {
        if (state.id === stateId) return state;
    }
    throw ({ message: 'get: Complex group state doesn\'t exist' });
}

export function getFieldInComplexGroup(complexGroupState: IComplexFieldGroupState, fieldId: number): IDeviceFieldBasic {
    for (let field of complexGroupState.fields) {
        if (field.id === fieldId) return field;
    }
    throw ({ message: 'get: Field in complex group doesn\'t exist' });
}