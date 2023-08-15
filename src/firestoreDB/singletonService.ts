import { Db } from "./db";
import { FirestoreDB } from "./firestore";

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

export const DBSingletonFactory = (function () {
    var DB: Db;

    function createInstance(): Db {
        var object = new Db();
        return object;
    }

    return {
        getInstance: function () {
            if (!DB) {
                DB = createInstance();
            }
            return DB;
        }
    };
})();