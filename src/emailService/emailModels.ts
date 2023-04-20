export interface IEmailData {
    reciver: String,
    title: String,
    payload: String,
}

export interface IEmailConfirmationData{
    userId: number,
    hashCode: string,
    email: string,
}