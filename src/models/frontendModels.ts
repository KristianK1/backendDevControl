import { IComplexFieldGroup, IComplexFieldGroupState, IDeviceFieldButton, IDeviceFieldMultipleChoice, IDeviceFieldNumeric, IDeviceFieldRGB, IDeviceFieldText, IFieldGroup } from "./basicModels";

export interface IDeviceForUser {
    id: number,
    deviceKey: string,
    deviceName: string,
    deviceFieldGroups: IFieldGroupForUser[],
    deviceFieldComplexGroups: IComplexFieldGroupForUser[],
    userAdminId: number,
    updateTimeStamp: number,
}

export interface IDeviceForDevice {
    id: number,
    deviceKey: string,
    deviceName: string,
    deviceFieldGroups: IFieldGroup[],
    deviceFieldComplexGroups: IComplexFieldGroup[],
    userAdminId: number,
    updateTimeStamp: number,
}

export interface IDeviceForUserFailed {
    lostRightsToDevice: number,
}

export interface IDeviceDeleted {
    deletedDeviceId: number,
}


export interface IFieldGroupForUser {
    id: number,
    fields: IDeviceFieldBasicForUser[],
    groupName: string,
}

export interface IComplexFieldGroupForUser {
    id: number,
    groupName: string,
    currentState: number,
    fieldGroupStates: IComplexFieldGroupState[],
    readOnly: boolean,
}

export interface IDeviceFieldBasicForUser {
    deviceId: number,
    groupId: number,
    id: number,
    fieldName: string,

    fieldType: 'numeric' | 'text' | 'button' | 'multipleChoice' | 'RGB',
    fieldValue: IDeviceFieldNumeric | IDeviceFieldText | IDeviceFieldButton | IDeviceFieldMultipleChoice | IDeviceFieldRGB,
    readOnly: boolean,
}

export interface ILoggedReason {
    logoutReason: ELogoutReasons
}

export enum ELogoutReasons {
    DeletedUser,
    ChangedPassword,
    LogoutAll,
}

export interface IDeviceRightsRequest{
    adminToken: string,
    deviceId: number,
}

export interface IAllDeviceRightsForAdminResponse {
    deviceRights: IDeviceRightsForAdmin[],
    groupRights: IGroupRightsForAdmin[],
    fieldRights: IFieldRightsForAdmin[],
    complexGrouprights: IComplexGroupRightsForAdmin[],
}

export interface IDeviceRightsForAdmin {
    readonly: boolean,
}

export interface IGroupRightsForAdmin {
    groupId: number,
    readOnly: boolean,
}

export interface IComplexGroupRightsForAdmin {
    complexGroupId: number,
    readOnly: boolean,
}

export interface IFieldRightsForAdmin {
    groupId: number,
    fieldId: number,
    readOnly: boolean,
}