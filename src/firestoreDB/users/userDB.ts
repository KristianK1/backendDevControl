import { IAuthToken, IUser } from '../../models/basicModels';
import { getMaxIds } from '../MaxIDs/MaxIDs';
import { ILoginResponse } from '../../models/API/loginRegisterReqRes';
import { v4 as uuid } from 'uuid';
import { addDaysToCurrentTime, hasTimePASSED } from '../../generalStuff/timeHandlers';
import { firestoreSingletonFactory, getMaxIDSingletonFactory } from '../singletonService';
import { FirestoreDB } from 'firestoreDB/firestore';


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
        return await this.firestore.getCollectionData(UsersDB.usersCollName);
    }

    async getTokens(): Promise<IAuthToken[]> {
        return await this.firestore.getCollectionData(UsersDB.authTokenCollName);
    }

    async getUserbyId(id: number): Promise<IUser> {
        let user = await this.firestore.getDocumentData(UsersDB.usersCollName, `${id}`);
        if (!user) throw ({ message: 'User doesn\'t exist' });
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
            userRight: { rightsToDevices: [], rightsToGroupFields: [], rightsToComplexGroups: [] },
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

}