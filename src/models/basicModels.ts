export interface IUser {
    id: number,
    username: string,
    email: string,
    password: string,
    deviceFields: IDeviceFieldBasic[],
    fieldViews: IUserView[],
}

export interface IAuthToken {
    authToken: string,
    userId: number,
    validUntil: string,
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
    // fieldControlType: 'slider' | 'upDownButtons',
    minValue: number,
    maxValue: number,
    valueStep: number,
    IO: 'input',
}

export interface IDeviceFieldText {
    fieldValue: string,
    IO: 'input' | 'output',
}

export interface IDeviceFieldButton {
    fieldValue: boolean,
    IO: 'input' | 'output',
}

export interface IDeviceFieldMultipleChoice {
    fieldValue: number,
    values: string[],
    IO: 'input' | 'output',
}

export interface IDeviceFieldRGB {
    R: number,
    G: number,
    B: number,
    IO: 'input'
}