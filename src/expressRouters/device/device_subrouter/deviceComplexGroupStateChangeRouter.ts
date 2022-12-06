import { deviceDBSingletonFactory, usersDBSingletonFactory } from "../../../firestoreDB/singletonService";
import { DeviceDB } from "../../../firestoreDB/devices/deviceDB";
import { UsersDB } from "../../../firestoreDB/users/userDB";
import { IChangeComplexGroupState_Device, IChangeComplexGroupState_User } from "models/API/deviceCreateAlterReqRes";
import { IUser } from "models/basicModels";
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { ERightType } from "../../../models/userRightsModels";

var express = require('express');
var router = express.Router();

var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
var userDb: UsersDB = usersDBSingletonFactory.getInstance();
var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

var express = require('express');
var router = express.Router();

router.post('/device', async (req: any, res: any) => {
    let request: IChangeComplexGroupState_Device = req.body;

    try {
        await deviceDb.changeComplexGroupStateFromDevice(request.deviceKey, request.groupId, request.state);
        let id = (await deviceDb.getDeviceByKey(request.deviceKey)).id;
        wsServer.emitDeviceConfig(id); //bez await-a
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    res.sendStatus(200);
});

router.post('/user', async (req: any, res: any) => {
    let request: IChangeComplexGroupState_User = req.body;
    let user: IUser;
    try {
        user = await userDb.getUserByToken(request.authToken, false);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }


    let right = await userDb.checkUserRightToComplexGroup(user, request.deviceId, request.groupId);
    if (right !== ERightType.Write) {
        res.status(400);
        res.send('User doesn\'t have write rights to this complex group');
        return;
    }

    try {
        await deviceDb.changeComplexGroupStateFromUser(request.deviceId, request.groupId, request.state);
        wsServer.emitDeviceConfig(request.deviceId); //bez await-a
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;