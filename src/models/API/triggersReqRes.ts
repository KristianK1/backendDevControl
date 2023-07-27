import { ITrigger } from "models/triggerModels";

export interface IAddTriggerReq {
    authToken: string,
    trigger: ITrigger,
}

