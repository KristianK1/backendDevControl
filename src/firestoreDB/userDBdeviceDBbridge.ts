import { IDevice } from "models/basicModels";
import { DeviceDB } from "./devices/deviceDB";
import { deviceDBSingletonFactory, usersDBSingletonFactory } from "./singletonService";
import { UsersDB } from "./users/userDB";


export async function deleteDeviceOnAllUsers(deviceId: number) {
    var userDB: UsersDB = usersDBSingletonFactory.getInstance();
    await userDB.deleteDeviceOnAllUsers(deviceId);
}

export async function deleteGroupOnAllUsers(deviceId: number, groupId: number) {
    var userDB: UsersDB = usersDBSingletonFactory.getInstance();
    await userDB.deleteGroupOnAllUsers(deviceId, groupId);
}

export async function deleteFieldOnAllUsers(deviceId: number, groupId: number, fieldId: number) {
    var userDB: UsersDB = usersDBSingletonFactory.getInstance();
    await userDB.deleteFieldOnAllUsers(deviceId, groupId, fieldId);
}

export async function deleteComplexGroupOnAllUsers(deviceId: number, complexGroupId: number) {
    var userDB: UsersDB = usersDBSingletonFactory.getInstance();
    await userDB.deleteComplexGroupOnAllUsers(deviceId, complexGroupId);
}

export async function giveWriteDeviceRightsToUser(userId: number, deviceId: number) {
    var userDB: UsersDB = usersDBSingletonFactory.getInstance();
    await userDB.giveWriteDeviceRightsToUser(userId, deviceId);
}

export async function deleteUserRightForNewAdmin(userId: number, deviceId: number){
    var userDB: UsersDB = usersDBSingletonFactory.getInstance();
    await userDB.deleteUserRightForNewAdmin(userId, deviceId);
}

export async function getDeviceById(deviceId: number): Promise<IDevice> {
    var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
    return await deviceDb.getDevicebyId(deviceId);
}
