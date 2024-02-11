import { IComplexFieldGroupState, IDevice, IDeviceFieldBasic, IUser } from "../models/basicModels";
import { ERightType, IUserRightComplexGroup, IUserRightDevice, IUserRightField, IUserRightGroup } from "../models/userRightsModels";
import { DBSingletonFactory } from "../firestoreDB/singletonService";
import { Db } from "../firestoreDB/db";
import { IAllDeviceRightsForAdminResponse, IComplexFieldGroupForUser, IDeviceFieldBasicForUser, IDeviceForUser, IFieldGroupForUser, IGroupRightsForAdmin } from "models/frontendModels";
import { getCurrentTimeUNIX } from "../generalStuff/timeHandlers";
import { bridge_getDevicebyId, bridge_getUserbyId, bridge_getUsers } from "./serviceBridge";

export class UserPermissionService {

    private db: Db;

    constructor() {
        this.db = DBSingletonFactory.getInstance();
    }

    async getDevicebyId(deviceId: number): Promise<IDevice> {
        return await bridge_getDevicebyId(deviceId);
    }

    async getUsers(): Promise<IUser[]> {
        return await bridge_getUsers();
    }

    async getUserbyId(userId: number): Promise<IUser> {
        return await bridge_getUserbyId(userId);
    }

    async checkUserRightToDevice(user: IUser, deviceId: number, device?: IDevice): Promise<ERightType> {
        if (!device) {
            try {
                device = await this.getDevicebyId(deviceId);
            } catch {
                return ERightType.None;
            }
        }
        if (device.userAdminId === user.id) {
            return ERightType.Write;
        }
        let userRightsToDevices = user.userRight.rightsToDevices;
        for (let right of userRightsToDevices) {
            if (right.deviceId === deviceId) {
                return right.readOnly ? ERightType.Read : ERightType.Write;
            }
        }
        return ERightType.None;
    }

    async checkUserRightToComplexGroup(user: IUser, deviceId: number, complexGroupId: number, device?: IDevice): Promise<ERightType> {
        let rightToDevice = await this.checkUserRightToDevice(user, deviceId, device);
        if (rightToDevice === ERightType.Write) {
            return ERightType.Write;
        }

        let rightToComplexGroup = ERightType.None;
        let userRightsToComplexGroups = user.userRight.rightsToComplexGroups;
        for (let right of userRightsToComplexGroups) {
            if (right.deviceId === deviceId && right.complexGroupId === complexGroupId) {
                if (!right.readOnly) {
                    return ERightType.Write;
                }
                // else
                rightToComplexGroup = ERightType.Read;
                break;
            }
        }
        if (rightToComplexGroup === ERightType.Read || rightToDevice === ERightType.Read) return ERightType.Read;
        return ERightType.None;
    }

    async checkUserRightToGroup(user: IUser, deviceId: number, groupId: number, device?: IDevice): Promise<ERightType> {
        let rightToDevice = await this.checkUserRightToDevice(user, deviceId, device);
        if (rightToDevice === ERightType.Write) {
            return ERightType.Write;
        }
        let rightToGroup = ERightType.None;
        let userRightsToGroups = user.userRight.rightsToGroups;
        for (let right of userRightsToGroups) {
            if (right.deviceId === deviceId && right.groupId === groupId) {
                if (!right.readOnly) {
                    return ERightType.Write;
                }
                // else
                rightToGroup = ERightType.Read;
                break;
            }
        }
        if (rightToGroup === ERightType.Read || rightToDevice === ERightType.Read) {
            return ERightType.Read;
        }
        return ERightType.None;
    }

    async checkUserRightToField(user: IUser, deviceId: number, groupId: number, fieldId: number, device?: IDevice): Promise<ERightType> {
        let rightToGroup = await this.checkUserRightToGroup(user, deviceId, groupId, device);
        if (rightToGroup === ERightType.Write) {
            return ERightType.Write;
        }
        let rightToField = ERightType.None;
        let userRightsToField = user.userRight.rightsToFields;
        for (let right of userRightsToField) {
            if (right.deviceId === deviceId && right.groupId === groupId && right.fieldId === fieldId) {
                if (!right.readOnly) {
                    return ERightType.Write;
                }
                //else
                rightToField = ERightType.Read;
                break;
            }
        }
        if (rightToField === ERightType.Read || rightToGroup === ERightType.Read) {
            return ERightType.Read;
        }
        return ERightType.None;
    }

