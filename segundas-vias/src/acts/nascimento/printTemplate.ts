// @ts-nocheck

/**
 * Gera o HTML de impressão da certidão de nascimento.
 * @param {any} data Dados da certidão (registro e certidao)
 * @param {Document|HTMLElement} [srcDoc] Documento de origem (opcional)
 * @returns {string} HTML pronto para impressão
 */
export function buildNascimentoPrintHtml(data, srcDoc = document) {
	// Implemente aqui o template de impressão conforme o padrão do projeto.
	// Exemplo mínimo:
	const reg = data?.registro || {};
	const cert = data?.certidao || {};
	return `<html><head><meta charset='utf-8'><title>Certidão de Nascimento</title></head><body>
		<h1>Certidão de Nascimento - 2ª Via</h1>
		<div><b>Nome:</b> ${reg.nome_completo || ''}</div>
		<div><b>Data de Nascimento:</b> ${reg.data_nascimento || ''}</div>
		<div><b>Sexo:</b> ${reg.sexo || ''}</div>
		<div><b>CPF:</b> ${reg.cpf || ''}</div>
		<div><b>Matrícula:</b> ${reg.matricula || ''}</div>
		<div><b>Cartório CNS:</b> ${cert.cartorio_cns || ''}</div>
		<!-- Adapte conforme o layout desejado -->
	</body></html>`;
}
