import { IWSSMessage, IWSSBasicConnection, IWSSConnectionDevice, IWSSConnectionUser, IWSSDeviceConnectRequest, IWSSUserConnectRequest } from 'models/WSS/wssConnectionReqRes';
import { server, request, connection, Message } from 'websocket';
import { addDeviceConnection, addUserConnection } from './subrouter/WSConnect';
import { v4 as uuid } from 'uuid';
import { getCurrentTimeISO } from '../generalStuff/timeHandlers';


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
            newConnection.startedAt = getCurrentTimeISO(); //TODO nije testirano
            this.allClients.push(newConnection);
            console.log('uuid in reqq ' + newConnection.connectionUUID);

            newConnection.connection.on('message', async (message: Message) => {
                if (message.type === 'utf8') {
                    let wsMessage: IWSSMessage = JSON.parse(message.utf8Data);

                    if (wsMessage.messageType === 'connectUser') {
                        let request = wsMessage.data as IWSSUserConnectRequest;
                        this.userClients.push(await addUserConnection(request, newConnection));
                    }
                    else if (wsMessage.messageType === 'connectDevice') {
                        let request = wsMessage.data as IWSSDeviceConnectRequest;
                        console.log(request);
                        let devConn = await addDeviceConnection(request, newConnection);
                        if (devConn) {
                            this.deviceClients.push(devConn);
                            console.log('new uuid: ' + devConn.basicConnection.connectionUUID);
                            console.log("dev clients N: " + this.deviceClients.length);
                        }
                    }
                }
            })
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
}