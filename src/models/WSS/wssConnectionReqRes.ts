import { connection } from "websocket"

export interface IWSSMessage {
    messageType: 'connectDevice' | 'connectUser',
    data: IWSSDeviceConnectRequest | IWSSUserConnectRequest
}

export interface IWSSUserConnectRequest {
    authToken: string,
    frontendType: EFrontendType,
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
    authToken: string,
    basicConnection: IWSSBasicConnection,
    frontendType: EFrontendType,
    lastEmited: number,
}

export interface IWSSConnectionDevice {
    deviceId: number,
    basicConnection: IWSSBasicConnection,
    lastEmited: number,
}

export enum EFrontendType {
    Web,
    ResponsiveWeb,
    AndroidApp,
    WearOs,
}
