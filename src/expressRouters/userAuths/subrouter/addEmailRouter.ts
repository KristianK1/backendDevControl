import { DeviceDB } from 'firestoreDB/devices/deviceDB';
import { deviceDBSingletonFactory, usersDBSingletonFactory } from '../../../firestoreDB/singletonService';
import { UsersDB } from 'firestoreDB/users/userDB';
import { IUser } from 'models/basicModels';
import { IAddEmailRequest } from 'models/API/loginRegisterReqRes';
var express = require('express');
var router = express.Router();

var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
var userDb: UsersDB = usersDBSingletonFactory.getInstance();


router.post('/', async (req: any, res: any) => {
    let request: IAddEmailRequest = req.body;

    let user: IUser;
    try {
        user = await userDb.getUserByToken(request.authToken, false);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }

    if(request.email === ""){
        res.status(400);
        res.send('Invalid e-mail');
        return;
    }

    if(user.email !== ""){
        res.status(400);
        res.send('User already has an email address.');
        return;
    }

    try{
        let users = await userDb.getUsers();
        let userWithSameEmail = users.find(o => o.email === request.email);
        if(userWithSameEmail){
            res.status(400);
            res.send('This email is already linked to a diffrent user');
            return;
        }
    }catch(e){
        res.status(400);
        res.send(e.message);
        return;
    }

    try{
        userDb.sendEmailConfirmation_addEmail(user.id, user.username, request.email);
    }catch(e){
        res.status(400);
        res.send(e.message)
        return;
    }




    res.sendStatus(200);

    
});

module.exports = router;