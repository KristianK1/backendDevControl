import { IWSSMessage, IWSSBasicConnection, IWSSConnectionDevice, IWSSConnectionUser, IWSSDeviceConnectRequest, IWSSUserConnectRequest } from 'models/WSS/wssConnectionReqRes';
import { server, request, connection, Message } from 'websocket';
import { addDeviceConnection, addUserConnection } from './subrouter/WSConnect';
import { v4 as uuid } from 'uuid';
import { getCurrentTimeISO } from '../generalStuff/timeHandlers';
import { IDevice, IUser } from 'models/basicModels';
import { deviceDBSingletonFactory, usersDBSingletonFactory } from '../firestoreDB/singletonService';
import { UsersDB } from '../firestoreDB/users/userDB';
import { DeviceDB } from '../firestoreDB/devices/deviceDB';
import { ERightType } from '../models/userRightsModels';
import { ELogoutReasons, IDeviceDeleted, IDeviceForUserFailed, ILoggedReason, IWSSMessageForUser } from '../models/frontendModels';
import { getDeviceById } from 'firestoreDB/userDBdeviceDBbridge';


var userDB: UsersDB = usersDBSingletonFactory.getInstance();
var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
export class MyWebSocketServer {
    private wsServer: server;

    private allClients: IWSSBasicConnection[] = [];
    private userClients: IWSSConnectionUser[] = [];
    private deviceClients: IWSSConnectionDevice[] = [];

    public setupServer(server: server) {
        this.wsServer = server;

        this.wsServer.on('request', (request: request) => {
            console.log('new r');

            let connection = request.accept(null, request.origin);
            let newConnection: IWSSBasicConnection = {
                connection: connection,
                connectionUUID: uuid(),
                startedAt: getCurrentTimeISO(),
            };
            this.allClients.push(newConnection);
            console.log('uuid in reqq ' + newConnection.connectionUUID);

            newConnection.connection.on('message', async (message: Message) => {
                if (message.type !== 'utf8') return;

                if (message.utf8Data.includes("clear")) {
                    for (let client of this.allClients) {
                        client.connection.close()
                    }
                    this.allClients = []
                    this.userClients = []
                    this.deviceClients = []
                }

                let wsMessage: IWSSMessage;
                try {
                    wsMessage = JSON.parse(message.utf8Data);
                } catch {
                    return;
                }

                console.log(wsMessage)
                switch (wsMessage.messageType) {
                    case 'connectUser':
                        let connectUserRequest = wsMessage.data as IWSSUserConnectRequest;
                        let userConn = await addUserConnection(connectUserRequest, newConnection);
                        if (!userConn) {
                            let logoutData: ILoggedReason = { logoutReason: ELogoutReasons.LogoutMyself }
                            newConnection.connection.sendUTF(JSON.stringify(logoutData));
                            setInterval(() => {
                                newConnection.connection.close();
                            }, 5000);
                            return
                        }
                        this.userClients.push(userConn);
                        console.log('user connected')
                        await this.sendAllDeviceDataToUser(userConn.userId, newConnection.connection);
                        break;
                    case 'connectDevice':
                        let connectDevRequest = wsMessage.data as IWSSDeviceConnectRequest;
                        console.log(connectDevRequest);
                        let devConn = await addDeviceConnection(connectDevRequest, newConnection);
                        if (!devConn) break;
                        this.deviceClients.push(devConn);
                        console.log('new uuid: ' + devConn.basicConnection.connectionUUID);
                        console.log("dev clients N: " + this.deviceClients.length);
                        console.log("emited data to device")
                        this.emitDeviceRegistration(connectDevRequest.deviceKey)
                        break;
                    default:
                        console.log('unprocessed message');
                        console.log(wsMessage);
                        break;
                }
            });
        });

        this.wsServer.on('close', (connection: connection, reason: number, desc: string) => {
            console.log('closed conn');

            for (let i = 0; i < this.allClients.length; i++) {
                if (this.allClients[i].connection === connection) {
                    this.allClients.splice(i, 1);
                }
            }
            for (let i = 0; i < this.deviceClients.length; i++) {
                if (this.deviceClients[i].basicConnection.connection === connection) {
                    console.log('closed ' + this.deviceClients[i].basicConnection.connectionUUID);
                    let deviceId = this.deviceClients[i].deviceId
                    this.deviceClients.splice(i, 1);
                    i--;
                    console.log("dev clients N: " + this.deviceClients.length);
                    this.emitDeviceRegistrationById(deviceId)
                }
            }
            for (let i = 0; i < this.userClients.length; i++) {
                if (this.userClients[i].basicConnection.connection === connection) {
                    console.log(this.userClients[i].authToken)
                    console.log("closed " + this.userClients[i].basicConnection.connectionUUID);
                    this.userClients.splice(i, 1);
                    return;
                }
            }
        });
    }
    async emitDeviceRegistrationById(deviceId: number) {
        let device = await deviceDb.getDevicebyId(deviceId)
        await this.emitDeviceRegistration(device.deviceKey)
    }

