import { IComplexFieldGroup, IComplexFieldGroupState, IDevice, IDeviceFieldBasic, IFieldGroup } from "models/basicModels";
import { IUserRight, IUserRightComplexGroup, IUserRightDevice, IUserRightField, IUserRightGroup } from "models/userRightsModels";

export function transformDeviceData(device: IDevice) {
    let actualDeviceFieldGroups: IFieldGroup[] = [];
    Object.keys(device.deviceFieldGroups).forEach(key => {
        actualDeviceFieldGroups.push(transformDeviceFieldGroup(device, Number(key)));
    })
    device.deviceFieldGroups = actualDeviceFieldGroups;
    let actualComplexGroups: IComplexFieldGroup[] = [];
    Object.keys(device.deviceFieldComplexGroups).forEach(key => {
        actualComplexGroups.push(transformComplexGroup(device, Number(key)));
    })
    device.deviceFieldComplexGroups = actualComplexGroups;

    return device;
}

export function transformDeviceFieldGroup(device: IDevice, groupId: number): IFieldGroup {
    let devGroup = {} as IFieldGroup;

    Object.keys(device.deviceFieldGroups).forEach(key => {

        let groupByKey: IFieldGroup = device.deviceFieldGroups[key];
        if (groupByKey.id === groupId) {
            devGroup = groupByKey;
        }
    });

    if (!devGroup.id && devGroup.id !== 0) {
        throw ({ message: 'Field group doesn\'t exist' });
    }
    let actualGroup = {} as IFieldGroup;
    actualGroup.id = devGroup.id;
    actualGroup.groupName = devGroup.groupName;
    actualGroup.fields = [];

    Object.keys(devGroup.fields).forEach(key => {
        actualGroup.fields.push(transformDeviceField(devGroup, Number(key)));
    });
    return actualGroup;
}

export function transformDeviceField(fieldGroup: IFieldGroup, fieldId: number): IDeviceFieldBasic {
    let field = {} as IDeviceFieldBasic;

    Object.keys(fieldGroup.fields).forEach(key => {
        let fieldByKey: IDeviceFieldBasic = fieldGroup.fields[key];
        if (fieldByKey.id === fieldId) {
            field = fieldByKey;
        }
    });

    if (!field.id && field.id !== 0) {
        throw ({ message: 'Field doesn\'t exist' });
    }
    return field;
}

export function transformComplexGroup(device: IDevice, groupId: number): IComplexFieldGroup {
    let complexGroup = {} as IComplexFieldGroup;

    Object.keys(device.deviceFieldComplexGroups).forEach(key => {
        let complexGroupById = device.deviceFieldComplexGroups[groupId];
        if (complexGroupById.id === groupId) {
            complexGroup = complexGroupById;
        }
    });

    if (!complexGroup.id && complexGroup.id !== 0) {
        throw ({ message: 'Complex group doesn\'t exist' });
    }
    let actualComplexGroup = {} as IComplexFieldGroup;
    actualComplexGroup.id = complexGroup.id;
    actualComplexGroup.groupName = complexGroup.groupName;
    actualComplexGroup.fieldGroupStates = [];
    actualComplexGroup.currentState = complexGroup.currentState;
    Object.keys(complexGroup.fieldGroupStates).forEach(key => {
        actualComplexGroup.fieldGroupStates.push(transformComplexGroupState(complexGroup, Number(key)));
    })
    return actualComplexGroup;
}

export function transformComplexGroupState(complexGroup: IComplexFieldGroup, stateId: number): IComplexFieldGroupState {
    let state = {} as IComplexFieldGroupState;

    Object.keys(complexGroup.fieldGroupStates).forEach(key => {
        let stateByKey = complexGroup.fieldGroupStates[stateId];
        if (stateByKey.id === stateId) {
            state = stateByKey;
        }
    })

    if (!state.id && state.id !== 0) {
        throw ({ message: 'Complex group state doesn\'t exist' });
    }
    let actualState = {} as IComplexFieldGroupState;
    actualState.id = state.id;
    actualState.stateName = state.stateName;
    actualState.fields = [];
    Object.keys(state.fields).forEach(key => {
        actualState.fields.push(transformFieldInComplexGroup(state, Number(key)));
    })
    return actualState;
}

export function transformFieldInComplexGroup(groupState: IComplexFieldGroupState, fieldId: number): IDeviceFieldBasic {
    let field = {} as IDeviceFieldBasic;//groupState.fields[fieldId]

    Object.keys(groupState.fields).forEach(key => {
        let fieldByKey: IDeviceFieldBasic = groupState.fields[key];
        if (fieldByKey.id === fieldId) {
            field = fieldByKey;
        }
    });

    if (!field.id && field.id !== 0) {
        throw ({ message: 'Field in Complex group state doesn\'t exist' });
    }
    return field;
}


export function transformUserRights(userRights: IUserRight): IUserRight {
    let rightsDev = userRights.rightsToDevices;
    let actualDevRigts: IUserRightDevice[] = [];
    Object.keys(rightsDev).forEach(deviceId => {
        actualDevRigts.push(rightsDev[deviceId]);
    });

    let rightsGroup = userRights.rightsToGroups;
    let actualGroupRights: IUserRightGroup[] = [];
    Object.keys(rightsGroup).forEach(deviceId => {
        Object.keys(rightsGroup[deviceId]).forEach(groupId => {
            actualGroupRights.push(rightsGroup[deviceId][groupId]);
        });
    });

    let rightsField = userRights.rightsToFields;
    let actualFieldRights: IUserRightField[] = [];
    Object.keys(rightsField).forEach(deviceId => {
        Object.keys(rightsField[deviceId]).forEach(groupId => {
            Object.keys(rightsField[deviceId][groupId]).forEach(fieldId => {
                actualFieldRights.push(rightsField[deviceId][groupId][fieldId]);
            });
        });
    });

    let complexGroupRigths = userRights.rightsToComplexGroups;
    let actualComplexGroupRights: IUserRightComplexGroup[] = [];
    Object.keys(complexGroupRigths).forEach(deviceId => {
        Object.keys(complexGroupRigths[deviceId]).forEach(complexGroupId => {
            actualComplexGroupRights.push(complexGroupRigths[deviceId][complexGroupId]);
        });
    });

    let actualRights: IUserRight = {
        rightsToDevices: actualDevRigts,
        rightsToGroups: actualGroupRights,
        rightsToFields: actualFieldRights,
        rightsToComplexGroups: actualComplexGroupRights,
    };
    return actualRights;
}