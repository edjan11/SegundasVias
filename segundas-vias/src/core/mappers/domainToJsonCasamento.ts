import { CasamentoDomainSchema } from "../schemas/CasamentoDomainSchema";

export function domainToJsonCasamento(domain: unknown): string {
  const parsed = CasamentoDomainSchema.safeParse(domain);
  if (!parsed.success) {
    throw new Error("Domínio de casamento inválido para exportação");
  }

  return JSON.stringify(parsed.data, null, 2);
}
