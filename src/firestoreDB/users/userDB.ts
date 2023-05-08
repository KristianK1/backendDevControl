import { IAuthToken, IDevice, IUser } from '../../models/basicModels';
import { getMaxIds } from '../MaxIDs/MaxIDs';
import { ILoginResponse } from '../../models/API/loginRegisterReqRes';
import { v4 as uuid } from 'uuid';
import { addDaysToCurrentTime, getCurrentTimeUNIX, hasTimePASSED } from '../../generalStuff/timeHandlers';
import { firestoreSingletonFactory, getMaxIDSingletonFactory } from '../singletonService';
import { FirestoreDB } from 'firestoreDB/firestore';
import { ERightType, IUserRight, IUserRightComplexGroup, IUserRightDevice, IUserRightField, IUserRightGroup } from '../../models/userRightsModels';
import { FieldValue } from 'firebase-admin/firestore';
import { getDeviceById } from '../../firestoreDB/userDBdeviceDBbridge';
import { IAllDeviceRightsForAdminResponse, IComplexFieldGroupForUser, IDeviceFieldBasicForUser, IDeviceForDevice, IDeviceForUser, IFieldGroupForUser, IGroupRightsForAdmin } from 'models/frontendModels';
import { EmailService, emailServiceSingletonFactory } from '../../emailService/emailService';
import { IEmailConfirmationData } from 'emailService/emailModels';
var userDBObj: UsersDB;

export function createUserDBInstance() {
    userDBObj = new UsersDB();
}

export function getUserDBInstance(): UsersDB {
    return userDBObj;
}
export class UsersDB {

    static usersCollName = 'users';
    static authTokenCollName = 'authTokens';
    static emailConfirmationsCollName = 'emailConfirmations';

    firestore: FirestoreDB;
    getMaxIds: getMaxIds;
    emailService: EmailService;
    constructor() {
        this.firestore = firestoreSingletonFactory.getInstance();
        this.getMaxIds = getMaxIDSingletonFactory.getInstance();
        this.emailService = emailServiceSingletonFactory.getInstance();
    }

    async getUsers(): Promise<IUser[]> {
        let users: IUser[] = await this.firestore.getCollectionData(UsersDB.usersCollName);
        for (let user of users) {
            user.userRight = this.transformUserRights(user.userRight);
        }
        return users;
    }

    async getTokens(): Promise<IAuthToken[]> {
        return await this.firestore.getCollectionData(UsersDB.authTokenCollName);
    }

    async getUserbyId(id: number): Promise<IUser> {
        let user: IUser = await this.firestore.getDocumentData(UsersDB.usersCollName, `${id}`);
        if (!user) throw ({ message: 'User doesn\'t exist' });
        user.userRight = this.transformUserRights(user.userRight);
        return user;
    }

    async loginUserByCreds(username: string, password: string): Promise<ILoginResponse> {
        var users = await this.getUsers();
        const user = users.find(user => user.username === username);
        if (!user) {
            throw ({ message: 'User doesn\'t exist' });
        }
        if(user.password !== password){
            throw ({ message: 'Wrong password' });
        }
        let loginResponse = {} as ILoginResponse;
        loginResponse.username = user.username;
        loginResponse.id = user.id;

        const newAuthToken = uuid().replace('-', '');
        const authToken: IAuthToken = {} as IAuthToken;

        authToken.authToken = newAuthToken;
        authToken.userId = user.id;
        authToken.validUntil = addDaysToCurrentTime(30);
        loginResponse.authToken = newAuthToken;
        await this.firestore.setDocumentValue(UsersDB.authTokenCollName, newAuthToken, authToken);
        return loginResponse;
    }

    async getUserByToken(token: string, updateTokenTime: boolean): Promise<IUser> {
        let authTokenDB: IAuthToken = await this.firestore.getDocumentData(UsersDB.authTokenCollName, token);
        if (!authTokenDB) {
            throw ({ message: 'Couldn\'t find token' });
        }
        if (hasTimePASSED(authTokenDB.validUntil)) {
            throw ({ message: 'Token expired' });
        }
        const user = await this.getUserbyId(authTokenDB.userId);
        if (!user) {
            throw ({ message: 'User doesn\'t exist' });
        }

        if (updateTokenTime) {
            await this.firestore.updateDocumentValue(UsersDB.authTokenCollName, token, {
                validUntil: addDaysToCurrentTime(30)
            });
        }
        return user;
    }

    async removeToken(token: string) {
        let authTokenDB: IAuthToken = await this.firestore.getDocumentData(UsersDB.authTokenCollName, token);
        if (!authTokenDB) {
            throw ({ message: 'Couldn\'t find token' });
        }
        await this.firestore.deleteDocument(UsersDB.authTokenCollName, token);
    }