    async addDeviceWriteUserRightToAdmin(user:IUser, deviceId: number){
        let right: IUserRightDevice = {
            deviceId: deviceId,
            readOnly: false,
        };
        await this.db.addUserRightToDevice(user.id, right);
    }

    async addUserRightToDevice(user: IUser, deviceId: number, readOnly: boolean) {
        let currUserRight = await this.checkUserRightToDevice(user, deviceId);
        if (!readOnly) { //write
            if (currUserRight === ERightType.Write) {
                return;
            }
            else if (currUserRight === ERightType.Read) {
                await this.deleteNestedRightsForDevice(user, deviceId, false);
            }
            else {
                await this.deleteNestedRightsForDevice(user, deviceId, false);
            }
        }
        else { //read
            if (currUserRight === ERightType.Write) { }
            else if (currUserRight === ERightType.Read) {
                return;
            }
            else {
                await this.deleteNestedRightsForDevice(user, deviceId, true);
            }
        }
        let right: IUserRightDevice = {
            deviceId: deviceId,
            readOnly: readOnly,
        };
        await this.db.addUserRightToDevice(user.id, right);
    }

    async addUserRightToGroup(user: IUser, deviceId: number, groupId: number, readOnly: boolean) {
        let currUserRightToDevice = await this.checkUserRightToDevice(user, deviceId);
        let currUserRightToGroup = await this.checkUserRightToGroup(user, deviceId, groupId);

        if (!readOnly) { //write
            if (currUserRightToDevice === ERightType.Write) {
                return;
            }
            else if (currUserRightToGroup === ERightType.Write) {
                return;
            }
            else if (currUserRightToGroup === ERightType.Read) {
                await this.deleteNestedRightsForGroup(user, deviceId, groupId, false);
            }
            else { }
        }
        else { //read
            if (currUserRightToDevice === ERightType.Write) {
                return;
            }
            else if (currUserRightToDevice === ERightType.Read) {
                return;
            }
            else if (currUserRightToGroup === ERightType.Write) { }
            else if (currUserRightToGroup === ERightType.Read) {
                return;
            }
            else { }
        }

        let right: IUserRightGroup = {
            deviceId: deviceId,
            groupId: groupId,
            readOnly: readOnly,
        };
        await this.deleteNestedRightsForGroup(user, deviceId, groupId, readOnly);
        await this.db.addUserRightToGroup(user.id, right);
    }

    async addUserRightToField(user: IUser, deviceId: number, groupId: number, fieldId: number, readOnly: boolean) {
        let currUserRightToDevice = await this.checkUserRightToDevice(user, deviceId);
        let currUserRightToGroup = await this.checkUserRightToGroup(user, deviceId, groupId);
        let currUserRightToField = await this.checkUserRightToField(user, deviceId, groupId, fieldId);

        if (!readOnly) { //write
            if (currUserRightToDevice === ERightType.Write) {
                return;
            }
            else if (currUserRightToGroup === ERightType.Write) {
                return;
            }
            else if (currUserRightToField === ERightType.Write) {
                return;
            }
            else if (currUserRightToField === ERightType.Read) { }
        }
        else { //read //TODO fix THIS ASAP
            if (currUserRightToDevice === ERightType.Write) {
                return;
            }
            else if (currUserRightToGroup === ERightType.Write) {
                return;
            }
            else if (currUserRightToField === ERightType.Write) { }
            else if (currUserRightToField === ERightType.Read) {
                return;
            }
            else { }
        }

        let right: IUserRightField = {
            deviceId: deviceId,
            groupId: groupId,
            fieldId: fieldId,
            readOnly: readOnly,
        };
        await this.db.addUserRightToField(user.id, right);
    }

