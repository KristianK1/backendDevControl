import { v4 as uuid } from 'uuid';
import { IDevice, IDeviceFieldBasic, IDeviceFieldButton, IDeviceFieldMultipleChoice, IDeviceFieldNumeric, IDeviceFieldText, IFieldGroup } from "../../models/basicModels";
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
                deviceKey = uuid().replaceAll('-', '');//.substring(0,10);
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

    async RegisterDeviceData(deviceData: IDevice) {
        let device = await this.getDeviceByKey(deviceData.deviceKey);
        let deviceId = device.id;
        if (device.deviceFieldComplexGroups.length == 0 && device.deviceFieldGroups.length == 0) {
            //register
            await this.firestore.setDocumentValue(DeviceDB.devCollName, `${deviceId}`, deviceData);
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
                        await this.addDeviceField(fieldNew);
                    }

                    if (fieldNew.fieldName !== fieldOld.fieldName) {
                        await this.renameDeviceField(deviceId, i, j, fieldNew.fieldName);
                    }
                    if (this.compareFields(fieldNew, fieldOld) === false) {
                        await this.deleteDeviceField(deviceId, i, j);
                        await this.addDeviceField(fieldNew);
                    }
                }

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

    async removeDeviceFieldGroup(deviceId: number, groupId: number) {
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

    async addDeviceField(deviceField: IDeviceFieldBasic): Promise<void> {
        await this.firestore.updateDocumentValue('devices', `${deviceField.deviceId}`, {
            [`deviceFieldGroups.${deviceField.groupId}.fields.${deviceField.id}`]: deviceField,
        });
    }

    async renameDeviceField(deviceId: number, groupId: number, fieldId: number, fieldName: string) {
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

    async updateFieldValue(deviceId: number, groupId: number, fieldId: number, value: number | string | boolean) {
        let device = await this.getDevicebyId(deviceId);
        let groupField = this.getDeviceFieldGroup(device, groupId);
        let field = this.getDeviceField(groupField, fieldId);
        if (typeof value === 'number' || typeof value === 'boolean') {
            if (field.fieldType === 'numeric' || field.fieldType === 'button') {
                await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
                    deviceFieldGroups: {
                        groupId: {
                            fields: {
                                fieldId: {
                                    fieldValue: value,
                                }
                            }
                        }
                    }
                });
            }
        }
        else if (typeof value === 'string') {
            await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
                deviceFieldGroups: {
                    groupId: {
                        fields: {
                            fieldId: {
                                textValue: value,
                            }
                        }
                    }
                }
            });
        }
    }

    compareFields(fieldNew: IDeviceFieldBasic, fieldOld: IDeviceFieldBasic): boolean {
        try {
            if (fieldNew.fieldType !== fieldOld.fieldType) return false;



            if (fieldNew.fieldValue.IO !== fieldOld.fieldValue.IO) return false;

            if (fieldNew.fieldType === 'numeric') {
                let fieldValueNew: IDeviceFieldNumeric = JSON.parse(JSON.stringify(fieldNew.fieldValue));
                let fieldValueOld: IDeviceFieldNumeric = JSON.parse(JSON.stringify(fieldNew.fieldValue));
                if (fieldValueNew.minValue !== fieldValueOld.minValue) return false;
                if (fieldValueNew.maxValue !== fieldValueOld.maxValue) return false;
                if (fieldValueNew.valueStep !== fieldValueOld.valueStep) return false;
                // if (fieldValueNew.fieldValue !== fieldValueOld.fieldValue) return false;            
            }

            // if (fieldNew.fieldType === 'text') {
            //     let fieldValueNew: IDeviceFieldText = JSON.parse(JSON.stringify(fieldNew.fieldValue)); 
            //     let fieldValueOld: IDeviceFieldText = JSON.parse(JSON.stringify(fieldNew.fieldValue)); 
            //     if (fieldValueNew.fieldValue !== fieldValueOld.fieldValue) return false;
            // }


            // if (fieldNew.fieldType === 'button') {
            //     let fieldValueNew: IDeviceFieldButton = JSON.parse(JSON.stringify(fieldNew.fieldValue)); 
            //     let fieldValueOld: IDeviceFieldButton = JSON.parse(JSON.stringify(fieldNew.fieldValue)); 
            //     if (fieldValueNew.fieldValue !== fieldValueOld.fieldValue) return false;            
            // }

            //RGB takoder svedno

            if (fieldNew.fieldType === 'multipleChoice') {
                let fieldValueNew: IDeviceFieldMultipleChoice = JSON.parse(JSON.stringify(fieldNew.fieldValue));
                let fieldValueOld: IDeviceFieldMultipleChoice = JSON.parse(JSON.stringify(fieldNew.fieldValue));
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


