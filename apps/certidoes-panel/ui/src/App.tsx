import React, { useState } from 'react';

type TabKey = 'buscar' | 'cadastrar' | 'detalhe';

export default function App() {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<TabKey>('buscar');

  return (
    <div className={`panel-shell ${open ? 'open' : ''}`}>
      <button className="panel-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? 'Fechar painel' : 'Abrir painel'}
      </button>
      <aside className="panel">
        <header>
          <h1>Certidoes</h1>
          <p>Painel lateral (isolado)</p>
        </header>
        <nav className="tabs">
          <button className={tab === 'buscar' ? 'active' : ''} onClick={() => setTab('buscar')}>
            Busca
          </button>
          <button className={tab === 'cadastrar' ? 'active' : ''} onClick={() => setTab('cadastrar')}>
            Cadastro
          </button>
          <button className={tab === 'detalhe' ? 'active' : ''} onClick={() => setTab('detalhe')}>
            Detalhe
          </button>
        </nav>
        <section className="tab-content">
          {tab === 'buscar' && (
            <div>
              <label>Busca livre</label>
              <input placeholder="nome, termo, matricula, cns..." />
              <div className="row">
                <input placeholder="matricula" />
                <input placeholder="cns" />
              </div>
              <button>Buscar</button>
            </div>
          )}
          {tab === 'cadastrar' && (
            <div>
              <label>JSON de entrada</label>
              <textarea rows={8} placeholder="Cole o JSON_ENTRADA aqui" />
              <button>Cadastrar</button>
            </div>
          )}
          {tab === 'detalhe' && (
            <div>
              <label>ID</label>
              <input placeholder="id da certidao" />
              <button>Ver detalhes</button>
              <div className="row">
                <button>Ver XML</button>
                <button>Baixar XML</button>
              </div>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
