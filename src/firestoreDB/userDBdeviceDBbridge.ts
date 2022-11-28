import { usersDBSingletonFactory } from "./singletonService";
import { UsersDB } from "./users/userDB";

var userDB: UsersDB = usersDBSingletonFactory.getInstance();

export async function deleteDeviceOnAllUsers(deviceId: number) {
    await userDB.deleteDeviceOnAllUsers(deviceId);
}

export async function deleteGroupOnAllUsers(deviceId: number, groupId: number) {
    await userDB.deleteGroupOnAllUsers(deviceId, groupId);
}

export async function deleteFieldOnAllUsers(deviceId: number, groupId: number, fieldId: number) {
    await userDB.deleteFieldOnAllUsers(deviceId, groupId, fieldId);
}

export async function deleteComplexGroupOnAllUsers(deviceId: number, complexGroupId: number) {
    await userDB.deleteComplexGroupOnAllUsers(deviceId, complexGroupId);
}
