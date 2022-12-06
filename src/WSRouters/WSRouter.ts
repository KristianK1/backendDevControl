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
            let newConnection: IWSSBasicConnection = {} as IWSSBasicConnection;
            newConnection.connection = connection;
            newConnection.connectionUUID = uuid();
            newConnection.startedAt = getCurrentTimeISO();
            this.allClients.push(newConnection);
            console.log('uuid in reqq ' + newConnection.connectionUUID);

            newConnection.connection.on('message', async (message: Message) => {
                if (message.type !== 'utf8') return;
                let wsMessage: IWSSMessage = JSON.parse(message.utf8Data);

                switch (wsMessage.messageType) {
                    case 'connectUser':
                        let connectUserRequest = wsMessage.data as IWSSUserConnectRequest;
                        this.userClients.push(await addUserConnection(connectUserRequest, newConnection));
                        break;
                    case 'connectDevice':
                        let connectDevRequest = wsMessage.data as IWSSDeviceConnectRequest;
                        console.log(connectDevRequest);
                        let devConn = await addDeviceConnection(connectDevRequest, newConnection);
                        if (devConn) {
                            this.deviceClients.push(devConn);
                            console.log('new uuid: ' + devConn.basicConnection.connectionUUID);
                            console.log("dev clients N: " + this.deviceClients.length);
                        }
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
                    this.deviceClients.splice(i, 1);
                    console.log("dev clients N: " + this.deviceClients.length);
                    return;
                }
            }
            for (let i = 0; i < this.userClients.length; i++) {
                if (this.userClients[i].basicConnection.connection === connection) {
                    this.userClients.splice(i, 1);
                    return;
                }
            }
        });
    }

    async emitDeviceRegistration(deviceKey: string) {
        let users = await userDB.getUsers();
        let deviceData = await deviceDb.getDeviceByKey(deviceKey);
        for (let userClient of this.userClients) {
            try {
                let user = users.find(user => user.id === userClient.userId);
                if (!user) continue;
                console.log('one');
                let deviceForUser = await userDB.getDeviceForUser(user, deviceData);
                console.log('two');
                if (!deviceForUser) continue;
                console.log('started sending UTF');
                userClient.basicConnection.connection.sendUTF(JSON.stringify(deviceForUser));
            } catch (e) {
                console.log("Device registration emiting error");
                console.log(e);
            }
        }
        console.log('end emit');
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
        console.log(usersWithRight);

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

    async emitDeviceConfig(deviceData: IDevice, users: IUser[]) {
        for (let userClient of this.userClients) {
            try {
                let user = users.find(user => user.id === userClient.userId);
                if (!user) continue;
                console.log('one');
                let deviceForUser = await userDB.getDeviceForUser(user, deviceData);
                console.log('two');
                if (!deviceForUser) continue;
                console.log('started sending UTF');
                userClient.basicConnection.connection.sendUTF(JSON.stringify(deviceForUser));
            } catch (e) {
                console.log("Device registration emiting error");
                console.log(e);
            }
        }
        console.log('end emit');
    }

    async emitUserRightUpdate(user: IUser, deviceId: number) {
        let deviceData = await deviceDb.getDevicebyId(deviceId);
        for (let userClient of this.userClients) {
            try {
                if (userClient.userId !== user.id) continue;
                let deviceForUser = await userDB.getDeviceForUser(user, deviceData);
                if (!deviceForUser) continue;
                userClient.basicConnection.connection.sendUTF(JSON.stringify(deviceForUser));
            } catch (e) {
                console.log("User right - emiting error");
                console.log(e);
            }
        }
        console.log('end emit');
    }

}