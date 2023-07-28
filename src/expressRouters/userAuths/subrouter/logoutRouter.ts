import { IUser } from "models/basicModels";
import { ELogoutReasons } from "../../../models/frontendModels";
import { ILogoutRequest } from "../../../models/API/loginRegisterReqRes";
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { Db } from "firestoreDB/db";
import { DBSingletonFactory } from "../../../firestoreDB/singletonService";
import { userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";

var express = require('express');
var router = express.Router();

var db: Db = DBSingletonFactory.getInstance();
var userService: UserService = userServiceSingletonFactory.getInstance();
var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();


router.post('/', async (req: any, res: any) => {
    let logoutRequest: ILogoutRequest = req.body;

    let user: IUser;
    try {
        user = await userService.getUserByToken(logoutRequest.authToken, true);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    try {
        if (logoutRequest.logoutOtherSessions) {
            await userService.removeAllMyTokens(logoutRequest.authToken)
            await userService.removeToken(logoutRequest.authToken);
            wsServer.logoutAllUsersSessions(user.id, ELogoutReasons.LogoutAll, logoutRequest.authToken);
        }
        else{
            await userService.removeToken(logoutRequest.authToken);
            // wsServer.logoutUserSession(logoutRequest.authToken, ELogoutReasons.LogoutMyself) //TODO hmm commented (android implications)
        }
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
})

module.exports = router;
