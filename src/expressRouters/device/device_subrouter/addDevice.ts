import { IAddDeviceReq } from "../../../models/API/deviceCreateAlterReqRes";
import { IUser } from "models/basicModels";
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { DBSingletonFactory } from "../../../firestoreDB/singletonService";
import { Db } from "firestoreDB/db";
import { userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";

var express = require('express');
var router = express.Router();

var db: Db = DBSingletonFactory.getInstance();
var userService: UserService = userServiceSingletonFactory.getInstance();
var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    var addDeviceReq: IAddDeviceReq = req.body;
    
    let user: IUser
    try {
        user = await userService.getUserByToken(addDeviceReq.authToken, false);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    try {
        let id = await db.addDevice(addDeviceReq.deviceName, user.id, addDeviceReq.deviceKey);
        wsServer.emitDeviceRegistrationById(id);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    res.sendStatus(200);
});

module.exports = router;
