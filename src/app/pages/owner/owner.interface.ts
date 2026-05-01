export interface OwnerPreview {
    idPropietario: string;
    nombrePropietario: string;
    apellidoPropietario: string;
    aliasPropietario: string;
    cantidadVuelos: number;
    ultimoVuelo: Date;
}

export interface UserPreview extends OwnerPreview {
    perfil: string;
    activo: boolean;
}


export interface OwnerListInput {
    propietarioId: string;
    nombrePropietario: string;
    apellidoPropietario: string;
    aliasPropietario: string;
    cuitPropietario: string;
    telefonoPropietario: string;
    domicilioPropietario: string;
}
