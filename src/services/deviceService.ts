import { Db } from "../firestoreDB/db";
import { DBSingletonFactory } from "../firestoreDB/singletonService";

export class DeviceService {
    private db: Db;

    constructor() {
        this.db = DBSingletonFactory.getInstance();
    }
}