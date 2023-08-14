import { firestoreSingletonFactory } from "./../firestoreDB/singletonService"

var admin = require('firebase-admin')

export class FirebaseNotifications {
    private firebaseDB = firestoreSingletonFactory.getInstance();

    createAndSendTestNott() {
        let token = "dO-EIPGPT7egzzxnIBMQHa:APA91bEjrofP4boiB5_XEa4lmVx7SDkEYtgKaz2hgAH8upPEHEbV6pW9CzN-gjl93hYyHjtonS0VtWGyLFjD56Apx2mWWUD4MyX7KsCvqcf9-i09STnKCmslz6FIFTguxshqq4dKBm9H";
        const message = {
            notification: {
                title: "title of",
                body: "body of",
            },
        }
        const options = {
            priority: 'high',
            timeToLive: 60 * 60 * 24
        };

        this.sendPushNotification(token, message, options);
    }

    sendPushNotification(token: string, message, options) {
        admin.messaging().sendToDevice(token, message, options).then((response) => {
            console.log("message sent: " + response)
        }).catch((error) => {
            console.log("message error: " + error)
        });
    }
}