    async addUserRightToComplexGroup(user: IUser, deviceId: number, complexGroupId: number, readOnly: boolean) {
        let currUserRightToDevice = await this.checkUserRightToDevice(user, deviceId);
        let currUserRightToComplexGroup = await this.checkUserRightToComplexGroup(user, deviceId, complexGroupId);
        if (!readOnly) { //write
            if (currUserRightToDevice === ERightType.Write) {
                return;
            }
            else if (currUserRightToComplexGroup === ERightType.Write) {
                return;
            }
            else if (currUserRightToComplexGroup === ERightType.Read) {
            }
            else { }
        }
        else { //read
            if (currUserRightToDevice === ERightType.Write) {
                return;
            }
            else if (currUserRightToDevice === ERightType.Read) {
                return;
            }
            else if (currUserRightToComplexGroup === ERightType.Write) { }
            else if (currUserRightToComplexGroup === ERightType.Read) {
                return;
            }
            else { }
        }

        let right: IUserRightComplexGroup = {
            deviceId: deviceId,
            complexGroupId: complexGroupId,
            readOnly: readOnly,
        };
        await this.db.addUserRightToComplexGroup(user.id, right);
    }

    async deleteNestedRightsForDevice(user: IUser, deviceId: number, onlyDeleteReadRights: boolean) {
        for (let groupRight of user.userRight.rightsToGroups) {
            if (groupRight.deviceId === deviceId) {
                if (!onlyDeleteReadRights || groupRight.readOnly) {
                    await this.db.deleteUserRightToGroup(user.id, deviceId, groupRight.groupId);
                }
            }
        }
        for (let fieldRight of user.userRight.rightsToFields) {
            if (fieldRight.deviceId === deviceId) {
                if (!onlyDeleteReadRights || fieldRight.readOnly) {
                    await this.db.deleteUserRightToField(user.id, deviceId, fieldRight.groupId, fieldRight.fieldId);
                }
            }
        }
        for (let complexGroupRight of user.userRight.rightsToComplexGroups) {
            if (complexGroupRight.deviceId === deviceId) {
                if (!onlyDeleteReadRights || complexGroupRight.readOnly) {
                    await this.db.deleteUserRightToComplexGroup(user.id, deviceId, complexGroupRight.complexGroupId);
                }
            }
        }
    }

    async deleteNestedRightsForGroup(user: IUser, deviceId: number, groupId: number, onlyDeleteReadRights: boolean) {
        for (let fieldRight of user.userRight.rightsToFields) {
            if (fieldRight.deviceId === deviceId && fieldRight.groupId === groupId) {
                if (!onlyDeleteReadRights || fieldRight.readOnly) {
                    await this.db.deleteUserRightToField(user.id, deviceId, groupId, fieldRight.fieldId);
                }
            }
        }
    }

    async deleteUserRightToDevice(userId: number, deviceId: number) {
        await this.db.deleteUserRightToDevice(userId, deviceId);
    }

    async deleteUserRightToGroup(userId: number, deviceId: number, groupId: number) {
        await this.db.deleteUserRightToGroup(userId, deviceId, groupId);
    }

    async deleteUserRightToField(userId: number, deviceId: number, groupId: number, fieldId: number) {
        await this.db.deleteUserRightToField(userId, deviceId, groupId, fieldId);
    }

    async deleteUserRightToComplexGroup(userId: number, deviceId: number, complexGroupId: number) {
        await this.db.deleteUserRightToComplexGroup(userId, deviceId, complexGroupId);
    }

    async deleteDeviceOnAllUsers(deviceId: number) {
        const allUsers = await this.getUsers();
        for (let user of allUsers) {
            await this.deleteUserRightToDevice(user.id, deviceId);
        }
    }

    async deleteGroupOnAllUsers(deviceId: number, groupId: number) {
        const allUsers = await this.getUsers();
        for (let user of allUsers) {
            await this.deleteUserRightToGroup(user.id, deviceId, groupId);
        }
    }

    async deleteFieldOnAllUsers(deviceId: number, groupId: number, fieldId: number) {
        const allUsers = await this.getUsers();
        for (let user of allUsers) {
            await this.deleteUserRightToField(user.id, deviceId, groupId, fieldId);
        }
    }

