# Mapeamento JSON -> XML (Nascimento)

Fonte JSON: `samples/input/certidao.nascimento.input.json`  
XML referencia: `samples/reference/certidao.nascimento.reference.xml`

Observacao: tags nao mapeadas usam o valor padrao do template XML referencia.

| xpath/tag_destino | path_json | transformacoes | obrigatorio | default | observacoes |
| --- | --- | --- | --- | --- | --- |
| /ListaRegistrosNascimento/PNAS/CodigoCNJ | certidao.cartorio_cns | digits(6) | nao | "" | CNS |
| /ListaRegistrosNascimento/PNAS/DataRegistro | registro.data_registro | data DD/MM/AAAA | nao | "" | data registro |
| /ListaRegistrosNascimento/PNAS/EstabelecimentoDoNascimento | registro.local_nascimento | trim | nao | "" | local nascimento |
| /ListaRegistrosNascimento/PNAS/NumeroDNV_DO | registro.numero_dnv | trim | nao | "" | DNV |
| /ListaRegistrosNascimento/PNAS/Registrado/Nome | registro.nome_completo | trim | sim | "" | registrado |
| /ListaRegistrosNascimento/PNAS/Registrado/Sexo | registro.sexo | map M/F | nao | "" | sexo |
| /ListaRegistrosNascimento/PNAS/Registrado/DataNascimento | registro.data_nascimento | data DD/MM/AAAA | nao | "" | data nasc |
| /ListaRegistrosNascimento/PNAS/Registrado/HoraNascimento | registro.hora_nascimento | HH:mm | nao | "" | hora nasc |
| /ListaRegistrosNascimento/PNAS/Registrado/CidadeNascimento | registro.municipio_nascimento | upper | nao | "" | municipio |
| /ListaRegistrosNascimento/PNAS/Registrado/UFNascimento | registro.uf_nascimento | upper | nao | "" | UF |
