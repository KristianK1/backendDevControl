import { ILoginResponse, IRegisterRequest } from '../../../models/API/loginRegisterReqRes'
import { userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";

var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    console.log('reggg');
    let registerReq: IRegisterRequest = req.body;
    console.log(registerReq);

    let loginResponse: ILoginResponse;
    try {
        await userService.addUser(registerReq.username, registerReq.password, registerReq.email);
        loginResponse = await userService.loginUserByCreds(registerReq.username, registerReq.password, registerReq.firebaseToken);
        res.json(loginResponse);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
});

module.exports = router;