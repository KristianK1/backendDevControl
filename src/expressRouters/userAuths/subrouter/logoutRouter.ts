import { IUser } from "models/basicModels";
import { ELogoutReasons } from "../../../models/frontendModels";
import { usersDBSingletonFactory } from "../../../firestoreDB/singletonService";
import { UsersDB } from "../../../firestoreDB/users/userDB";
import { ILogoutRequest } from "../../../models/API/loginRegisterReqRes";
import { MyWebSocketServer } from "../../../WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";

var express = require('express');
var router = express.Router();

var userDb: UsersDB = usersDBSingletonFactory.getInstance();
var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();


router.post('/', async (req: any, res: any) => {
    let logoutRequest: ILogoutRequest = req.body;

    let user: IUser;
    try {
        user = await userDb.getUserByToken(logoutRequest.authToken, true);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    try {
        if (logoutRequest.logoutOtherSessions) {
            await userDb.removeAllMyTokens(logoutRequest.authToken)
            await userDb.removeToken(logoutRequest.authToken);
            wsServer.logoutAllUsersSessions(user.id, ELogoutReasons.LogoutAll);
        }
        else{
            await userDb.removeToken(logoutRequest.authToken);
            wsServer.logoutUserSession(logoutRequest.authToken, ELogoutReasons.LogoutMyself)
        }
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
})

module.exports = router;
