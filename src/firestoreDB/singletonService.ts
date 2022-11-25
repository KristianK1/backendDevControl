import { DeviceDB } from "./devices/deviceDB";
import { FirestoreDB } from "./firestore";
import { getMaxIds } from "./MaxIDs/MaxIDs";
import { UserRightsDB } from "./userRights/userRightsDB";
import { UsersDB } from "./users/userDB";

export const firestoreSingletonFactory = (function () {
    var firestoreInstance: FirestoreDB;

    function createInstance(): FirestoreDB {
        var object = new FirestoreDB();
        return object;
    }

    return {
        getInstance: function () {
            if (!firestoreInstance) {
                firestoreInstance = createInstance();
            }
            return firestoreInstance;
        }
    };
})();

export const usersDBSingletonFactory = (function () {
    var usersDB: UsersDB;

    function createInstance(): UsersDB {
        var object = new UsersDB();
        return object;
    }

    return {
        getInstance: function () {
            if (!usersDB) {
                usersDB = createInstance();
            }
            return usersDB;
        }
    };
})();

export const deviceDBSingletonFactory = (function () {
    var deviceDB: DeviceDB;

    function createInstance(): DeviceDB {
        var object = new DeviceDB();
        return object;
    }

    return {
        getInstance: function () {
            if (!deviceDB) {
                deviceDB = createInstance();
            }
            return deviceDB;
        }
    };
})();

export const getMaxIDSingletonFactory = (function () {
    var getMaxIDs: getMaxIds;

    function createInstance(): getMaxIds {
        var object = new getMaxIds();
        return object;
    }

    return {
        getInstance: function () {
            if (!getMaxIDs) {
                getMaxIDs = createInstance();
            }
            return getMaxIDs;
        }
    };
})();


export const getUserRightDBSingletonFactory = (function () {
    var userRightsDB: UserRightsDB;

    function createInstance(): UserRightsDB {
        var object = new UserRightsDB();
        return object;
    }

    return {
        getInstance: function () {
            if (!userRightsDB) {
                userRightsDB = createInstance();
            }
            return userRightsDB;
        }
    };
})();

