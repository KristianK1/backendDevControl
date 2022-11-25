import { v4 as uuid } from 'uuid';
import { IComplexFieldGroup, IComplexFieldGroupState, IDevice, IDeviceFieldBasic, IDeviceFieldButton, IDeviceFieldMultipleChoice, IDeviceFieldNumeric, IDeviceFieldText, IFieldGroup } from "../../models/basicModels";
import { FirestoreDB } from '../firestore';
import { getMaxIds } from '../MaxIDs/MaxIDs';
import { FieldValue } from 'firebase-admin/firestore';
import { firestoreSingletonFactory, getMaxIDSingletonFactory, usersDBSingletonFactory } from '../singletonService';
import { getCurrentTimeUNIX } from '../../generalStuff/timeHandlers';
import { getUserDBInstance, UsersDB } from 'firestoreDB/users/userDB';

var deviceDBObj: UserRightsDB;

export function createUserRightsDBInstance() {
    deviceDBObj = new UserRightsDB();
}

export function getUserRightsDBInstance(): UserRightsDB {
    return deviceDBObj;
}

export class UserRightsDB {

    firestore: FirestoreDB;
    getMaxIds: getMaxIds;
    usersDB: UsersDB;

    constructor() {
        this.firestore = firestoreSingletonFactory.getInstance();
        this.getMaxIds = getMaxIDSingletonFactory.getInstance();
        this.usersDB = usersDBSingletonFactory.getInstance();
    }

    async addUserRightToDevice(userId: number, deviceId: number, readOnly: boolean) {

    }

    async deleteUserRightToDevice(userId: number, deviceId: number) {

    }

    async addUserRightToGroup(userId: number, deviceId: number, groupId: number, readOnly: boolean){

    }

    async deleteUserRightToGroup(userId: number, deviceId: number, groupId: number){

    }

    async addUserRightToField(userId: number, deviceId: number, groupId: number, fieldId: number, readOnly: boolean){

    }

    async deleteUserRightToField(userId: number, deviceId: number, groupId: number, fieldId: number){

    }

    async addUserRightToComplexGroup(userId: number, deviceId: number, complexGroupId: number, readOnly: boolean){

    }

    async deleteUserRightToComplexGroup(userId: number, deviceId: number, complexGroupId: number){

    }
}