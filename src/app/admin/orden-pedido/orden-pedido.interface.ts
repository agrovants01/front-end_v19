export interface OrdenPedido {
    opId: string;
    opNomenclatura?: string;
    opFecha: string | Date;
    fk_Piloto: string;
    fk_Propietario: string;
    opCultivo: string;
    opSuperficie: number;
    opAgroq1?: string;
    opDosisAgroq1?: number;
    opAgroq2?: string;
    opDosisAgroq2?: number;
    opAgroq3?: string;
    opDosisAgroq3?: number;
    opAgroq4?: string;
    opDosisAgroq4?: number;
    opCoad1?: string;
    opDosisCoad1?: number;
    opCoad2?: string;
    opDosisCoad2?: number;
    opFormaPago: string;
    opPrecioHa: number;
    opPrecioTotal: number;
    opEstado: string;
    fk_Usuario?: string;
    pilotoAlias?: string;
    propietarioAlias?: string;
}

export interface UsuarioSelect {
    usuarioId: string;
    aliasUsuario: string;
    nombreUsuario: string;
    apellidoUsuario: string;
}

export interface ListadoItem {
    listadoAgroqId?: string;
    ListadoCoadId?: string;
    listadoAgroqNom?: string;
    ListadoCoadNom?: string;
    listadoAgroqDesc?: string;
    ListadoCoadDesc?: string;
}
