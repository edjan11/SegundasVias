
function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
}
function padLeft(value, size) {
    const digits = digitsOnly(value);
    if (!digits)
        return '';
    return digits.padStart(size, '0').slice(-size);
}
export function buildMatriculaBase30(args) {
    const cns = digitsOnly(args.cns6 || '');
    const ano = digitsOnly(args.ano || '');
    const tipoAto = digitsOnly(args.tipoAto || '');
    const acervo = digitsOnly(args.acervo || '01').padStart(2, '0');
    const servico = digitsOnly(args.servico || '55').padStart(2, '0');
    const livro = padLeft(args.livro, 5);
    const folha = padLeft(args.folha, 3);
    const termo = padLeft(args.termo, 7);
    if (cns.length !== 6 || ano.length !== 4 || !tipoAto || !livro || !folha || !termo)
        return '';
    const base = `${cns}${acervo}${servico}${ano}${tipoAto}${livro}${folha}${termo}`;
    return base.length === 30 ? base : '';
}
export function calcDv2Digits(base30) {
    if (!base30 || base30.length !== 30)
        return '';
    let s1 = 0;
    for (let i = 0; i < 30; i++)
        s1 += Number(base30[i]) * (31 - i);
    let d1 = 11 - (s1 % 11);
    d1 = d1 === 11 ? 0 : d1 === 10 ? 1 : d1;
    const seq31 = base30 + String(d1);
    let s2 = 0;
    for (let i = 0; i < 31; i++)
        s2 += Number(seq31[i]) * (32 - i);
    let d2 = 11 - (s2 % 11);
    d2 = d2 === 11 ? 0 : d2 === 10 ? 1 : d2;
    return `${d1}${d2}`;
}
export function buildMatriculaFinal(args) {
    const base30 = buildMatriculaBase30(args);
    if (!base30)
        return '';
    const dv = calcDv2Digits(base30);
    return dv ? base30 + dv : '';
}
