/**
 * Tipos do Sistema de Selo Digital
 * 
 * Define todas as interfaces e tipos utilizados no módulo de selo digital.
 * Estes tipos refletem a estrutura da API do TJSE e as necessidades internas do módulo.
 */

/**
 * Tipos de certidão suportados pelo sistema
 */
export type CertType = 'nascimento' | 'casamento' | 'obito';

/**
 * Status de uma guia
 */
export type StatusGuia = 'paga' | 'nao-paga' | 'desconhecido';

/**
 * Tipo de emissão do selo
 */
export type TipoEmissao = 'direta' | 'ordinaria';

/**
 * Informações de uma taxa (serviço)
 */
export interface TaxaInfo {
  codTaxa: number;
  nomeTaxa: string;
  valor: number;
  tipoCertidao: CertType;
  descricao: string;
  isencoes?: IsencaoInfo[];
}

/**
 * Informações de isenção
 */
export interface IsencaoInfo {
  codIsencao: number;
  dsIsencao: string;
  temAnexo: 'sim' | 'nao';
}

/**
 * Tipos de variável suportados pelo modelo
 */
export type TipoVariavel = 'TEXTO' | 'NUMERO' | 'DATA' | 'CPF' | 'EMAIL' | 'TELEFONE' | 'SELECT' | 'BOOLEAN';

/**
 * Variável do modelo de selo
 */
export interface VariavelModelo {
  nome: string;
  rotulo: string;
  tipo: TipoVariavel;
  obrigatorio: boolean;
  tamanhoMaximo?: number;
  opcoes?: Array<{ valor: string; rotulo: string }>;
  mascara?: string;
  ajuda?: string;
}

/**
 * Modelo de selo completo
 */
export interface ModeloInfo {
  codModelo: number;
  variaveis: VariavelModelo[];
}

/**
 * Input de anexo (antes da conversão)
 */
export interface AnexoInput {
  arquivo: File | Blob;
  nomeOriginal: string;
}

/**
 * Anexo processado (PDF Base64)
 */
export interface AnexoProcessado {
  nomeArquivo: string;
  conteudoBase64: string;
  tamanhoBytes: number;
}

/**
 * Informações de uma guia
 */
export interface GuiaInfo {
  numGuia: string;
  codCartorio: number;
  flgPago: 'S' | 'N';
  taxas: TaxaGuia[];
  selos: SeloAplicado[];
}

/**
 * Taxa vinculada a uma guia
 */
export interface TaxaGuia {
  codTaxa: number;
  nomeTaxa: string;
  quantidade: number;
  selosAplicados: number;
  selosDisponiveis: number;
}

/**
 * Selo já aplicado
 */
export interface SeloAplicado {
  numSelo: string;
  numChavePublica: string;
  dataHoraAplicacao: string;
  codTaxa: number;
  nrControleSelo?: string;
}

/**
 * Request para gerar selo
 */
export interface SeloRequest {
  codCartorio: number;
  codTaxa: number;
  nrControleSelo: string; // UUID único gerado pelo cliente
  numGuia?: string; // Opcional para emissão direta
  codIsencao?: number; // Opcional
  variaveis: VariavelValor[];
}

/**
 * Variável com valor para gerar selo
 */
export interface VariavelValor {
  codVariavel: number;
  valor: string | number;
}

/**
 * Resultado da geração de selo
 */
export interface SeloResult {
  numSelo: string;
  numChavePublica: string;
  nrControleSelo: string;
  success: boolean;
  erro?: string;
}

/**
 * Dados completos de um selo aplicado (para recuperação)
 */
export interface SeloCompleto {
  numSelo: string;
  numChavePublica: string;
  nrControleSelo: string;
  codTaxa: number;
  nomeTaxa: string;
  dataHoraAplicacao: string;
  variaveis: VariavelValor[];
  numGuia?: string;
  codIsencao?: number;
}

/**
 * Configuração de autopreenchimento por tipo de certidão
 */
export interface AutofillConfig {
  certType: CertType;
  mappings: VariavelMapping[];
}

/**
 * Mapeamento de variável para autopreenchimento
 */
export interface VariavelMapping {
  descVariavel: string; // Nome da variável no modelo
  sourceField: string; // Campo de origem na certidão
  transform?: (value: any) => string | number; // Transformação opcional
}

/**
 * Opções do modal de selo
 */
export type SeloModalAction = 'sem-selo' | 'com-guia' | 'com-isencao';

/**
 * Estado do fluxo de selo
 */
export interface SeloFlowState {
  action: SeloModalAction;
  codTaxa?: number;
  nomeTaxa?: string;
  numGuia?: string;
  codIsencao?: number;
  anexo?: AnexoProcessado;
  modelo?: ModeloInfo;
  variaveis?: VariavelValor[];
  selo?: SeloResult;
  imagemBase64?: string;
}

/**
 * Dados persistidos do selo
 */
export interface SeloPersistido {
  numSelo: string;
  numChavePublica: string;
  nrControleSelo: string;
  codTaxa: number;
  codCartorio: number;
  numGuia?: string;
  dataAplicacao: string;
}

/**
 * Configuração da API
 */
export interface SeloApiConfig {
  baseUrl: string;
  chaveApi: string;
  codCartorio: number;
  usuario?: string;
  senhaMD5?: string; // Senha já em MD5
  timeout?: number;
}

/**
 * Resposta de erro da API
 */
export interface SeloApiError {
  codigo: string;
  mensagem: string;
  detalhes?: string;
}

/**
 * Opções de requisição
 */
export interface RequestOptions {
  requiresAuth?: boolean; // Se requer cabeçalho Authorization
  timeout?: number;
}

/**
 * Parâmetros para gerar selo
 */
export interface GerarSeloParams {
  codCartorio: number;
  codTaxa: number;
  codIsencao?: number;
  numGuia?: string;
  tipoEmissao: TipoEmissao;
  campos: Record<string, string>;
  nrProtocoloAnexo?: string;
}

/**
 * Resposta de geração de selo
 */
export interface GerarSeloResponse {
  numSelo: string;
  numChavePublica: string;
  nrControleSelo: string;
  dataGeracao: string;
  urlImagem?: string;
}

/**
 * Parâmetros de anexo (PDF)
 */
export interface AnexoParams {
  arquivo: File | Blob;
  nomeOriginal: string;
}

/**
 * Resposta de guia paga
 */
export interface GuiaPagaResponse {
  numGuia: string;
  flgPago: StatusGuia;
  dataVencimento?: string;
  dataPagamento?: string;
  valorPago?: number;
}

/**
 * Resposta de selo aplicado
 */
export interface SeloAplicadoResponse {
  numSelo: string;
  numChavePublica: string;
  dataHoraAplicacao: string;
  codTaxa: number;
  nrControleSelo: string;
}

/**
 * Resposta com dados da guia
 */
export interface DadosGuiaResponse {
  numGuia: string;
  codCartorio: number;
  codTaxa: number;
  valor: number;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento?: string;
  flgPago: StatusGuia;
  taxas?: Array<{
    codigoGuiaTaxa?: string;
    codigoTaxa: number;
    descricaoResumida?: string;
    descricaoDetalhada?: string;
    quantidade?: number;
    quantidadeSelosAplicados?: number;
    selosAplicados?: Array<{
      numSelo: string;
      numChavePublica: string;
      dataHoraEmissao?: string;
      dataHoraAplicacao?: string;
    }>;
  }>;
  selosVinculados?: Array<{
    numSelo: string;
    numChavePublica: string;
    dataGeracao: string;
  }>;
}
