import { v4 as uuid } from 'uuid';
import { IComplexFieldGroup, IComplexFieldGroupState, IDevice, IDeviceFieldBasic, IDeviceFieldButton, IDeviceFieldMultipleChoice, IDeviceFieldNumeric, IDeviceFieldText, IFieldGroup } from "../../models/basicModels";
import { FirestoreDB } from '../firestore';
import { getMaxIds } from '../MaxIDs/MaxIDs';
import { FieldValue } from 'firebase-admin/firestore';
import { firestoreSingletonFactory, getMaxIDSingletonFactory } from '../singletonService';

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
        let device = await this.firestore.getDocumentData(DeviceDB.devCollName, `${id}`);
        if (!device) {
            throw ({ message: 'Device doesn\'t exist' });
        }
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

        console.log('register data');
        console.log(deviceData);
        

        if (device.deviceFieldComplexGroups.length == 0 && device.deviceFieldGroups.length == 0) {
            //register
            console.log('simple register');
            
            await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, deviceData);
        }
        else {
            for (let i = 0; i < deviceData.deviceFieldGroups.length; i++) {
                let groupOld = device.deviceFieldGroups[i];
                let groupNew = deviceData.deviceFieldGroups[i];

                if (!groupOld) {
                    await this.addDeviceFieldGroup(deviceId, i, groupNew.groupName);
                }

                if (groupNew.groupName !== groupOld.groupName) {
                    this.renameDeviceFieldGroup(deviceId, groupOld.id, groupNew.groupName);
                }

                for (let j = 0; j < groupNew.fields.length; j++) {
                    let fieldOld = groupOld.fields[i];
                    let fieldNew = groupNew.fields[i];

                    if (!fieldOld) {
                        await this.addDeviceField(deviceId, groupNew.id, fieldNew);
                    }

                    if (fieldNew.fieldName !== fieldOld.fieldName) {
                        await this.renameDeviceField(deviceId, i, j, fieldNew.fieldName);
                    }
                    if (this.compareFields(fieldNew, fieldOld) === false) {
                        await this.deleteDeviceField(deviceId, i, j);
                        await this.addDeviceField(deviceId, groupNew.id, fieldNew);
                    }
                }
                for (let j = groupNew.fields.length; j < groupOld.fields.length; j++) {
                    await this.deleteDeviceField(deviceId, i, j);
                }
            }
            for (let i = deviceData.deviceFieldGroups.length; i < device.deviceFieldGroups.length; i++) {
                await this.deleteDeviceFieldGroup(deviceId, i);
            }

            for (let i = 0; i < deviceData.deviceFieldComplexGroups.length; i++) {

                let groupOld = device.deviceFieldComplexGroups[i];
                let groupNew = deviceData.deviceFieldComplexGroups[i];

                if (!groupOld) {
                    this.addComplexGroup(deviceId, groupNew.id, groupNew.groupName);
                }

                console.log('names');
                console.log(groupNew.groupName);
                console.log(groupOld.groupName);
                
                
                if (groupNew.groupName !== groupOld.groupName) {
                    console.log('rename complex group');
                    
                    this.renameComplexGroup(deviceId, groupOld.id, groupNew.groupName);
                }

                for (let j = 0; j < groupNew.fieldGroupStates.length; j++) {

                    let groupStateOld = groupOld.fieldGroupStates[j];
                    let groupStateNew = groupNew.fieldGroupStates[j];

                    if (!groupStateOld) {
                        await this.addComplexGroupState(deviceId, groupOld.id, groupStateNew.id, groupStateNew.stateName);
                    }

                    if (groupStateNew.stateName !== groupStateOld.stateName) {
                        await this.renameComplexGroupState(deviceId, groupOld.id, groupStateNew.id, groupNew.groupName);
                    }

                    for (let k = 0; k < groupStateNew.fields.length; k++) {
                        let fieldOld = groupStateOld.fields[k];
                        let fieldNew = groupStateNew.fields[k];

                        if (!fieldOld) {
                            await this.addFieldInComplexGroup(deviceId, groupNew.id, groupStateNew.id, fieldNew);
                        }

                        if (fieldNew.fieldName !== fieldOld.fieldName) {
                            await this.renameFieldInComplexGroup(deviceId, i, j, k, fieldNew.fieldName);

                        }

                        if (this.compareFields(fieldNew, fieldOld) === false) {
                            await this.deleteFieldInComplexGroup(deviceId, i, j, k);
                            await this.addFieldInComplexGroup(deviceId, groupNew.id, groupStateNew.id, fieldNew);
                        }
                    }
                    for (let k = groupStateNew.fields.length; k < groupStateOld.fields.length; k++) {
                        await this.deleteFieldInComplexGroup(deviceId, i, j, k);
                    }
                }
                for (let j = groupNew.fieldGroupStates.length; j < groupOld.fieldGroupStates.length; j++) {
                    await this.deleteComplexGroupState(deviceId, i, j);
                }
            }

            for (let i = deviceData.deviceFieldComplexGroups.length; i < device.deviceFieldComplexGroups.length; i++) {
                await this.deleteComplexGroup(deviceId, i);
            }
        }

    }

    async getDeviceByKey(key: string) {
        const allDevices = await this.getDevices();
        let device = allDevices.find(o => o.deviceKey === key);
        if (!device) {
            throw ({ message: 'Device doesn\'t exist' });
        }
        return device;
    }

    async renameDevice(id: number, deviceName: string) {
        let device: IDevice = await this.getDevicebyId(id);
        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${id}`, {
            deviceName: deviceName,
        });
    }

    async deleteDevice(id: number) {
        let device = await this.getDevicebyId(id);
        await this.firestore.deleteDocument(DeviceDB.devCollName, `${id}`); //TODO treba pocistit taj device u deviceFieldovima od svih usera
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
        let devGroup = device.deviceFieldGroups[groupId]
        if (!devGroup) {
            throw ({ message: 'Field group doesn\'t exist' });
        }
        return devGroup;
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
        const field = fieldGroup.fields[fieldId];
        if (!field) {
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
        let complexGroup = device.deviceFieldComplexGroups[groupId]
        if (!complexGroup) {
            throw ({ message: 'Complex group doesn\'t exist' });
        }
        return complexGroup;
    }

    async renameComplexGroup(deviceId: number, groupId: number, groupName: string) {
        let device = await this.getDevicebyId(deviceId);
        let str = `deviceFieldComplexGroups.${groupId}.groupName`;
        console.log(str);
        
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
        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}`]: state
        });
    }

    getComplexGroupState(complexGroup: IComplexFieldGroup, stateId: number): IComplexFieldGroupState {
        let state = complexGroup.fieldGroupStates[stateId];
        if (!state) {
            throw ({ message: 'Complex group state doesn\'t exist' });
        }
        return state;
    }

    async renameComplexGroupState(deviceId: number, groupId: number, stateId: number, stateName: string) {
        let device = await this.getDevicebyId(deviceId);
        let group = this.getComplexGroup(device, groupId);

        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
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

        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}`]: fieldData
        });
    }

    getFieldInComplexGroup(groupState: IComplexFieldGroupState, fieldId: number) {
        let field = groupState.fields[fieldId]
        if (!field) {
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

    // async updateFieldValue(deviceId: number, groupId: number, fieldId: number, value: number | string | boolean) {
    //     let device = await this.getDevicebyId(deviceId);
    //     let groupField = this.getDeviceFieldGroup(device, groupId);
    //     let field = this.getDeviceField(groupField, fieldId);
    //     if (typeof value === 'number' || typeof value === 'boolean') {
    //         if (field.fieldType === 'numeric' || field.fieldType === 'button') {
    //             await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
    //                 deviceFieldGroups: {
    //                     groupId: {
    //                         fields: {
    //                             fieldId: {
    //                                 fieldValue: value,
    //                             }
    //                         }
    //                     }
    //                 }
    //             });
    //         }
    //     }
    //     else if (typeof value === 'string') {
    //         await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
    //             deviceFieldGroups: {
    //                 groupId: {
    //                     fields: {
    //                         fieldId: {
    //                             textValue: value,
    //                         }
    //                     }
    //                 }
    //             }
    //         });
    //     }
    // }

















    private compareFields(fieldNew: IDeviceFieldBasic, fieldOld: IDeviceFieldBasic): boolean {
        try {
            if (fieldNew.fieldType !== fieldOld.fieldType) return false;



            if (fieldNew.fieldValue.fieldDirection !== fieldOld.fieldValue.fieldDirection) return false;

            if (fieldNew.fieldType === 'numeric') {
                let fieldValueNew: IDeviceFieldNumeric = fieldNew.fieldValue as IDeviceFieldNumeric;
                let fieldValueOld: IDeviceFieldNumeric = fieldNew.fieldValue as IDeviceFieldNumeric;
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
                let fieldValueOld: IDeviceFieldMultipleChoice = fieldNew.fieldValue as IDeviceFieldMultipleChoice;
                if (fieldValueNew.values.length !== fieldValueOld.values.length) return false;
                for (let i = 0; i < fieldValueNew.values.length; i++) {
                    if (fieldValueNew.values[i] !== fieldValueOld[i]) return false;
                }
            }

        } catch {
            return false;
        }

        return true;
    }
}


