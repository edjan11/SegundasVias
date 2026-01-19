import { z } from "zod";

export const ObitoFormInputSchema = z.object({
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
    data_falecimento_ignorada: z.boolean(),
    data_falecimento: z.string(),
    hora_falecimento: z.string(),
    local_falecimento: z.string(),
    municipio_falecimento: z.string(),
    uf_falecimento: z.string(),
    sexo: z.string(),
    sexo_outros: z.string().optional(),
    estado_civil: z.string(),
    nome_ultimo_conjuge_convivente: z.string(),
    idade: z.string(),
    data_nascimento: z.string(),
    municipio_naturalidade: z.string(),
    uf_naturalidade: z.string(),
    filiacao: z.string(),
    causa_morte: z.string(),
    nome_medico: z.string(),
    crm_medico: z.string(),
    local_sepultamento_cremacao: z.string(),
    municipio_sepultamento_cremacao: z.string(),
    uf_sepultamento_cremacao: z.string(),
    data_registro: z.string(),
    nome_declarante: z.string(),
    existencia_bens: z.string(),
    existencia_filhos_ignorada: z.boolean().optional(),
    existencia_filhos_opcao: z.string().optional(),
    existencia_filhos: z.object({
      quantidade: z.number().optional(),
      filhos: z.array(z.union([
        z.object({ nome: z.string(), idade: z.string(), falecido: z.boolean().optional() }),
        z.object({ texto: z.string() })
      ]))
    }).optional(),
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
