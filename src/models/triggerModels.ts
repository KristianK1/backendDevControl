export enum ENumericTriggerType {
    Bigger,
    Smaller,
    Equal,
    Inbetween, // [x,y]
    NotInBetween, // R \ [x,y]
}

export enum ETextTriggerType {
    StartsWith,
    EndsWith,
    Contains,
    IsEqualTo,
    IsNotEqualTo,
}

export enum EMCTriggerType {
    IsEqualTo,
    IsNotEqualTo,
}

export enum ERGBTriggerType_numeric {
    Bigger,
    Smaller,
    Equal,
    Inbetween,
    NotInBetween,
}

export enum ERGBTriggerType_context {
    R,
    G,
    B,
}

export interface INumTrig {
    value: number,
    second_value: number | null,
    type: ENumericTriggerType,
}

export interface ITextTrig {
    value: string,
    type: ETextTriggerType,
}

export interface IMCTrig {
    value: number,
    type: EMCTriggerType,
}

export interface IRGBTrig {
    value: number,
    second_value: number,
    type: ERGBTriggerType_numeric,
    contextType: ERGBTriggerType_context,
}

export interface IBoolTrig {
    value: boolean,
}

export enum ETrigSourceType {
    FieldInGroup,
    FieldInComplexGroup,
    TimeTrigger,
}

export interface ITrigSourceFG {
    deviceId: number,
    groupId: number,
    fieldId: number,
}

export interface ITrigSourceFCG {
    deviceId: number,
    complexGroupId: number,
    stateId: number,
    fieldId: number,
}

export enum ETriggerTimeType {
    Once,
    Daily,
    Weekly,
    // ChooseDaysInWeek,
    // Monthly,
    // Wearly,
}

export interface ITrigSourceTime {
    type: ETriggerTimeType,
    firstTimeStamp: string,
    // daysInWeek?: number[],
    lastRunTimestamp: string,
}


export interface ITrigRespEmail {
    emailSubject: string,
    emailText: string,
}

export interface ITrigRespMobNot {
    notificationTitle: string,
    notificationText: string,
}

export interface ITrigRespFG {
    deviceId: number,
    groupId: number,
    fieldId: number,
    value: any,
    rgbContext: ERGBTriggerType_context,
}

export interface ITrigRespFCG {
    deviceId: number,
    complexGroupId: number,
    complexGroupState: number,
    fieldId: number,
    value: any,
    rgbContext: ERGBTriggerType_context,
}

export enum ETrigRespType {
    Email,
    MobileNotification,
    SettingValue_fieldInGroup,
    SettingValue_fieldInComplexGroup,
}

export interface ITrigger {
    id: number,

    name: string,
    userId: number,

    sourceType: ETrigSourceType,
    sourceData: ITrigSourceFG | ITrigSourceFCG | ITrigSourceTime,

    fieldType: 'numeric' | 'text' | 'button' | 'RGB' | 'multipleChoice',
    settings: INumTrig | ITextTrig | IMCTrig | IBoolTrig | IRGBTrig,

    responseType: ETrigRespType,
    responseSettings: ITrigRespEmail | ITrigRespMobNot | ITrigRespFG | ITrigRespFCG,
}
