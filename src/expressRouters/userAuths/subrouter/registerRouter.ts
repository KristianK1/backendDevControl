import { usersDBSingletonFactory } from '../../../firestoreDB/singletonService';
import { UsersDB } from 'firestoreDB/users/userDB';
import { IRegisterRequest } from '../../../models/API/loginRegisterReqRes'

var express = require('express');
var router = express.Router();

var userDb: UsersDB = usersDBSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    console.log('reggg');
    let registerReq: IRegisterRequest = req.body;
    console.log(registerReq);
    try {
        await userDb.addUser(registerReq.username, registerReq.password, registerReq.email);
        let loginResponse = await userDb.loginUserByCreds(registerReq.username, registerReq.password);
        res.json(loginResponse);
    }
    catch (e) {
        console.log(e);
        res.send(e['message']);
    }
})



module.exports = router;