    async emitDeviceRegistration(deviceKey: string) {
        let deviceData: IDevice;
        let allUsers: IUser[];
        try {
            allUsers = await userDB.getUsers();
            deviceData = await deviceDb.getDeviceByKey(deviceKey);
        } catch (e) {
            return;
        }

        let usersWithRight: IUser[] = [];
        for (let user of allUsers) {
            let right = await userDB.checkAnyUserRightToDevice(user, deviceData);
            if (right) {
                usersWithRight.push(user);
            }
        }
        await this.emitDeviceConfig(deviceData, usersWithRight);
    }

    async emitFieldChanged(deviceId: number, groupId: number, fieldId: number) {
        let deviceData: IDevice = {} as IDevice;
        let allUsers: IUser[] = [];
        try {
            deviceData = await deviceDb.getDevicebyId(deviceId);
            allUsers = await userDB.getUsers();
        } catch {
            console.log("emit deviceRegistration event - first error");
            return;
        }

        let usersWithRight: IUser[] = [];
        for (let user of allUsers) {
            let right = await userDB.checkUserRightToField(user, deviceId, groupId, fieldId, deviceData);
            if (right === ERightType.Write || right === ERightType.Read) {
                usersWithRight.push(user);
            }
        }
        await this.emitDeviceConfig(deviceData, usersWithRight);
    }

    async emitComplexGroupChanged(deviceId: number, complexGroupId: number) { //state or field
        let deviceData: IDevice = {} as IDevice;
        let allUsers: IUser[] = [];
        try {
            deviceData = await deviceDb.getDevicebyId(deviceId);
            allUsers = await userDB.getUsers();
        } catch {
            console.log("emit deviceRegistration event - first error");
            return;
        }


        let usersWithRight: IUser[] = [];
        for (let user of allUsers) {
            let right = await userDB.checkUserRightToComplexGroup(user, deviceId, complexGroupId, deviceData);
            if (right === ERightType.Write || right === ERightType.Read) {
                usersWithRight.push(user);
            }
        }
        await this.emitDeviceConfig(deviceData, usersWithRight);
    }

    private async emitDeviceConfig(deviceData: IDevice, users: IUser[]) {
        let isActive = this.isDeviceActive(deviceData.id)
        for (let userClient of this.userClients) {
            try {
                let user = users.find(user => user.id === userClient.userId);
                if (!user) continue;
                let deviceForUser = await userDB.getDeviceForUser(user, deviceData, isActive);
                if (!deviceForUser) continue;
                let message: IWSSMessageForUser = {
                    messageType: "deviceData",
                    data: deviceForUser,
                }
                userClient.basicConnection.connection.sendUTF(JSON.stringify(message));
            } catch (e) {
                console.log("Device registration emiting error");
                console.log(e);
            }
        }
        let thisDevConns = this.deviceClients.filter(conn => conn.deviceId === deviceData.id);
        for (let devCon of thisDevConns) {
            devCon.basicConnection.connection.sendUTF(JSON.stringify(deviceData));
        }
        console.log('end emit');
    }

