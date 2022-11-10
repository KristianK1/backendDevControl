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





export interface IAddFieldGroup {
    authToken: string,
    deviceId: number,
    groupName: string,
}

export interface IRenameFieldGroup {
    authToken: string,
    deviceId: number,
    groupId: number,
    groupName: string,
}

export interface IDeleteFieldGroup {
    authToken: string,
    deviceId: number,
    groupId: number,
}





export interface IAddFieldReq {
    authToken: string,
    deviceField: IAddFieldBasic,
}

export interface IAddFieldBasic {
    deviceId: number,
    groupId: number,
    fieldName: string,

    fieldType: 'numeric' | 'text' | 'button' | 'multipleChoice' | 'RGB',
    fieldValue: IDeviceFieldNumeric | IDeviceFieldText | IDeviceFieldButton | IDeviceFieldMultipleChoice | IDeviceFieldRGB,
}

export interface IRenameFieldReq {
    authToken: string,
    deviceId: number,
    groupId: number,
    fieldId: number,
    fieldName: string,
}


export interface IDeleteFieldReq {
    authToken: string,
    deviceId: number,
    groupId: number,
    fieldId: number,
}

