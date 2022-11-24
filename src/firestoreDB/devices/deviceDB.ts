import { v4 as uuid } from 'uuid';
import { IComplexFieldGroup, IComplexFieldGroupState, IDevice, IDeviceFieldBasic, IDeviceFieldButton, IDeviceFieldMultipleChoice, IDeviceFieldNumeric, IDeviceFieldText, IFieldGroup, IRGB } from "../../models/basicModels";
import { FirestoreDB } from '../firestore';
import { getMaxIds } from '../MaxIDs/MaxIDs';
import { FieldValue } from 'firebase-admin/firestore';
import { firestoreSingletonFactory, getMaxIDSingletonFactory } from '../singletonService';
import { getCurrentTimeUNIX } from '../../generalStuff/timeHandlers';

var deviceDBObj: DeviceDB;

export function createDeviceDBInstance() {
    deviceDBObj = new DeviceDB();
}

export function getDeviceDBInstance(): DeviceDB {
    return deviceDBObj;
}

export class DeviceDB {

    static devCollName = 'devices';
    static usersCollName = 'users';

    firestore: FirestoreDB;
    getMaxIds: getMaxIds;

    constructor() {
        this.firestore = firestoreSingletonFactory.getInstance();
        this.getMaxIds = getMaxIDSingletonFactory.getInstance();
    }

    async getDevices(): Promise<IDevice[]> {
        return await this.firestore.getCollectionData(DeviceDB.devCollName);
    }

    async getDevicebyId(id: number): Promise<IDevice> {
        let device: IDevice = await this.firestore.getDocumentData(DeviceDB.devCollName, `${id}`);
        if (!device) {
            throw ({ message: 'Device doesn\'t exist' });
        }
        device = this.transformDeviceData(device);
        return device;
    }

    async getDeviceByKey(key: string): Promise<IDevice> {
        const allDevices = await this.getDevices();
        let device = allDevices.find(o => o.deviceKey === key);
        if (!device) {
            throw ({ message: 'Device doesn\'t exist' });
        }
        device = this.transformDeviceData(device);
        return device;
    }

    transformDeviceData(device: IDevice) {
        let unix1 = getCurrentTimeUNIX();
        let actualDeviceFieldGroups: IFieldGroup[] = [];
        Object.keys(device.deviceFieldGroups).forEach(key => {
            actualDeviceFieldGroups.push(this.transformDeviceFieldGroup(device, Number(key)));
        })
        device.deviceFieldGroups = actualDeviceFieldGroups;
        let actualComplexGroups: IComplexFieldGroup[] = [];
        Object.keys(device.deviceFieldComplexGroups).forEach(key => {
            actualComplexGroups.push(this.transformComplexGroup(device, Number(key)));
        })
        device.deviceFieldComplexGroups = actualComplexGroups;
        let unix2 = getCurrentTimeUNIX();

        return device;
    }

    async addDevice(deviceName: string, userAdminId: number, deviceKey?: string): Promise<number> {
        const allDevices = await this.getDevices();
        if (!!deviceKey) {
            if (allDevices.find(o => o.deviceKey === deviceKey)) {
                throw ({ message: 'deviceKey exists' });
            }
        } else {
            while (true) {
                deviceKey = uuid();//.replaceAll('-', '');//.substring(0,10);
                if (!allDevices.find(o => o.deviceKey === deviceKey)) break;
            }
        }
        const maxId = await this.getMaxIds.getMaxDeviceId(true);

        const newDevice: IDevice = {
            id: maxId + 1,
            deviceName: deviceName,
            userAdminId: userAdminId,
            deviceKey: deviceKey,
            deviceFieldGroups: [],
            deviceFieldComplexGroups: [],
        }
        await this.firestore.setDocumentValue(DeviceDB.devCollName, `${newDevice.id}`, newDevice);
        return newDevice.id;
    }

