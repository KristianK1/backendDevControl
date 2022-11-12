export interface IAlterDeviceState {
    whatToAlter: 'field' | 'complexGroupState' | 'fieldInComplexGroup'
    data: IAlterFieldValue | IAlterComplexGroupState, // | IAlterFieldValue,                  
}

export interface IAlterFieldValue {
    deviceId: number,
    groupId: number,
    fieldId: number,
    fieldType: 'numeric' | 'text' | 'button' | 'multipleChoice' | 'RGB',
    value: IFieldNumericValue | IFieldTextValue | IFieldButtonValue | IFieldMultipleChoiceValue | IFieldRGBValue,
}

export interface IFieldNumericValue {
    number: number,
}
export interface IFieldTextValue {
    text: string,
}

export interface IFieldButtonValue {
    onOff: boolean,
}

export interface IFieldMultipleChoiceValue {
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


