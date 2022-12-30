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
import { ELogoutReasons, IDeviceDeleted, IDeviceForUserFailed as LostRightsForUser, ILoggedReason } from 'models/frontendModels';
import { FORMERR } from 'dns';

const clients = {};


var userDB: UsersDB = usersDBSingletonFactory.getInstance();
var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
export class MyWebSocketServer {
    private wsServer: server;

    private allClients: IWSSBasicConnection[] = [];
    private userClients: IWSSConnectionUser[] = [];
    private deviceClients: IWSSConnectionDevice[] = [];


    public setupServer(server: server) {
        this.wsServer = server;

        server.on('request', function (request) {
            var userID = uuid();
            console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');
            const connection = request.accept(null, request.origin);
            clients[userID] = connection;
            console.log('connected: ' + userID);
            connection.on('message', function (message) {
              if (message.type === 'utf8') {
                console.log('Received Message: ', message.utf8Data);
                // broadcasting message to all connected clients
                for (let key in clients) {
                  clients[key].sendUTF(message.utf8Data);
                  console.log('sent Message to: ', key);
                }
              }
            })
          });
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
                let deviceForUser = await userDB.getDeviceForUser(user, deviceData);
                if (!deviceForUser) continue;
                userClient.basicConnection.connection.sendUTF(JSON.stringify(deviceForUser));
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
                let deviceForUser = await userDB.getDeviceForUser(user, deviceData);
                if (!deviceForUser) {
                    let response: LostRightsForUser = {
                        lostRightsToDevice: deviceId,
                    }
                    userClient.basicConnection.connection.sendUTF(JSON.stringify(response));
                }
                else {
                    userClient.basicConnection.connection.sendUTF(JSON.stringify(deviceForUser));
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
            userConn.basicConnection.connection.sendUTF(JSON.stringify(response));
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
                    // let index = this.userClients.findIndex((value, index, obj) => value.basicConnection.connectionUUID === client.basicConnection.connectionUUID);
                    // this.userClients.splice(index, 1);
                } catch {
                    console.log('failed to close ' + client.userId);
                }
            }, 1000);
        }
    }

}