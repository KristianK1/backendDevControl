import { deviceServiceSingletonFactory, userPermissionServiceSingletonFactory, userServiceSingletonFactory } from "../services/serviceSingletonFactory";
import { UserService } from "../services/userService";
import { DeviceService } from "../services/deviceService";
import { UserPermissionService } from "../services/userPermissionService";
import { IDevice, IDeviceFieldBasic, IUser } from "models/basicModels";
import { ERightType } from "models/userRightsModels";

export async function bridge_deleteDeviceOnAllUsers(deviceId: number): Promise<void> {
    var userPermissionService: UserPermissionService = userPermissionServiceSingletonFactory.getInstance();
    await userPermissionService.deleteDeviceOnAllUsers(deviceId);
}

export async function bridge_deleteGroupOnAllUsers(deviceId: number, groupId: number): Promise<void> {
    var userPermissionService: UserPermissionService = userPermissionServiceSingletonFactory.getInstance();
    await userPermissionService.deleteGroupOnAllUsers(deviceId, groupId);
}

export async function bridge_deleteFieldOnAllUsers(deviceId: number, groupId: number, fieldId: number): Promise<void> {
    var userPermissionService: UserPermissionService = userPermissionServiceSingletonFactory.getInstance();
    await userPermissionService.deleteFieldOnAllUsers(deviceId, groupId, fieldId);
}

export async function bridge_deleteComplexGroupOnAllUsers(deviceId: number, complexGroupId: number): Promise<void> {
    var userPermissionService: UserPermissionService = userPermissionServiceSingletonFactory.getInstance();
    await userPermissionService.deleteComplexGroupOnAllUsers(deviceId, complexGroupId);
}

export async function bridge_getDevicebyId(deviceId: number): Promise<IDevice> {
    var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();
    return await deviceService.getDevicebyId(deviceId);
}

export async function bridge_getDevicebyKey(deviceKey: string): Promise<IDevice> {
    var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();
    return await deviceService.getDevicebyKey(deviceKey);
}

export async function bridge_getUsers(): Promise<IUser[]> {
    var userService: UserService = userServiceSingletonFactory.getInstance();
    return await userService.getUsers();
}

export async function bridge_getUserbyId(userId: number): Promise<IUser> {
    var userService: UserService = userServiceSingletonFactory.getInstance();
    return await userService.getUserbyId(userId);
}

export async function bridge_tryToChangeDeviceFieldValue(deviceId: number, groupId: number, field: IDeviceFieldBasic, fieldValue: any, dontSetValue?: boolean) {
    var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();
    await deviceService.tryToChangeDeviceFieldValue(deviceId, groupId, field, fieldValue, dontSetValue);
}

export async function bridge_tryToChangeFieldValueInComplexGroup(deviceId: number, complexGroupId: number, stateId: number, field: IDeviceFieldBasic, fieldValue: any, dontSetValue?: boolean) {
    var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();
    await deviceService.tryToChangeFieldValueInComplexGroup(deviceId, complexGroupId, stateId, field, fieldValue, dontSetValue);
}

export async function bridge_checkUserRightToField(user: IUser, deviceId: number, groupId: number, fieldId: number, device?: IDevice): Promise<ERightType> {
    var userPermissionService: UserPermissionService = userPermissionServiceSingletonFactory.getInstance();
    return await userPermissionService.checkUserRightToField(user, deviceId, groupId, fieldId, device);
}

export async function bridge_checkUserRightToComplexGroup(user: IUser, deviceId: number, complexGroupId: number, device?: IDevice): Promise<ERightType> {
    var userPermissionService: UserPermissionService = userPermissionServiceSingletonFactory.getInstance();
    return await userPermissionService.checkUserRightToComplexGroup(user, deviceId, complexGroupId, device);
}