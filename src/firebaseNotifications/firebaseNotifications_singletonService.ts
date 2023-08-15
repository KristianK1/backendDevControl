import { FirebaseNotifications } from "./firebaseNotifications";

export const firebaseNotificationsSingletonFactory = (function () {
    var firebaseNotificationsInstance: FirebaseNotifications;

    function createInstance(): FirebaseNotifications {
        var object = new FirebaseNotifications();
        return object;
    }

    return {
        getInstance: function () {
            if (!firebaseNotificationsInstance) {
                firebaseNotificationsInstance = createInstance();
            }
            return firebaseNotificationsInstance;
        }
    };
})();

