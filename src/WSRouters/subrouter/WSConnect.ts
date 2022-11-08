import { DeviceDB } from "firestoreDB/devices/deviceDB";
import { deviceDBSingletonFactory, usersDBSingletonFactory } from "../../firestoreDB/singletonService";
import { UsersDB } from "firestoreDB/users/userDB";
import { IWSSBasicConnection, IWSSConnectionDevice, IWSSConnectionUser, IWSSDeviceConnectRequest, IWSSUserConnectRequest } from "models/WSS/wssConnectionReqRes";
import { IDevice } from "models/basicModels";

var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
var userDb: UsersDB = usersDBSingletonFactory.getInstance();

export async function addUserConnection(request: IWSSUserConnectRequest, basicConnection: IWSSBasicConnection) {
    let user = await userDb.getUserByToken(request.authToken, true);

    let connection: IWSSConnectionUser = {} as IWSSConnectionUser;
    connection.basicConnection.connection = basicConnection.connection;
    connection.basicConnection.connectionUUID = basicConnection.connectionUUID;
    connection.basicConnection.startedAt = basicConnection.startedAt;
    connection.frontendType = request.frontEndType;
    connection.userId = user.id;

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

    let connection: IWSSConnectionDevice = {} as IWSSConnectionDevice;
    connection.basicConnection = {} as IWSSBasicConnection;
    connection.basicConnection.connection = basicConnection.connection;
    connection.basicConnection.connectionUUID = basicConnection.connectionUUID;
    connection.basicConnection.startedAt = basicConnection.startedAt;
    connection.deviceId = device.id;
    return connection;
}