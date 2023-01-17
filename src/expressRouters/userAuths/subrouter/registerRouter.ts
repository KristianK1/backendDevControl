import { usersDBSingletonFactory } from '../../../firestoreDB/singletonService';
import { UsersDB } from 'firestoreDB/users/userDB';
import { ILoginResponse, IRegisterRequest } from '../../../models/API/loginRegisterReqRes'

var express = require('express');
var router = express.Router();

var userDb: UsersDB = usersDBSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    console.log('reggg');
    let registerReq: IRegisterRequest = req.body;
    console.log(registerReq);

    let loginResponse: ILoginResponse;
    try {
        await userDb.addUser(registerReq.username, registerReq.password, registerReq.email);
        loginResponse = await userDb.loginUserByCreds(registerReq.username, registerReq.password);
        res.json(loginResponse);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
})



module.exports = router;