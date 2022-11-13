import { v4 as uuid } from 'uuid';
import { IComplexFieldGroup, IComplexFieldGroupState, IDevice, IDeviceFieldBasic, IDeviceFieldButton, IDeviceFieldMultipleChoice, IDeviceFieldNumeric, IDeviceFieldText, IFieldGroup } from "../../models/basicModels";
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
        console.log(device);
        device = this.transformDeviceData(device);
        return device;
    }

    async getDeviceByKey(key: string) {
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
            console.log(key);
            
            actualDeviceFieldGroups.push(this.getDeviceFieldGroup(device, Number(key)));
        })
        device.deviceFieldGroups = actualDeviceFieldGroups;
        let actualComplexGroups: IComplexFieldGroup[] = [];
        Object.keys(device.deviceFieldComplexGroups).forEach(key => {
            actualComplexGroups.push(this.getComplexGroup(device, Number(key)));
        })
        device.deviceFieldComplexGroups = actualComplexGroups;
        let unix2 = getCurrentTimeUNIX();
        console.log('transform: ' + (unix2 - unix1));

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
        console.log('x1');
        oldDeviceGroups.forEach(async oldGroup => {
            try {
                console.log('x2');
                this.getDeviceFieldGroup(device, oldGroup.id);
                console.log('x3');
            } catch {
                console.log('x4');
                await this.deleteDeviceFieldGroup(deviceId, oldGroup.id);
                device = await this.getDevicebyId(deviceId);
                console.log('x5');
            }
        });

        newDeviceGroups.forEach(async newGroup => {
            let oldGroup: IFieldGroup;
            try {
                console.log('x6');
                oldGroup = this.getDeviceFieldGroup(device, newGroup.id);
                console.log('x7');
            }
            catch {
                console.log('x8');
                await this.addDeviceFieldGroup(deviceId, newGroup.id, newGroup.groupName);
                device = await this.getDevicebyId(deviceId);
                console.log('x9');
            }

            let oldDeviceFields = this.getDeviceFieldGroup(device, newGroup.id).fields;
            let newDeviceFields = newGroup.fields;

            oldDeviceFields.forEach(async oldField => {
                try {
                    console.log('x10');
                    this.getDeviceField(oldGroup, oldField.id);
                    console.log('x11');
                } catch {
                    console.log('x12');
                    await this.deleteDeviceField(deviceId, newGroup.id, oldField.id);
                }
            });

            newDeviceFields.forEach(async newField => {
                let oldField: IDeviceFieldBasic;
                try {
                    console.log('x13');
                    oldField = this.getDeviceField(oldGroup, newField.id);
                    console.log('x14');
                }
                catch {
                    console.log('x15');
                    await this.addDeviceField(deviceId, newGroup.id, newField);
                    console.log('x16');
                    device = await this.getDevicebyId(deviceId);
                    return;
                }
                if (newField.fieldName !== oldField.fieldName) {
                    await this.renameDeviceField(deviceId, newGroup.id, newField.id, newField.fieldName);
                }
                if (this.compareFields(newField, oldField) === false) {
                    await this.deleteDeviceField(deviceId, newGroup.id, newField.id);
                    await this.addDeviceField(deviceId, newGroup.id, newField);
                }
            })
        });
        console.log('\n\n\n');

        //////////////////////////////////////////////////////////////////////////
        let oldDeviceComplexGroups = device.deviceFieldComplexGroups;
        let newDeviceComplexGroups = deviceData.deviceFieldComplexGroups;

        oldDeviceComplexGroups.forEach(async oldGroup => {
            try {
                console.log('y1');
                this.getComplexGroup(deviceData, oldGroup.id);
                console.log('y2');
            } catch {
                console.log('y3');
                await this.deleteComplexGroup(deviceId, oldGroup.id);
                device = await this.getDevicebyId(deviceId);
            }
        });
        console.log('y4');

        newDeviceComplexGroups.forEach(async newGroup => {
            let oldGroup: IComplexFieldGroup;
            try {
                console.log('y5');
                oldGroup = this.getComplexGroup(device, newGroup.id);
                console.log('y6');
            }
            catch {
                console.log('y7');
                await this.addComplexGroup(deviceId, newGroup.id, newGroup.groupName);
                device = await this.getDevicebyId(deviceId);
                console.log('y8');
            }

            oldGroup = this.getComplexGroup(device, newGroup.id);

            if (newGroup.groupName !== oldGroup.groupName) {
                await this.renameComplexGroup(deviceId, newGroup.id, newGroup.groupName);
            }

            let oldComplexGroupStates = oldGroup.fieldGroupStates;
            let newComplexGroupStates = newGroup.fieldGroupStates;
            console.log('y9');
            oldComplexGroupStates.forEach(async oldState => {
                try {
                    console.log('y10');
                    this.getComplexGroupState(newGroup, oldState.id);
                    console.log('y11');
                } catch {
                    console.log('y12');
                    await this.deleteComplexGroupState(deviceId, newGroup.id, oldState.id);
                }
            });

            newComplexGroupStates.forEach(async newState => {
                let oldState: IComplexFieldGroupState;
                try {
                    console.log('y13');
                    oldState = this.getComplexGroupState(oldGroup, newState.id);
                    console.log('y14');
                }
                catch {
                    console.log('y15');
                    await this.addComplexGroupState(deviceId, newGroup.id, newState.id, newState.stateName);
                    device = await this.getDevicebyId(deviceId);
                    console.log('y16');
                }
                oldState = this.getComplexGroupState(this.getComplexGroup(device, newGroup.id), newState.id);
                if (newState.stateName !== oldState.stateName) {
                    await this.renameComplexGroupState(deviceId, newGroup.id, newState.id, newState.stateName);
                }

                let oldComplexGroupFields = oldState.fields;
                let newComplexGroupFields = newState.fields;

                oldComplexGroupFields.forEach(async oldField => {
                    try {
                        console.log('y17');
                        this.getFieldInComplexGroup(newState, oldField.id);
                        console.log('y18');
                    } catch {
                        console.log('y19');
                        await this.deleteFieldInComplexGroup(deviceId, newGroup.id, newState.id, oldField.id);
                    }
                });

                newComplexGroupFields.forEach(async newField => {
                    let oldField: IDeviceFieldBasic;
                    try {
                        console.log('y20');
                        oldField = this.getFieldInComplexGroup(oldState, newField.id);
                        console.log('y21');
                    }
                    catch {
                        console.log('y22');
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
                });
            });
        });
        console.log('q1');
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





    getDeviceFieldGroup(device: IDevice, groupId: number): IFieldGroup {
        let devGroup = {} as IFieldGroup;

        Object.keys(device.deviceFieldGroups).forEach(key => {
            let groupByKey: IFieldGroup = device.deviceFieldGroups[key];
            if (groupByKey.id === groupId) {
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

        Object.keys(devGroup.fields).forEach(key => {
            actualGroup.fields.push(this.getDeviceField(devGroup, Number(key)));
        });
        return actualGroup;
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









    getDeviceField(fieldGroup: IFieldGroup, fieldId: number): IDeviceFieldBasic {
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










    async addComplexGroup(deviceId: number, groupId: number, groupName: string) {
        let device = await this.getDevicebyId(deviceId);

        let newGroup: IComplexFieldGroup = {
            id: groupId,
            groupName: groupName,
            fieldGroupStates: [],
        }

        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${newGroup.id}`]: newGroup
        });
    }

    getComplexGroup(device: IDevice, groupId: number): IComplexFieldGroup {
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
        Object.keys(complexGroup.fieldGroupStates).forEach(key => {
            actualComplexGroup.fieldGroupStates.push(this.getComplexGroupState(complexGroup, Number(key)));
        })
        return actualComplexGroup;
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

    getComplexGroupState(complexGroup: IComplexFieldGroup, stateId: number): IComplexFieldGroupState {
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
            actualState.fields.push(this.getFieldInComplexGroup(state, Number(key)));
        })
        return actualState;
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

    getFieldInComplexGroup(groupState: IComplexFieldGroupState, fieldId: number): IDeviceFieldBasic {
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


