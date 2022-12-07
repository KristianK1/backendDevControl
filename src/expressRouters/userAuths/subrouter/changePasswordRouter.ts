import { UsersDB } from '../../../firestoreDB/users/userDB';
import { usersDBSingletonFactory } from '../../../firestoreDB/singletonService';
import { IChangePasswordRequest } from 'models/API/loginRegisterReqRes';

var express = require('express');
var router = express.Router();

var userDb: UsersDB = usersDBSingletonFactory.getInstance();


router.post('/', async (req: any, res: any) => {
    const request: IChangePasswordRequest = req.body;

    try {
        await userDb.changeUserPassword(request.userId, request.oldPassword, request.newPassword, request.logoutOtherSessions);
        await userDb.removeAllMyTokens(request.dontLogoutToken);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;
