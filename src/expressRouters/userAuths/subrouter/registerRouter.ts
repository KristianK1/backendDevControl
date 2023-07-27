import { DBSingletonFactory } from "../../../firestoreDB/singletonService";
import { ILoginResponse, IRegisterRequest } from '../../../models/API/loginRegisterReqRes'
import { Db } from "firestoreDB/db";

var express = require('express');
var router = express.Router();

var db: Db = DBSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    console.log('reggg');
    let registerReq: IRegisterRequest = req.body;
    console.log(registerReq);

    let loginResponse: ILoginResponse;
    try {
        await db.addUser(registerReq.username, registerReq.password, registerReq.email);
        loginResponse = await db.loginUserByCreds(registerReq.username, registerReq.password);
        res.json(loginResponse);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
});

module.exports = router;