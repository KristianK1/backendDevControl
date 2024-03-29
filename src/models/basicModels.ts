import { IUserRight } from "./userRightsModels";

export interface IUser {
    id: number,
    username: string,
    email: string,
    password: string,
    userRight: IUserRight,
    fieldViews: IUserView[],
}

export interface IAuthToken {
    authToken: string,
    userId: number,
    validUntil: string,
    firebaseToken?: string,
}

export interface IUserView {
    deviceFields: IDeviceFieldBasic[],
    color: string,
    viewName: string,
}

export interface IDeviceFieldAccess {
    deviceField: IDeviceFieldBasic,
    viewOnly: boolean,
}

export interface IDevice {
    id: number,
    deviceKey: string,
    deviceName: string,
    deviceFieldGroups: IFieldGroup[],
    deviceFieldComplexGroups: IComplexFieldGroup[],
    userAdminId: number,
}

export interface IFieldGroup {
    id: number,
    fields: IDeviceFieldBasic[],
    groupName: string,
}

export interface IComplexFieldGroup {
    id: number,
    groupName: string,
    currentState: number,
    fieldGroupStates: IComplexFieldGroupState[],
}

export interface IComplexFieldGroupState {
    id: number,
    stateName: string,
    fields: IDeviceFieldBasic[],
}

export interface IDeviceFieldBasic {
    deviceId: number,
    groupId: number,
    id: number,
    fieldName: string,

    fieldType: 'numeric' | 'text' | 'button' | 'multipleChoice' | 'RGB',
    fieldValue: IDeviceFieldNumeric | IDeviceFieldText | IDeviceFieldButton | IDeviceFieldMultipleChoice | IDeviceFieldRGB,
}

export interface IDeviceFieldNumeric {
    fieldValue: number,
    minValue: number,
    maxValue: number,
    valueStep: number,
    prefix: string,
    sufix: string,
    fieldDirection: 'input' | 'output',
}

export interface IDeviceFieldText {
    fieldValue: string,
    fieldDirection: 'input' | 'output',
}

export interface IDeviceFieldButton {
    fieldValue: boolean,
    fieldDirection: 'input' | 'output',
}

export interface IDeviceFieldMultipleChoice {
    fieldValue: number,
    values: string[],
    fieldDirection: 'input' | 'output',
}

export interface IDeviceFieldRGB {
    R: number,
    G: number,
    B: number,
    fieldDirection: 'input',
}

export interface IRGB {
    R: number,
    G: number,
    B: number,
}