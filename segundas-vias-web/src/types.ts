export type Certidao = {
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
};

export type Registro = {
  nome_completo: string;
  cpf_sem_inscricao: boolean;
  cpf: string;
  matricula: string;
  data_registro: string;
  data_nascimento_ignorada: boolean;
  data_nascimento: string;
  hora_nascimento_ignorada: boolean;
  hora_nascimento: string;
  municipio_naturalidade: string;
  uf_naturalidade: string;
  local_nascimento: string;
  municipio_nascimento: string;
  uf_nascimento: string;
  sexo: string;
  sexo_outros: string;
  gemeos: { quantidade: string };
  numero_dnv: string;
  averbacao_anotacao: string;
};

export type UiState = {
  gemeos_irmao_raw: string;
  anotacoes_raw: string;
  cartorio_oficio: string;
  casamento_tipo: string;
  matricula_livro: string;
  matricula_folha: string;
  matricula_termo: string;
  mae_nome: string;
  mae_uf: string;
  mae_cidade: string;
  mae_avo_materna: string;
  mae_avo_materno: string;
  pai_nome: string;
  pai_uf: string;
  pai_cidade: string;
  pai_avo_paterna: string;
  pai_avo_paterno: string;
};

export type AppState = { certidao: Certidao; registro: Registro; ui: UiState };
