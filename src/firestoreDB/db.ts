import { IAuthToken, IComplexFieldGroup, IComplexFieldGroupState, IDevice, IDeviceFieldBasic, IDeviceFieldMultipleChoice, IDeviceFieldNumeric, IFieldGroup, IRGB, IUser } from "../models/basicModels";
import { FirestoreDB } from "./firestore";
import { firestoreSingletonFactory } from "./singletonService";
import { transformDeviceData, transformUserRights } from "./dataTransformations";
import { v4 as uuid } from 'uuid';
import { addDaysToCurrentTime } from "../generalStuff/timeHandlers";
import { IUserRight, IUserRightComplexGroup, IUserRightDevice, IUserRightField, IUserRightGroup } from "../models/userRightsModels";
import { IEmailConfirmationData, IForgotPasswordData } from "../emailService/emailModels";
import { EmailService, emailServiceSingletonFactory } from "../emailService/emailService";
import { FieldValue } from "firebase-admin/firestore";
import { ETriggerSourceType, ITrigger, ITriggerSourceAdress_fieldInComplexGroup, ITriggerSourceAdress_fieldInGroup } from "models/triggerModels";

export class Db {
    static usersCollName = 'users';
    static authTokenCollName = 'authTokens';
    static emailConfirmationsCollName = 'emailConfirmations';
    static forgetPasswordRequestsCollName = 'forgotPasswords';
    static devCollName = 'devices';
    static maxIDsCollName = 'maxIDs';
    static triggersCollName = 'triggers';

    static maxId_userKey = 'user';
    static maxId_deviceKey = 'device';
    static maxId_fieldGroupKey = 'fieldGroup';
    static maxId_fieldKey = 'field';
    static maxId_triggerKey = 'trigger';

    firestore: FirestoreDB;
    emailService: EmailService;

    constructor() {
        this.firestore = firestoreSingletonFactory.getInstance();
        this.emailService = emailServiceSingletonFactory.getInstance();
    }


    //<USER>
    async getUserbyId(id: number): Promise<IUser> {
        let user: IUser = await this.firestore.getDocumentData(Db.usersCollName, `${id}`);
        if (!user) throw ({ message: 'User doesn\'t exist' });
        user.userRight = transformUserRights(user.userRight);
        return user;
    }

    async getUsers(): Promise<IUser[]> {
        let users: IUser[] = await this.firestore.getCollectionData(Db.usersCollName);
        for (let user of users) {
            user.userRight = transformUserRights(user.userRight);
        }
        return users;
    }

    async addUser(newUser: IUser): Promise<void> {
        await this.firestore.setDocumentValue(Db.usersCollName, `${newUser.id}`, newUser);
    }

    async changeUsername(id: number, username: string) {
        let user = await this.getUserbyId(id);
        if (!user) {
            throw ({ message: 'User doesn\'t exist in database' });
        }
        user.username = username;
        await this.firestore.updateDocumentValue(Db.usersCollName, `${id}`, user);
    }

    async updateUserEmail(userId: number, email: string) {
        await this.firestore.updateDocumentValue(Db.usersCollName, `${userId}`, { email: email });
    }

    async updateUserPassword(userId: number, password: string) {
        await this.firestore.updateDocumentValue(Db.usersCollName, `${userId}`, { password: password });
    }

    async deleteUser(userId: number) {
        await this.firestore.deleteDocument(Db.usersCollName, `${userId}`);
        let tokens = await this.getTokens();
        tokens.forEach(async token => {
            if (token.userId === userId) {
                await this.firestore.deleteDocument(Db.authTokenCollName, token.authToken);
            }
        });
    }
    //</USER>

    //<TOKENs>
    async generateAndSaveNewToken(userId: number): Promise<IAuthToken> {

        const newAuthToken = uuid().replace('-', '');
        const authToken: IAuthToken = {} as IAuthToken;

        authToken.authToken = newAuthToken;
        authToken.userId = userId;
        authToken.validUntil = addDaysToCurrentTime(30);

        await this.firestore.setDocumentValue(Db.authTokenCollName, newAuthToken, authToken);

        return authToken;
    }

    async getToken(token: string): Promise<IAuthToken> {
        return await this.firestore.getDocumentData(Db.authTokenCollName, token);
    }

    async extendToken(token: string): Promise<void> {
        await this.firestore.updateDocumentValue(Db.authTokenCollName, token, {
            validUntil: addDaysToCurrentTime(30)
        });
    }

