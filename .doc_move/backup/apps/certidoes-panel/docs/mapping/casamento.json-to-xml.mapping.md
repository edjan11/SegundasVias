# Mapeamento JSON -> XML (Casamento)

Fonte JSON: `samples/input/certidao.casamento.input.json`  
XML referencia: `samples/reference/certidao.casamento.reference.xml`

Observacao: tags nao mapeadas usam o valor padrao do template XML referencia.

| xpath/tag_destino | path_json | transformacoes | obrigatorio | default | observacoes |
| --- | --- | --- | --- | --- | --- |
| /ListaRegistrosCasamento/PCAS/pc_003 | registro.conjuges | concat nomes + dados | nao | valor do template | resumo dos conjuges |
| /ListaRegistrosCasamento/PCAS/pc_101 | registro.conjuges[0].nome_atual_habilitacao | trim | sim | "" | 1o conjuge |
| /ListaRegistrosCasamento/PCAS/pc_111 | registro.conjuges[0].data_nascimento | data DD/MM/AAAA | nao | "" | data nasc 1 |
| /ListaRegistrosCasamento/PCAS/pc_109 | registro.conjuges[0].municipio_naturalidade | upper | nao | "" | municipio 1 |
| /ListaRegistrosCasamento/PCAS/pc_110 | registro.conjuges[0].uf_naturalidade | upper | nao | "" | uf 1 |
| /ListaRegistrosCasamento/PCAS/pc_130 | registro.conjuges[0].genitores | trim | nao | "" | genitores 1 |
| /ListaRegistrosCasamento/PCAS/pc_201 | registro.conjuges[1].nome_atual_habilitacao | trim | sim | "" | 2o conjuge |
| /ListaRegistrosCasamento/PCAS/pc_211 | registro.conjuges[1].data_nascimento | data DD/MM/AAAA | nao | "" | data nasc 2 |
| /ListaRegistrosCasamento/PCAS/pc_209 | registro.conjuges[1].municipio_naturalidade | upper | nao | "" | municipio 2 |
| /ListaRegistrosCasamento/PCAS/pc_210 | registro.conjuges[1].uf_naturalidade | upper | nao | "" | uf 2 |
| /ListaRegistrosCasamento/PCAS/pc_230 | registro.conjuges[1].genitores | trim | nao | "" | genitores 2 |
| /ListaRegistrosCasamento/PCAS/pc_301 | certidao.cartorio_cns | digits(6) | nao | "" | CNS |
| /ListaRegistrosCasamento/PCAS/pc_311 | registro.data_registro | data DD/MM/AAAA | nao | "" | data registro |
| /ListaRegistrosCasamento/PCAS/pc_320 | registro.regime_bens | trim | nao | "" | regime bens |
