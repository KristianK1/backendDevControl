import { MyWebSocketServer } from "./WSRouter";

export const wsServerSingletonFactory = (function () {
    var wsServerInstance: MyWebSocketServer;

    function createInstance(): MyWebSocketServer {
        var object = new MyWebSocketServer();
        return object;
    }

    return {
        getInstance: function () {
            if (!wsServerInstance) {
                wsServerInstance = createInstance();
            }
            return wsServerInstance;
        }
    };
})();