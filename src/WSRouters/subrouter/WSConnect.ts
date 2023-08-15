import { IWSSBasicConnection, IWSSConnectionDevice, IWSSConnectionUser, IWSSDeviceConnectRequest, IWSSUserConnectRequest } from "models/WSS/wssConnectionReqRes";
import { IDevice, IUser } from "models/basicModels";
import { UserService } from "services/userService";
import { deviceServiceSingletonFactory, userServiceSingletonFactory } from "../../services/serviceSingletonFactory";
import { DeviceService } from "../../services/deviceService";

var userService: UserService = userServiceSingletonFactory.getInstance();
var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();
export async function addUserConnection(request: IWSSUserConnectRequest, basicConnection: IWSSBasicConnection) {
    let user: IUser;
    try {
        user = await userService.getUserByToken(request.authToken, true);
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
        device = await deviceService.getDevicebyKey(request.deviceKey)
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