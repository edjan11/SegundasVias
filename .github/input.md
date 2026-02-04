Você é um(a) engenheiro(a) de software sênior focado em TypeScript, arquitetura modular e integrações HTTP/XML.

Contexto:
Já existe um módulo de “Selo Digital” criado em segundas-vias/selo/ (fora de src/). A aplicação principal apenas chama esse módulo antes de imprimir o PDF.

Sua tarefa:
Revisar e aprimorar o módulo existente seguindo boas práticas rigorosas (arquitetura, segurança, idempotência, testes, logging, UX), mantendo o desenho de responsabilidades abaixo. Não invente campos fixos do modelo: o que é obrigatório vem do endpoint Exibe Modelo.

Regras de saída:
1) Entregue um checklist objetivo (prioridade Alta/Média/Baixa) do que verificar/ajustar no código existente.
2) Proponha a estrutura final de arquivos e a responsabilidade de cada um (sem mudar a ideia central).
3) Descreva o fluxo ponta-a-ponta do usuário e do pipeline técnico (guia / isenção / sem selo) em passos numerados.
4) Liste regras de validação e segurança (ex.: tamanho 2MB, PDF Base64, autenticação centralizada, sanitização de XML).
5) Inclua um “contrato” de integração com a aplicação principal (inputs/outputs do módulo e do pdfStampAdapter).
6) Inclua exemplos curtos (pseudocódigo) apenas onde necessário para deixar decisões inequívocas.

Restrições técnicas/funcionais:
- Pasta: segundas-vias/selo/
- Arquivos:
  - README.md (fluxo)
  - types.ts (SeloRequest, SeloResult, GuiaInfo, TaxaInfo, ModeloInfo, VariavelModelo, AnexoInput, CertType etc.)
  - endpoints.ts (rotas/contratos: gerarSelo, exibeImagem, dadosGuia, guiaPaga, seloDigitalAplicado, adicionaAnexo)
  - seloApiClient.ts (HTTP + XML: URL, headers, parse XML, erros; centralizar Authorization/Accept quando exigidos)
  - taxasService.ts (Listar Taxas + cache local; tolerar novas taxas/modelos)
  - modeloService.ts (Exibe Modelo; nunca hardcodear obrigatórios)
  - anexosService.ts (upload; converter qualquer entrada para PDF Base64; validar ≤2MB)
  - geracaoService.ts (orquestra gerar selo após taxas+modelo+anexos; nrControleSelo idempotente e único por taxa)
  - imagemService.ts (Exibe Imagem apenas no print; retorna Base64; não persistir)
  - recuperacaoService.ts:
     (1) dadosGuia: recuperar selos/taxas/uso
     (2) seloDigitalAplicado?nrSelo=...: recuperar variáveis/valores aplicados
  - catalogoCertidoes.ts (somente UX/defaults por tipo: nascimento/casamento; sugestão de autopreenchimento; regras de isenção)
  - seloModal.ts + seloController.ts (UI: interceptar impressão; opções: sem selo, com guia, com isenção+anexo)
  - pdfStampAdapter.ts (ou pdfRendererBridge.ts): renderizar selo no final do documento; entregar sealImageBase64 ao gerador; descartar Base64 ao cancelar

Fluxos obrigatórios:
- Emissão direta: sem numGuia (ex.: isenções e algumas taxas)
- Emissão ordinária: com numGuia
- Se usuário informar guia:
  1) chamar guiaPaga (flgPago N/S)
  2) se paga, chamar dadosGuia e permitir “usar próximo selo” ou recuperar selos anteriores
- Se usuário escolher isenção:
  - permitir selecionar código de isenção (ex.: 3 e 4 relevantes)
  - se o tipo/taxa exigir, anexar PDF comprobatório via adicionaAnexo antes do gerarSelo
- Persistência mínima: numSelo, numChavePublica, nrControleSelo, codTaxa, codCartorio, numGuia (se houver)
- Nunca persistir imagem do selo (buscar só na hora do print)