    async removeAllMyTokens(dontRemoveToken: string) {
        let authTokenDB: IAuthToken = await this.firestore.getDocumentData(UsersDB.authTokenCollName, dontRemoveToken);
        if (!authTokenDB) {
            throw ({ message: 'Couldn\'t find token' });
        }
        const allAuthTokens: IAuthToken[] = await this.firestore.getCollectionData(UsersDB.authTokenCollName);
        allAuthTokens.forEach(async token => { //TODO maybe regular for loop
            if (token.userId == authTokenDB.userId && token.authToken !== dontRemoveToken) {
                await this.firestore.deleteDocument(UsersDB.authTokenCollName, `${token.authToken}`);
            }
        })
    }

    async addUser(username: string, password: string, email: string): Promise<number> {
        var users = await this.getUsers();
        var sameNameUser = users.find(user => user.username === username);
        if (sameNameUser) throw ({ message: 'User with same name exists' });
        
        if(email){
            let sameEmailUser = users.find(user => user.email === email);
            console.log(sameEmailUser);
            if(sameEmailUser) throw ({ message: 'User with same email exists' });
        }
    var maxIDdoc = await this.getMaxIds.getMaxUserId(true);

        var newUser: IUser = {
            id: maxIDdoc + 1,
            password: password,
            username: username,
            email: "",
            userRight: { rightsToDevices: [], rightsToGroups: [], rightsToFields: [], rightsToComplexGroups: [] },
            fieldViews: [],
        }

        if(email !== ""){
            await this.sendEmailConfirmation_registration(newUser.id, newUser.username, email);
        }

        await this.firestore.setDocumentValue(UsersDB.usersCollName, `${newUser.id}`, newUser);
        return newUser.id;
    }

    async changeUserPassword(id: number, oldP: string, newP: string) {
        let user = await this.getUserbyId(id);
        if (user.password !== oldP) {
            throw ({ message: 'Wrong password' });
        }
        await this.firestore.updateDocumentValue(UsersDB.usersCollName, `${id}`, { password: newP });
    }

    async changeUsername(id: number, username: string) {
        let user = await this.getUserbyId(id);
        if (!user) {
            throw ({ message: 'User doesn\'t exist in database' });
        }
        user.username = username;
        await this.firestore.updateDocumentValue(UsersDB.usersCollName, `${id}`, user);
    }

    async deleteUser(token: string) {
        let user = await this.getUserByToken(token, false);
        if (!user) {
            throw ({ message: 'User doesn\'t exist in database' });
        }
        await this.firestore.deleteDocument(UsersDB.usersCollName, `${user.id}`);

        let tokens = await this.getTokens();
        tokens.forEach(async token => {
            if (token.userId === user.id) {
                await this.firestore.deleteDocument(UsersDB.authTokenCollName, token.authToken);
            }
        });
    }




    async getUserRights(userId: number): Promise<IUserRight> {
        let user = await this.getUserbyId(userId);
        return user.userRight;
    }

    transformUserRights(userRights: IUserRight): IUserRight {
        let rightsDev = userRights.rightsToDevices;
        let actualDevRigts: IUserRightDevice[] = [];
        Object.keys(rightsDev).forEach(deviceId => {
            actualDevRigts.push(rightsDev[deviceId]);
        });

        let rightsGroup = userRights.rightsToGroups;
        let actualGroupRights: IUserRightGroup[] = [];
        Object.keys(rightsGroup).forEach(deviceId => {
            Object.keys(rightsGroup[deviceId]).forEach(groupId => {
                actualGroupRights.push(rightsGroup[deviceId][groupId]);
            });
        });

        let rightsField = userRights.rightsToFields;
        let actualFieldRights: IUserRightField[] = [];
        Object.keys(rightsField).forEach(deviceId => {
            Object.keys(rightsField[deviceId]).forEach(groupId => {
                Object.keys(rightsField[deviceId][groupId]).forEach(fieldId => {
                    actualFieldRights.push(rightsField[deviceId][groupId][fieldId]);
                });
            });
        });

        let complexGroupRigths = userRights.rightsToComplexGroups;
        let actualComplexGroupRights: IUserRightComplexGroup[] = [];
        Object.keys(complexGroupRigths).forEach(deviceId => {
            Object.keys(complexGroupRigths[deviceId]).forEach(complexGroupId => {
                actualComplexGroupRights.push(complexGroupRigths[deviceId][complexGroupId]);
            });
        });

        let actualRights: IUserRight = {
            rightsToDevices: actualDevRigts,
            rightsToGroups: actualGroupRights,
            rightsToFields: actualFieldRights,
            rightsToComplexGroups: actualComplexGroupRights,
        };
        return actualRights;
    }

