import { IAuthToken, IComplexFieldGroup, IComplexFieldGroupState, IDevice, IDeviceFieldBasic, IDeviceFieldMultipleChoice, IDeviceFieldNumeric, IFieldGroup, IRGB, IUser } from "../models/basicModels";
import { FirestoreDB } from "./firestore";
import { firestoreSingletonFactory } from "./singletonService";
import { transformDeviceData, transformUserRights } from "./dataTransformations";
import { v4 as uuid } from 'uuid';
import { addDaysToCurrentTime, getCurrentTimeUNIX } from "../generalStuff/timeHandlers";
import { ERightType, IUserRight, IUserRightComplexGroup, IUserRightDevice, IUserRightField, IUserRightGroup } from "../models/userRightsModels";
import { IEmailConfirmationData, IForgotPasswordData } from "../emailService/emailModels";
import { EmailService, emailServiceSingletonFactory } from "../emailService/emailService";
import { IAllDeviceRightsForAdminResponse, IComplexFieldGroupForUser, IDeviceFieldBasicForUser, IDeviceForDevice, IDeviceForUser, IFieldGroupForUser, IGroupRightsForAdmin } from "../models/frontendModels";
import { FieldValue } from "firebase-admin/firestore";
import { getComplexGroup, getComplexGroupState, getDeviceField, getDeviceFieldGroup, getFieldInComplexGroup } from "./deviceStructureFunctions";

export class Db {
    static usersCollName = 'users';
    static authTokenCollName = 'authTokens';
    static emailConfirmationsCollName = 'emailConfirmations';
    static forgetPasswordRequestsCollName = 'forgotPasswords';
    static devCollName = 'devices';
    static maxIDsCollName = 'maxIDs';

    static maxId_userKey = 'user';
    static maxId_deviceKey = 'device';
    static maxId_fieldGroupKey = 'fieldGroup';
    static maxId_fieldKey = 'field';

    firestore: FirestoreDB;
    emailService: EmailService;

    constructor() {
        this.firestore = firestoreSingletonFactory.getInstance();
        this.emailService = emailServiceSingletonFactory.getInstance();
    }


    //<USER>
    async getUserbyId(id: number): Promise<IUser> {
        let user: IUser = await this.firestore.getDocumentData(Db.usersCollName, `${id}`);
        if (!user) throw ({ message: 'User doesn\'t exist' });
        user.userRight = transformUserRights(user.userRight);
        return user;
    }

    async getUsers(): Promise<IUser[]> {
        let users: IUser[] = await this.firestore.getCollectionData(Db.usersCollName);
        for (let user of users) {
            user.userRight = transformUserRights(user.userRight);
        }
        return users;
    }

    async addUser(newUser: IUser): Promise<void> {
        await this.firestore.setDocumentValue(Db.usersCollName, `${newUser.id}`, newUser);
    }

    async changeUsername(id: number, username: string) {
        let user = await this.getUserbyId(id);
        if (!user) {
            throw ({ message: 'User doesn\'t exist in database' });
        }
        user.username = username;
        await this.firestore.updateDocumentValue(Db.usersCollName, `${id}`, user);
    }

    async updateUserEmail(userId: number, email: string) {
        await this.firestore.updateDocumentValue(Db.usersCollName, `${userId}`, { email: email });
    }

    async updateUserPassword(userId: number, password: string) {
        await this.firestore.updateDocumentValue(Db.usersCollName, `${userId}`, { password: password });
    }

    async deleteUser(userId: number) {
        await this.firestore.deleteDocument(Db.usersCollName, `${userId}`);
        let tokens = await this.getTokens();
        tokens.forEach(async token => {
            if (token.userId === userId) {
                await this.firestore.deleteDocument(Db.authTokenCollName, token.authToken);
            }
        });
    }
    //</USER>

    //<TOKENs>
    async generateAndSaveNewToken(userId: number): Promise<IAuthToken> {

        const newAuthToken = uuid().replace('-', '');
        const authToken: IAuthToken = {} as IAuthToken;

        authToken.authToken = newAuthToken;
        authToken.userId = userId;
        authToken.validUntil = addDaysToCurrentTime(30);

        await this.firestore.setDocumentValue(Db.authTokenCollName, newAuthToken, authToken);

        return authToken;
    }