Pontos de qualidade exigidos (boas práticas):
- Idempotência real do nrControleSelo por taxa (colisão/concorrência/retentativas)
- Cache de taxas com estratégia de invalidação (ex.: TTL + versão + “fallback se falhar”)
- Tratamento de erro padronizado (erros de rede, XML inválido, erro 993 etc.)
- Observabilidade: logs com correlação (correlationId) e eventos-chave (chamadas/tempos)
- Segurança: não logar credenciais; não persistir Base64; sanitizar XML; limites de payload
- Testabilidade: separar parsing/serialização; mocks do cliente HTTP; testes unitários para:
   parse de XML, validação do modelo, composição do XML do gerarSelo, idempotência nrControleSelo,
   conversão para PDF Base64 + size check, seleção de tentativa de autopreenchimento
- UX: modal claro; validações inline; autopreenchimento como sugestão; modo dark/light acompanhando tema do app

Agora, produza o guia de boas práticas e o checklist para revisar o módulo já criado, garantindo aderência completa aos requisitos acima e à documentação do TJSE.



> <u>DOCUMENTAÇÃO TÉCNICA - API DE INTEGRAÇÃO DO PROJETO SELO
> DIGITAL</u>

A seguinte documentação tem como objetivo orientar a integração, pelos
cartórios extra-judiciais e/ou seus fornecedores de software, das
aplicações utilizadas pelos cartórios com o sistema Selo Digital.

Abaixo serão listados os métodos, bem como exemplos de chamada e
resposta, necessários para que a integração seja possível.

Descrição de utilização

O primeiro método a ser requisitado é <u>Listar Taxas</u>, que lista as
taxas (serviços) que o cartório pode realizar. Em seguida é necessária
uma chamada ao <u>Exibe Modelo</u>, que retornará a estrutura de
informações necessárias para aplicar um selo da taxa escolhida. Para
efeitos do Projeto Selo Digital, entende-se Taxa como Serviço, como por
exemplo: Autenticação de Documentos, Registro de Óbito etc.. Cada Taxa
pode ter alguns tipos de isenção (informados no serviço Listar Taxas).

Podem surgir novas taxas e alterações no modelo, que deverão ser
ajustadas nos sistemas clientes em prazo a ser definido pela
Corregedoria. Isso quer dizer, por exemplo, que se a taxa "Autenticação
de Documentos" requer os campos obrigatórios resumo e nome, pode ser
alterado para que solicite também o campo obrigatório documento.

Depois da chamada ao modelo e da identificação dos campos necessários
será realizado, caso necessário, o upload de arquivos de anexo. A
necessidade é identificada pelo método Listar Taxas, que informa se para
o tipo de isenção a ser escolhido é necessário ou não o envio de
arquivos.

Após o envio de arquivos será executado o método <u>Gerar Selo</u> e
nele serão informadas todas as informações necessárias para a geração do
selo. A resposta (no caso de sucesso) do método <u>Gerar Selo</u> é o
número do selo e a chave pública, dados que serão necessários para a
realização da consulta pública do selo por qualquer pessoa de posse
dessas informações.

Emissão Direta e Emissão Ordinária

Selos emitidos diretamente no balcão, sem a necessidade anterior de uma
guia paga. Nesse caso, não será informado um número de guia (numGuia) no
método <u>Gerar Selo.</u> Para os outros casos o número deverá ser
informado.

Serviços realizados por emissão direta: Autenticação de Documentos
(Código: 1), Reconhecimento de Firma (Código: 2) e Reconhecimento de
Firma - Por Semelhança (Código: 14). Além desses, os serviços com algum
tipo de isenção também são realizados por emissão direta.

Isenções

Segue abaixo a lista isenções possíveis. As isenções aplicáveis para
cada taxa são informadas no método <u>Listar Taxas</u>.

