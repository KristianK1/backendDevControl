import { IUser } from 'models/basicModels';
import { IAddEmailRequest } from 'models/API/loginRegisterReqRes';
import { userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";


var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    let request: IAddEmailRequest = req.body;

    let user: IUser;
    try {
        user = await userService.getUserByToken(request.authToken, false);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }

    if (request.email === "") {
        res.status(400);
        res.send('Invalid e-mail');
        return;
    }

    if (user.email !== "") {
        res.status(400);
        res.send('User already has an email address.');
        return;
    }

    try {
        let user = await userService.getUserbyEmail(request.email);
        if (user) {
            res.status(400);
            res.send('This email is already linked to a diffrent user');
            return;
        }
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    try {
        userService.sendEmailConfirmation_addEmail(user.id, user.username, request.email);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }
    res.sendStatus(200);
});

module.exports = router;