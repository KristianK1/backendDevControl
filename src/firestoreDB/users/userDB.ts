import { IAuthToken, IUser } from '../../models/basicModels';
import { getMaxIds } from '../MaxIDs/MaxIDs';
import { ILoginResponse } from '../../models/API/loginRegisterReqRes';
import { v4 as uuid } from 'uuid';
import { addDaysToCurrentTime, hasTimePASSED } from '../../generalStuff/timeHandlers';
import { firestoreSingletonFactory, getMaxIDSingletonFactory } from '../singletonService';
import { FirestoreDB } from 'firestoreDB/firestore';
import { IUserRight, IUserRightComplexGroup, IUserRightDevice, IUserRightField, IUserRightGroup } from 'models/userRightsModels';
import { FieldValue } from 'firebase-admin/firestore';
import { urlencoded } from 'body-parser';


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

    async checkUserRightToDevice(userId: number, deviceId: number): Promise<IUserRightDevice | undefined> {
        let userRightsToDevices = (await this.getUserRights(userId)).rightsToDevices;
        let hasDevice = false;
        let butReadOnly = false;
        for (let right of userRightsToDevices) {
            if (right.deviceId === deviceId) {
                return right;
            }
        }
        return;
        // if (!hasDevice) {
        //     //add right
        // }
        // else if (hasDevice && butReadOnly && !readOnly) {
        //     //add right
        // }
        // else if (hasDevice && !butReadOnly && readOnly) {
        //     //stronger right exists
        // }
    }

    // async checkUserRightToGroup(userId: number, deviceId: number, groupId: number): Promise<IUserRightGroup> {
    //     let userRightsToGroups = (await this.getUserRights(userId)).rightsToGroups;
    //     for (let deviceId of userRightsToGroups) {
    //         // if ( === deviceId) {
    //         // return right;
    //         // }
    //     }
    // }

    async addUserRightToDevice(user: IUser, deviceId: number, readOnly: boolean) {
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

}