> ● Nascimento/Óbito/Natimorto (Código: 3)
>
> ● 2ª Via de Certidão de Nascimento/Óbito/Casamento (Código: 4 ) ●
> Habilitação Casamento (envolvendo todos os atos) (Código: 5)
>
> ● Determinação Judicial (Código: 6 )
>
> ● Determinação Administrativa (Código: 7 )
>
> ● Art. 6º, I, Lei Estadual 8639/2019 - Autoridade
> Judiciária/Ministério Público/Autoridad e Policial/Autoridade
> Administrativa/Autoridade Fazendária (Código: 1)
>
> ● Lei Federal 12.879/13 - Adequação Estatutária/Qualificação como
> OSCIP/Associação de Moradores (Código: 2)
>
> ● Afixação gratuita proveniente habilitação gratuita (Código: 8)
>
> ● Art. 5º, V, Lei Estadual 6310/2007 - Atos da habilitação até o
> registro de casamento (Código: 9) - Removido
>
> ● Art. 3º, §3º, Lei Federal 11441/2007 -
> Inventário/Partilha/Separação/Divórcio (Código: 10)
>
> ● Atos de Ofício com Previsão Legal (Código: 11)
>
> ● Retificação ou Renovação do ato praticado com erro imputável ao
> serviço (Código: 12 ) ● Certidão de Dívida Ativa (CDA) (Código: 14)
>
> ● Art. 290-A, I, Lei 6015/73 – Regularização Fundiária - Primeiro
> Registro de direito real (Código: 15)
>
> ● Art. 290-A, II, Lei 6015/73 – Regularização Fundiária - Primeira
> Averbação de construção residencial de até 70m² (Código: 16)
>
> ● Art. 290-A, III, Lei 6015/73 – Regularização Fundiária – Registro de
> Título de legitimação de posse, e de sua conversão em propriedade
> (Código: 17)
>
> ● Ato Normativo – Prov. 63/CNJ (Código: 18)
>
> ● Art. 237-A, § 1º da Lei nº 6.015/73. (Código: 19)
>
> ● Reconhecimento de paternidade - Art. 102, § 5º, Lei 8.069/1990.
> (Código: 20 )
>
> ● Atos Relacionados à REURB-S – Art. 13, §1º, Lei nº 13.465/17 -
> Decreto nº 9.310/18 . (Código: 21 ) (Novo - Adiconado em 05/08/2021)
>
> ● Art. 68-A da Lei 8.212/91 incluído pela Lei 14.199/2021. (Código: 22
> ) (Novo -Adiconado em 10/09/2021)
>
> ● ATO DECORRENTE DE ABERTURA DE MATRÍCULA DE OFICIO - Art. 230 da Lei
> 6.015/73. (Código: 23 ) (Novo - Adiconado em 16/12/2021)

Exemplos de Implementação

Chave de API (Exemplo): 123abc

Cada combinação usuário/cartório terá sua chave de API. Isso quer dizer
que, quando um selo é emitido e aplicado utilizando uma chave de API,
possui o mesmo efeito de um selo emitido e aplicado através de login e
senha no sistema de Selo Digital (sem utilização da API), ou seja, o
selo constará como responsável pela prática do ato o usuário vinculado à
chave de API utilizada.

A chave de API para testes e a definitiva será fornecida posteriormente
por meio a ser informado.

Se um mesmo usuário tiver acesso a N cartórios, ele terá N chaves de
API: uma para cada cartório.

Os testes podem também serem feitos através da ferramenta Postman. O
tipo de 'Authorization' sempre será 'No Auth'.

<img src="./ih1elz1b.png" style="width:6.9in;height:2.59167in" />

Listar Taxas

Requisição:

GET /selodigital/ws/cartorio/listarTaxas?codCartorio=140&chaveApi=123abc
HTTP/1.1 Host: homologacao.tjse.jus.br

Accept: application/xml

**No** **Postman:**

Exemplo de Resposta:

\<?xml version="1.0" encoding="UTF-8" standalone="yes"?\> \<taxas\>

> \<taxa\> \<codTaxa\>1\</codTaxa\> \<isencoes\>
>
> \<isencao\> \<codIsencao\>1\</codIsencao\>
>
> \<dsIsencao\>Art. 5º, I, Lei Estadual 6310/2007\</dsIsencao\>
> \<temAnexo\>sim\</temAnexo\>
>
> \</isencao\> \<isencao\>
>
> \<codIsencao\>2\</codIsencao\>
>
> \<dsIsencao\>Lei Federal 12.879/13\</dsIsencao\>
> \<temAnexo\>sim\</temAnexo\>
>
> \</isencao\> \<isencao\>
>
> \<codIsencao\>3\</codIsencao\>
> \<dsIsencao\>Nascimento/Óbito/Natimorto\</dsIsencao\>
> \<temAnexo\>nao\</temAnexo\>
>
> \</isencao\> \</isencoes\>
>
> \<nomeTaxa\>Autenticação de Documentos\</nomeTaxa\> \</taxa\>
>
> \<taxa\> \<codTaxa\>11\</codTaxa\> \<isencoes\>
>
> \<isencao\> \<codIsencao\>1\</codIsencao\>
>
> \<dsIsencao\>Art. 5º, I, Lei Estadual 6310/2007\</dsIsencao\>
> \<temAnexo\>sim\</temAnexo\>
>
> \</isencao\> \</isencoes\>
>
> \<nomeTaxa\>Certidões em Geral\</nomeTaxa\> \</taxa\>

