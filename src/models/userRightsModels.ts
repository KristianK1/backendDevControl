export interface IUserRightDevice {
    deviceId: number,
    readOnly: boolean,
}

export interface IUserRightGroupField {
    deviceId: number,
    groupId: number,
    fieldId?: number,
    readOnly: boolean,
}

export interface IUserRightComplexGroup {
    deviceId: number,
    complexGroupId: number,
    readOnly: boolean,
}