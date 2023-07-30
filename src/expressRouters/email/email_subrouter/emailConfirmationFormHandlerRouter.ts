import { UserService } from "../../../services/userService";
import { userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";

var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();

router.post('/:hashCode', async (req: any, res: any) => {
    try {
        await userService.confirmEmail(req.params.hashCode);
        res.render("successConfirmingEmail");
    }
    catch (e) {
        console.log(e.message);
        res.render('errorConfirmingEmail');
    }
});

module.exports = router;