\</taxas\>

Exibe Modelo

Requisição:

GET /selodigital/ws/cartorio/exibeModelo?codTaxa=5&chaveApi=123abc
HTTP/1.1 Host: homologacao.tjse.jus.br

Accept: application/xml

Resposta:

\<?xml version="1.0" encoding="UTF-8" standalone="yes"?\> \<modelo\>

> \<codModelo\>2132\</codModelo\> \<variavel\>
>
> \<codVariavel\>3741\</codVariavel\>
> \<descVariavel\>Livro\</descVariavel\>
> \<obrigatorio\>sim\</obrigatorio\>
> \<tipoVariavel\>texto\</tipoVariavel\>
>
> \</variavel\> \<variavel\>
>
> \<codVariavel\>3742\</codVariavel\>
> \<descVariavel\>Outorgados\</descVariavel\>
> \<obrigatorio\>nao\</obrigatorio\> \<subvariaveis\>
>
> \<variavel\> \<codVariavel\>1\</codVariavel\>
>
> \<descVariavel\>Documento\</descVariavel\>
> \<obrigatorio\>nao\</obrigatorio\>
> \<tipoVariavel\>texto\</tipoVariavel\>
>
> \</variavel\> \<variavel\>
>
> \<codVariavel\>2\</codVariavel\> \<descVariavel\>Nome\</descVariavel\>
> \<obrigatorio\>nao\</obrigatorio\>
> \<tipoVariavel\>texto\</tipoVariavel\>
>
> \</variavel\> \</subvariaveis\>
>
> \<tipoVariavel\>multiplo\</tipoVariavel\> \</variavel\>
>
> \<variavel\> \<codVariavel\>3784\</codVariavel\>
>
> \<descVariavel\>Descrição do Objeto\</descVariavel\>
> \<obrigatorio\>sim\</obrigatorio\>
> \<tipoVariavel\>texto\</tipoVariavel\>
>
> \</variavel\> \<variavel\>
>
> \<codVariavel\>3792\</codVariavel\>
> \<descVariavel\>Folha\</descVariavel\>
> \<obrigatorio\>sim\</obrigatorio\>
> \<tipoVariavel\>texto\</tipoVariavel\>
>
> \</variavel\> \<variavel\>
>
> \<codVariavel\>3794\</codVariavel\>
> \<descVariavel\>Observação\</descVariavel\>
>
> \<obrigatorio\>nao\</obrigatorio\>
> \<tipoVariavel\>texto\</tipoVariavel\>
>
> \</variavel\> \<variavel\>
>
> \<codVariavel\>3812\</codVariavel\>
> \<descVariavel\>Outorgantes\</descVariavel\>
> \<obrigatorio\>sim\</obrigatorio\> \<subvariaveis\>
>
> \<variavel\> \<codVariavel\>1\</codVariavel\>
>
> \<descVariavel\>Documento\</descVariavel\>
> \<obrigatorio\>sim\</obrigatorio\>
> \<tipoVariavel\>texto\</tipoVariavel\>
>
> \</variavel\> \<variavel\>
>
> \<codVariavel\>2\</codVariavel\> \<descVariavel\>Nome\</descVariavel\>
> \<obrigatorio\>sim\</obrigatorio\>
> \<tipoVariavel\>texto\</tipoVariavel\>
>
> \</variavel\> \</subvariaveis\>
>
> \<tipoVariavel\>multiplo\</tipoVariavel\> \</variavel\>

\</modelo\>

