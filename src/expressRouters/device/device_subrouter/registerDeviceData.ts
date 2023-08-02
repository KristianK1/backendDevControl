import { MyWebSocketServer } from "WSRouters/WSRouter";
import { wsServerSingletonFactory } from "../../../WSRouters/WSRouterSingletonFactory";
import { IDevice } from "models/basicModels";
import { DeviceService } from "../../../services/deviceService";
import { deviceServiceSingletonFactory, triggerServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { TriggerService } from "../../../services/triggerService";

var express = require('express');
var router = express.Router();

var deviceService: DeviceService = deviceServiceSingletonFactory.getInstance();
var triggerService: TriggerService = triggerServiceSingletonFactory.getInstance();

var wsServer: MyWebSocketServer = wsServerSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    var registerDeviceDataReq: IDevice = req.body;
    try {
        await deviceService.registerDeviceData(registerDeviceDataReq);
        await triggerService.checkValidityOfTriggers();
        wsServer.emitDeviceRegistration(registerDeviceDataReq.deviceKey); //bez await-a
    } catch (e) {
        res.status(400);
        res.send(e.message);
        return;
    }
    res.sendStatus(200);
});

module.exports = router;