    async checkUserRightToDevice(user: IUser, deviceId: number, device?: IDevice): Promise<ERightType> {
        if (!device) {
            try{
                device = await getDeviceById(deviceId);
            } catch{
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
        await this.firestore.updateDocumentValue(UsersDB.usersCollName, `${user.id}`, {
            [`userRight.rightsToDevices.${deviceId}`]: right,
        });
    }

    async deleteUserRightToDevice(user: IUser, deviceId: number) {
        // await this.deleteNestedRightsForDevice(user, deviceId, false);
        await this.firestore.updateDocumentValue(UsersDB.usersCollName, `${user.id}`, {
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
        await this.firestore.updateDocumentValue(UsersDB.usersCollName, `${user.id}`, {
            [`userRight.rightsToGroups.${deviceId}.${groupId}`]: right,
        });
    }

    async deleteUserRightToGroup(user: IUser, deviceId: number, groupId: number) {
        // await this.deleteNestedRightsForGroup(user, deviceId, groupId, false);
        await this.firestore.updateDocumentValue(UsersDB.usersCollName, `${user.id}`, {
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
        await this.firestore.updateDocumentValue(UsersDB.usersCollName, `${user.id}`, {
            [`userRight.rightsToFields.${deviceId}.${groupId}.${fieldId}`]: right
        });
    }

    async deleteUserRightToField(user: IUser, deviceId: number, groupId: number, fieldId: number) {
        await this.firestore.updateDocumentValue(UsersDB.usersCollName, `${user.id}`, {
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
        await this.firestore.updateDocumentValue(UsersDB.usersCollName, `${user.id}`, {
            [`userRight.rightsToComplexGroups.${deviceId}.${complexGroupId}`]: right
        });
    }

    async deleteUserRightToComplexGroup(user: IUser, deviceId: number, complexGroupId: number) {
        await this.firestore.updateDocumentValue(UsersDB.usersCollName, `${user.id}`, {
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
                else if (complexGroupRight === ERightType.Read  && deviceRight !== ERightType.Read) {
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

    async getAllUsersWithRightToDevice(deviceData: IDevice): Promise<IUser[]>{
        let users = await this.getUsers();
        let result: IUser[] = [];
        for(let user of users){
            if(await this.checkAnyUserRightToDevice(user, deviceData)){
                result.push(user);
            }
        }
        return result;
    }
    
    private async sendEmailConfirmation_registration(id: number, username: String, email: string) {
        let hashCode = uuid();
        await this.emailService.sendRegistrationEmail(username, email, hashCode);

        let emailConfirmationData: IEmailConfirmationData = {
            userId: id,
            hashCode: hashCode,
            email: email,
        }
        await this.firestore.setDocumentValue(UsersDB.emailConfirmationsCollName, hashCode, emailConfirmationData);        
    }

    async sendEmailConfirmation_addEmail(id: number, username: String, email: string) {
        let hashCode = uuid();
        await this.emailService.sendAddEmailEmail(username, email, hashCode);

        let emailConfirmationData: IEmailConfirmationData = {
            userId: id,
            hashCode: hashCode,
            email: email,
        }
        let confirmations: IEmailConfirmationData[] = await this.firestore.getCollectionData(UsersDB.emailConfirmationsCollName);
        for(let confirmation of confirmations){
            if(confirmation.email === email){
                await this.firestore.deleteDocument(UsersDB.emailConfirmationsCollName, confirmation.hashCode);
            }
        }
        await this.firestore.setDocumentValue(UsersDB.emailConfirmationsCollName, hashCode, emailConfirmationData);   
    }

    async getEmailConfirmationData(hashCode: string): Promise<IEmailConfirmationData>{
        let data: IEmailConfirmationData[] = await this.firestore.getCollectionData(UsersDB.emailConfirmationsCollName);
        let findCode = data.find(o => o.hashCode === hashCode);
        if(findCode) return findCode;
        throw {message: 'Can\'t find email confirmation'};
    }

    async confirmEmail(hashCode: string){
        let data: IEmailConfirmationData[] = await this.firestore.getCollectionData(UsersDB.emailConfirmationsCollName);
        console.log(data);

        let findCode = data.find(o => o.hashCode === hashCode);
        if(findCode){

            let users = await this.getUsers();
            let sameEmailUser = users.find(user => user.email === findCode?.email);
            if(sameEmailUser) throw({message: 'Email was already confirmed for a different user'});

            if(await this.getUserbyId(findCode.userId)){
                await this.firestore.updateDocumentValue(UsersDB.usersCollName, `${findCode.userId}`, { email: findCode.email });
                await this.firestore.deleteDocument(UsersDB.emailConfirmationsCollName, findCode.hashCode);

                for(let confirmation of data){
                    if(confirmation.email === findCode.email){
                        await this.firestore.deleteDocument(UsersDB.emailConfirmationsCollName, confirmation.hashCode);
                    }
                }
            }
            else{
                throw({message: 'User doesn\'t exist'});
            }
        }
        else{
            throw({message: 'Invalid email confirmation code'});
        }
    }
}