export enum ENumericTriggerType{
    Bigger,
    Smaller,
    Equal,
    Inbetween,
    NotInBetween,
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
    latestValue: number,
}

export interface ITextTrigger {
    value: string,
    type: ETextTriggerType,
    latestValue: string,
}

export interface IMCTrigger {
    value: number,
    type: ENumericTriggerType,
    latestValue: number,
}

export interface IRGBTrigger {
    value: number,
    second_value: number,
    type: ERGBTriggerType_numeric,
    contextType: ERGBTriggerType_context,
    latestValue: number,
}

export interface IBooleanTrigger {
    value: boolean,
    type: boolean,
    latestValue: boolean,
}

export enum ETriggerSourceType {
    FieldInGroup,
    FieldInComplexGroup,
}

export interface ITriggerSourceAdress_fieldInGroup {
    groupId: number,
    fieldId: number,
}

export interface ITriggerSourceAdress_fieldInComplexGroup {
    complexGroupId: number,
    stateId: number,
    fieldId: number,
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
}

export interface ITriggerSettingsValueResponse_fieldInComplexGroup {
    deviceId: number,
    complexGroupId: number,
    complexGroupState: number,
    fieldId: number,
    value: any,
}

export enum ETriggerResponseType {
    Email,
    MobileNotification,
    SettingValue_fieldInGroup,
    SettingValue_fieldInComplexGroup,
}

export interface ITrigger {
    name: string,
    userId: number,

    sourceDeviceId: number,
    sourceType: ETriggerSourceType,
    sourceAdress: ITriggerSourceAdress_fieldInGroup |ITriggerSourceAdress_fieldInComplexGroup,

    fieldType: 'numeric' | 'text' | 'button' | 'RGB' | 'multipleChoice',
    settings: INumericTrigger | ITextTrigger | IMCTrigger | IBooleanTrigger | IRGBTrigger,

    responseType: ETriggerResponseType,
    responseSettings: ITriggerEmailResponse |ITriggerMobileNotificationResponse | ITriggerSettingValueResponse_fieldInGroup |ITriggerSettingsValueResponse_fieldInComplexGroup,
}
