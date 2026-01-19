import { z } from "zod";

export const NascimentoDomainSchema = z.object({
  version: z.string(),
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
    cota_emolumentos_isento: z.boolean()
  }),
  registro: z.object({
    nome_completo: z.string(),
    cpf_sem_inscricao: z.boolean(),
    cpf: z.string(),
    matricula: z.string(),
    data_registro: z.string(),
    data_nascimento_ignorada: z.boolean(),
    data_nascimento: z.string(),
    hora_nascimento_ignorada: z.boolean(),
    hora_nascimento: z.string(),
    municipio_naturalidade: z.string(),
    uf_naturalidade: z.string(),
    local_nascimento: z.string(),
    municipio_nascimento: z.string(),
    uf_nascimento: z.string(),
    sexo: z.string(),
    sexo_outros: z.string().optional(),
    gemeos: z.object({
      quantidade: z.string(),
      irmao: z.array(z.object({ nome: z.string(), matricula: z.string() }))
    }),
    filiacao: z.array(z.object({
      nome: z.string(),
      municipio_nascimento: z.string(),
      uf_nascimento: z.string(),
      avos: z.string()
    })),
    numero_dnv: z.string(),
    averbacao_anotacao: z.string(),
    anotacoes_cadastro: z.array(z.object({
      tipo: z.string(),
      documento: z.string(),
      orgao_emissor: z.string(),
      uf_emissao: z.string(),
      data_emissao: z.string()
    }))
  })
});
