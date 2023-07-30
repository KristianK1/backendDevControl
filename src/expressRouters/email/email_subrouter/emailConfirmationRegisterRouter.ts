import { UserService } from "../../../services/userService";
import { userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { IEmailConfirmationData } from "emailService/emailModels";
import { IUser } from "models/basicModels";
import { emailConfirmation_formHandlerPath } from "../../../emailService/emailPaths";

var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();

router.get('/:hashCode', async (req: any, res: any) => {
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