    async getToken(token: string): Promise<IAuthToken> {
        return await this.firestore.getDocumentData(Db.authTokenCollName, token);
    }

    async extendToken(token: string): Promise<void> {
        await this.firestore.updateDocumentValue(Db.authTokenCollName, token, {
            validUntil: addDaysToCurrentTime(30)
        });
    }

    async getTokens(): Promise<IAuthToken[]> {
        return await this.firestore.getCollectionData(Db.authTokenCollName);
    }

    async removeToken(token: string) {
        let authTokenDB: IAuthToken = await this.firestore.getDocumentData(Db.authTokenCollName, token);
        if (!authTokenDB) {
            throw ({ message: 'Couldn\'t find token' });
        }
        await this.firestore.deleteDocument(Db.authTokenCollName, token);
    }

    async removeAllMyTokens(dontRemoveToken: string) {
        let authTokenDB: IAuthToken = await this.firestore.getDocumentData(Db.authTokenCollName, dontRemoveToken);
        if (!authTokenDB) {
            throw ({ message: 'Couldn\'t find token' });
        }
        const allAuthTokens: IAuthToken[] = await this.firestore.getCollectionData(Db.authTokenCollName);
        allAuthTokens.forEach(async token => { //TODO maybe regular for loop
            if (token.userId == authTokenDB.userId && token.authToken !== dontRemoveToken) {
                await this.firestore.deleteDocument(Db.authTokenCollName, `${token.authToken}`);
            }
        })
    }
    //</TOKENs>

    //<USER_RIGHTS>
    async getUserRights(userId: number): Promise<IUserRight> {
        let user = await this.getUserbyId(userId);
        return user.userRight;
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
        await this.firestore.updateDocumentValue(Db.usersCollName, `${user.id}`, {
            [`userRight.rightsToDevices.${deviceId}`]: right,
        });
    }


    async deleteUserRightToDevice(user: IUser, deviceId: number) {
        // await this.deleteNestedRightsForDevice(user, deviceId, false);
        await this.firestore.updateDocumentValue(Db.usersCollName, `${user.id}`, {
            [`userRight.rightsToDevices.${deviceId}`]: FieldValue.delete()
        });
    }

    async addUserRightToGroup(user: IUser, deviceId: number, groupId: number, readOnly: boolean) {
        let currUserRightToDevice = await this.checkUserRightToDevice(user, deviceId);
        let currUserRightToGroup = await this.checkUserRightToComplexGroup(user, deviceId, groupId);

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
        await this.firestore.updateDocumentValue(Db.usersCollName, `${user.id}`, {
            [`userRight.rightsToGroups.${deviceId}.${groupId}`]: right,
        });
    }

