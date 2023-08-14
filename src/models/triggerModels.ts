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

export interface INumericTrigger {
    value: number,
    second_value: number | null,
    type: ENumericTriggerType,
}

export interface ITextTrigger {
    value: string,
    type: ETextTriggerType,
}

export interface IMCTrigger {
    value: number,
    type: EMCTriggerType,
}

export interface IRGBTrigger {
    value: number,
    second_value: number,
    type: ERGBTriggerType_numeric,
    contextType: ERGBTriggerType_context,
}

export interface IBooleanTrigger {
    value: boolean,
}

export enum ETriggerSourceType {
    FieldInGroup,
    FieldInComplexGroup,
    TimeTrigger,
}

export interface ITriggerSourceAdress_fieldInGroup {
    deviceId: number,
    groupId: number,
    fieldId: number,
}

export interface ITriggerSourceAdress_fieldInComplexGroup {
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

export interface ITriggerTimeSourceData {
    type: ETriggerTimeType,
    firstTimeStamp: string,
    daysInWeek?: number[],
    lastRunTimestamp: string,
}


export interface ITriggerEmailResponse {
    emailSubject: string,
    emailText: string,
}

export interface ITriggerMobileNotificationResponse {
    notificationTitle: string,
    notificationText: string,
}

export interface ITriggerSettingValueResponse_fieldInGroup {
    deviceId: number,
    groupId: number,
    fieldId: number,
    value: any,
    rgbContext: ERGBTriggerType_context,
}

export interface ITriggerSettingsValueResponse_fieldInComplexGroup {
    deviceId: number,
    complexGroupId: number,
    complexGroupState: number,
    fieldId: number,
    value: any,
    rgbContext: ERGBTriggerType_context,
}

export enum ETriggerResponseType {
    Email,
    MobileNotification,
    SettingValue_fieldInGroup,
    SettingValue_fieldInComplexGroup,
}

export interface ITrigger {
    id: number,

    name: string,
    userId: number,

    sourceType: ETriggerSourceType,
    sourceData: ITriggerSourceAdress_fieldInGroup | ITriggerSourceAdress_fieldInComplexGroup | ITriggerTimeSourceData,

    fieldType: 'numeric' | 'text' | 'button' | 'RGB' | 'multipleChoice',
    settings: INumericTrigger | ITextTrigger | IMCTrigger | IBooleanTrigger | IRGBTrigger,

    responseType: ETriggerResponseType,
    responseSettings: ITriggerEmailResponse | ITriggerMobileNotificationResponse | ITriggerSettingValueResponse_fieldInGroup | ITriggerSettingsValueResponse_fieldInComplexGroup,
}
