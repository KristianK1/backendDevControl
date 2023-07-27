import { IUser } from 'models/basicModels';
import { IGetUsersRequest, IGetUsersResponse } from 'models/API/loginRegisterReqRes';
import { DBSingletonFactory } from "../../../firestoreDB/singletonService";
import { Db } from "firestoreDB/db";

var express = require('express');
var router = express.Router();

var db: Db = DBSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    console.log("request")
    let request: IGetUsersRequest = req.body;
    
    let users: IUser[];
    let thisUser: IUser;

    try {
        thisUser = await db.getUserByToken(request.authToken, false);
        users = await db.getUsers()
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