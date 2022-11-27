import { IAuthToken, IUser } from '../../models/basicModels';
import { getMaxIds } from '../MaxIDs/MaxIDs';
import { ILoginResponse } from '../../models/API/loginRegisterReqRes';
import { v4 as uuid } from 'uuid';
import { addDaysToCurrentTime, hasTimePASSED } from '../../generalStuff/timeHandlers';
import { firestoreSingletonFactory, getMaxIDSingletonFactory } from '../singletonService';
import { FirestoreDB } from 'firestoreDB/firestore';
import { ERightType, IUserRight, IUserRightComplexGroup, IUserRightDevice, IUserRightField, IUserRightGroup } from '../../models/userRightsModels';
import { FieldValue } from 'firebase-admin/firestore';


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

    firestore: FirestoreDB;
    getMaxIds: getMaxIds;
    constructor() {
        this.firestore = firestoreSingletonFactory.getInstance();
        this.getMaxIds = getMaxIDSingletonFactory.getInstance();
    }

    async getUsers(): Promise<IUser[]> {
        let users = await this.firestore.getCollectionData(UsersDB.usersCollName);
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
        const user = users.find(user => user.username === username && user.password === password);
        if (!user) {
            throw ({ message: 'User doesn\'t exist' });
        }
        let loginResponse = {} as ILoginResponse;
        loginResponse.user = user;

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

    async removeAllMyTokens(token: string) {
        let authTokenDB: IAuthToken = await this.firestore.getDocumentData(UsersDB.authTokenCollName, token);
        if (!authTokenDB) {
            throw ({ message: 'Couldn\'t find token' });
        }
        const allAuthTokens: IAuthToken[] = await this.firestore.getCollectionData(UsersDB.authTokenCollName);
        allAuthTokens.forEach(async token => {
            if (token.userId == authTokenDB.userId) {
                await this.firestore.deleteDocument(UsersDB.authTokenCollName, `${token.authToken}`);
            }
        })
    }

    async addUser(username: string, password: string, email: string): Promise<number> {
        var users = await this.getUsers();
        var sameNameUser = users.find(user => user.username === username);
        if (sameNameUser) throw ({ message: 'User with same name exists' });
        var maxIDdoc = await this.getMaxIds.getMaxUserId(true);

        var newUser: IUser = {
            id: maxIDdoc + 1,
            password: password,
            username: username,
            email: email,
            userRight: { rightsToDevices: [], rightsToGroups: [], rightsToFields: [], rightsToComplexGroups: [] },
            fieldViews: [],
        }

        await this.firestore.setDocumentValue(UsersDB.usersCollName, `${newUser.id}`, newUser);
        return newUser.id;
    }

    async changeUserPassword(id: number, oldP: string, newP: string) {
        let user = await this.getUserbyId(id);
        if (!user) {
            throw ({ message: 'User doesn\'t exist in database' });
        }
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
        })
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
            actualComplexGroupRights.push(complexGroupRigths[deviceId]);
        });

        let actualRights: IUserRight = {
            rightsToDevices: actualDevRigts,
            rightsToGroups: actualGroupRights,
            rightsToFields: actualFieldRights,
            rightsToComplexGroups: actualComplexGroupRights,
        };
        return actualRights;
    }

    checkUserRightToDevice(user: IUser, deviceId: number): ERightType {
        let userRightsToDevices = user.userRight.rightsToDevices;
        for (let right of userRightsToDevices) {
            if (right.deviceId === deviceId) {
                return right.readOnly ? ERightType.Read : ERightType.Write;
            }
        }
        return ERightType.None;
    }

    checkUserRightToComplexGroup(user: IUser, deviceId: number, complexGroupId: number): ERightType {
        let rightToDevice = this.checkUserRightToDevice(user, deviceId);
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

    checkUserRightToGroup(user: IUser, deviceId: number, groupId: number): ERightType {
        let rightToDevice = this.checkUserRightToDevice(user, deviceId);
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

    checkUserRightToField(user: IUser, deviceId: number, groupId: number, fieldId: number): ERightType {
        let rightToGroup = this.checkUserRightToGroup(user, deviceId, groupId);
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
            return ERightType.Write
        }
        return ERightType.None;
    }

    async addUserRightToDevice(user: IUser, deviceId: number, readOnly: boolean) {
        let currUserRight = this.checkUserRightToDevice(user, deviceId);
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
        await this.firestore.updateDocumentValue(UsersDB.usersCollName, `${user.id}`, {
            [`userRight.rightsToDevices.${deviceId}`]: FieldValue.delete()
        });
    }

    async addUserRightToGroup(user: IUser, deviceId: number, groupId: number, readOnly: boolean) {
        let currUserRightToDevice = this.checkUserRightToDevice(user, deviceId);
        let currUserRightToGroup = this.checkUserRightToComplexGroup(user, deviceId, groupId);

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
        await this.firestore.updateDocumentValue(UsersDB.usersCollName, `${user.id}`, {
            [`userRight.rightsToGroups.${deviceId}.${groupId}`]: right,
        });
    }

    async deleteUserRightToGroup(user: IUser, deviceId: number, groupId: number) {
        await this.firestore.updateDocumentValue(UsersDB.usersCollName, `${user.id}`, {
            [`userRight.rightsToGroups.${deviceId}.${groupId}`]: FieldValue.delete()
        });
    }

    async addUserRightToField(user: IUser, deviceId: number, groupId: number, fieldId: number, readOnly: boolean) {
        let currUserRightToDevice = this.checkUserRightToDevice(user, deviceId);
        let currUserRightToGroup = this.checkUserRightToGroup(user, deviceId, groupId);
        let currUserRightToField = this.checkUserRightToField(user, deviceId, groupId, fieldId);

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
        let currUserRightToDevice = this.checkUserRightToDevice(user, deviceId);
        let currUserRightToComplexGroup = this.checkUserRightToComplexGroup(user, deviceId, complexGroupId);
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
        for (let complexGroupRight of user.userRight.rightsToFields) {
            if (complexGroupRight.deviceId === deviceId) {
                if (!onlyDeleteReadRights || complexGroupRight.readOnly) {
                    await this.deleteUserRightToField(user, deviceId, complexGroupRight.groupId, complexGroupRight.fieldId);
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

}