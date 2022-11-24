export interface IAlterDeviceState {
    whatToAlter: 'field' | 'complexGroupState' | 'fieldInComplexGroup'
    data: IAlterFieldValue | IAlterComplexGroupState, // | IAlterFieldValue,                  
}

export interface IAlterFieldValue {
    deviceId: number,
    groupId: number,
    fieldId: number,
    fieldType: 'numeric' | 'text' | 'button' | 'multipleChoice' | 'RGB',
    value: IAlterFieldNumericValue | IAlterFieldTextValue | IAlterFieldButtonValue | IAlterFieldMultipleChoiceValue | IFieldRGBValue,
}

export interface IAlterFieldNumericValue {
    number: number,
}
export interface IAlterFieldTextValue {
    text: string,
}

export interface IAlterFieldButtonValue {
    onOff: boolean,
}

export interface IAlterFieldMultipleChoiceValue {
    choice: string,
}

export interface IFieldRGBValue {
    R: number,
    G: number,
    B: number,
}






export interface IAlterComplexGroupState {
    deviceId: number,
    groupId: number,
    state: string,
}