<img src="./a5xdso1p.png"
style="width:6.88333in;height:2.29167in" />

Adiciona Anexo

Adiciona anexos a serem utilizados na criação de selos digitail

\- Obs: No corpo da mensagem vem anexado o documento a ser salvo como um
multipart/form-data de nome 'arquivo'

O arquivo deverá ser enviado na representação Base64 e o formato,
obrigatoriamente, PDF. O tamanho máximo do arquivo é de 2MB.

Requisição:

POST
/selodigital/ws/cartorio/adicionaAnexo?descricao=ordem-judicial&chaveApi=123abc
HTTP/1.1 Host: homologacao.tjse.jus.br

Accept: application/xml

Content-Type: multipart/form-data

Exemplo no Postman

Resposta:

\<?xml version="1.0" encoding="UTF-8" standalone="yes"?\>
\<anexo\>335\</anexo\>

<img src="./2me1ep4a.png"
style="width:6.88333in;height:2.275in" />

Gerar Selo

Requisição:

POST /selodigital/ws/cartorio/gerarSelo?chaveApi=123abc HTTP/1.1 Host:
homologacao.tjse.jus.br

Accept: application/xml Content-Type: application/xml

Para todas as gerações do selo será necessário informar o número de
controle de selo a ser definido pela própria empresa, para garantir que
não haja duplicação na aplicação do selo por parte do próprio usuário.
Esse número é único para cada taxa.

Exemplo no Postman:

\<?xml version="1.0" encoding="UTF-8" standalone="yes"?\> \<selo\>

> \<codCartorio\>222\</codCartorio\> \<codTaxa\>1\</codTaxa\>
> \<numGuia\>\</numGuia\> \<codIsencao\>12\</codIsencao\>
>
> \<modelo\> \<codModelo\>2121\</codModelo\>
>
> \<variavel\> \<codVariavel\>3997\</codVariavel\>
> \<valorVariavel\>1\</valorVariavel\>
>
> \</variavel\> \<variavel\>
>
> \<codVariavel\>3719\</codVariavel\>
>
> \<valorVariavel\>Este é meu documento para
> autenticar\</valorVariavel\>
>
> \</variavel\> \<variavel\>
>
> \<codVariavel\>3815\</codVariavel\> \<valorVariavel\>Descricao
> qualquer\</valorVariavel\>
>
> \</variavel\> \</modelo\>
>
> \<situacaoProtesto\>\</situacaoProtesto\> \<anexos\>
>
> \<anexo\>50152\</anexo\> \</anexos\>

\</selo\>

Resposta:

\<?xml version="1.0" encoding="UTF-8" standalone="yes"?\> \<selo\>

> \<numChavePublica\>989854756957\</numChavePublica\>
> \<nrControleSelo\>124\</nrControleSelo\>

\<numSelo\> 201929636000422\</numSelo\> \</selo\>

**Gerar** **Selo** **com** **processo** **no** **caso** **de**
**Isenção** **por** **Determinação** **Judicial** **(Código:** **6)**

**-** **Obs:** **Abaixo** **a** **descrição** **simplificada** **dos**
**campos**

**---\>** **codCartorio:** **(int)** **Código** **do** **cartório**
**que** **será** **gerado** **o** **selo**

**---\>** **codTaxa:** **(int)** **Código** **da** **taxa**
**utilizada** **pelo** **selo**

**---\>** **numGuia:** **(Long)** **Número** **da** **guia** **paga**
**utilizada** **para** **gerar** **o** **selo** **Ordinário**

**---\>** **numSeloOrigem:** **(Long)** **Número** **do** **selo**
**origem** **utilizado** **para** **gerar** **selos** **Dependentes**

**---\>** **tipoSeloOrigem:** **(String)** **fisicosergipe** **/**
**virtualsergipe** **/** **outrosestados**

**---\>** **codIsencao:** **(int)** **Código** **isenção** **da**
**taxa** **utilizada**

\<?xml version="1.0" encoding="UTF-8" standalone="yes"?\> \<selo\>

