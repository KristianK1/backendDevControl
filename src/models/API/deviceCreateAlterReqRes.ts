import { IDevice, IDeviceFieldButton, IDeviceFieldMultipleChoice, IDeviceFieldNumeric, IDeviceFieldRGB, IDeviceFieldText, IRGB } from "../basicModels"

export interface IAddDeviceReq {
    deviceName: string
    deviceKey?: string,
    authToken: string,
}

export interface IRenameDeviceReq {
    deviceName: string,
    deviceId: number,
    authToken: string,
}

export interface IChangeDeviceAdminReq {
    authToken: string,
    deviceId: number,
    userAdminId: number,
}

export interface IDeleteDeviceReq {
    deviceId: number,
    authToken: string,
}

export interface IRegisterDeviceDataReq {
    deviceData: IDevice,
}

export interface IChangeDeviceField_User {
    authToken: string,
    deviceId: number,
    groupId: number,
    fieldId: number,
    fieldValue: number | string | boolean | IRGB,
}

export interface IChangeDeviceField_Device {
    deviceKey: string,
    groupId: number,
    fieldId: number,
    fieldValue: number | string | boolean | IRGB,
}


export interface IChangeComplexGroupState_Device {
    deviceKey: string,
    groupId: number,
    state: number,
}

export interface IChangeComplexGroupState_User {
    authToken: string,
    deviceId: number,
    groupId: number,
    state: number,
}

export interface IChangeComplexGroupField_Device {
    deviceKey: string,
    groupId: number,
    stateId: number,
    fieldId: number,
    fieldValue: number | string | boolean | IRGB,
}

export interface IChangeComplexGroupField_User {
    authToken: string,
    deviceId: number,
    groupId: number,
    stateId: number,
    fieldId: number,
    fieldValue: number | string | boolean | IRGB,
}