    async emitUserRightUpdate(userId: number, deviceId: number) {
        let deviceData = await deviceDb.getDevicebyId(deviceId);
        let user = await userDB.getUserbyId(userId);
        for (let userClient of this.userClients) {
            try {
                if (userClient.userId !== user.id) continue;
                let isActive = this.isDeviceActive(deviceData.id)
                let deviceForUser = await userDB.getDeviceForUser(user, deviceData, isActive);
                if (!deviceForUser) {
                    let response: IDeviceForUserFailed = {
                        lostRightsToDevice: deviceId,
                    }
                    let message: IWSSMessageForUser = {
                        messageType: "lostRightsToDevice",
                        data: response,
                    }
                    userClient.basicConnection.connection.sendUTF(JSON.stringify(message));
                }
                else {
                    let message: IWSSMessageForUser = {
                        messageType: "deviceData",
                        data: deviceForUser,
                    }
                    userClient.basicConnection.connection.sendUTF(JSON.stringify(message));
                }
            } catch (e) {
                console.log("User right - emiting error");
                console.log(e);
            }
        }
        console.log('end emit');
    }

    async emitDeviceDeleted(allUsers: IUser[], deviceData: IDevice) {
        let usersWithRight: IWSSConnectionUser[] = [];
        console.log(allUsers);
        console.log(deviceData);
        console.log(this.userClients);
        for (let userClient of this.userClients) {
            let user = allUsers.find(user => user.id === userClient.userId);
            if (!user) continue;
            if (await userDB.checkAnyUserRightToDevice(user, deviceData)) {
                console.log('pushed' + user.id);
                usersWithRight.push(userClient);
            }
        }

        let response: IDeviceDeleted = { deletedDeviceId: deviceData.id };
        for (let userConn of usersWithRight) {
            console.log('senddddd');
            let message: IWSSMessageForUser = {
                messageType: 'deviceDeleted',
                data: response,
            }
            userConn.basicConnection.connection.sendUTF(JSON.stringify(message));
        }
    }

    // async logoutUserSession(token: string, reason: ELogoutReasons) {
    //     let client = this.userClients.find(client => client.authToken === token);
    //     let logoutReason: ILoggedReason = { logoutReason: reason };
    //     client?.basicConnection.connection.sendUTF(JSON.stringify(logoutReason));
    // }


    async logoutAllUsersSessions(userId: number, reason: ELogoutReasons, safeToken?: string) {
        let clients = this.userClients.filter(client => client.userId === userId);
        let logoutReason: ILoggedReason = { logoutReason: reason };
        for (let client of clients) {
            if (client.authToken === safeToken) continue;
            client.basicConnection.connection.sendUTF(JSON.stringify(logoutReason));
            setTimeout(() => {
                try {
                    client.basicConnection.connection.close();
                } catch {
                    console.log('failed to close ' + client.userId);
                }
            }, 5000);
        }
    }

    async logoutUserSession(token: string, reason: ELogoutReasons) {
        let clients = this.userClients.filter(client => client.authToken === token);
        let logoutReason: ILoggedReason = { logoutReason: reason };

        for (let client of clients) {
            client.basicConnection.connection.sendUTF(JSON.stringify(logoutReason));
            setTimeout(() => {
                try {
                    client.basicConnection.connection.close();
                } catch {
                    console.log('failed to close ' + client.userId);
                }
            }, 1000);
        }
    }

    async sendAllDeviceDataToUser(userId: number, connection: connection) {
        try {
            let user = await userDB.getUserbyId(userId);
            let devices = await deviceDb.getTransformedDevices()
            for (let device of devices) {
                let isActive = this.isDeviceActive(device.id)
                let deviceForUser = await userDB.getDeviceForUser(user, device, isActive)
                if (deviceForUser) {
                    let message: IWSSMessageForUser = {
                        messageType: "deviceData",
                        data: deviceForUser,
                    }
                    connection.sendUTF(JSON.stringify(message))
                }
            }
        } catch {
            console.log("error in sending all device data");

        }
    }

    isDeviceActive(deviceId: number): boolean {
        return !!this.deviceClients.find(o => o.deviceId == deviceId)
    }
}