> \<codCartorio\>222\</codCartorio\> \<codTaxa\>29\</codTaxa\>
> \<numGuia\>\</numGuia\> \<nrSeloOrigem\>\</nrSeloOrigem\>
> \<tipoSeloOrigem\>\</tipoSeloOrigem\> \<codIsencao\>6\</codIsencao\>
>
> **\<numProcessoIsencao\>14569\</numProcessoIsencao\>**
> **\<tipoProcessoIsencao\>outrosestados\</tipoProcessoIsencao\>**
>
> **\<descricaoProcessoIsencaoOrigem\>descrição** **do**
> **processo\</descricaoProcessoIsencaoOrigem\>**
>
> \<modelo\> \<codModelo\>2143\</codModelo\>
>
> \<variavel\> \<codVariavel\>3759\</codVariavel\>
>
> \<valorVariavel\>733.01\</valorVariavel\> \</variavel\>
>
> \<variavel\> \<codVariavel\>3787\</codVariavel\>
> \<valorVariavel\>x\</valorVariavel\>
>
> \</variavel\>
>
> \<variavel\> \<codVariavel\>3759\</codVariavel\>
> \<valorVariavel\>x\</valorVariavel\>
>
> \</variavel\>
>
> \<variavel\> \<codVariavel\>3759\</codVariavel\>
> \<valorVariavel\>x\</valorVariavel\>
>
> \</variavel\> \</modelo\>

\</selo\>

**Processo** **no** **TJ:**

\<numProcessoIsencao\>200511000066\</numProcessoIsencao\>
\<tipoProcessoIsencao\>tjse\</tipoProcessoIsencao\>

Gerar Selo com Subvariaveis

> \<?xml version="1.0"?\>
>
> \<selo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
> xmlns:xsd="http://www.w3.org/2001/XMLSchema"\>
>
> \<codCartorio\>222\</codCartorio\> \<codTaxa\>81\</codTaxa\> \<numGuia
> /\>
>
> \<nrSeloOrigem /\> \<tipoSeloOrigem /\> \<codIsencao\>7\</codIsencao\>
> \<modelo\>
>
> \<codModelo\>2138\</codModelo\> \<variavel\>
>
> \<codVariavel\>3750\</codVariavel\> \<nomeVariavel\>descrição do
> objeto\</nomeVariavel\> \<valorVariavel\>Procuração\</valorVariavel\>
>
> \</variavel\> \<variavel\>
>
> \<codVariavel\>3812\</codVariavel\>
>
> \<subvariaveis\> \<variavel\>
>
> \<codVariavel\>1\</codVariavel\> \<linha\>1\</linha\>
> \<nomeVariavel\>documento\</nomeVariavel\>
> \<valorVariavel\>4324234234\</valorVariavel\>
>
> \</variavel\> \<variavel\>
>
> \<codVariavel\>2\</codVariavel\> \<linha\>1\</linha\>
> \<nomeVariavel\>nome\</nomeVariavel\>
> \<valorVariavel\>Pedro\</valorVariavel\>
>
> \</variavel\> \<variavel\>
>
> \<codVariavel\>1\</codVariavel\> \<linha\>2\</linha\>
> \<nomeVariavel\>documento\</nomeVariavel\>
> \<valorVariavel\>45354543\</valorVariavel\>
>
> \</variavel\> \<variavel\>
>
> \<codVariavel\>2\</codVariavel\> \<linha\>2\</linha\>
> \<nomeVariavel\>nome\</nomeVariavel\>
> \<valorVariavel\>Maria\</valorVariavel\>
>
> \</variavel\> \</subvariaveis\>
>
> \</variavel\>
>
> \<variavel\> \<codVariavel\>3813\</codVariavel\>
> \<nomeVariavel\>outorgados\</nomeVariavel\> \<subvariaveis\>
>
> \<variavel\> \<codVariavel\>1\</codVariavel\> \<linha\>1\</linha\>
>
> \<nomeVariavel\>documento\</nomeVariavel\>
> \<valorVariavel\>24234234\</valorVariavel\>
>
> \</variavel\> \<variavel\>
>
> \<codVariavel\>2\</codVariavel\> \<linha\>1\</linha\>
> \<nomeVariavel\>nome\</nomeVariavel\>
> \<valorVariavel\>Joao\</valorVariavel\>
>
> \</variavel\> \<variavel\>
>
> \<codVariavel\>1\</codVariavel\> \<linha\>2\</linha\>
> \<nomeVariavel\>documento\</nomeVariavel\>
> \<valorVariavel\>234234\</valorVariavel\>
>
> \</variavel\> \<variavel\>
>
> \<codVariavel\>2\</codVariavel\> \<linha\>2\</linha\>
> \<nomeVariavel\>nome\</nomeVariavel\>
>
> \<valorVariavel\>José\</valorVariavel\> \</variavel\>
>
> \</subvariaveis\> \</variavel\> \<variavel\>
>
> \<codVariavel\>3815\</codVariavel\>
> \<nomeVariavel\>observação\</nomeVariavel\> \<valorVariavel /\>
>
> \</variavel\> \</modelo\> \<anexos /\>
>
> \</selo\>

