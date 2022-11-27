export interface IUserRight{
    rightsToDevices: IUserRightDevice[],
    rightsToGroups: IUserRightGroup[],
    rightsToFields: IUserRightField[],
    rightsToComplexGroups: IUserRightComplexGroup[],
}

export interface IUserRightDevice {
    deviceId: number,
    readOnly: boolean,
}

export interface IUserRightGroup {
    deviceId: number,
    groupId: number,
    readOnly: boolean,
}

export interface IUserRightField {
    deviceId: number,
    groupId: number,
    fieldId: number,
    readOnly: boolean,
}


export interface IUserRightComplexGroup {
    deviceId: number,
    complexGroupId: number,
    readOnly: boolean,
}

export enum ERightType{
    None,
    Read,
    Write,
}