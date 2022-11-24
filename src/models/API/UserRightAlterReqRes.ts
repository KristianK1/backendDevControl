export interface IAddUserRightDeviceReq {
    authToken: string,
    userId: number,
    deviceId: number,
    readOnly: boolean,
}

export interface IDeleteUserRightDeviceReq {
    authToken: string,
    userId: number,
    deviceId: number,
}

export interface IAddUserRightGroupFieldReq {
    authToken: string,
    userId: number,
    deviceId: number,
    groupId: number,
    fieldId?: number,
    readOnly: boolean,
}

export interface IDeleteUserRightGroupFieldReq {
    authToken: string,
    userId: number,
    deviceId: number,
    groupId: number,
    fieldId?: number,
}

export interface IAddUserRightComplexGroupReq {
    authToken: string,
    userId: number,
    deviceId: number,
    complexGroupId: number,
    readOnly: boolean
}

export interface IDeleteUserRightComplexGroupReq {
    authToken: string,
    userId: number,
    deviceId: number,
    complexGroupId: number,
}



// export interface IGetUserRightsDeviceReq {
//     authToken: string,
//     deviceId: number,
// }