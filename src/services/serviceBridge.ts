import { deviceServiceSingletonFactory, userPermissionServiceSingletonFactory, userServiceSingletonFactory } from "../services/serviceSingletonFactory";
import { UserService } from "../services/userService";
import { DeviceService } from "../services/deviceService";
import { UserPermissionService } from "../services/userPermissionService";
import { IDevice, IUser } from "models/basicModels";

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