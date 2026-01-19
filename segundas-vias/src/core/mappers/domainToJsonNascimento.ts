import { NascimentoDomainSchema } from "../schemas/NascimentoDomainSchema";

export function domainToJsonNascimento(domain: unknown): string {
  const parsed = NascimentoDomainSchema.safeParse(domain);
  if (!parsed.success) {
    throw new Error("Domínio de nascimento inválido para exportação");
  }

  return JSON.stringify(parsed.data, null, 2);
}
