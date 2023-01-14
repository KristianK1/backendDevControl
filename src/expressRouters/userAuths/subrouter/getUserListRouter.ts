import { DeviceDB } from 'firestoreDB/devices/deviceDB';
import { deviceDBSingletonFactory, usersDBSingletonFactory } from '../../../firestoreDB/singletonService';
import { UsersDB } from 'firestoreDB/users/userDB';
import { IUser } from 'models/basicModels';
import { IGetUsersRequest, IGetUsersResponse } from 'models/API/loginRegisterReqRes';
var express = require('express');
var router = express.Router();

var deviceDb: DeviceDB = deviceDBSingletonFactory.getInstance();
var userDb: UsersDB = usersDBSingletonFactory.getInstance();


router.post('/', async (req: any, res: any) => {
    console.log("request")
    let request: IGetUsersRequest = req.body;
    
    let users: IUser[];
    let thisUser: IUser;

    try {
        thisUser = await userDb.getUserByToken(request.authToken, false);
        users = await userDb.getUsers()
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }

    let response: IGetUsersResponse = {
        users: []
    }

    for(let user of users){
        if(user.id !== thisUser.id){
            response.users.push({
                id: user.id,
                username: user.username,
            });
        }
    }

    res.json(response)

});

module.exports = router;