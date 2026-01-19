import { ObitoDomainSchema } from "../schemas/ObitoDomainSchema";

export function domainToJsonObito(domain: unknown): string {
  const parsed = ObitoDomainSchema.safeParse(domain);
  if (!parsed.success) {
    throw new Error("Objeto de domínio inválido para exportação");
  }

  return JSON.stringify(parsed.data, null, 2);
}
