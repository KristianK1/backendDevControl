export enum EDeleteUserPermissionsEvents {
    Device = "x0",
    Group = "x1",
    Field = "x2",
    ComplexGroup = "x3"
}

export interface IDeviceAddress {
    deviceId: number,
}

export interface IGroupAddress {
    deviceId: number,
    groupId: number,
}

export interface IFieldAddress {
    deviceId: number,
    groupId: number,
    fieldId: number,
}

export interface IComplexGroupAddress {
    deviceId: number,
    complexGroupId: number
}