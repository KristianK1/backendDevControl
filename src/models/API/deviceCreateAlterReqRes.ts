import { IDevice, IDeviceFieldButton, IDeviceFieldMultipleChoice, IDeviceFieldNumeric, IDeviceFieldRGB, IDeviceFieldText } from "../basicModels"

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