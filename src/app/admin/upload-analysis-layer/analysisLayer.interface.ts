import { IndexRange, IndexRangeInput } from "../indexes/index.interface";

export interface LayerUpload {
    fechaAnalisis: Date;
    imagenAnalisis: string;
    propietarioAnalisisId: string; //Owner's User ID
    indiceAnalisisId: string; //Analysis Layer ID
}

export interface LayerTypeInput {
    indiceId: string;
    siglasIndice: string;
    referencia: IndexRangeInput[];
}

export interface Layer {
    indiceId: string;
    fechaAnalisis: Date;
    imagenAnalisis: string;
    propietarioAnalisisId: string; //Owner's User ID
    indiceAnalisis: string; //Analysis Layer ID
    rango: IndexRange[];
}
