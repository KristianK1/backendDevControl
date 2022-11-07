import { v4 as uuid } from 'uuid';
import { IDevice, IDeviceFieldBasic, IFieldGroup } from "../../models/basicModels";
import { FirestoreDB } from '../firestore';
import { getMaxIds } from '../MaxIDs/MaxIDs';
import { FieldValue } from 'firebase-admin/firestore';
import { IAddFieldBasic } from '../../models/API/deviceCreateAlterReqRes';
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

    async addDevice(deviceName: string, userAdminId: number): Promise<number> {
        const allDevices = await this.getDevices();
        let deviceKey: string;
        while (true) {
            deviceKey = uuid().replace('-', '');//.slice(0, 10);
            if (!allDevices.find(o => o.deviceKey === deviceKey)) break;
        }
        const maxId = await this.getMaxIds.getMaxDeviceId(true);
        const newDevice: IDevice = {
            id: maxId + 1,
            deviceName: deviceName,
            userAdminId: userAdminId,
            deviceKey: deviceKey,
            deviceFieldGroups: []
        }
        await this.firestore.setDocumentValue(DeviceDB.devCollName, `${newDevice.id}`, newDevice);
        return newDevice.id;
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

    async addDeviceFieldGroup(deviceId: number, groupName: string): Promise<number> {
        let device = await this.getDevicebyId(deviceId);
        let newId = await this.getMaxIds.getMaxFieldGroupId(true);
        let newGroup: IFieldGroup = {
            id: newId,
            groupName: groupName,
            fields: [],
        }

        await this.firestore.updateDocumentValue(DeviceDB.devCollName, `${deviceId}`, {
            [`deviceFieldGroups.${newId}`]: newGroup
        });
        return newId;
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

    async addDeviceField(deviceField: IAddFieldBasic): Promise<number> {
        let device = await this.getDevicebyId(deviceField.deviceId);
        this.getDeviceFieldGroup(device, deviceField.groupId); //baci error ako nema

        if (deviceField.fieldName.length >= 15) {
            throw ({ message: 'Field name too long (>=15 chars)' })
        }
        let newId = await this.getMaxIds.getMaxFieldId(true);

        let field: IDeviceFieldBasic = {
            deviceId: deviceField.deviceId,
            groupId: deviceField.groupId,
            id: newId,
            fieldName: deviceField.fieldName,
            fieldType: deviceField.fieldType,
            fieldValue: deviceField.fieldValue,
        }

        await this.firestore.updateDocumentValue('devices', `${deviceField.deviceId}`, {
            [`deviceFieldGroups.${deviceField.groupId}.fields.${newId}`]: field
        });
        return newId;
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
}