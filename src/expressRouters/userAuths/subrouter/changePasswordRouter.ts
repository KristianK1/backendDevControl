import { DBSingletonFactory } from "../../../firestoreDB/singletonService";
import { IChangePasswordRequest } from 'models/API/loginRegisterReqRes';
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { ELogoutReasons } from '../../../models/frontendModels';
import { Db } from "firestoreDB/db";

var express = require('express');
var router = express.Router();

var db: Db = DBSingletonFactory.getInstance();
var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    const request: IChangePasswordRequest = req.body;
    try {
        await db.changeUserPassword(request.userId, request.oldPassword, request.newPassword);
        if (request.logoutOtherSessions) {
            await db.removeAllMyTokens(request.dontLogoutToken);
            wsServer.logoutAllUsersSessions(request.userId, ELogoutReasons.ChangedPassword, request.dontLogoutToken);
        }
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;
