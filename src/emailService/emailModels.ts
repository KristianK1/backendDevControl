export interface IEmailData {
    reciver: String,
    title: String,
    payload: String,
}

export interface IEmailConfirmationData {
    userId: number,
    hashCode: string,
    email: string,
}

export interface IForgotPasswordData {
    userId: number,
    hashCode: string,
    timeStamp: string,
}