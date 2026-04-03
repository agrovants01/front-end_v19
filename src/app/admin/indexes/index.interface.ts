
interface IndexBase {
  indiceId: string;
}

export interface IndexList extends IndexBase {
  nombreIndice: string;
  siglasIndice: string;
  bandasIndice: string;
}

export interface IndexData extends IndexList {
  referencia: IndexRange[];
}


export interface IndexRangeInput {
  colorRango: string;
  desdeRango: number;
  hastaRango: number;
}

export interface IndexRange extends IndexRangeInput {
  rangoId: string;
}