    async deleteComplexGroupOnAllUsers(deviceId: number, complexGroupId: number) {
        const allUsers = await this.getUsers();
        for (let user of allUsers) {
            await this.deleteUserRightToComplexGroup(user.id, deviceId, complexGroupId);
        }
    }

    async deleteUserRightForNewAdmin(userId: number, deviceId: number) {
        this.db.deleteUserRightToDevice(userId, deviceId);
    }

    async getAllUsersWithRightToDevice(deviceData: IDevice): Promise<IUser[]> {
        let users = await this.getUsers();
        let result: IUser[] = [];
        for (let user of users) {
            if (await this.checkAnyUserRightToDevice(user, deviceData)) {
                result.push(user);
            }
        }
        return result;
    }

    async checkAnyUserRightToDevice(user: IUser, device: IDevice): Promise<boolean> {
        let right = await this.checkUserRightToDevice(user, device.id, device);
        if (right === ERightType.Read || right === ERightType.Write) {
            return true;
        }

        for (let group of device.deviceFieldGroups) {
            let right = await this.checkUserRightToGroup(user, device.id, group.id, device);
            if (right === ERightType.Read || right === ERightType.Write) {
                return true;
            }
            for (let field of group.fields) {
                let right = await this.checkUserRightToField(user, device.id, group.id, field.id, device);
                if (right === ERightType.Read || right === ERightType.Write) {
                    return true;
                }
            }
        }
        for (let complexGroup of device.deviceFieldComplexGroups) {
            let right = await this.checkUserRightToComplexGroup(user, device.id, complexGroup.id, device);
            if (right === ERightType.Read || right === ERightType.Write) {
                return true;
            }
        }
        return false;
    }

    async changeDeviceAdmin(deviceId: number, userId: number) {
        let device: IDevice = await this.getDevicebyId(deviceId);
        if (device.userAdminId === userId) {
            throw ({ message: 'User is already the admin' });
        }
        let previousAdmin = await this.getUserbyId(device.userAdminId);
        await this.addDeviceWriteUserRightToAdmin(previousAdmin, deviceId);
        await this.db.changeDeviceAdmin(deviceId, userId);
        await this.db.deleteUserRightForNewAdmin(userId, deviceId);
    }

    async getDeviceForUser(user: IUser, device: IDevice, isActive: boolean): Promise<IDeviceForUser | undefined> {
        if (! await this.checkAnyUserRightToDevice(user, device)) return;
        let deviceReduced: IDeviceForUser = {
            id: device.id,
            deviceKey: device.deviceKey,
            deviceName: device.deviceName,
            userAdminId: device.userAdminId,
            deviceFieldGroups: [],
            deviceFieldComplexGroups: [],
            updateTimeStamp: 0,
            isActive: isActive,
        }

        for (let group of device.deviceFieldGroups) {
            let groupReduced: IFieldGroupForUser = {
                id: group.id,
                groupName: group.groupName,
                fields: [],
            }
            for (let field of group.fields) {
                let fieldRight = await this.checkUserRightToField(user, device.id, group.id, field.id, device);
                if (fieldRight === ERightType.None) continue;

                let fieldReduced: IDeviceFieldBasicForUser = {
                    deviceId: field.deviceId,
                    groupId: field.groupId,
                    id: field.id,
                    fieldName: field.fieldName,
                    fieldType: field.fieldType,
                    fieldValue: field.fieldValue,
                    readOnly: fieldRight === ERightType.Read,
                }
                groupReduced.fields.push(fieldReduced);
            }
            if (groupReduced.fields.length > 0) {
                deviceReduced.deviceFieldGroups.push(groupReduced);
            }
        }

        for (let complexGroup of device.deviceFieldComplexGroups) {
            let complexGroupRight = await this.checkUserRightToComplexGroup(user, device.id, complexGroup.id, device);
            if (complexGroupRight === ERightType.None) continue;

            let complexGroupReduced: IComplexFieldGroupForUser = {
                id: complexGroup.id,
                groupName: complexGroup.groupName,
                currentState: complexGroup.currentState,
                fieldGroupStates: [],
                readOnly: complexGroupRight === ERightType.Read,
            }
            let states: IComplexFieldGroupState[] = [];
            for(let state of complexGroup.fieldGroupStates){
                let fields: IDeviceFieldBasic[] = [];
                for(let field of state.fields){
                    if(complexGroupRight == ERightType.Read){
                        field.fieldValue.fieldDirection = "output";
                    }
                    fields.push(field);
                }
                states.push(state);
            }
            complexGroupReduced.fieldGroupStates = states;
            deviceReduced.deviceFieldComplexGroups.push(complexGroupReduced);
        }
        deviceReduced.updateTimeStamp = getCurrentTimeUNIX();
        return deviceReduced;
    }

