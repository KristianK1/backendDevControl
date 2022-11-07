import { connection } from "websocket"

export interface IWSMessage {
    messageType: 'connectDevice' | 'connectUser',
    data: IWSSDeviceConnectRequest | IWSSUserConnectRequest
}



export interface IWSSUserConnectRequest {
    authToken: string,
    frontEndType: 'web' | 'responsive-web' | 'mobileApp' | 'wearOS',
}

export interface IWSSDeviceConnectRequest {
    deviceKey: string,
}

export interface IWSSBasicConnection {
    startedAt: string,
    connection: connection,
    connectionUUID: string,
}

export interface IWSSConnectionUser {
    userId: number,
    basicConnection: IWSSBasicConnection,
    frontendType: 'web' | 'responsive-web' | 'mobileApp' | 'wearOS',
}

export interface IWSSConnectionDevice {
    deviceId: number,
    basicConnection: IWSSBasicConnection,
}

