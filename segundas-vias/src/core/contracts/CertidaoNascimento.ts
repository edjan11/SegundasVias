import { CertidaoBase } from "./CertidaoBase";

export interface Filiacao {
  nome: string;
  municipio_nascimento: string;
  uf_nascimento: string;
  avos: string;
}

export interface Gemeos {
  quantidade: string;
  irmao: Array<{ nome: string; matricula: string }>;
}

export interface AnotacaoCadastro {
  tipo: string;
  documento: string;
  orgao_emissor: string;
  uf_emissao: string;
  data_emissao: string;
}

export interface RegistroNascimento {
  nome_completo: string;
  cpf_sem_inscricao: boolean;
  cpf: string;
  matricula: string;
  data_registro: string;
  data_nascimento_ignorada: boolean;
  data_nascimento: string;
  hora_nascimento: string;
  municipio_naturalidade: string;
  uf_naturalidade: string;
  local_nascimento: string;
  municipio_nascimento: string;
  uf_nascimento: string;
  sexo: string;
  sexo_outros?: string;
  gemeos: Gemeos;
  filiacao: Filiacao[];
  numero_dnv: string;
  averbacao_anotacao: string;
  anotacoes_cadastro: AnotacaoCadastro[];
}

export interface CertidaoNascimento {
  version: string;
  certidao: CertidaoBase;
  registro: RegistroNascimento;
}
