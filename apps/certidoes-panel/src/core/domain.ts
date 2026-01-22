export type CertidaoTipo = 'nascimento' | 'casamento' | 'obito';

export type CertidaoInput = {
  certidao: {
    plataformaId?: string;
    tipo_registro?: string;
    tipo_certidao?: string;
    transcricao?: boolean;
    cartorio_cns?: string;
    selo?: string;
    cod_selo?: string;
    modalidade?: string;
    cota_emolumentos?: string;
    cota_emolumentos_isento?: boolean;
  };
  registro: any;
};

export type NormalizedCertidao = {
  id: string;
  tipo: CertidaoTipo;
  createdAt: string;
  certidao: {
    cartorio_cns: string;
    tipo_registro: CertidaoTipo;
  };
  registro: any;
};

export type SearchIndex = {
  id: string;
  tipo: CertidaoTipo;
  text: string;
  fields: Record<string, string>;
};

export type CertidaoRecord = {
  id: string;
  tipo: CertidaoTipo;
  createdAt: string;
  canonical: NormalizedCertidao;
  xml: string;
  searchIndex: SearchIndex;
};
