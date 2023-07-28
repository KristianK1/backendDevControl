import { IComplexFieldGroup, IComplexFieldGroupState, IDevice, IDeviceFieldBasic, IFieldGroup } from "models/basicModels";
import { v4 as uuid } from 'uuid';
import { Db } from "../firestoreDB/db";
import { DBSingletonFactory } from "../firestoreDB/singletonService";
import { compareFields, getComplexGroup, getComplexGroupState, getDeviceField, getDeviceFieldGroup, getFieldInComplexGroup } from "firestoreDB/deviceStructureFunctions";

export class DeviceService {
    private db: Db;

    constructor() {
        this.db = DBSingletonFactory.getInstance();
    }

    async getDevicebyId(id: number): Promise<IDevice> {
        return await this.db.getDevicebyId(id);
    }

    async getDevicebyKey(key: string): Promise<IDevice> {
        return await this.db.getDevicebyKey(key);
    }

    async addDevice(deviceName: string, userAdminId: number, deviceKey?: string): Promise<number> {
        const allDevices = await this.db.getTransformedDevices();
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
        const maxId = await this.db.getMaxDeviceId(true);
        const newDevice: IDevice = {
            id: maxId + 1,
            deviceName: deviceName,
            userAdminId: userAdminId,
            deviceKey: deviceKey,
            deviceFieldGroups: [],
            deviceFieldComplexGroups: [],
        }
        await this.db.addDevice(newDevice);
        return newDevice.id;
    }

    async renameDevice(deviceId: number, deviceName: string): Promise<void> {
        await this.db.renameDevice(deviceId, deviceName);
    }

    async deleteDevice(id: number) {
        await this.db.deleteDevice(id);
    }

    async changeDeviceAdmin(deviceId: number, userId: number) {
        let device: IDevice = await this.getDevicebyId(deviceId);
        if (device.userAdminId === userId) {
            throw ({ message: 'User is already the admin' });
        }
        await this.db.giveWriteDeviceRightsToUser(device.userAdminId, deviceId);
        await this.db.changeDeviceAdmin(deviceId, userId);
        await this.db.deleteUserRightForNewAdmin(userId, deviceId);
    }

