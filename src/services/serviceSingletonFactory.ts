import { DeviceService } from "./deviceService";
import { UserPermissionService } from "./userPermissionService";
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

export const deviceServiceSingletonFactory = (function () {
    var deviceService: DeviceService;

    function createInstance(): DeviceService {
        var object = new DeviceService();
        return object;
    }

    return {
        getInstance: function () {
            if (!deviceService) {
                deviceService = createInstance();
            }
            return deviceService;
        }
    };
})();

export const userPermissionServiceSingletonFactory = (function () {
    var userPermissionService: UserPermissionService;

    function createInstance(): UserPermissionService {
        var object = new UserPermissionService();
        return object;
    }

    return {
        getInstance: function () {
            if (!userPermissionService) {
                userPermissionService = createInstance();
            }
            return userPermissionService;
        }
    };
})();