import { UserService } from "../../../services/userService";
import { userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";

var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();

router.post('/:hashCode', async (req: any, res: any) => {
    let hashCode: string = req.params.hashCode;
    let newPassword: string = req.body.password;
    let newPasswordAgain: string = req.body.confirmPassword;
    if (newPassword !== newPasswordAgain) {
        res.render("fp_unequalPasswords");
        return;
    }
    try {
        await userService.changePasswordViaForgetPasswordRequest(hashCode, newPassword);
        res.render('fp_newPasswordSuccess');
    } catch (e) {
        res.render("fp_newPasswordError");
    }

});

module.exports = router;