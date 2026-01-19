import { CertidaoBase } from "./CertidaoBase";

export interface Conjuge {
  nome_atual_habilitacao: string;
  cpf_sem_inscricao: boolean;
  cpf: string;
  novo_nome: string;
  nome_apos_casamento?: string;
  data_nascimento: string;
  nacionalidade: string;
  estado_civil: string;
  municipio_naturalidade: string;
  uf_naturalidade: string;
  genitores: string;
}

export interface AnotacaoCadastro {
  tipo: string;
  documento: string;
  orgao_emissor: string;
  uf_emissao: string;
  data_emissao: string;
}

export interface RegistroCasamento {
  conjuges: Conjuge[];
  matricula: string;
  data_celebracao: string;
  regime_bens: string;
  data_registro: string;
  averbacao_anotacao: string;
  anotacoes_cadastro: {
    primeiro_conjuge: AnotacaoCadastro[];
    segundo_conjuge: AnotacaoCadastro[];
  };
}

export interface CertidaoCasamento {
  version: string;
  certidao: CertidaoBase;
  registro: RegistroCasamento;
}