    async getTokens(): Promise<IAuthToken[]> {
        return await this.firestore.getCollectionData(Db.authTokenCollName);
    }

    async removeToken(token: string) {
        let authTokenDB: IAuthToken = await this.firestore.getDocumentData(Db.authTokenCollName, token);
        if (!authTokenDB) {
            throw ({ message: 'Couldn\'t find token' });
        }
        await this.firestore.deleteDocument(Db.authTokenCollName, token);
    }

    async removeAllMyTokens(dontRemoveToken: string) {
        let authTokenDB: IAuthToken = await this.firestore.getDocumentData(Db.authTokenCollName, dontRemoveToken);
        if (!authTokenDB) {
            throw ({ message: 'Couldn\'t find token' });
        }
        const allAuthTokens: IAuthToken[] = await this.firestore.getCollectionData(Db.authTokenCollName);
        allAuthTokens.forEach(async token => { //TODO maybe regular for loop
            if (token.userId == authTokenDB.userId && token.authToken !== dontRemoveToken) {
                await this.firestore.deleteDocument(Db.authTokenCollName, `${token.authToken}`);
            }
        })
    }
    //</TOKENs>

    //<USER_RIGHTS>
    async getUserRights(userId: number): Promise<IUserRight> {
        let user = await this.getUserbyId(userId);
        return user.userRight;
    }

    async addUserRightToDevice(userId: number, right: IUserRightDevice) {
        await this.firestore.updateDocumentValue(Db.usersCollName, `${userId}`, {
            [`userRight.rightsToDevices.${right.deviceId}`]: right,
        });
    }

    async deleteUserRightToDevice(userId: number, deviceId: number) {
        await this.firestore.updateDocumentValue(Db.usersCollName, `${userId}`, {
            [`userRight.rightsToDevices.${deviceId}`]: FieldValue.delete()
        });
    }

    async addUserRightToGroup(userId: number, right: IUserRightGroup) {
        await this.firestore.updateDocumentValue(Db.usersCollName, `${userId}`, {
            [`userRight.rightsToGroups.${right.deviceId}.${right.groupId}`]: right,
        });
    }

    async deleteUserRightToGroup(userId: number, deviceId: number, groupId: number) {
        // await this.deleteNestedRightsForGroup(user, deviceId, groupId, false);
        await this.firestore.updateDocumentValue(Db.usersCollName, `${userId}`, {
            [`userRight.rightsToGroups.${deviceId}.${groupId}`]: FieldValue.delete()
        });
    }

    async addUserRightToField(userId: number, right: IUserRightField) {
        await this.firestore.updateDocumentValue(Db.usersCollName, `${userId}`, {
            [`userRight.rightsToFields.${right.deviceId}.${right.groupId}.${right.fieldId}`]: right
        });
    }

    async deleteUserRightToField(userId: number, deviceId: number, groupId: number, fieldId: number) {
        await this.firestore.updateDocumentValue(Db.usersCollName, `${userId}`, {
            [`userRight.rightsToFields.${deviceId}.${groupId}.${fieldId}`]: FieldValue.delete()
        });
    }

    async addUserRightToComplexGroup(userId: number, right: IUserRightComplexGroup) {
        await this.firestore.updateDocumentValue(Db.usersCollName, `${userId}`, {
            [`userRight.rightsToComplexGroups.${right.deviceId}.${right.complexGroupId}`]: right
        });
    }

    async deleteUserRightToComplexGroup(userId: number, deviceId: number, complexGroupId: number) {
        await this.firestore.updateDocumentValue(Db.usersCollName, `${userId}`, {
            [`userRight.rightsToComplexGroups.${deviceId}.${complexGroupId}`]: FieldValue.delete()
        });
    }

    async deleteUserRightForNewAdmin(userId: number, deviceId: number) {
        this.deleteUserRightToDevice(userId, deviceId);
    }
    //</USER_RIGHTS>

    //<DEVICE>
    private async getDevices(): Promise<IDevice[]> {
        return await this.firestore.getCollectionData(Db.devCollName);
    }

    async getTransformedDevices(): Promise<IDevice[]> {
        let devices = await this.getDevices();
        let transformedDevices: IDevice[] = [];
        for (let device of devices) {
            let transformedDevice = transformDeviceData(device)
            transformedDevices.push(transformedDevice)
        }
        return transformedDevices;
    }

    async getDevicebyId(id: number): Promise<IDevice> {
        let device: IDevice = await this.firestore.getDocumentData(Db.devCollName, `${id}`);
        if (!device) {
            throw ({ message: 'Device doesn\'t exist' });
        }
        device = transformDeviceData(device);
        return device;
    }

