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


/*

{"deviceKey":"keyA","deviceFieldGroups":[{"id":0,"groupName":"group1_rename","fields":[{"id":1,"fieldName":"field1","fieldType":"numeric","fieldValue":{"fieldValue":-1,"minValue":-1,"maxValue":25,"valueStep":1,"fieldDirection":"input","prefix":"T=", "sufix":"°C"}},{"id":2,"fieldName":"field2","fieldType":"numeric","fieldValue":{"fieldValue":-1,"minValue":-1,"maxValue":25,"valueStep":0.5,"fieldDirection":"input","prefix":"T=", "sufix":"°C"}},{"id":3,"fieldName":"field3","fieldType":"text","fieldValue":{"fieldValue":"23 deg C","fieldDirection":"input"}},{"id":4,"fieldName":"field4","fieldType":"multipleChoice","fieldValue":{"values":["OFF","ANIMACIJA 1","ANIMACIJA 2","ANIMACIJA 3"],"fieldValue":0,"fieldDirection":"input"}},{"id":5,"fieldName":"field5","fieldType":"button","fieldValue":{"fieldValue":false,"fieldDirection":"input"}},{"id":6,"fieldName":"field6","fieldType":"RGB","fieldValue":{"R":0,"G":0,"B":0,"fieldDirection":"input"}},{"id":7,"fieldName":"field7","fieldType":"button","fieldValue":{"fieldValue":true,"fieldDirection":"input","prefix":"T=", "sufix":"°C"}},{"id":8,"fieldName":"field8","fieldType":"button","fieldValue":{"fieldValue":true,"fieldDirection":"input"}},{"id":50,"fieldName":"field0","fieldType":"numeric","fieldValue":{"fieldValue":-1,"minValue":-1,"maxValue":25,"valueStep":1,"fieldDirection":"input","prefix":"T=", "sufix":"°C"}},{"id":99,"fieldName":"field9","fieldType":"button","fieldValue":{"fieldValue":true,"fieldDirection":"input"}}]},{"id":1,"groupName":"group2","fields":[{"id":0,"fieldName":"field0","fieldType":"numeric","fieldValue":{"fieldValue":-1,"minValue":-1,"maxValue":25,"valueStep":1,"fieldDirection":"input","prefix":"T=", "sufix":"°C"}},{"id":1,"fieldName":"field1","fieldType":"numeric","fieldValue":{"fieldValue":-1,"minValue":-1,"maxValue":25,"valueStep":1,"fieldDirection":"input","prefix":"T=", "sufix":"°C"}},{"id":2,"fieldName":"field2","fieldType":"numeric","fieldValue":{"fieldValue":-1,"minValue":-1,"maxValue":25,"valueStep":1,"fieldDirection":"input","prefix":"T=", "sufix":"°C"}},{"id":3,"fieldName":"field3","fieldType":"text","fieldValue":{"fieldValue":"23 deg C","fieldDirection":"input"}},{"id":4,"fieldName":"field4","fieldType":"multipleChoice","fieldValue":{"values":["OFF","ANIMACIJA 1","ANIMACIJA 2"],"fieldValue":0,"fieldDirection":"input"}},{"id":5,"fieldName":"field5","fieldType":"button","fieldValue":{"fieldValue":false,"fieldDirection":"input"}},{"id":6,"fieldName":"field6","fieldType":"RGB","fieldValue":{"R":0,"G":0,"B":0,"fieldDirection":"input"}}]}],"deviceFieldComplexGroups":[{"id":0,"groupName":"complexGroup1","currentState":0,"fieldGroupStates":[{"id":0, "stateName":"individual","fields":[{"id":0,"fieldName":"RField","fieldType":"numeric","fieldValue":{"fieldValue":0,"minValue":0,"maxValue":25,"valueStep":1,"fieldDirection":"input","prefix":"T=", "sufix":"°C"}},{"id":1,"fieldName":"GField","fieldType":"numeric","fieldValue":{"fieldValue":0,"minValue":0,"maxValue":25,"valueStep":1,"fieldDirection":"input","prefix":"T=", "sufix":"°C"}},{"id":2,"fieldName":"BField","fieldType":"numeric","fieldValue":{"fieldValue":0,"minValue":0,"maxValue":25,"valueStep":1,"fieldDirection":"input","prefix":"T=", "sufix":"°C"}}]},{"id":1, "stateName":"rgb","fields":[{"id":0,"fieldName":"RGB","fieldType":"RGB","fieldValue":{"R":0,"G":0,"B":0,"fieldDirection":"input"}}]},{"id":2, "stateName":"animations","fields":[{"id":0,"fieldName":"animations","fieldType":"multipleChoice","fieldValue":{"values":["OFF","A1","A2","A3","A4","A5"],"fieldValue":0,"fieldDirection":"input"}}]}]},{"id":1,"groupName":"complexGroup1_new","currentState":0,"fieldGroupStates":[{"id":0, "stateName":"individual","fields":[{"id":0,"fieldName":"RField","fieldType":"numeric","fieldValue":{"fieldValue":0,"minValue":0,"maxValue":25,"valueStep":1,"fieldDirection":"input","prefix":"T=", "sufix":"°C"}},{"id":1,"fieldName":"GField","fieldType":"numeric","fieldValue":{"fieldValue":0,"minValue":0,"maxValue":25,"valueStep":1,"fieldDirection":"input","prefix":"T=", "sufix":"°C"}},{"id":2,"fieldName":"BField","fieldType":"numeric","fieldValue":{"fieldValue":0,"minValue":0,"maxValue":25,"valueStep":1,"fieldDirection":"input","prefix":"T=", "sufix":"°C"}}]},{"id":1, "stateName":"rgb","fields":[{"id":0,"fieldName":"RGB","fieldType":"RGB","fieldValue":{"R":0,"G":0,"B":0,"fieldDirection":"input"}}]},{"id":2, "stateName":"animations","fields":[{"id":0,"fieldName":"animations","fieldType":"multipleChoice","fieldValue":{"values":["OFF","A1","A2","A3","A4"],"fieldValue":0,"fieldDirection":"input"}}]}]}]}

*/