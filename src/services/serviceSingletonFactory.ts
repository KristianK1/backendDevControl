import { UserService } from "./userService";

export const userServiceSingletonFactory = (function () {
    var userService: UserService;

    function createInstance(): UserService {
        var object = new UserService();
        return object;
    }

    return {
        getInstance: function () {
            if (!userService) {
                userService = createInstance();
            }
            return userService;
        }
    };
})();