    async getDevicebyKey(key: string): Promise<IDevice> {
        const allDevices = await this.getDevices();
        let device = allDevices.find(o => o.deviceKey === key);
        if (!device) {
            throw ({ message: 'Device doesn\'t exist' });
        }
        device = transformDeviceData(device);
        return device;
    }

    async addDevice(newDevice: IDevice): Promise<void> {
        await this.firestore.setDocumentValue(Db.devCollName, `${newDevice.id}`, newDevice);
    }

    async renameDevice(id: number, deviceName: string) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${id}`, {
            deviceName: deviceName,
        });
    }

    async deleteDevice(id: number) {
        await this.firestore.deleteDocument(Db.devCollName, `${id}`);
    }

    async changeDeviceAdmin(deviceId: number, userId: number) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            userAdminId: userId,
        });
    }

    async addDeviceFieldGroup(deviceId: number, newGroup: IFieldGroup): Promise<void> {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldGroups.${newGroup.id}`]: newGroup
        });
    }

    async renameDeviceFieldGroup(deviceId: number, groupId: number, groupName: string) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.groupName`]: groupName
        });
    }

    async deleteDeviceFieldGroup(deviceId: number, groupId: number) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldGroups.${groupId}`]: FieldValue.delete()
        })

    }

    async addDeviceField(deviceId: number, groupId: number, deviceField: IDeviceFieldBasic): Promise<void> {
        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${deviceField.id}`]: deviceField,
        });
    }

    async renameDeviceField(deviceId: number, groupId: number, fieldId: number, fieldName: string) {
        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${fieldId}.fieldName`]: fieldName
        });
    }

    async deleteDeviceField(deviceId: number, groupId: number, fieldId: number) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${fieldId}`]: FieldValue.delete()
        });
    }

    async changeDeviceFieldValue(deviceId: number, groupId: number, fieldId: number, fieldValue: any) {
        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${fieldId}.fieldValue.fieldValue`]: fieldValue
        });
    }

    async changeDeviceFieldValueRGB(deviceId: number, groupId: number, fieldId: number, fieldValue: IRGB) {
        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${fieldId}.fieldValue.R`]: fieldValue.R
        });
        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${fieldId}.fieldValue.G`]: fieldValue.G
        });
        await this.firestore.updateDocumentValue('devices', `${deviceId}`, {
            [`deviceFieldGroups.${groupId}.fields.${fieldId}.fieldValue.B`]: fieldValue.B
        });
    }

    async addComplexGroup(deviceId: number, newGroup: IComplexFieldGroup) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${newGroup.id}`]: newGroup
        });
    }

    async renameComplexGroup(deviceId: number, groupId: number, groupName: string) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups[${groupId}].groupName`]: groupName
        });
    }

    async deleteComplexGroup(deviceId: number, groupId: number) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}`]: FieldValue.delete()
        });

    }

    async addComplexGroupState(deviceId: number, groupId: number, state: IComplexFieldGroupState) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${state.id}`]: state
        });
    }

    async renameComplexGroupState(deviceId: number, groupId: number, stateId: number, stateName: string) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.stateName`]: stateName
        });
    }

    async changeComplexGroupState(deviceId: number, groupId: number, stateId: number) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.currentState`]: stateId
        });
    }

    async deleteComplexGroupState(deviceId: number, groupId: number, stateId: number) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}`]: FieldValue.delete()
        });
    }

    async addFieldInComplexGroup(deviceId: number, groupId: number, stateId: number, fieldData: IDeviceFieldBasic) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldData.id}`]: fieldData
        });
    }

    async deleteFieldInComplexGroup(deviceId: number, groupId: number, stateId: number, fieldId: number) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldId}`]: FieldValue.delete()
        });
    }

    async renameFieldInComplexGroup(deviceId: number, groupId: number, stateId: number, fieldId: number, fieldName: string) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldId}.fieldName`]: fieldName
        });
    }

    async changeDeviceFieldValueInComplexGroup(deviceId: number, groupId: number, stateId: number, fieldId: number, fieldValue: any) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldId}.fieldValue.fieldValue`]: fieldValue
        });
    }

    async changeDeviceFieldValueInComplexGroupRGB(deviceId: number, groupId: number, stateId: number, fieldId: number, fieldValue: IRGB) {
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldId}.fieldValue.R`]: fieldValue.R
        });
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldId}.fieldValue.G`]: fieldValue.G
        });
        await this.firestore.updateDocumentValue(Db.devCollName, `${deviceId}`, {
            [`deviceFieldComplexGroups.${groupId}.fieldGroupStates.${stateId}.fields.${fieldId}.fieldValue.B`]: fieldValue.B
        });
    }
    //</DEVICE>

    //<EMAIL>
    async saveEmailConfirmationData(emailConfirmationData: IEmailConfirmationData): Promise<void> {
        await this.firestore.setDocumentValue(Db.emailConfirmationsCollName, emailConfirmationData.hashCode, emailConfirmationData);
    }

    async deleteEmailConfirmationData(hashCode: string): Promise<void> {
        await this.firestore.deleteDocument(Db.emailConfirmationsCollName, hashCode);
    }

    async getAllEmailConfirmationData(): Promise<IEmailConfirmationData[]> {
        return await this.firestore.getCollectionData(Db.emailConfirmationsCollName);
    }

    async saveForgotPasswordRequest(request: IForgotPasswordData): Promise<void> {
        await this.firestore.setDocumentValue(Db.forgetPasswordRequestsCollName, `${request.userId}`, request);
    }

    async deleteForgotPasswordRequest(userId: number): Promise<void> {
        await this.firestore.deleteDocument(Db.forgetPasswordRequestsCollName, `${userId}`);
    }
    async getAllForgotPasswordRequests(): Promise<IForgotPasswordData[]> {
        return await this.firestore.getCollectionData(Db.forgetPasswordRequestsCollName);
    }
    //</EMAIL>

    //<TRIGGER>
    async saveTrigger(triggerData: ITrigger) {
        let newTriggerId = await this.getMaxTriggerId(true);

        switch (triggerData.sourceType) {
            case ETriggerSourceType.FieldInGroup:
                let addressG = triggerData.sourceData as ITriggerSourceAdress_fieldInGroup;
                await this.firestore.updateDocumentValue(Db.triggersCollName, `devices/${addressG.deviceId}/${addressG.groupId}/${addressG.fieldId}/${newTriggerId}`, triggerData);
                break;
            case ETriggerSourceType.FieldInComplexGroup:
                let addressCG = triggerData.sourceData as ITriggerSourceAdress_fieldInComplexGroup;
                await this.firestore.updateDocumentValue(Db.triggersCollName, `devices/${addressCG.deviceId}/${addressCG.complexGroupId}/${addressCG.stateId}/${addressCG.fieldId}/${newTriggerId}`, triggerData);
                break;
            case ETriggerSourceType.TimeTrigger:
                await this.firestore.updateDocumentValue(Db.triggersCollName, `time/${newTriggerId}`, triggerData);
                break;
        }
    }
    //</TRIGGER>


    // <MAX_IDs>
    async getMaxUserId(autoIncrement: boolean): Promise<number> { return await this.getMax(Db.maxId_userKey, autoIncrement) }
    async setMaxUserId(id: number) { await this.setMax(Db.maxId_userKey, id) }

    async getMaxDeviceId(autoIncrement: boolean): Promise<number> { return await this.getMax(Db.maxId_deviceKey, autoIncrement) }
    async setMaxDeviceId(id: number) { await this.setMax(Db.maxId_deviceKey, id) }

    async getMaxFieldGroupId(autoIncrement: boolean): Promise<number> { return await this.getMax(Db.maxId_fieldGroupKey, autoIncrement) }
    async setMaxFieldGroupId(id: number) { await this.setMax(Db.maxId_fieldGroupKey, id) }

    async getMaxFieldId(autoIncrement: boolean): Promise<number> { return await this.getMax(Db.maxId_fieldKey, autoIncrement) }
    async setMaxFieldId(id: number) { await this.setMax(Db.maxId_fieldKey, id) }

    async getMaxTriggerId(autoIncrement: boolean): Promise<number> { return await this.getMax(Db.maxId_triggerKey, autoIncrement) }
    async setMaxTriggerId(id: number) { await this.setMax(Db.maxId_triggerKey, id) }

    private async getMax(key: string, autoIncrement?: boolean): Promise<number> {
        let maxId: number;
        try {
            maxId = (await this.firestore.getDocumentData(Db.maxIDsCollName, key)).max
        }
        catch {
            maxId = 0;
        }
        if (autoIncrement) {
            await this.setMax(key, maxId + 1);
        }
        return maxId;
    }

    private async setMax(key: string, id: number) {
        return await this.firestore.setDocumentValue(Db.maxIDsCollName, key, { max: id });
    }
    // </MAX_IDs>
}