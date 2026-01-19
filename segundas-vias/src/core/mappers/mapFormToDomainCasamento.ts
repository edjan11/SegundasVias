import { CONTRACT_VERSION } from "../version/contractVersion";
import { CasamentoFormInputSchema } from "../schemas/CasamentoFormInputSchema";
import { CasamentoDomainSchema } from "../schemas/CasamentoDomainSchema";

type MapResult<T> =
  | { ok: true; domain: T }
  | { ok: false; stage: "form" | "domain"; errors: unknown };

export function mapFormToDomainCasamento(formInput: unknown): MapResult<unknown> {
  const formParsed = CasamentoFormInputSchema.safeParse(formInput);
  if (!formParsed.success) {
    return { ok: false, stage: "form", errors: formParsed.error };
  }

  const input = formParsed.data;

  const domainCandidate = {
    version: CONTRACT_VERSION,
    certidao: input.certidao,
    registro: input.registro
  };

  const domainParsed = CasamentoDomainSchema.safeParse(domainCandidate);
  if (!domainParsed.success) {
    return { ok: false, stage: "domain", errors: domainParsed.error };
  }

  return { ok: true, domain: domainParsed.data };
}
