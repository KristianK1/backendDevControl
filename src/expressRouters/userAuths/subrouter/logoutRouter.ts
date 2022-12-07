import { usersDBSingletonFactory } from "../../../firestoreDB/singletonService";
import { UsersDB } from "../../../firestoreDB/users/userDB";
import { ILogoutRequest } from "../../../models/API/loginRegisterReqRes";

var express = require('express');
var router = express.Router();

var userDb: UsersDB = usersDBSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    let logoutRequest: ILogoutRequest = req.body;
    try {
        await userDb.removeToken(logoutRequest.authToken);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
})

module.exports = router;
