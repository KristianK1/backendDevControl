import { DeviceDB } from "firestoreDB/devices/deviceDB";
import { deviceDBSingletonFactory, usersDBSingletonFactory } from "../../firestoreDB/singletonService";
import { UsersDB } from "firestoreDB/users/userDB";
import { IWSSBasicConnection, IWSSConnectionDevice, IWSSConnectionUser, IWSSDeviceConnectRequest, IWSSUserConnectRequest } from "models/WSS/wssConnectionReqRes";
import { IDevice, IUser } from "models/basicModels";

var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
var userDb: UsersDB = usersDBSingletonFactory.getInstance();

export async function addUserConnection(request: IWSSUserConnectRequest, basicConnection: IWSSBasicConnection) {
    let user: IUser;
    try {
        user = await userDb.getUserByToken(request.authToken, true);
    } catch (e) {
        console.log(e.message);
        return;
    }
    let connection: IWSSConnectionUser = {
        basicConnection: {
            connection: basicConnection.connection,
            connectionUUID: basicConnection.connectionUUID,
            startedAt: basicConnection.startedAt,
        },
        frontendType: request.frontendType,
        userId: user.id,
        authToken: request.authToken,
        lastEmited: 0,
    };

    return connection;
}

export async function addDeviceConnection(request: IWSSDeviceConnectRequest, basicConnection: IWSSBasicConnection): Promise<IWSSConnectionDevice | undefined> {
    let device: IDevice;
    try {
        device = await deviceDb.getDeviceByKey(request.deviceKey)
    } catch (e) {
        console.log(e.message);
        return;
    }

    let connection: IWSSConnectionDevice = {
        basicConnection: {
            connection: basicConnection.connection,
            connectionUUID: basicConnection.connectionUUID,
            startedAt: basicConnection.startedAt,
        },
        deviceId: device.id,
    };
    return connection;
}