interface UserBase {
    usuarioId: string;
    perfilUsuario: string;
}

export interface UserList extends UserBase {
    nombreUsuario: string;
    apellidoUsuario: string;
    aliasUsuario: string;
    domicilioUsuario: string;
    emailUsuario: string;
    telefonoUsuario: string;
    cuitUsuario: string;
    activo: boolean
}

export interface UserLogin extends UserBase {
    emailUsuario: string;
    contraseniaUsuario: string;
}

export interface UserLoginResponse extends UserBase {
    tokenUsuario: string;
}
