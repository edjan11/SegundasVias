import { UFS } from "./constants";

export const template = `
  <div class="container">
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="type-group">
          <button id="btn-nascimento" class="type-btn active">Nascimento</button>
          <button id="btn-casamento" class="type-btn">Casamento</button>
          <button id="btn-obito" class="type-btn">Obito</button>
        </div>
        <button id="btn-save" class="btn save dirty">Salvar (Ctrl+B)</button>
        <button id="btn-json" class="btn">Gerar JSON</button>
        <button id="btn-xml" class="btn">Gerar XML</button>
        <button id="btn-config" class="btn secondary">Config</button>
      </div>
      <div class="toolbar-right">
        <span id="outputDirBadge" class="badge">Salvar local</span>
        <span id="statusText" class="status">Pronto</span>
      </div>
    </div>

    <details class="collapse">
      <summary>Certidao (oculto)</summary>
      <div class="card">
        <div class="cardTitle">Certidao</div>
        <div class="grid">
          <div class="field span-3"><label>plataformaId</label><input data-bind="certidao.plataformaId" readonly /></div>
          <div class="field span-3"><label>tipo_registro</label><input data-bind="certidao.tipo_registro" readonly /></div>
          <div class="field span-3"><label>tipo_certidao</label><select data-bind="certidao.tipo_certidao"><option></option><option>Breve relato</option><option>Inteiro teor</option><option>Simplificada</option></select></div>
          <div class="field span-3"><label>modalidade</label><select data-bind="certidao.modalidade"><option></option><option>eletronica</option><option>fisica</option></select></div>
          <div class="field span-3"><label>cartorio_cns</label><input data-bind="certidao.cartorio_cns" readonly /></div>
          <div class="field span-3"><label>cota_emolumentos</label><input data-bind="certidao.cota_emolumentos" /></div>
          <div class="field checkboxField span-2"><input type="checkbox" data-bind="certidao.transcricao" /><label>transcricao</label></div>
        </div>
      </div>
    </details>

    <div class="card">
      <div class="cardTitle">Registro</div>
      <div class="grid">
        <div class="field span-5 fixed"><label>Local de nascimento *</label><input data-bind="registro.local_nascimento" data-required class="w-local" /></div>
        <div class="field span-4 fixed"><label>Municipio de nascimento *</label><input data-bind="registro.municipio_nascimento" data-required class="w-cpf" /></div>
        <div class="field span-3 fixed"><label>UF de nascimento *</label><select data-bind="registro.uf_nascimento" data-required class="w-uf">${ufsOptions()}</select></div>

        <div class="field span-8 fixed"><label>Nome completo *</label><input data-bind="registro.nome_completo" data-required class="w-nome" /></div>
        <div class="field span-4 fixed"><label>Sexo *</label><select data-bind="registro.sexo" id="sexo" class="w-sexo"><option></option><option>masculino</option><option>feminino</option><option>ignorado</option><option>outros</option></select></div>

        <div class="field span-3 fixed"><label class="label-row"><span>CPF</span><span class="inline-check"><input type="checkbox" data-bind="registro.cpf_sem_inscricao" id="cpf-sem" />Sem inscricao</span></label><input data-bind="registro.cpf" id="cpf" placeholder="000.000.000-00" class="w-cpf" /></div>
        <div class="field span-2 fixed"><label>Cartorio</label><select data-bind="ui.cartorio_oficio" id="cartorio-oficio" class="w-cartorio"><option></option><option value="6">6</option><option value="9">9</option><option value="12">12</option><option value="13">13</option><option value="14">14</option><option value="15">15</option></select></div>
        <div class="field span-2 fixed"><label>Livro</label><input data-bind="ui.matricula_livro" id="matricula-livro" class="w-livro" placeholder="00000" /></div>
        <div class="field span-1 fixed"><label>Folha</label><input data-bind="ui.matricula_folha" id="matricula-folha" class="w-folha" placeholder="000" /></div>
        <div class="field span-2 fixed"><label>Termo</label><input data-bind="ui.matricula_termo" id="matricula-termo" class="w-termo" placeholder="0000000" /></div>
        <div class="field span-2 fixed" id="casamento-tipo-wrap" style="display:none;"><label>Casamento</label><select data-bind="ui.casamento_tipo" id="casamento-tipo"><option></option><option value="2">Civil</option><option value="3">Religioso</option></select></div>
        <input type="hidden" data-bind="registro.matricula" id="matricula" />

        <div class="field span-3 fixed"><label>Data de registro</label><input data-bind="registro.data_registro" placeholder="dd/mm/aaaa" class="w-date" /></div>
        <div class="field span-4 fixed"><label class="label-row"><span>Data de nascimento</span><span class="inline-check"><input type="checkbox" data-bind="registro.data_nascimento_ignorada" id="dn-ign" />Ignorar</span></label><input data-bind="registro.data_nascimento" id="dn" placeholder="dd/mm/aaaa" class="w-date" /></div>
        <div class="field span-3 fixed"><label class="label-row"><span>Hora de nascimento</span><span class="inline-check"><input type="checkbox" data-bind="registro.hora_nascimento_ignorada" id="hn-ign" />Ignorar</span></label><input data-bind="registro.hora_nascimento" id="hn" placeholder="hh:mm" class="w-time" /></div>
        <div class="spacer span-2"></div>

        <div class="field span-5 fixed"><label>Municipio de naturalidade</label><input data-bind="registro.municipio_naturalidade" class="w-cidade" /></div>
        <div class="field span-3 fixed"><label>UF de naturalidade</label><select data-bind="registro.uf_naturalidade" class="w-uf">${ufsOptions()}</select></div>
        <div class="field span-4 fixed"><label>Numero DNV</label><input data-bind="registro.numero_dnv" class="w-num" /></div>

        <div class="field span-12"><label>Averbacao / Anotacao</label><textarea data-bind="registro.averbacao_anotacao"></textarea></div>
      </div>
    </div>

    <div class="card">
      <div class="cardTitle">Filiacao</div>
      <div class="grid">
        <div class="field span-6"><label>Nome da mae</label><input data-bind="ui.mae_nome" /></div>
        <div class="field span-3"><label>UF da mae</label><select data-bind="ui.mae_uf">${ufsOptions()}</select></div>
        <div class="field span-3"><label>Cidade da mae</label><input data-bind="ui.mae_cidade" /></div>
        <div class="field span-6"><label>Avo materna</label><input data-bind="ui.mae_avo_materna" /></div>
        <div class="field span-6"><label>Avo materno</label><input data-bind="ui.mae_avo_materno" /></div>
        <div class="field span-6"><label>Nome do pai</label><input data-bind="ui.pai_nome" /></div>
        <div class="field span-3"><label>UF do pai</label><select data-bind="ui.pai_uf">${ufsOptions()}</select></div>
        <div class="field span-3"><label>Cidade do pai</label><input data-bind="ui.pai_cidade" /></div>
        <div class="field span-6"><label>Avo paterna</label><input data-bind="ui.pai_avo_paterna" /></div>
        <div class="field span-6"><label>Avo paterno</label><input data-bind="ui.pai_avo_paterno" /></div>
      </div>
    </div>

    <details class="collapse">
      <summary>Avancado</summary>
      <div class="details-box">
        <div class="subTitle">Gemeos</div>
        <div class="grid">
          <div class="field span-3"><label>quantidade</label><input data-bind="registro.gemeos.quantidade" /></div>
          <div class="field span-9"><label>irmao (nome|matricula por linha)</label><textarea data-bind="ui.gemeos_irmao_raw"></textarea></div>
        </div>
        <div class="subTitle" style="margin-top:6px;">Anotacoes cadastro (1 por linha)</div>
        <div class="field"><label>tipo|documento|orgao_emissor|uf_emissao|data_emissao</label><textarea data-bind="ui.anotacoes_raw"></textarea></div>
      </div>
    </details>

    <div class="toast" id="toast"></div>
  </div>
`;

function ufsOptions() {
  return UFS.map(u => `<option>${u}</option>`).join("");
}
