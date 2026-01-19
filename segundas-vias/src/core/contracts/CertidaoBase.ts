export interface CertidaoBase {
  plataformaId: string;
  tipo_registro: string;
  tipo_certidao: string;
  transcricao: boolean;
  cartorio_cns: string;
  selo: string;
  cod_selo: string;
  modalidade: string;
  cota_emolumentos: string;
  cota_emolumentos_isento: boolean;
}
