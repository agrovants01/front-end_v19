export interface OwnerAnalysis {
  indices: Index[];
  analisis: Analysis[];
}

export interface Analysis {
  fechaAnalisis: Date;
  analisisId: string;
  imagenAnalisis: string;
  indice: Indice;
  date: Date;
}

export interface Indice {
  nombreIndice: string;
}

export interface Index {
  nombreIndice: string;
  rangos: ColorRange[];
}

export interface ColorRange {
  colorRango: string;
}
