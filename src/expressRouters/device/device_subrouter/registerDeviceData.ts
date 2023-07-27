import { MyWebSocketServer } from "WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { DBSingletonFactory } from "../../../firestoreDB/singletonService";
import { Db } from "firestoreDB/db";
import { IDevice } from "models/basicModels";

var express = require('express');
var router = express.Router();

var db: Db = DBSingletonFactory.getInstance();
var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    var registerDeviceDataReq: IDevice = req.body;
    try {
        await db.registerDeviceData(registerDeviceDataReq);
        wsServer.emitDeviceRegistration(registerDeviceDataReq.deviceKey); //bez await-a
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;
