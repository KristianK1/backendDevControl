export interface ILoginRequest {
    username: string, //or email
    password: string,
}

export interface ILoginByTokenRequest {
    authToken: string,
}

export interface ILoginResponse {
    authToken: string,
    id: number,
    username: string,
}

export interface IRegisterRequest {
    username: string,
    email: string,
    password: string,
}

export interface ILogoutRequest {
    authToken: string,
    logoutOtherSessions: boolean,
}

export interface IDeleteUserRequest {
    authToken: string,
}

export interface IChangePasswordRequest {
    userId: number,
    oldPassword: string,
    newPassword: string,
    logoutOtherSessions: boolean,
    dontLogoutToken: string,
}

export interface IGetUsersRequest {
    authToken: string,
}

export interface IGetUsersResponse { 
    users: IFrontendUser[],
}

export interface IFrontendUser {
    id: number,
    username: string,
}