import { IChangeComplexGroupState_Device, IChangeComplexGroupState_User } from "models/API/deviceCreateAlterReqRes";
import { IUser } from "models/basicModels";
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { ERightType } from "../../../models/userRightsModels";
import { DBSingletonFactory } from "../../../firestoreDB/singletonService";
import { Db } from "firestoreDB/db";
import { userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";

var express = require('express');
var router = express.Router();

var db: Db = DBSingletonFactory.getInstance();
var userService: UserService = userServiceSingletonFactory.getInstance();
var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/device', async (req: any, res: any) => {
    let request: IChangeComplexGroupState_Device = req.body;

    try {
        await db.changeComplexGroupStateFromDevice(request.deviceKey, request.groupId, request.state);
        let id = (await db.getDeviceByKey(request.deviceKey)).id;
        wsServer.emitComplexGroupChanged(id, request.groupId);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    res.sendStatus(200);
});

router.post('/user', async (req: any, res: any) => {
    console.log(req.body);
    let request: IChangeComplexGroupState_User = req.body;
    let user: IUser;
    console.log(request);

    try{
        await db.getDevicebyId(request.deviceId);
    }catch (e){
        res.status(400);
        res.send(e.message);
        return;
    }

    try {
        user = await userService.getUserByToken(request.authToken, false);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }

    let right = await db.checkUserRightToComplexGroup(user, request.deviceId, request.groupId);
    if (right !== ERightType.Write) {
        res.status(400);
        res.send('User doesn\'t have write rights to this complex group');
        return;
    }
    
    try {
        await db.changeComplexGroupStateFromUser(request.deviceId, request.groupId, request.state);
        wsServer.emitComplexGroupChanged(request.deviceId, request.groupId); //bez await-a
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;