import { UserService } from "../../../services/userService";
import { userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { setupNewPassword_formHandlerPath } from "../../../emailService/emailPaths";

var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();

router.get('/:hashCode', async (req: any, res: any) => {
    try {
        let request = await userService.getForgotPasswordRequest(req.params.hashCode);
        res.render('enterNewPassword', {
            formHandlerPath: "../../email" + setupNewPassword_formHandlerPath + "/" + request.hashCode
        });
    } catch (e) {
        res.json("Ne radi");
    }
});

module.exports = router;