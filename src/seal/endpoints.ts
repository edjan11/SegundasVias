/**
 * Endpoints da API de Selo Digital
 * 
 * Define todas as rotas e contratos de comunicação com a API do TJSE.
 */

/**
 * Configuração de endpoints
 */
export const ENDPOINTS = {
  /**
   * Lista todas as taxas (serviços) disponíveis para o cartório
   * 
   * Método: GET
   * Parâmetros: codCartorio, chaveApi
   * Retorna: XML com lista de taxas e suas isenções
   */
  LISTAR_TAXAS: '/selodigital/ws/cartorio/listarTaxas',

  /**
   * Exibe o modelo (estrutura de campos) para uma taxa específica
   * 
   * Método: GET
   * Parâmetros: codTaxa, chaveApi
   * Retorna: XML com variáveis obrigatórias e seus tipos
   */
  EXIBE_MODELO: '/selodigital/ws/cartorio/exibeModelo',

  /**
   * Adiciona anexo quando a isenção exige
   * 
   * Método: POST
   * Body: XML com nomeArquivo e conteudoBase64 (PDF obrigatoriamente)
   * Limite: 2MB
   */
  ADICIONA_ANEXO: '/selodigital/ws/cartorio/adicionaAnexo',

  /**
   * Gera um novo selo digital
   * 
   * Método: POST
   * Body: XML com dados do selo (taxa, variáveis, guia, etc)
   * Retorna: numSelo, numChavePublica, nrControleSelo
   */
  GERAR_SELO: '/selodigital/ws/cartorio/gerarSelo',

  /**
   * Busca a imagem do selo em Base64
   * 
   * Método: GET
   * Parâmetros: numSelo, chaveApi
   * Retorna: Imagem em Base64
   */
  EXIBE_IMAGEM: '/selodigital/ws/cartorio/exibeImagem',

  /**
   * Verifica se uma guia está paga
   * 
   * Método: GET
   * Parâmetros: numGuia, codCartorio
   * Headers: Authorization (Base64 de usuario:senhaMD5)
   * Retorna: flgPago (S/N)
   */
  GUIA_PAGA: '/selodigital/ws/cartorio/guiaPaga',

  /**
   * Obtém dados completos de uma guia
   * 
   * Método: GET
   * Parâmetros: numGuia, codCartorio
   * Headers: Authorization, Accept: application/xml
   * Retorna: Taxas vinculadas e selos já aplicados
   */
  DADOS_GUIA: '/selodigital/ws/cartorio/dadosGuia',

  /**
   * Obtém informações de um selo específico já aplicado
   * 
   * Método: GET
   * Parâmetros: nrSelo
   * Headers: Authorization, Accept: application/xml
   * Retorna: Dados do modelo e valores das variáveis usadas
   */
  SELO_DIGITAL_APLICADO: '/selodigital/ws/cartorio/seloDigitalAplicado',
} as const;

/**
 * Ambiente da API
 */
export enum ApiEnvironment {
  HOMOLOGACAO = 'https://homologacao.tjse.jus.br',
  PRODUCAO = 'https://www.tjse.jus.br', // A ser confirmado
}

/**
 * Templates de requisição XML
 */
export const XML_TEMPLATES = {
  /**
   * Template para adicionar anexo
   */
  ADICIONA_ANEXO: `<?xml version="1.0" encoding="UTF-8"?>
<anexo>
  <nomeArquivo>{{nomeArquivo}}</nomeArquivo>
  <conteudoBase64>{{conteudoBase64}}</conteudoBase64>
</anexo>`,

  /**
   * Template para gerar selo
   */
  GERAR_SELO: `<?xml version="1.0" encoding="UTF-8"?>
<selo>
  <codCartorio>{{codCartorio}}</codCartorio>
  <codTaxa>{{codTaxa}}</codTaxa>
  <nrControleSelo>{{nrControleSelo}}</nrControleSelo>
  {{numGuia}}
  {{codIsencao}}
  <variaveis>
    {{variaveis}}
  </variaveis>
</selo>`,

  /**
   * Template de variável individual
   */
  VARIAVEL: `<variavel>
  <codVariavel>{{codVariavel}}</codVariavel>
  <valor>{{valor}}</valor>
</variavel>`,
};

/**
 * Códigos de erro conhecidos da API
 */
export const ERROR_CODES = {
  GUIA_NAO_PAGA: 'GUIA_NAO_PAGA',
  ANEXO_OBRIGATORIO: 'ANEXO_OBRIGATORIO',
  ANEXO_TAMANHO_EXCEDIDO: 'ANEXO_TAMANHO_EXCEDIDO',
  VARIAVEL_OBRIGATORIA: 'VARIAVEL_OBRIGATORIA',
  SELO_DUPLICADO: 'SELO_DUPLICADO',
  AUTENTICACAO_INVALIDA: 'AUTENTICACAO_INVALIDA',
  TAXA_INVALIDA: 'TAXA_INVALIDA',
  MODELO_NAO_ENCONTRADO: 'MODELO_NAO_ENCONTRADO',
} as const;

/**
 * Mensagens de erro amigáveis
 */
export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.GUIA_NAO_PAGA]: 'A guia informada não está paga.',
  [ERROR_CODES.ANEXO_OBRIGATORIO]: 'Esta isenção requer um anexo comprobatório.',
  [ERROR_CODES.ANEXO_TAMANHO_EXCEDIDO]: 'O anexo excede o tamanho máximo de 2MB.',
  [ERROR_CODES.VARIAVEL_OBRIGATORIA]: 'Existem campos obrigatórios não preenchidos.',
  [ERROR_CODES.SELO_DUPLICADO]: 'Já existe um selo gerado com este número de controle.',
  [ERROR_CODES.AUTENTICACAO_INVALIDA]: 'Credenciais de autenticação inválidas.',
  [ERROR_CODES.TAXA_INVALIDA]: 'Taxa não encontrada ou inválida para este cartório.',
  [ERROR_CODES.MODELO_NAO_ENCONTRADO]: 'Modelo não encontrado para esta taxa.',
};

/**
 * Limites e constantes
 */
export const LIMITS = {
  MAX_ANEXO_SIZE_BYTES: 2 * 1024 * 1024, // 2MB
  REQUEST_TIMEOUT_MS: 30000, // 30 segundos
  CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 horas para cache de taxas
} as const;
