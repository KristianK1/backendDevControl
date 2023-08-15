import { ITrigger } from "models/triggerModels";

export interface IAddTriggerReq {
    authToken: string,
    trigger: ITrigger,
}

export interface IGetAllUserTriggersReq {
    authToken: string,
}

export interface IGetAllUserTriggersRes {
    triggers: ITrigger[],
}

export interface IDeleteTriggersReq {
    authToken: string,
    triggerId: number,
}
