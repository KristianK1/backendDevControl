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

export interface IAddUserRightGroupReq {
    authToken: string,
    userId: number,
    deviceId: number,
    groupId: number,
    readOnly: boolean,
}

export interface IDeleteUserRightGroupReq {
    authToken: string,
    userId: number,
    deviceId: number,
    groupId: number,
}

export interface IAddUserRightFieldReq {
    authToken: string,
    userId: number,
    deviceId: number,
    groupId: number,
    fieldId: number,
    readOnly: boolean,
}

export interface IDeleteUserRightFieldReq {
    authToken: string,
    userId: number,
    deviceId: number,
    groupId: number,
    fieldId: number,
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