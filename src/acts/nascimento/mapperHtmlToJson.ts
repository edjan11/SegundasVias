
import { normalizeDate } from '../../shared/validators/date';
import { normalizeCpf } from '../../shared/validators/cpf';
import { adjustMatricula } from '../../shared/matricula/cnj';

/**
 * Extrai os dados do formulário de nascimento para um objeto JSON padronizado.
 * @param {Document|HTMLElement} doc
 * @returns {any}
 */
export function mapperHtmlToJson(doc) {
  const get = (sel) => (doc as any).querySelector(sel)?.value || '';
  const getText = (sel) => (doc as any).querySelector(sel)?.textContent || '';
  const getChecked = (sel) => !!(doc as any).querySelector(sel)?.checked;
  const getRadio = (name) => {
    const el = (doc as any).querySelector(`input[name="${name}"]:checked`);
    return el ? (el as any).value : '';
  };
  const getSelect = (sel) => {
    const el = (doc as any).querySelector(sel);
    return el ? (el as any).value : '';
  };
  const getAll = (sel) => Array.from((doc as any).querySelectorAll(sel)).map((el) => (el as any).value || '');

  return {
    registro: {
      nome_completo: get('input[name="nomeCompleto"]'),
      sexo: getRadio('sexo'),
      data_nascimento: normalizeDate(get('input[name="dataNascimento"]')),
      data_registro: normalizeDate(get('input[name="dataRegistro"]')),
      naturalidade: get('input[name="naturalidade"]'),
      nacionalidade: get('input[name="nacionalidade"]'),
      filiacao: get('input[name="filiacao"]'),
      cpf_sem_inscricao: (function(){ return !!(doc.querySelector('input[data-bind="registro.cpf_sem_inscricao"]')?.checked) || !!(doc.querySelector('#cpf-sem') as any)?.checked || false; })(),
      cpf: (function(){ const sem = !!(doc.querySelector('input[data-bind="registro.cpf_sem_inscricao"]')?.checked) || !!(doc.querySelector('#cpf-sem') as any)?.checked || false; return sem ? '' : normalizeCpf(get('input[name="cpf"]')); })(),
      numero_dnv: get('input[name="numeroDNV"]'),
      livro: get('input[name="livro"]'),
      folha: get('input[name="folha"]'),
      termo: get('input[name="termo"]'),
      matricula: (function(){
        const m = get('input[name="matricula"]') || (doc.querySelector('#matricula')?.value || (doc.querySelector('input[data-bind="registro.matricula"]')?.value || ''));
        if (m) return m;
        // compute fallback matricula from DOM (for robustness)
        try {
          const digitsOnly = (v)=>String(v||'').replace(/\D/g,'');
          const padLeft = (v,s)=>digitsOnly(v).padStart(s,'0').slice(-s);
          const cns = digitsOnly((doc.querySelector('input[data-bind="certidao.cartorio_cns"]')||{value:''}).value || '163659');
          const dr = (doc.querySelector('input[data-bind="registro.data_registro"]')||{value:''}).value || '';
          const ano = (dr.match(/(\d{4})$/)||[])[1] || '';
          const tipo = '1';
          const livro = padLeft((doc.getElementById('matricula-livro')||{value:''}).value,5);
          const folha = padLeft((doc.getElementById('matricula-folha')||{value:''}).value,3);
          const termo = padLeft((doc.getElementById('matricula-termo')||{value:''}).value,7);
          const base30 = `${cns}01` + `55${ano}${tipo}${livro}${folha}${termo}`;
          if (!base30 || base30.length !== 30) return '';
          const calcDv = (base) => {
            let s1=0; for(let i=0;i<30;i++) s1+=Number(base[i])*(31-i);
            let d1=11-(s1%11); d1 = d1===11?0: d1===10?1:d1;
            const seq31 = base + String(d1);
            let s2=0; for(let i=0;i<31;i++) s2+=Number(seq31[i])*(32-i);
            let d2=11-(s2%11); d2 = d2===11?0:d2===10?1:d2;
            return `${d1}${d2}`;
          };
          const dv = calcDv(base30);
          const candidate = dv ? base30+dv : '';
          // apply MatriculaAjustada rules (ofício/CNS mapping, prompts when needed)
          try { return candidate ? (adjustMatricula(candidate, (doc.querySelector('textarea[name="observacoes"]')||{value:''}).value) || candidate) : ''; } catch(e){ return candidate; }
        } catch (e) { return ''; }
      })(),
    },
    certidao: {
      cartorio_cns: get('input[name="certidao.cartorio_cns"]') || (doc.querySelector('input[data-bind="certidao.cartorio_cns"]')?.value || '163659'),
      municipio_cartorio: get('input[name="municipioCartorio"]'),
      uf_cartorio: getSelect('select[name="ufCartorio"]'),
      data_emissao: normalizeDate(get('input[name="dataEmissao"]')),
      via: get('input[name="via"]'),
      solicitante: get('input[name="solicitante"]'),
      cpf_solicitante: normalizeCpf(get('input[name="cpfSolicitante"]')),
      observacoes: get('textarea[name="observacoes"]'),
    },
  };
}
