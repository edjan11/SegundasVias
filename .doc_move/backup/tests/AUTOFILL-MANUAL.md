Manual test: Browser autofill / address suggestions neutralization (Casamento & Óbito)

Steps (Chrome / Edge Chromium):

1. Run the local UI server (e.g., `npm run serve` or `npm run dev`).
2. Open the **Casamento** form (2 Via - Casamento). Focus the fields:
   - Cidade nascimento (noivo / noiva)
   - UF nascimento (noivo / noiva)
   - Any address-like fields if present
   Observe: no Google address suggestion menu (e.g. "Gerenciar endereços…") should appear.
3. Repeat for the **Óbito** form. Focus these fields:
   - Cidade nascimento
   - Cidade do óbito
   - Cidade sepultamento
   - Local do óbito
   - Endereço / CEP
   - UF fields
   Observe: no browser address suggestions should appear on focus or typing.
4. Verify that normal application suggestions (our autocomplete) still appear when appropriate (city suggestions provided by the app), and that selecting them still triggers autofill of the UF and existing validations.
5. If address suggestions still appear, try:
   - Clear saved addresses in Chrome and retest to verify honeypot behavior.
   - Confirm honeypot elements exist in the DOM (search for `.no-autofill-honeypot`).

Acceptance:

- No Google address suggestion menu appears when focusing/typing any of the tested fields in Casamento and Óbito.
- App autocomplete (city suggestions) still works and UF autofill still happens.
- No regression in form submission/export JSON behavior.