Ping

Serviço que verifica se API está online.

Requisição:

POST http://homologacao.tjse.jus.br/selodigital/ws/cartorio/ping?
chaveApi=123abc HTTP/1.1

Host: homologacao.tjse.jus.br Accept: application/xml Content-Type:
application/xml

Resposta:

\<?xml version="1.0" encoding="UTF-8" standalone="yes"?\> \<resposta\>

\<mensagem\>pong\</mensagem\> \</resposta\>

Exibir Imagem

Serviço exibe a imagem do selo para ser usada no documento. Retornará um
texto codificado em Base64.

Requisição:

GET /selodigital/ws/cartorio/exibeImagem?
numSelo=201829636000009&codCartorio=222&chaveApi=123 HTTP/1.1 Host:
homologacao.tjse.jus.br

Accept: application/xml

Resposta:

Content-Type: application/xml

Obter Dados da Guia de Recolhimento Extrajudicial (Novo Serviço)

Serviço que retorna os dados de uma guia extrajudicial. As informações
de retorno são: número da guia, data de emissão, data de vencimento,
data de pagamento, valor da guia, valor destinado ao FERD e uma lista
com as taxas (serviços) vinculadas à guia.

As taxas possuem as informações como: código identificador da relação
entre taxa e guia, código identificador da taxa, descrição resumida,
descrição detalhada, quantidade, quantidade de selos aplicados
(quantidade utilizada) e uma lista com informações dos selos aplicados.

Os selos aplicados possuem informações como: número do selo, data/hora
de emissão, data/hora de aplicação e número da chave pública.

Exemplo de requisição:

{host}/selodigital/ws/cartorio/dadosGuia?numGuia=156200000020

Host (ambiente de homologação): homologacao.tjse.jus.br

Host (ambiente de produção): www.tjse.jus.br

No cabeçalho da requisição devem ser enviados os campos Authorization e
Accept, com os valores usuário:senhaEmMD5 no formato BASE64 e
application/xml, respectivamente.

Exemplo de resposta:

Content-Type: application/xml;charset=UTF-8

\<dadosGuia\>

> \<numGuia\>156200000020\</numGuia\>
>
> \<dataEmissao\>2020-03-29T00:00:00-03:00\</dataEmissao\>
> \<dataVencimento\>2020-04-13T00:00:00-03:00\</dataVencimento\>
> \<dataPagamento\>2020-03-29T00:00:00-03:00\</dataPagamento\>
> \<valorGuia\>280.52\</valorGuia\> \<valorFerd\>46.76\</valorFerd\>
>
> \<taxas\>
>
> \<taxa\> \<codigoGuiaTaxa\>3227\</codigoGuiaTaxa\>
> \<codigoTaxa\>182\</codigoTaxa\>
>
> \<descricaoResumida\>Aposição de apostila\</descricaoResumida\>

\<descricaoDetalhada\>AVISO IMPORTANTE: A aposição de apostila somente
pode ser realizada por serventia credenciada pelo Conselho Nacional de
Justiça. Consulte o Cartório escolhido, antes de promover o pagamento da
guia de recolhimento dos respectivos emolumentos, para confirmar se a
serventia está credenciada.\</descricaoDetalhada\>

