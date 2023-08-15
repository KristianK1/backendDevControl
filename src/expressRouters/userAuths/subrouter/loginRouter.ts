import { ILoginByTokenRequest, ILoginRequest, ILoginResponse } from '../../../models/API/loginRegisterReqRes'
import { userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";

var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();


router.post('/creds', async (req: any, res: any) => {
    const loginReq: ILoginRequest = req.body;
    console.log('/login/creds');
    console.log(loginReq);
    let loginResponse: ILoginResponse;
    try {
        loginResponse = await userService.loginUserByCreds(loginReq.username, loginReq.password, loginReq.firebaseToken);
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    console.log(loginResponse);
    res.json(loginResponse);
});

router.post('/token', async (req: any, res: any) => {
    const loginReq: ILoginByTokenRequest = req.body;

    let loginResponse = {} as ILoginResponse;
    try {
        const user = await userService.getUserByToken(loginReq.authToken, true);
        
        loginResponse.username = user.username;
        loginResponse.id = user.id;
        loginResponse.authToken = loginReq.authToken;
        loginResponse.email = user.email;
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.json(loginResponse);
});

module.exports = router;