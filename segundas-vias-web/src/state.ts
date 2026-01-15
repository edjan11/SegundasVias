import type { AppState } from "./types";

export function createInitialState(): AppState {
  return {
    certidao: {
      plataformaId: 'certidao-eletronica',
      tipo_registro: 'nascimento',
      tipo_certidao: 'Breve relato',
      transcricao: false,
      cartorio_cns: '163659',
      selo: '',
      cod_selo: '',
      modalidade: 'eletronica',
      cota_emolumentos: '',
      cota_emolumentos_isento: false
    },
    registro: {
      nome_completo: '',
      cpf_sem_inscricao: false,
      cpf: '',
      matricula: '',
      data_registro: '',
      data_nascimento_ignorada: false,
      data_nascimento: '',
      hora_nascimento_ignorada: false,
      hora_nascimento: '',
      municipio_naturalidade: '',
      uf_naturalidade: '',
      local_nascimento: '',
      municipio_nascimento: '',
      uf_nascimento: '',
      sexo: '',
      sexo_outros: '',
      gemeos: { quantidade: '' },
      numero_dnv: '',
      averbacao_anotacao: ''
    },
    ui: {
      gemeos_irmao_raw: '',
      anotacoes_raw: '',
      cartorio_oficio: '',
      casamento_tipo: '',
      matricula_livro: '',
      matricula_folha: '',
      matricula_termo: '',
      mae_nome: '',
      mae_uf: '',
      mae_cidade: '',
      mae_avo_materna: '',
      mae_avo_materno: '',
      pai_nome: '',
      pai_uf: '',
      pai_cidade: '',
      pai_avo_paterna: '',
      pai_avo_paterno: ''
    }
  };
}

export function setByPath(obj: any, path: string, value: any) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] === undefined) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

export function getByPath(obj: any, path: string) {
  return path.split('.').reduce((acc, p) => (acc ? acc[p] : undefined), obj as any);
}

export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
