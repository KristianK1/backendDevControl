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
        await userDb.removeToken(logoutRequest.authToken);
        if (logoutRequest.logoutOtherSessions) {
            wsServer.logoutAllUsersSessions(user.id, ELogoutReasons.LogoutAll);
        }
        else{
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
