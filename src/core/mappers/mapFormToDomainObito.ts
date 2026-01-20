import { CONTRACT_VERSION } from '../version/contractVersion';
import { ObitoFormInputSchema } from '../schemas/ObitoFormInputSchema';
import { ObitoDomainSchema } from '../schemas/ObitoDomainSchema';

export function mapFormToDomainObito(formInput: unknown) {
  const formParsed = ObitoFormInputSchema.safeParse(formInput);
  if (!formParsed.success) {
    return { errors: formParsed.error.issues };
  }

  const input = formParsed.data;

  const domainCandidate = {
    version: CONTRACT_VERSION,
    certidao: { ...input.certidao },
    registro: { ...input.registro },
  };

  const domainParsed = ObitoDomainSchema.safeParse(domainCandidate);
  if (!domainParsed.success) {
    return { errors: domainParsed.error.issues };
  }

  return { domain: domainParsed.data };
}
