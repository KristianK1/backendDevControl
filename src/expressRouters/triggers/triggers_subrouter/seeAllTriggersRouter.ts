import { triggerServiceSingletonFactory, userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";
import { TriggerService } from "../../../services/triggerService";
import { IGetAllUserTriggersReq, IGetAllUserTriggersRes } from "../../../models/API/triggersReqRes";
import { IUser } from "../../../models/basicModels";

var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();
var triggerService: TriggerService = triggerServiceSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    let request: IGetAllUserTriggersReq = req.body;

    let user: IUser;
    try {
        user = await userService.getUserByToken(request.authToken, false);
    } catch (e) {
        res.status(400);
        res.send(e.message)
        return;
    }

    let tgs = await triggerService.getAllTriggersForUser(user.id);
    let response: IGetAllUserTriggersRes = {
        triggers: tgs,
    }
    // res.status(200);
    res.json(response);
});

module.exports = router;
