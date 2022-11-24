import { IDevice, IDeviceFieldButton, IDeviceFieldMultipleChoice, IDeviceFieldNumeric, IDeviceFieldRGB, IDeviceFieldText, IRGB } from "../basicModels"

export interface IAddDeviceReq {
    deviceName: string
    deviceKey?: string,
    userAdminId: number,
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