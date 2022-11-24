import { v4 as uuid } from 'uuid';
import { IComplexFieldGroup, IComplexFieldGroupState, IDevice, IDeviceFieldBasic, IDeviceFieldButton, IDeviceFieldMultipleChoice, IDeviceFieldNumeric, IDeviceFieldText, IFieldGroup } from "../../models/basicModels";
import { FirestoreDB } from '../firestore';
import { getMaxIds } from '../MaxIDs/MaxIDs';
import { FieldValue } from 'firebase-admin/firestore';
import { firestoreSingletonFactory, getMaxIDSingletonFactory } from '../singletonService';
import { getCurrentTimeUNIX } from '../../generalStuff/timeHandlers';

var deviceDBObj: UserRightsDB;

export function createUserRightsDBInstance() {
    deviceDBObj = new UserRightsDB();
}

export function getUserRightsDBInstance(): UserRightsDB {
    return deviceDBObj;
}

export class UserRightsDB {


}