    async deleteUserRightToGroup(user: IUser, deviceId: number, groupId: number) {
        // await this.deleteNestedRightsForGroup(user, deviceId, groupId, false);
        await this.firestore.updateDocumentValue(Db.usersCollName, `${user.id}`, {
            [`userRight.rightsToGroups.${deviceId}.${groupId}`]: FieldValue.delete()
        });
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
        else { //read
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
        await this.firestore.updateDocumentValue(Db.usersCollName, `${user.id}`, {
            [`userRight.rightsToFields.${deviceId}.${groupId}.${fieldId}`]: right
        });
    }

    async deleteUserRightToField(user: IUser, deviceId: number, groupId: number, fieldId: number) {
        await this.firestore.updateDocumentValue(Db.usersCollName, `${user.id}`, {
            [`userRight.rightsToFields.${deviceId}.${groupId}.${fieldId}`]: FieldValue.delete()
        });
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
        await this.firestore.updateDocumentValue(Db.usersCollName, `${user.id}`, {
            [`userRight.rightsToComplexGroups.${deviceId}.${complexGroupId}`]: right
        });
    }

    async deleteUserRightToComplexGroup(user: IUser, deviceId: number, complexGroupId: number) {
        await this.firestore.updateDocumentValue(Db.usersCollName, `${user.id}`, {
            [`userRight.rightsToComplexGroups.${deviceId}.${complexGroupId}`]: FieldValue.delete()
        });
    }

    async deleteNestedRightsForDevice(user: IUser, deviceId: number, onlyDeleteReadRights: boolean) {
        for (let groupRight of user.userRight.rightsToGroups) {
            if (groupRight.deviceId === deviceId) {
                if (!onlyDeleteReadRights || groupRight.readOnly) {
                    await this.deleteUserRightToGroup(user, deviceId, groupRight.groupId);
                }
            }
        }
        for (let fieldRight of user.userRight.rightsToFields) {
            if (fieldRight.deviceId === deviceId) {
                if (!onlyDeleteReadRights || fieldRight.readOnly) {
                    await this.deleteUserRightToField(user, deviceId, fieldRight.groupId, fieldRight.fieldId);
                }
            }
        }
        for (let complexGroupRight of user.userRight.rightsToComplexGroups) {
            if (complexGroupRight.deviceId === deviceId) {
                if (!onlyDeleteReadRights || complexGroupRight.readOnly) {
                    await this.deleteUserRightToComplexGroup(user, deviceId, complexGroupRight.complexGroupId);
                }
            }
        }
    }

    async deleteNestedRightsForGroup(user: IUser, deviceId: number, groupId: number, onlyDeleteReadRights: boolean) {
        for (let fieldRight of user.userRight.rightsToFields) {
            if (fieldRight.deviceId === deviceId && fieldRight.groupId === groupId) {
                if (!onlyDeleteReadRights || fieldRight.readOnly) {
                    await this.deleteUserRightToField(user, deviceId, groupId, fieldRight.fieldId);
                }
            }
        }
    }

    async deleteDeviceOnAllUsers(deviceId: number) {
        const allUsers = await this.getUsers();
        for (let user of allUsers) {
            await this.deleteUserRightToDevice(user, deviceId);
        }
    }

    async deleteGroupOnAllUsers(deviceId: number, groupId: number) {
        const allUsers = await this.getUsers();
        for (let user of allUsers) {
            await this.deleteUserRightToGroup(user, deviceId, groupId);
        }
    }

    async deleteFieldOnAllUsers(deviceId: number, groupId: number, fieldId: number) {
        const allUsers = await this.getUsers();
        for (let user of allUsers) {
            await this.deleteUserRightToField(user, deviceId, groupId, fieldId);
        }
    }

    async deleteComplexGroupOnAllUsers(deviceId: number, complexGroupId: number) {
        const allUsers = await this.getUsers();
        for (let user of allUsers) {
            await this.deleteUserRightToComplexGroup(user, deviceId, complexGroupId);
        }
    }

    async giveWriteDeviceRightsToUser(userId: number, deviceId: number) {
        let user = await this.getUserbyId(userId);
        await this.addUserRightToDevice(user, deviceId, false);
    }

    async deleteUserRightForNewAdmin(userId: number, deviceId: number) {
        let user = await this.getUserbyId(userId);
        this.deleteUserRightToDevice(user, deviceId);
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
    //</USER_RIGHTS>

    //<DEVICE>
    private async getDevices(): Promise<IDevice[]> {
        return await this.firestore.getCollectionData(Db.devCollName);
    }

    async getTransformedDevices(): Promise<IDevice[]> {
        let devices = await this.getDevices();
        let transformedDevices: IDevice[] = [];
        for (let device of devices) {
            let transformedDevice = transformDeviceData(device)
            transformedDevices.push(transformedDevice)
        }
        return transformedDevices;
    }

    async getDevicebyId(id: number): Promise<IDevice> {
        let device: IDevice = await this.firestore.getDocumentData(Db.devCollName, `${id}`);
        if (!device) {
            throw ({ message: 'Device doesn\'t exist' });
        }
        device = transformDeviceData(device);
        return device;
    }

    async getDevicebyKey(key: string): Promise<IDevice> {
        const allDevices = await this.getDevices();
        let device = allDevices.find(o => o.deviceKey === key);
        if (!device) {
            throw ({ message: 'Device doesn\'t exist' });
        }
        device = transformDeviceData(device);
        return device;
    }

    async addDevice(newDevice: IDevice): Promise<void> {
        await this.firestore.setDocumentValue(Db.devCollName, `${newDevice.id}`, newDevice);
    }

    async renameDevice(id: number, deviceName: string) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${id}`, {
            deviceName: deviceName,
        });
    }

    async deleteDevice(id: number) {
        await this.firestore.deleteDocument(Db.devCollName, `${id}`);
        await this.deleteDeviceOnAllUsers(id);
    }

    async changeDeviceAdmin(deviceId: number, userId: number) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            userAdminId: userId,
        });
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
                fieldGroupStates: complexGroup.fieldGroupStates,
                readOnly: complexGroupRight === ERightType.Read,
            }
            deviceReduced.deviceFieldComplexGroups.push(complexGroupReduced);
        }
        deviceReduced.updateTimeStamp = getCurrentTimeUNIX();
        return deviceReduced;
    }

    async getDeviceForDevice(device: IDevice) {
        let deviceData: IDeviceForDevice = {
            id: device.id,
            deviceKey: device.deviceKey,
            deviceName: device.deviceName,
            deviceFieldGroups: device.deviceFieldGroups,
            deviceFieldComplexGroups: device.deviceFieldComplexGroups,
            userAdminId: device.userAdminId,
            updateTimeStamp: getCurrentTimeUNIX(),
        }
        return deviceData;
    }

    async addDeviceFieldGroup(deviceId: number, groupId: number, groupName: string): Promise<void> {
        // let device = await this.getDevicebyId(deviceId);
        let newGroup: IFieldGroup = {
            id: groupId,
            groupName: groupName,
            fields: [],
        }

        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldGroups.${newGroup.id}`]: newGroup
        });
    }

    async renameDeviceFieldGroup(deviceId: number, groupId: number, groupName: string) {
        let device = await this.getDevicebyId(deviceId);
        getDeviceFieldGroup(device, groupId);

        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.groupName`]: groupName
        });
    }

    async deleteDeviceFieldGroup(deviceId: number, groupId: number) {
        let device = await this.getDevicebyId(deviceId);
        getDeviceFieldGroup(device, groupId);

        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldGroups.${groupId}`]: FieldValue.delete()
        })

        await this.deleteGroupOnAllUsers(deviceId, groupId);
    }

    async addDeviceField(deviceId: number, groupId: number, deviceField: IDeviceFieldBasic): Promise<void> {
        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${deviceField.id}`]: deviceField,
        });
    }

    async renameDeviceField(deviceId: number, groupId: number, fieldId: number, fieldName: string) {
        let device = await this.getDevicebyId(deviceId);
        let groupField = getDeviceFieldGroup(device, groupId);
        getDeviceField(groupField, fieldId);
        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${fieldId}.fieldName`]: fieldName
        });
    }

    async deleteDeviceField(deviceId: number, groupId: number, fieldId: number) {
        let device = await this.getDevicebyId(deviceId);
        let groupField = getDeviceFieldGroup(device, groupId);
        getDeviceField(groupField, fieldId);
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${fieldId}`]: FieldValue.delete()
        });

        await this.deleteFieldOnAllUsers(deviceId, groupId, fieldId);
    }

    async changeDeviceFieldValueFromDevice(deviceKey: string, groupId: number, fieldId: number, fieldValue: any) {
        let device = await this.getDevicebyKey(deviceKey);
        let group = getDeviceFieldGroup(device, groupId);
        let field = getDeviceField(group, fieldId);
        await this.tryToChangeDeviceFieldValue(device.id, groupId, field, fieldValue);
    }

    async changeDeviceFieldValueFromUser(deviceId: number, groupId: number, fieldId: number, fieldValue: any) {
        let device = await this.getDevicebyId(deviceId);
        let group = getDeviceFieldGroup(device, groupId);
        let field = getDeviceField(group, fieldId);

        if (field.fieldValue.fieldDirection === 'output') {
            throw ({ message: 'Field value is output only - can\'t be set by user' });
        }
        await this.tryToChangeDeviceFieldValue(deviceId, groupId, field, fieldValue);
    }

    private async tryToChangeDeviceFieldValue(deviceId: number, groupId: number, field: IDeviceFieldBasic, fieldValue: any) {
        if (field.fieldType === 'button' && typeof fieldValue === 'boolean') {
            await this.changeDeviceFieldValue(deviceId, groupId, field.id, fieldValue);
        }
        else if (field.fieldType === 'numeric' && typeof fieldValue === 'number') {
            let numField: IDeviceFieldNumeric = JSON.parse(JSON.stringify(field.fieldValue));
            if (fieldValue <= numField.maxValue && fieldValue >= numField.minValue) {
                let N = (fieldValue - numField.minValue) / numField.valueStep;
                if (N % 1 < 0.05 || N % 1 > 0.95) {
                    await this.changeDeviceFieldValue(deviceId, groupId, field.id, fieldValue);
                }
                else throw ({ message: 'Incorrect step' });
            }
            else throw ({ message: 'Value out of interval [min,max]' });
        }
        else if (field.fieldType === 'text' && typeof fieldValue === 'string') {
            await this.changeDeviceFieldValue(deviceId, groupId, field.id, fieldValue);
        }
        else if (field.fieldType === 'multipleChoice' && typeof fieldValue === 'number') {
            let multipleCField: IDeviceFieldMultipleChoice = JSON.parse(JSON.stringify(field.fieldValue));
            if (multipleCField.values.length > fieldValue && fieldValue >= 0) {
                await this.changeDeviceFieldValue(deviceId, groupId, field.id, fieldValue);
            }
            else throw ({ message: 'Out of range - MC field' });
        }
        else if (
            field.fieldType === 'RGB' &&
            ((!!fieldValue.R || fieldValue.R === 0) && typeof fieldValue.R === 'number' && fieldValue.R >= 0) &&
            ((!!fieldValue.G || fieldValue.G === 0) && typeof fieldValue.G === 'number' && fieldValue.G >= 0) &&
            ((!!fieldValue.B || fieldValue.B === 0) && typeof fieldValue.B === 'number' && fieldValue.B >= 0)
        ) {
            console.log('RGB');
            console.log(fieldValue);
            await this.changeDeviceFieldValueRGB(deviceId, groupId, field.id, fieldValue);
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

        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${newGroup.id}`]: newGroup
        });
    }

    async renameComplexGroup(deviceId: number, groupId: number, groupName: string) {
        let device = await this.getDevicebyId(deviceId);
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups[${groupId}].groupName`]: groupName
        });
    }

    async deleteComplexGroup(deviceId: number, groupId: number) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}`]: FieldValue.delete()
        });

        await this.deleteComplexGroupOnAllUsers(deviceId, groupId);
    }

    async addComplexGroupState(deviceId: number, groupId: number, stateId: number, stateName: string) {
        let device = await this.getDevicebyId(deviceId);
        let group = getComplexGroup(device, groupId);

        let state: IComplexFieldGroupState = {
            id: stateId,
            stateName: stateName,
            fields: [],
        };
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}`]: state
        });
    }

    async renameComplexGroupState(deviceId: number, groupId: number, stateId: number, stateName: string) {
        let device = await this.getDevicebyId(deviceId);
        let group = getComplexGroup(device, groupId);

        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.stateName`]: stateName
        });
    }

    async deleteComplexGroupState(deviceId: number, groupId: number, stateId: number) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}`]: FieldValue.delete()
        });
    }

    async addFieldInComplexGroup(deviceId: number, groupId: number, stateId: number, fieldData: IDeviceFieldBasic) {
        let device = await this.getDevicebyId(deviceId);
        let group = getComplexGroup(device, groupId);
        let state = getComplexGroupState(group, stateId);

        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldData.id}`]: fieldData
        });
    }

    async changeComplexGroupStateFromDevice(deviceKey: string, groupId: number, state: number) {
        let device = await this.getDevicebyKey(deviceKey);
        await this.tryToChangeComplexGroupState(device, groupId, state);
    }

    async changeComplexGroupStateFromUser(deviceId: number, groupId: number, state: number) {
        let device = await this.getDevicebyId(deviceId);
        await this.tryToChangeComplexGroupState(device, groupId, state);
    }

    private async tryToChangeComplexGroupState(device: IDevice, groupId: number, state: number) {
        let group = getComplexGroup(device, groupId);
        let NofStates = group.fieldGroupStates.length;
        if (state >= 0 && state < NofStates) {
            await this.firestore.updateDocumentValue(Db.devCollName, `${device.id}`, {
                [`deviceFieldComplexGroups.${groupId}.currentState`]: state
            });
        }
        else throw ({ message: 'Invalid state number' });
    }

    async deleteFieldInComplexGroup(deviceId: number, groupId: number, stateId: number, fieldId: number) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldId}`]: FieldValue.delete()
        });
    }

    async renameFieldInComplexGroup(deviceId: number, groupId: number, stateId: number, fieldId: number, fieldName: string) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldId}.fieldName`]: fieldName
        });
    }

    async changeFieldValueInComplexGroupFromDevice(deviceKey: string, groupId: number, stateId: number, fieldId: number, fieldValue: any) {
        let device = await this.getDevicebyKey(deviceKey);
        let group = getComplexGroup(device, groupId);
        let state = getComplexGroupState(group, stateId);
        let field = getFieldInComplexGroup(state, fieldId);
        await this.tryToChangeFieldValueInComplexGroup(device, groupId, stateId, field, fieldValue);
    }

    async changeFieldValueInComplexGroupFromUser(deviceId: number, groupId: number, stateId: number, fieldId: number, fieldValue: any) {
        let device = await this.getDevicebyId(deviceId);
        let group = getComplexGroup(device, groupId);
        let state = getComplexGroupState(group, stateId);
        let field = getFieldInComplexGroup(state, fieldId);
        if (field.fieldValue.fieldDirection === 'output') {
            throw ({ message: 'Field value is output only - can\'t be set by user' });
        }
        //check user rights
        await this.tryToChangeFieldValueInComplexGroup(device, groupId, stateId, field, fieldValue);
    }

    private async tryToChangeFieldValueInComplexGroup(device: IDevice, groupId: number, stateId: number, field: IDeviceFieldBasic, fieldValue: any) {


        if (field.fieldType === 'button' && typeof fieldValue === 'boolean') {
            await this.changeDeviceFieldValueInComplexGroup(device.id, groupId, stateId, field.id, fieldValue);
        }
        else if (field.fieldType === 'numeric' && typeof fieldValue === 'number') {
            let numField: IDeviceFieldNumeric = JSON.parse(JSON.stringify(field.fieldValue));
            if (fieldValue <= numField.maxValue && fieldValue >= numField.minValue) {
                let N = (fieldValue - numField.minValue) / numField.valueStep;
                if (N % 1 < 0.05 || N % 1 > 0.95) {
                    await this.changeDeviceFieldValueInComplexGroup(device.id, groupId, stateId, field.id, fieldValue);
                }
                else throw ({ message: 'Incorrect step' });
            }
            else throw ({ message: 'Value out of interval [min,max]' });

        }
        else if (field.fieldType === 'text' && typeof fieldValue === 'string') {
            await this.changeDeviceFieldValueInComplexGroup(device.id, groupId, stateId, field.id, fieldValue);
        }
        else if (field.fieldType === 'multipleChoice' && typeof fieldValue === 'number') {
            let multipleCField: IDeviceFieldMultipleChoice = JSON.parse(JSON.stringify(field.fieldValue));
            if (multipleCField.values.length > fieldValue && fieldValue >= 0) {
                await this.changeDeviceFieldValueInComplexGroup(device.id, groupId, stateId, field.id, fieldValue);
            }
            else throw ({ message: 'Out of range - MC field' });
        }
        else if (
            field.fieldType === 'RGB' &&
            ((!!fieldValue.R || fieldValue.R === 0) && typeof fieldValue.R === 'number' && fieldValue.R >= 0) &&
            ((!!fieldValue.G || fieldValue.G === 0) && typeof fieldValue.G === 'number' && fieldValue.G >= 0) &&
            ((!!fieldValue.B || fieldValue.B === 0) && typeof fieldValue.B === 'number' && fieldValue.B >= 0)
        ) {
            console.log(fieldValue);
            await this.changeDeviceFieldValueInComplexGroupRGB(device.id, groupId, stateId, field.id, fieldValue);
        }
        else {
            throw ({ message: 'Wrong field data type' });
        }
    }

    private async changeDeviceFieldValueInComplexGroup(deviceId: number, groupId: number, stateId: number, fieldId: number, fieldValue: any) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldId}.fieldValue.fieldValue`]: fieldValue
        });
    }

    private async changeDeviceFieldValueInComplexGroupRGB(deviceId: number, groupId: number, stateId: number, fieldId: number, fieldValue: IRGB) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldId}.fieldValue.R`]: fieldValue.R
        });
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldId}.fieldValue.G`]: fieldValue.G
        });
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldId}.fieldValue.B`]: fieldValue.B
        });
    }
    //</DEVICE>

    //<EMAIL>
    async saveEmailConfirmationData(emailConfirmationData: IEmailConfirmationData): Promise<void> {
        await this.firestore.setDocumentValue(Db.emailConfirmationsCollName, emailConfirmationData.hashCode, emailConfirmationData);
    }

    async deleteEmailConfirmationData(hashCode: string): Promise<void> {
        await this.firestore.deleteDocument(Db.emailConfirmationsCollName, hashCode);
    }

    async getAllEmailConfirmationData(): Promise<IEmailConfirmationData[]> {
        return await this.firestore.getCollectionData(Db.emailConfirmationsCollName);
    }

    async saveForgotPasswordRequest(request: IForgotPasswordData): Promise<void> {
        await this.firestore.setDocumentValue(Db.forgetPasswordRequestsCollName, `${request.userId}`, request);
    }

    async deleteForgotPasswordRequest(userId: number): Promise<void> {
        await this.firestore.deleteDocument(Db.forgetPasswordRequestsCollName, `${userId}`);
    }
    async getAllForgotPasswordRequests(): Promise<IForgotPasswordData[]> {
        return await this.firestore.getCollectionData(Db.forgetPasswordRequestsCollName);
    }
    //</EMAIL>

    // <MAX_IDs>
    async getMaxUserId(autoIncrement: boolean): Promise<number> { return await this.getMax(Db.maxId_userKey, autoIncrement) }
    async setMaxUserId(id: number) { await this.setMax(Db.maxId_userKey, id) }

    async getMaxDeviceId(autoIncrement: boolean): Promise<number> { return await this.getMax(Db.maxId_deviceKey, autoIncrement) }
    async setMaxDeviceId(id: number) { await this.setMax(Db.maxId_deviceKey, id) }

    async getMaxFieldGroupId(autoIncrement: boolean): Promise<number> { return await this.getMax(Db.maxId_fieldGroupKey, autoIncrement) }
    async setMaxFieldGroupId(id: number) { await this.setMax(Db.maxId_fieldGroupKey, id) }

    async getMaxFieldId(autoIncrement: boolean): Promise<number> { return await this.getMax(Db.maxId_fieldKey, autoIncrement) }
    async setMaxFieldId(id: number) { await this.setMax(Db.maxId_fieldKey, id) }

    private async getMax(key: string, autoIncrement?: boolean): Promise<number> {
        let maxId: number;
        try {
            maxId = (await this.firestore.getDocumentData(Db.maxIDsCollName, key)).max
        }
        catch {
            maxId = 0;
        }
        if (autoIncrement) {
            await this.setMax(key, maxId + 1);
        }
        return maxId;
    }

    private async setMax(key: string, id: number) {
        return await this.firestore.setDocumentValue(Db.maxIDsCollName, key, { max: id });
    }
    // </MAX_IDs>
}