import { CertidaoBase } from "./CertidaoBase";

export interface AnotacaoCadastro {
  tipo: string;
  documento: string;
  orgao_emissor: string;
  uf_emissao: string;
  data_emissao: string;
}

export interface RegistroObito {
  nome_completo: string;
  cpf_sem_inscricao: boolean;
  cpf: string;
  matricula: string;
  data_registro: string;
  data_obito: string;
  hora_obito: string;
  municipio_naturalidade: string;
  uf_naturalidade: string;
  local_obito: string;
  municipio_obito: string;
  uf_obito: string;
  sexo: string;
  filiacao: Array<{ nome: string; municipio_nascimento: string; uf_nascimento: string; avos: string }>;
  averbacao_anotacao: string;
  anotacoes_cadastro: AnotacaoCadastro[];
}

export interface CertidaoObito {
  version: string;
  certidao: CertidaoBase;
  registro: RegistroObito;
}
