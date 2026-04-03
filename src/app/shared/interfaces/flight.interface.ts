import { GeoJsonObject } from 'geojson';
export interface Flight {
    vueloId: string;
    fechaVuelo: Date;
    cuadroVuelo?: string;
    propietario: string;
    aplicacionVuelo?: string;
    cultivoVuelo?: string;
    caldohaVuelo?: number;
    pilotoVuelo?: string;
    pilotoNombreCompleto?: string;
    tecnicoVuelo?: string;
    superficieVuelo?: number;
    colorVuelo?: string;
    geometryVuelo: GeoJsonObject;
    fechaBajaVuelo?: Date;
    fk_Usuario: string;
    date: Date;
}