    async registerDeviceData(deviceData: IDevice) {
        let device = await this.getDeviceByKey(deviceData.deviceKey);
        let deviceId = device.id;

        let oldDeviceGroups = device.deviceFieldGroups;
        let newDeviceGroups = deviceData.deviceFieldGroups;
        for (let oldGroup of oldDeviceGroups) {
            try {
                console.log(oldGroup);
                this.getDeviceFieldGroup(deviceData, oldGroup.id);
            } catch {
                await this.deleteDeviceFieldGroup(deviceId, oldGroup.id);
                device = await this.getDevicebyId(deviceId);
            }
        }

        for (let newGroup of newDeviceGroups) {
            let oldGroup: IFieldGroup;
            try {
                oldGroup = this.getDeviceFieldGroup(device, newGroup.id);
            }
            catch {
                await this.addDeviceFieldGroup(deviceId, newGroup.id, newGroup.groupName);
                device = await this.getDevicebyId(deviceId);
            }
            oldGroup = this.getDeviceFieldGroup(device, newGroup.id);

            if (oldGroup.groupName !== newGroup.groupName) {
                await this.renameDeviceFieldGroup(deviceId, newGroup.id, newGroup.groupName);
            }

            let oldDeviceFields = this.getDeviceFieldGroup(device, newGroup.id).fields;
            let newDeviceFields = newGroup.fields;

            for (let oldField of oldDeviceFields) {
                try {
                    this.getDeviceField(newGroup, oldField.id);
                } catch {
                    await this.deleteDeviceField(deviceId, newGroup.id, oldField.id);
                }
            }

            for (let newField of newDeviceFields) {
                let oldField: IDeviceFieldBasic;
                try {
                    oldField = this.getDeviceField(oldGroup, newField.id);
                }
                catch {
                    await this.addDeviceField(deviceId, newGroup.id, newField);
                    device = await this.getDevicebyId(deviceId);
                    continue;
                }
                if (newField.fieldName !== oldField.fieldName) {
                    await this.renameDeviceField(deviceId, newGroup.id, newField.id, newField.fieldName);
                }
                if (this.compareFields(newField, oldField) === false) {
                    await this.deleteDeviceField(deviceId, newGroup.id, newField.id);
                    await this.addDeviceField(deviceId, newGroup.id, newField);
                }
            }
        }

        //////////////////////////////////////////////////////////////////////////
        let oldDeviceComplexGroups = device.deviceFieldComplexGroups;
        let newDeviceComplexGroups = deviceData.deviceFieldComplexGroups;

        for (let oldGroup of oldDeviceComplexGroups) {
            try {
                this.getComplexGroup(deviceData, oldGroup.id);
            } catch {
                await this.deleteComplexGroup(deviceId, oldGroup.id);
                device = await this.getDevicebyId(deviceId);
            }
        }

        for (let newGroup of newDeviceComplexGroups) {
            let oldGroup: IComplexFieldGroup;
            try {
                oldGroup = this.getComplexGroup(device, newGroup.id);
            }
            catch {
                await this.addComplexGroup(deviceId, newGroup.id, newGroup.groupName);
                device = await this.getDevicebyId(deviceId);
            }

            oldGroup = this.getComplexGroup(device, newGroup.id);

            if (newGroup.groupName !== oldGroup.groupName) {
                await this.renameComplexGroup(deviceId, newGroup.id, newGroup.groupName);
            }

            let oldComplexGroupStates = oldGroup.fieldGroupStates;
            let newComplexGroupStates = newGroup.fieldGroupStates;
            // console.log('y9');
            for (let oldState of oldComplexGroupStates) {
                try {
                    this.getComplexGroupState(newGroup, oldState.id);
                } catch {
                    await this.deleteComplexGroupState(deviceId, newGroup.id, oldState.id);
                }
            }

            for (let newState of newComplexGroupStates) {
                let oldState: IComplexFieldGroupState;
                try {
                    oldState = this.getComplexGroupState(oldGroup, newState.id);
                }
                catch {
                    await this.addComplexGroupState(deviceId, newGroup.id, newState.id, newState.stateName);
                    device = await this.getDevicebyId(deviceId);
                }
                oldState = this.getComplexGroupState(this.getComplexGroup(device, newGroup.id), newState.id);

                if (newState.stateName !== oldState.stateName) {
                    await this.renameComplexGroupState(deviceId, newGroup.id, newState.id, newState.stateName);
                }

                let oldComplexGroupFields = oldState.fields;
                let newComplexGroupFields = newState.fields;

                for (let oldField of oldComplexGroupFields) {
                    try {
                        this.getFieldInComplexGroup(newState, oldField.id);
                    } catch {
                        await this.deleteFieldInComplexGroup(deviceId, newGroup.id, newState.id, oldField.id);
                    }
                }

                for (let newField of newComplexGroupFields) {
                    let oldField: IDeviceFieldBasic;
                    try {
                        oldField = this.getFieldInComplexGroup(oldState, newField.id);
                    }
                    catch {
                        await this.addFieldInComplexGroup(deviceId, newGroup.id, newState.id, newField);
                        device = await this.getDevicebyId(deviceId);
                    }
                    oldField = this.getFieldInComplexGroup(this.getComplexGroupState(this.getComplexGroup(device, newGroup.id), newState.id), newField.id);

                    if (newField.fieldName !== oldField.fieldName) {
                        await this.renameFieldInComplexGroup(deviceId, newGroup.id, newState.id, newField.id, newField.fieldName);
                    }

                    if (this.compareFields(newField, oldField) === false) {
                        await this.deleteFieldInComplexGroup(deviceId, newGroup.id, newState.id, newField.id);
                        await this.addFieldInComplexGroup(deviceId, newGroup.id, newState.id, newField);
                    }
                }
            }
        }
        // console.log('q1');
    }

