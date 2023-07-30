import { IEmailConfirmationData } from "emailService/emailModels";
import { emailConfirmation_formHandlerPath } from "../../../emailService/emailPaths";
import { IUser } from "models/basicModels";
import { userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { UserService } from "../../../services/userService";

var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();


router.get('/:hashCode', async (req: any, res: any) => {
    // res.send(req.params.hashCode);
    let data: IEmailConfirmationData;
    let user: IUser;
    try {
        data = await userService.getEmailConfirmationData(req.params.hashCode);
        user = await userService.getUserbyId(data.userId);
    }
    catch (e) {
        console.log(e.message);
        res.render('errorConfirmingEmail');
        return;
    }
    res.render('confirmEmail', {
        email: data.email,
        username: user.username,
        formHandlerPath: "../../email" + emailConfirmation_formHandlerPath + "/" + data.hashCode
    });
});

module.exports = router;