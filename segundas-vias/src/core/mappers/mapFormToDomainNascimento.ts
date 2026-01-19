import { CONTRACT_VERSION } from "../version/contractVersion";
import { NascimentoFormInputSchema } from "../schemas/NascimentoFormInputSchema";
import { NascimentoDomainSchema } from "../schemas/NascimentoDomainSchema";

const CERTIDAO_CNS_FIXO = "163659";

export function mapFormToDomainNascimento(formInput: unknown) {
  const formParsed = NascimentoFormInputSchema.safeParse(formInput);
  if (!formParsed.success) {
    return { errors: formParsed.error.issues };
  }

  const input = formParsed.data;

  const domainCandidate = {
    version: CONTRACT_VERSION,
    certidao: {
      ...input.certidao,
      cartorio_cns: CERTIDAO_CNS_FIXO
    },
    registro: {
      ...input.registro
    }
  };

  const domainParsed = NascimentoDomainSchema.safeParse(domainCandidate);
  if (!domainParsed.success) {
    return { errors: domainParsed.error.issues };
  }

  return { domain: domainParsed.data };
}