    async renameDevice(id: number, deviceName: string) {
        let device: IDevice = await this.getDevicebyId(id);
        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${id}`, {
            deviceName: deviceName,
        });
    }

    async deleteDevice(id: number) {
        let device = await this.getDevicebyId(id);
        await this.firestore.deleteDocument(DeviceDB.devCollName, `${id}`);
    }

    async changeDeviceAdmin(deviceId: number, userId: number) {
        let device: IDevice = await this.getDevicebyId(deviceId);
        if (device.userAdminId === userId) {
            throw ({ message: 'User is already the admin' });
        }
        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, {
            userAdminId: userId,
        });
    }





    transformDeviceFieldGroup(device: IDevice, groupId: number): IFieldGroup {
        let devGroup = {} as IFieldGroup;

        Object.keys(device.deviceFieldGroups).forEach(key => {

            let groupByKey: IFieldGroup = device.deviceFieldGroups[key];
            if (groupByKey.id === groupId) {
                // console.log('nasao');
                devGroup = groupByKey;
            }
        });

        if (!devGroup.id && devGroup.id !== 0) {
            throw ({ message: 'Field group doesn\'t exist' });
        }
        let actualGroup = {} as IFieldGroup;
        actualGroup.id = devGroup.id;
        actualGroup.groupName = devGroup.groupName;
        actualGroup.fields = [];

        // console.log('c1');

        Object.keys(devGroup.fields).forEach(key => {
            // console.log('devGroup.fields keys:' + key);

            actualGroup.fields.push(this.transformDeviceField(devGroup, Number(key)));
        });
        // console.log('c99');
        return actualGroup;
    }

    getDeviceFieldGroup(device: IDevice, groupId: number): IFieldGroup {
        for (let group of device.deviceFieldGroups) {
            if (group.id === groupId) return group;
        }
        throw ({ message: 'get: Device field doesn\'t exist' });
    }

    async addDeviceFieldGroup(deviceId: number, groupId: number, groupName: string): Promise<void> {
        // let device = await this.getDevicebyId(deviceId);
        let newGroup: IFieldGroup = {
            id: groupId,
            groupName: groupName,
            fields: [],
        }

        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, {
            [`deviceFieldGroups.${newGroup.id}`]: newGroup
        });
    }

    async renameDeviceFieldGroup(deviceId: number, groupId: number, groupName: string) {
        let device = await this.getDevicebyId(deviceId);
        this.getDeviceFieldGroup(device, groupId);

        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.groupName`]: groupName
        });
    }

    async deleteDeviceFieldGroup(deviceId: number, groupId: number) {
        let device = await this.getDevicebyId(deviceId);
        this.getDeviceFieldGroup(device, groupId);

        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, {
            [`deviceFieldGroups.${groupId}`]: FieldValue.delete()
        })
    }









    transformDeviceField(fieldGroup: IFieldGroup, fieldId: number): IDeviceFieldBasic {
        let field = {} as IDeviceFieldBasic;

        Object.keys(fieldGroup.fields).forEach(key => {
            let fieldByKey: IDeviceFieldBasic = fieldGroup.fields[key];
            if (fieldByKey.id === fieldId) {
                field = fieldByKey;
            }
        });

        if (!field.id && field.id !== 0) {
            throw ({ message: 'Field doesn\'t exist' });
        }
        return field;
    }

    getDeviceField(groupField: IFieldGroup, fieldId: number): IDeviceFieldBasic {
        for (let field of groupField.fields) {
            if (field.id === fieldId) return field;
        }
        throw ({ message: 'get: Field doesn\'t exist' });
    }

    async addDeviceField(deviceId: number, groupId: number, deviceField: IDeviceFieldBasic): Promise<void> {
        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${deviceField.id}`]: deviceField,
        });
    }

    private async renameDeviceField(deviceId: number, groupId: number, fieldId: number, fieldName: string) {
        let device = await this.getDevicebyId(deviceId);
        let groupField = this.getDeviceFieldGroup(device, groupId);
        this.getDeviceField(groupField, fieldId);
        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${fieldId}.fieldName`]: fieldName
        });
    }

    async deleteDeviceField(deviceId: number, groupId: number, fieldId: number) {
        let device = await this.getDevicebyId(deviceId);
        let groupField = this.getDeviceFieldGroup(device, groupId);
        this.getDeviceField(groupField, fieldId);
        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${fieldId}`]: FieldValue.delete()
        });
    }

    async changeDeviceFieldValueFromDevice(deviceKey: string, groupId: number, fieldId: number, fieldValue: any) {
        let device = await this.getDeviceByKey(deviceKey);
        await this.tryToChangeDeviceFieldValue(device, groupId, fieldId, fieldValue);
    }

    async changeDeviceFieldValueFromUser(deviceId: number, groupId: number, fieldId: number, fieldValue: any) {
        let device = await this.getDevicebyId(deviceId);
        //check user rights
        await this.tryToChangeDeviceFieldValue(device, groupId, fieldId, fieldValue);
    }

    private async tryToChangeDeviceFieldValue(device: IDevice, groupId: number, fieldId: number, fieldValue: any) {
        let group = this.getDeviceFieldGroup(device, groupId);
        let field = this.getDeviceField(group, fieldId);

        if (field.fieldType === 'button' && typeof fieldValue === 'boolean') {
            await this.changeDeviceFieldValue(device.id, groupId, fieldId, fieldValue);
        }
        else if (field.fieldType === 'numeric' && typeof fieldValue === 'number') {
            let numField: IDeviceFieldNumeric = JSON.parse(JSON.stringify(field.fieldValue));
            let N = (fieldValue - numField.minValue) / numField.valueStep;
            if (N % 1 < 0.05 || N % 1 > 0.95) {
                await this.changeDeviceFieldValue(device.id, groupId, fieldId, fieldValue);
            }
        }
        else if (field.fieldType === 'text' && typeof fieldValue === 'string') {
            await this.changeDeviceFieldValue(device.id, groupId, fieldId, fieldValue);
        }
        else if (field.fieldType === 'multipleChoice' && typeof fieldValue === 'number') {
            let multipleCField: IDeviceFieldMultipleChoice = JSON.parse(JSON.stringify(field.fieldValue));
            if (multipleCField.values.length > fieldValue && fieldValue >= 0) {
                await this.changeDeviceFieldValue(device.id, groupId, fieldId, fieldValue);
            }
            else throw ({ message: 'Out of range - MC field' });
        }
        else if (
            field.fieldType === 'RGB' &&
            (!!fieldValue.R && typeof fieldValue.R === 'number' && fieldValue.R >= 0) &&
            (!!fieldValue.G && typeof fieldValue.G === 'number' && fieldValue.G >= 0) &&
            (!!fieldValue.B && typeof fieldValue.B === 'number' && fieldValue.B >= 0)
        ) {
            console.log('RGB');
            console.log(fieldValue);
            await this.changeDeviceFieldValueRGB(device.id, groupId, fieldId, fieldValue);
        }
        else {
            console.log('wrong');
            throw ({ message: 'Wrong field data type' });
        }
    }

    private async changeDeviceFieldValue(deviceId: number, groupId: number, fieldId: number, fieldValue: any) {
        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${fieldId}.fieldValue.fieldValue`]: fieldValue
        });
    }

    private async changeDeviceFieldValueRGB(deviceId: number, groupId: number, fieldId: number, fieldValue: IRGB) {
        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${fieldId}.fieldValue.R`]: fieldValue.R
        });

        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${fieldId}.fieldValue.G`]: fieldValue.G
        });

        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${fieldId}.fieldValue.B`]: fieldValue.B
        });
    }









    async addComplexGroup(deviceId: number, groupId: number, groupName: string) {
        let device = await this.getDevicebyId(deviceId);

        let newGroup: IComplexFieldGroup = {
            id: groupId,
            groupName: groupName,
            currentState: 0,
            fieldGroupStates: [],
        }

        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${newGroup.id}`]: newGroup
        });
    }

    transformComplexGroup(device: IDevice, groupId: number): IComplexFieldGroup {
        let complexGroup = {} as IComplexFieldGroup;

        Object.keys(device.deviceFieldComplexGroups).forEach(key => {
            let complexGroupById = device.deviceFieldComplexGroups[groupId];
            if (complexGroupById.id === groupId) {
                complexGroup = complexGroupById;
            }
        });

        if (!complexGroup.id && complexGroup.id !== 0) {
            throw ({ message: 'Complex group doesn\'t exist' });
        }
        let actualComplexGroup = {} as IComplexFieldGroup;
        actualComplexGroup.id = complexGroup.id;
        actualComplexGroup.groupName = complexGroup.groupName;
        actualComplexGroup.fieldGroupStates = [];
        actualComplexGroup.currentState = complexGroup.currentState;
        Object.keys(complexGroup.fieldGroupStates).forEach(key => {
            actualComplexGroup.fieldGroupStates.push(this.transformComplexGroupState(complexGroup, Number(key)));
        })
        return actualComplexGroup;
    }

    getComplexGroup(device: IDevice, groupId: number): IComplexFieldGroup {
        for (let complexGroup of device.deviceFieldComplexGroups) {
            if (complexGroup.id === groupId) return complexGroup;
        }
        throw ({ message: 'get: Complex group doesn\'t exist' });
    }

    async renameComplexGroup(deviceId: number, groupId: number, groupName: string) {
        let device = await this.getDevicebyId(deviceId);
        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups[${groupId}].groupName`]: groupName
        });
    }

    async deleteComplexGroup(deviceId: number, groupId: number) {
        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}`]: FieldValue.delete()
        });
    }








    async addComplexGroupState(deviceId: number, groupId: number, stateId: number, stateName: string) {
        let device = await this.getDevicebyId(deviceId);
        let group = this.getComplexGroup(device, groupId);

        let state: IComplexFieldGroupState = {
            id: stateId,
            stateName: stateName,
            fields: [],
        };
        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}`]: state
        });
    }

    transformComplexGroupState(complexGroup: IComplexFieldGroup, stateId: number): IComplexFieldGroupState {
        let state = {} as IComplexFieldGroupState;

        Object.keys(complexGroup.fieldGroupStates).forEach(key => {
            let stateByKey = complexGroup.fieldGroupStates[stateId];
            if (stateByKey.id === stateId) {
                state = stateByKey;
            }
        })

        if (!state.id && state.id !== 0) {
            throw ({ message: 'Complex group state doesn\'t exist' });
        }
        let actualState = {} as IComplexFieldGroupState;
        actualState.id = state.id;
        actualState.stateName = state.stateName;
        actualState.fields = [];
        Object.keys(state.fields).forEach(key => {
            actualState.fields.push(this.transformFieldInComplexGroup(state, Number(key)));
        })
        return actualState;
    }

    getComplexGroupState(group: IComplexFieldGroup, stateId: number): IComplexFieldGroupState {
        for (let state of group.fieldGroupStates) {
            if (state.id === stateId) return state;
        }
        throw ({ message: 'get: Complex group state doesn\'t exist' });
    }

    async renameComplexGroupState(deviceId: number, groupId: number, stateId: number, stateName: string) {
        let device = await this.getDevicebyId(deviceId);
        let group = this.getComplexGroup(device, groupId);

        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.stateName`]: stateName
        });
    }

    async deleteComplexGroupState(deviceId: number, groupId: number, stateId: number) {
        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}`]: FieldValue.delete()
        });
    }

    async addFieldInComplexGroup(deviceId: number, groupId: number, stateId: number, fieldData: IDeviceFieldBasic) {
        let device = await this.getDevicebyId(deviceId);
        let group = this.getComplexGroup(device, groupId);
        let state = this.getComplexGroupState(group, stateId);

        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldData.id}`]: fieldData
        });
    }

    async changeComplexGroupStateFromDevice(deviceKey: string, groupId: number, state: number) {
        let device = await this.getDeviceByKey(deviceKey);
        await this.tryToChangeComplexGroupState(device, groupId, state);
    }

    async changeComplexGroupStateFromUser(deviceId: number, groupId: number, state: number) {
        let device = await this.getDevicebyId(deviceId);
        await this.tryToChangeComplexGroupState(device, groupId, state);
    }

    private async tryToChangeComplexGroupState(device: IDevice, groupId: number, state: number) {
        let group = this.getComplexGroup(device, groupId);
        let NofStates = group.fieldGroupStates.length;
        if (state >= 0 && state < NofStates) {
            await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${device.id}`, {
                [`deviceFieldComplexGroups.${groupId}.currentState`]: state
            });
        }
        else throw ({ message: 'Invalid state number' });
    }






    transformFieldInComplexGroup(groupState: IComplexFieldGroupState, fieldId: number): IDeviceFieldBasic {
        let field = {} as IDeviceFieldBasic;//groupState.fields[fieldId]

        Object.keys(groupState.fields).forEach(key => {
            let fieldByKey: IDeviceFieldBasic = groupState.fields[key];
            if (fieldByKey.id === fieldId) {
                field = fieldByKey;
            }
        });

        if (!field.id && field.id !== 0) {
            throw ({ message: 'Field in Complex group state doesn\'t exist' });
        }
        return field;
    }

    getFieldInComplexGroup(complexGroupState: IComplexFieldGroupState, fieldId: number): IDeviceFieldBasic {
        for (let field of complexGroupState.fields) {
            if (field.id === fieldId) return field;
        }
        throw ({ message: 'get: Field in complex group doesn\'t exist' });
    }

    async deleteFieldInComplexGroup(deviceId: number, groupId: number, stateId: number, fieldId: number) {
        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldId}`]: FieldValue.delete()
        });
    }

    async renameFieldInComplexGroup(deviceId: number, groupId: number, stateId: number, fieldId: number, fieldName: string) {
        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldId}.fieldName`]: fieldName
        });
    }


    async changeFieldValueInComplexGroupFromDevice(deviceKey: string, groupId: number, stateId: number, fieldId: number, fieldValue: any) {
        let device = await this.getDeviceByKey(deviceKey);
        await this.tryToChangeFieldValueInComplexGroup(device, groupId, stateId, fieldId, fieldValue);
    }

    async changeFieldValueInComplexGroupFromUser(deviceId: number, groupId: number, stateId: number, fieldId: number, fieldValue: any) {
        let device = await this.getDevicebyId(deviceId);
        //check user rights
        await this.tryToChangeFieldValueInComplexGroup(device, groupId, stateId, fieldId, fieldValue);
    }

    private async tryToChangeFieldValueInComplexGroup(device: IDevice, groupId: number, stateId: number, fieldId: number, fieldValue: any) {
        let group = this.getComplexGroup(device, groupId);
        let state = this.getComplexGroupState(group, stateId);
        let field = this.getFieldInComplexGroup(state, fieldId);

        if (field.fieldType === 'button' && typeof fieldValue === 'boolean') {
            await this.changeDeviceFieldValueInComplexGroup(device.id, groupId, stateId, fieldId, fieldValue);
        }
        else if (field.fieldType === 'numeric' && typeof fieldValue === 'number') {
            let numField: IDeviceFieldNumeric = JSON.parse(JSON.stringify(field.fieldValue));
            let N = (fieldValue - numField.minValue) / numField.valueStep;
            if (N % 1 < 0.05 || N % 1 > 0.95) {
                await this.changeDeviceFieldValueInComplexGroup(device.id, groupId, stateId, fieldId, fieldValue);
            }
        }
        else if (field.fieldType === 'text' && typeof fieldValue === 'string') {
            await this.changeDeviceFieldValueInComplexGroup(device.id, groupId, stateId, fieldId, fieldValue);
        }
        else if (field.fieldType === 'multipleChoice' && typeof fieldValue === 'number') {
            let multipleCField: IDeviceFieldMultipleChoice = JSON.parse(JSON.stringify(field.fieldValue));            
            if (multipleCField.values.length > fieldValue && fieldValue >= 0) {
                await this.changeDeviceFieldValueInComplexGroup(device.id, groupId, stateId, fieldId, fieldValue);
            }
            else throw ({ message: 'Out of range - MC field' });
        }
        else if (
            field.fieldType === 'RGB' &&
            (!!fieldValue.R && typeof fieldValue.R === 'number' && fieldValue.R >= 0) &&
            (!!fieldValue.G && typeof fieldValue.G === 'number' && fieldValue.G >= 0) &&
            (!!fieldValue.B && typeof fieldValue.B === 'number' && fieldValue.B >= 0)
        ) {
            console.log('RGB');
            console.log(fieldValue);
            await this.changeDeviceFieldValueInComplexGroup(device.id, groupId, stateId, fieldId, fieldValue);
        }
        else {
            console.log('wrong');
            throw ({ message: 'Wrong field data type' });
        }
    }

    private async changeDeviceFieldValueInComplexGroup(deviceId: number, groupId: number, stateId: number, fieldId: number, fieldValue: any) {

    }

    private async changeDeviceFieldValueInComplexGroupRGB(deviceId: number, groupId: number, stateId: number, fieldId: number, fieldValue: IRGB) {

    }

    private compareFields(fieldNew: IDeviceFieldBasic, fieldOld: IDeviceFieldBasic): boolean {
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
}