    async registerDeviceData(deviceData: IDevice) {
        let device = await this.getDevicebyKey(deviceData.deviceKey);
        let deviceId = device.id;

        let oldDeviceGroups = device.deviceFieldGroups;
        let newDeviceGroups = deviceData.deviceFieldGroups;
        for (let oldGroup of oldDeviceGroups) {
            try {
                getDeviceFieldGroup(deviceData, oldGroup.id);
            } catch {
                await this.db.deleteDeviceFieldGroup(deviceId, oldGroup.id);
                device = await this.getDevicebyId(deviceId);
            }
        }

        for (let newGroup of newDeviceGroups) {
            let oldGroup: IFieldGroup;
            try {
                oldGroup = getDeviceFieldGroup(device, newGroup.id);
            }
            catch {
                await this.db.addDeviceFieldGroup(deviceId, newGroup.id, newGroup.groupName);
                device = await this.getDevicebyId(deviceId);
            }
            oldGroup = getDeviceFieldGroup(device, newGroup.id);

            if (oldGroup.groupName !== newGroup.groupName) {
                await this.db.renameDeviceFieldGroup(deviceId, newGroup.id, newGroup.groupName);
            }

            let oldDeviceFields = getDeviceFieldGroup(device, newGroup.id).fields;
            let newDeviceFields = newGroup.fields;

            for (let oldField of oldDeviceFields) {
                try {
                    getDeviceField(newGroup, oldField.id);
                } catch {
                    await this.db.deleteDeviceField(deviceId, newGroup.id, oldField.id);
                }
            }

            for (let newField of newDeviceFields) {
                let oldField: IDeviceFieldBasic;
                try {
                    oldField = getDeviceField(oldGroup, newField.id);
                }
                catch {
                    await this.db.addDeviceField(deviceId, newGroup.id, newField);
                    device = await this.getDevicebyId(deviceId);
                    continue;
                }
                if (newField.fieldName !== oldField.fieldName) {
                    await this.db.renameDeviceField(deviceId, newGroup.id, newField.id, newField.fieldName);
                }
                if (compareFields(newField, oldField) === false) {
                    await this.db.deleteDeviceField(deviceId, newGroup.id, newField.id);
                    await this.db.addDeviceField(deviceId, newGroup.id, newField);
                }
            }
        }

        //////////////////////////////////////////////////////////////////////////
        let oldDeviceComplexGroups = device.deviceFieldComplexGroups;
        let newDeviceComplexGroups = deviceData.deviceFieldComplexGroups;

        for (let oldGroup of oldDeviceComplexGroups) {
            try {
                getComplexGroup(deviceData, oldGroup.id);
            } catch {
                await this.db.deleteComplexGroup(deviceId, oldGroup.id);
                device = await this.getDevicebyId(deviceId);
            }
        }

        for (let newGroup of newDeviceComplexGroups) {
            let oldGroup: IComplexFieldGroup;
            try {
                oldGroup = getComplexGroup(device, newGroup.id);
            }
            catch {
                await this.db.addComplexGroup(deviceId, newGroup.id, newGroup.groupName);
                device = await this.getDevicebyId(deviceId);
            }

            oldGroup = getComplexGroup(device, newGroup.id);

            if (newGroup.groupName !== oldGroup.groupName) {
                await this.db.renameComplexGroup(deviceId, newGroup.id, newGroup.groupName);
            }

            let oldComplexGroupStates = oldGroup.fieldGroupStates;
            let newComplexGroupStates = newGroup.fieldGroupStates;
            for (let oldState of oldComplexGroupStates) {
                try {
                    getComplexGroupState(newGroup, oldState.id);
                } catch {
                    await this.db.deleteComplexGroupState(deviceId, newGroup.id, oldState.id);
                }
            }

            for (let newState of newComplexGroupStates) {
                let oldState: IComplexFieldGroupState;
                try {
                    oldState = getComplexGroupState(oldGroup, newState.id);
                }
                catch {
                    await this.db.addComplexGroupState(deviceId, newGroup.id, newState.id, newState.stateName);
                    device = await this.getDevicebyId(deviceId);
                }
                oldState = getComplexGroupState(getComplexGroup(device, newGroup.id), newState.id);

                if (newState.stateName !== oldState.stateName) {
                    await this.db.renameComplexGroupState(deviceId, newGroup.id, newState.id, newState.stateName);
                }

                let oldComplexGroupFields = oldState.fields;
                let newComplexGroupFields = newState.fields;

                for (let oldField of oldComplexGroupFields) {
                    try {
                        getFieldInComplexGroup(newState, oldField.id);
                    } catch {
                        await this.db.deleteFieldInComplexGroup(deviceId, newGroup.id, newState.id, oldField.id);
                    }
                }

                for (let newField of newComplexGroupFields) {
                    let oldField: IDeviceFieldBasic;
                    try {
                        oldField = getFieldInComplexGroup(oldState, newField.id);
                    }
                    catch {
                        await this.db.addFieldInComplexGroup(deviceId, newGroup.id, newState.id, newField);
                        device = await this.getDevicebyId(deviceId);
                    }
                    oldField = getFieldInComplexGroup(getComplexGroupState(getComplexGroup(device, newGroup.id), newState.id), newField.id);

                    if (newField.fieldName !== oldField.fieldName) {
                        await this.db.renameFieldInComplexGroup(deviceId, newGroup.id, newState.id, newField.id, newField.fieldName);
                    }

                    if (compareFields(newField, oldField) === false) {
                        await this.db.deleteFieldInComplexGroup(deviceId, newGroup.id, newState.id, newField.id);
                        await this.db.addFieldInComplexGroup(deviceId, newGroup.id, newState.id, newField);
                    }
                }
            }
        }
    }



}