    async getUsersRightsToDevice(adminId: number, device: IDevice): Promise<IAllDeviceRightsForAdminResponse> {
        let result = this.setupBasicDeviceStructureForUserPermissionsDataforAdmin(device);
        let users = await this.getUsers();
        for (let user of users) {
            if (user.id === adminId) continue;

            let deviceRight = await this.checkUserRightToDevice(user, device.id, device);
            if (deviceRight === ERightType.Write) {
                result.userPermissions.push({
                    userId: user.id,
                    username: user.username,
                    readOnly: false,
                });
                continue;
            }
            else if (deviceRight === ERightType.Read) {
                result.userPermissions.push({
                    userId: user.id,
                    username: user.username,
                    readOnly: true,
                });
            }
            for (let group of result.groups) {
                let groupRight = await this.checkUserRightToGroup(user, device.id, group.groupId, device);
                if (groupRight === ERightType.Write) {
                    group.userPermissions.push({
                        userId: user.id,
                        username: user.username,
                        readOnly: false,
                    });
                    continue;
                }
                else if (groupRight === ERightType.Read && deviceRight !== ERightType.Read) {
                    group.userPermissions.push({
                        userId: user.id,
                        username: user.username,
                        readOnly: true,
                    });
                }
                for (let field of group.fields) {
                    let fieldRight = await this.checkUserRightToField(user, device.id, group.groupId, field.fieldId, device);
                    if (fieldRight === ERightType.Write) {
                        field.userPermissions.push({
                            userId: user.id,
                            username: user.username,
                            readOnly: false,
                        });
                    }
                    else if (fieldRight === ERightType.Read && groupRight !== ERightType.Read) {
                        field.userPermissions.push({
                            userId: user.id,
                            username: user.username,
                            readOnly: true,
                        });
                    }
                }
            }
            for (let complexGroup of result.complexGroups) {
                let complexGroupRight = await this.checkUserRightToComplexGroup(user, device.id, complexGroup.complexGroupId, device);

                if (complexGroupRight === ERightType.Write) {
                    complexGroup.userPermissions.push({
                        userId: user.id,
                        username: user.username,
                        readOnly: false,
                    });
                }
                else if (complexGroupRight === ERightType.Read && deviceRight !== ERightType.Read) {
                    complexGroup.userPermissions.push({
                        userId: user.id,
                        username: user.username,
                        readOnly: true,
                    });
                }
            }
        }
        return result;
    }

    setupBasicDeviceStructureForUserPermissionsDataforAdmin(device: IDevice): IAllDeviceRightsForAdminResponse {
        let result: IAllDeviceRightsForAdminResponse = {
            userPermissions: [],
            groups: [],
            complexGroups: [],
        };
        for (let group of device.deviceFieldGroups) {
            let thisGroup: IGroupRightsForAdmin = {
                groupId: group.id,
                groupName: group.groupName,
                fields: [],
                userPermissions: [],
            }
            for (let field of group.fields) {
                thisGroup.fields.push({
                    fieldId: field.id,
                    fieldType: field.fieldType,
                    fieldName: field.fieldName,
                    userPermissions: [],
                });
            }
            result.groups.push(thisGroup);
        }
        for (let complexGroup of device.deviceFieldComplexGroups) {
            result.complexGroups.push({
                complexGroupId: complexGroup.id,
                complexGroupName: complexGroup.groupName,
                userPermissions: [],
            });
        }
        return result;
    }
}