> \<quantidade\>4\</quantidade\>
> \<quantidadeSelosAplicados\>3\</quantidadeSelosAplicados\>
> \<selosAplicados\>
>
> \<selo\> \<nrSelo\>202029505000012\</nrSelo\>
>
> \<dataHoraEmissao\>2020-09-03T09:57:16.394-03:00\</dataHoraEmissao\>
> \<dataHoraAplicacao\>2020-09-03T09:57:16.513-03:00\</dataHoraAplicacao\>
> \<numeroChavePublica\>TD837B\</numeroChavePublica\>
>
> \</selo\>
>
> \<selo\> \<nrSelo\>202029505000013\</nrSelo\>
>
> \<dataHoraEmissao\>2020-09-03T10:35:06.232-03:00\</dataHoraEmissao\>
> \<dataHoraAplicacao\>2020-09-03T10:35:06.389-

03:00\</dataHoraAplicacao\>
\<numeroChavePublica\>YTJJJM\</numeroChavePublica\>

> \</selo\>
>
> \<selo\> \<nrSelo\>202029505000014\</nrSelo\>
>
> \<dataHoraEmissao\>2020-09-03T11:13:23.741-03:00\</dataHoraEmissao\>
> \<dataHoraAplicacao\>2020-09-03T11:13:23.873-

03:00\</dataHoraAplicacao\>
\<numeroChavePublica\>HN3AFN\</numeroChavePublica\>

> \</selo\>
>
> \</selosAplicados\>
>
> \</taxa\> \</taxas\>

\</dadosGuia\>

Caso seja gerada alguma exceção no processamento da requisição, então a
resposta será retornada no seguinte formato:

\<erro\> \<codErro\>993\</codErro\>

> \<mensagem\>O número da guia não foi informado.\</mensagem\>
> \<mensagemTecnica\>O número da guia não foi
> informado.\</mensagemTecnica\>

\</erro\>

Verifica se a Guia de Recolhimento Extrajudicial Está Paga (Novo
Serviço)

Serviço que retorna se uma guia extrajudicial está paga. As informações
de retorno são: número da guia e a informação de pagamento (flgPago). Os
possíveis valores são “N” (Guia Não Paga) e “S” (Guia Paga).

Exemplo de requisição:

{host}/selodigital/ws/cartorio/guiaPaga?numGuia=116200000025

> Exemplo de Resposta:

\<?xml version="1.0" encoding="UTF-8" standalone="yes"?\>
\<guiaPagaResp\>

> \<numGuia\>116200000025\</numGuia\> \<flgPago\>N\</flgPago\>

\</guiaPagaResp\>

Retorna as Informações do Selo Aplicado (Novo Serviço)

Serviço que retorna as informações exigidos no ato da aplicação do selo,
ou seja, as informações do modelo. As informações de retorno dependem do
modelo e da taxa do selo. Veja exemplo de requisição abaixo:

Exemplo de requisição:

https://{host}/selodigital/ws/cartorio/seloDigitalAplicado?nrSelo=XXXXXXXXXXXXXXX

Host (ambiente de homologação): homologacao.tjse.jus.br

Host (ambiente de produção): www.tjse.jus.br

No cabeçalho da requisição devem ser enviados os camposAuthorization
eAccept, com os valores usuário:senhaEmMD5 no formato BASE64 e
application/xml, respectivamente.

Exemplo de requisição no ambiente de homologação:

https://homologacao.tjse.jus.br/selodigital/ws/cartorio/seloDigitalAplicado?nrSelo=202029636001728

> Exemplo de Resposta:

\<?xml version="1.0" encoding="UTF-8" standalone="yes"?\>
\<dadosModeloSelo\>

> \<variavel\>
>
> \<dsVariavel\>Nome da Pessoa cuja firma foi reconhecida\</dsVariavel\>
> \<dsValor\>FULANO\</dsValor\>
>
> \</variavel\> \<variavel\>
>
> \<dsVariavel\>Descrição Resumida\</dsVariavel\>

\<dsValor\>ATPV, PLACA QKT 9999, COMPRADOR: CICRANO DA SILVA, DATADO DE
29/09/2020\</dsValor\>

> \</variavel\> \<variavel\>
>
> \<dsVariavel\>Documento de Identificação\</dsVariavel\>
> \<dsValor\>XXX.XXX.XXX-XX\</dsValor\>

\</variavel\> \</dadosModeloSelo\>