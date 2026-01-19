import { z } from 'zod';

export const CasamentoFormInputSchema = z.object({
  certidao: z.object({
    plataformaId: z.string(),
    tipo_registro: z.string(),
    tipo_certidao: z.string(),
    transcricao: z.boolean(),
    cartorio_cns: z.string(),
    selo: z.string(),
    cod_selo: z.string(),
    modalidade: z.string(),
    cota_emolumentos: z.string(),
    cota_emolumentos_isento: z.boolean(),
  }),
  registro: z.object({
    conjuges: z.array(
      z.object({
        nome_atual_habilitacao: z.string(),
        cpf_sem_inscricao: z.boolean(),
        cpf: z.string(),
        novo_nome: z.string(),
        data_nascimento: z.string(),
        nacionalidade: z.string(),
        estado_civil: z.string(),
        municipio_naturalidade: z.string(),
        uf_naturalidade: z.string(),
        genitores: z.string(),
      }),
    ),
    matricula: z.string(),
    data_celebracao: z.string(),
    regime_bens: z.string(),
    data_registro: z.string(),
    averbacao_anotacao: z.string(),
    anotacoes_cadastro: z.object({
      primeiro_conjuge: z.array(
        z.object({
          tipo: z.string(),
          documento: z.string(),
          orgao_emissor: z.string(),
          uf_emissao: z.string(),
          data_emissao: z.string(),
        }),
      ),
      segundo_conjuge: z.array(
        z.object({
          tipo: z.string(),
          documento: z.string(),
          orgao_emissor: z.string(),
          uf_emissao: z.string(),
          data_emissao: z.string(),
        }),
      ),
    }),
  }),
});
