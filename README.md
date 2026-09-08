# Consultório — the men's & the ladies

Reconstrução estática do consultório digital. HTML, CSS e JavaScript puro,
sem build: a Ezra vai embutida em base64 no CSS, a Montserrat vem do Google
Fonts e as respostas ficam em `localStorage`.

## Rotas

| Rota | Tela |
| --- | --- |
| `/pages/consultorio` | Seleção de protocolo |
| `/pages/consultorio-inicio` | Como funciona a avaliação |
| `/pages/consultorio-1` … `-40` | Passos do fluxo (o total visível varia com as condicionais) |
| `/pages/consultorio-41` | Prontuário e checkout |

Rota desconhecida cai na seleção de protocolo. Rota de um passo que existe
mas está invisível (condicional que deixou de valer) recua até o passo
visível anterior — não volta para a pergunta 1. Deep link direto numa
pergunta funciona: sem protocolo salvo, assume o único que está aberto.

As rotas são numeradas pela posição no array `steps`, então inserir um passo
renumera as seguintes. Isso não afeta respostas já gravadas: o `localStorage`
é indexado por `field`, nunca por índice.

## Protocolos

Definidos no array `protocols`, no topo do `app.js`:

- **Emagrecimento** — aberto
- **Cabelo, Força, Sono, Ejaculação precoce, Disfunção erétil** — `status: "breve"`,
  entram na grade com selo "Em breve", esmaecidos e não clicáveis

Os seis aparecem numa grade de 3 por linha no desktop e 2 em tablet. **No
celular fica um por linha**, e os cinco “em breve” passam a linha horizontal
com o selo à direita: em duas colunas os nomes longos quebravam em três
linhas apertadas, e seis cards em bloco dariam uma página longa demais.

Só o card aberto é um link. As `specs` do protocolo aparecem na tela seguinte
("como funciona"), não na seleção. O campo `resumo` continua suportado, mas o
de emagrecimento está sem ele: o texto sobre análogos de GLP-1 foi removido a
pedido, e a intro usa o depoimento nesse espaço.

Para abrir um protocolo novo: troque o `status` para `"aberto"` e preencha as
`specs`. O fluxo de perguntas hoje é compartilhado — o array
`steps` é o de emagrecimento. Um segundo protocolo aberto precisa do próprio
array de perguntas, selecionado por `protocol.id`.

## Passos do fluxo

O array `steps` mistura perguntas e telas informativas. O `kind` diz qual é
qual:

| `kind` | comportamento |
| --- | --- |
| `single`, `multiple`, `singleWithText` | opções |
| `fields`, `number`, `textarea` | campos |
| `photos` | envio de fotos; Continuar nasce habilitado porque é opcional |
| `info` | só informa; Continuar nasce habilitado e nada é gravado |
| `block` | tela terminal, sem Continuar (previsto, ainda não usado) |

### Regras das telas informativas

- **`field` é obrigatório e único.** `goNext` localiza o passo atual por
  `field`; sem ele a navegação joga o usuário na pergunta 1, e duplicado com
  o de uma pergunta gera loop infinito. Use os prefixos `info_`, `insight_`
  ou `bloqueio_`. Há uma asserção na carga que reclama de duplicata no
  console.
- **Conteúdo** vem de `body` (lista de parágrafos) ou de `render()`, que
  devolve HTML — é o equivalente a uma tela customizada. `render()` roda
  dentro de `try/catch`, porque uma exceção ali aconteceria dentro do
  template de `innerHTML` e apagaria a página inteira.
- **`eyebrow`** substitui o contador no cabeçalho.
- **Nunca use `auto`** numa tela informativa: não há opção para clicar.

As telas informativas são **só texto**. Uma tentativa com ilustração de banco
de imagens foi revertida — a faixa de foto competia com o título e empurrava
o texto para baixo, sem acrescentar informação. Está no histórico do git
(commit `fb84fcd`) se alguém quiser retomar com material próprio.

### Contador e barra de progresso

Medem coisas diferentes de propósito. A **barra** avança pelo fluxo inteiro,
telas informativas incluídas — uma barra congelada por uma tela parece
defeito. O **contador** conta apenas perguntas, e desaparece nas telas
informativas, dando lugar ao `eyebrow`. Assim nunca se vê um número travado
ao lado de uma barra que andou.

### Devolutiva de IMC

`insight_imc` calcula o IMC a partir de `peso_atual` e `altura` e desenha uma
régua. `computeImc()` devolve `null` se faltar algum dado, e o `showIf.when`
usa isso para esconder a tela — é o que impede um "IMC: NaN" em quem entra
por link direto. `alturaEmMetros` aceita centímetros (o que o campo pede) e
também metros, para quem digitar `1,78`.

A tela mostra o número e a faixa, **sem** afirmar se há indicação de
tratamento — essa decisão é do médico, e a tela diz isso.

A régua é CSS puro. O domínio é fixo (`IMC_MIN` 18, `IMC_MAX` 45) e as
posições entram como números sem unidade em `--pos` e `--at`, consumidos por
`calc()` no `styles.css`. Mudar o domínio exige mexer no CSS.

## Por que perguntamos

Qualquer passo com a chave `why` ganha um botão "Por que perguntamos?" abaixo
do texto de apoio, que abre um `<dialog>` com a explicação:

```js
why: {
  titulo: "Por que perguntamos?",
  body: ["parágrafo", "…"],
  nota: "Suas respostas não são usadas para publicidade.",
}
```

Hoje só a pergunta de sexo atribuído usa. `<dialog>` nativo dá ESC, foco
preso e backdrop de graça; há um fallback por atributo `open` para navegador
sem suporte.

## Fotos do corpo

O passo `fotos_corpo` (`kind: "photos"`) tem dois slots — frente e lado — cada
um com "Usar câmera" (`capture="environment"`) e "Escolher arquivo". Aceita
JPG e PNG até 5 MB e mostra pré-visualização, nome e tamanho.

**As fotos são opcionais**: o Continuar nunca trava.

Cada card mostra uma silhueta de referência — `assets/corpo-frente.png` e
`assets/corpo-lado.png`, PNG com fundo transparente fornecidos pela marca.

O PNG original era contorno preto fino com interior branco, e **desaparecia**
ao ser reduzido de 1774 px para ~96 px de altura: o traço virava fração de
pixel e o interior branco não contrastava com o creme do card. Os arquivos
atuais foram gerados a partir do **canal alpha** do original, preenchido com
uma cor sólida (`#7a8a6f`, 3.43:1 sobre o creme). Assim a silhueta é visível
em qualquer tamanho.

A folga vertical fica **dentro do PNG** (34 px em cima e embaixo): na primeira
versão o corpo ia de ponta a ponta do canvas e os pés eram comidos pelo
`border-radius` do card. Ao trocar as imagens, preserve essa margem.

Os dois foram normalizados pela **altura** — 300×460, corpo centralizado —
para frente e lado aparecerem na mesma escala; o de lado só ocupa menos
largura, como deve ser. Peso caiu de 890 KB para 24 KB. Os originais em
887×1774 estão no commit `15ff7ca`.

Os arquivos vão para o **IndexedDB** (`tl-consulta-fotos`), não para o
`localStorage`: um JPEG de 3 MB em base64 passa de 4 MB e estouraria a cota
de 5 MB do domínio inteiro, levando as respostas junto. O `localStorage`
guarda só os metadados (nome, bytes, tipo), que é o que o prontuário precisa
ler de forma síncrona. Sem IndexedDB disponível (modo privado restrito), o
card avisa e o fluxo continua.

> **Falta o envio.** O projeto não tem backend: as fotos e as respostas ficam
> no navegador de quem preencheu, e o fluxo termina no checkout da Shopify.
> Nada chega à equipe médica ainda. Para isso é preciso um endpoint que
> receba o payload do `localStorage` mais os blobs do IndexedDB.

## Depoimento

O passo `info_depoimento` traz um depoimento com antes e depois, montado a
partir da constante `DEPOIMENTO` no `app.js`: fotos em
`assets/depoimento-antes.jpg` e `assets/depoimento-depois.jpg`, três
parágrafos de fala, crédito à autora e uma ressalva de que o resultado é
individual.

Ele fica **logo depois da devolutiva de IMC**: a pessoa acabou de ver o
próprio número, e é quando o relato de quem passou pelo mesmo pesa mais.

Por viver dentro do questionário, onde a tela não pode rolar, as fotos ficam
**ao lado** da fala e não acima: em coluna única, duas fotos 4:5 mais três
parágrafos passariam de 900 px. No celular empilha, com as fotos limitadas a
210 px de largura.

**É material real, cedido pela cliente.** Foto de banco nunca pode ocupar
esse lugar — seria prova social fabricada, e a licença do Pexels proíbe
explicitamente sugerir endosso por pessoas retratadas. Ao trocar o
depoimento, troque também as fotos pelas da pessoa citada.

As imagens vieram em 1080×1350 com 2,8 MB somados e foram reduzidas para
560×700 em JPEG, totalizando 97 KB. Fotografia não precisa do PNG: não há
transparência a preservar.

## Prontuário

A tela final (`renderDone`) monta um prontuário a partir do que foi
respondido, agrupado pelo array `PRONTUARIO`. Cada seção é um `<details>`
recolhido, com um cabeçalho que resume o estado:

| Símbolo | Significado |
| --- | --- |
| check | todos os campos esperados da seção têm resposta |
| atenção | falta pelo menos um; a seção **abre sozinha** e a linha aparece como "Não informado" |

O que conta como "esperado" é decidido por `campoEsperado()`: o passo dono tem
de estar visível, não ser opcional, e um campo revelado por opção (os
`revealValues`) só conta se a opção que o revela foi escolhida. Sem isso o
prontuário acusaria falta de resposta em pergunta que nunca apareceu para
aquela pessoa. Campo opcional em branco simplesmente não entra.

O "Editar" navega para a pergunta com `?revisao=1`. Nesse modo o CTA vira
"Salvar e voltar" e o `goNext` retorna ao prontuário em vez de seguir o
fluxo — é o que evita repetir 40 telas para corrigir um peso digitado
errado.

Campo sem resposta não aparece. A seção de medidas ganha o IMC calculado, e
há um aviso quando falta alguma foto.

O prontuário **não** redireciona sozinho para o checkout. A tela anterior
fazia isso em 5 segundos; com um documento para revisar, redirecionar por
conta própria atropela justamente o que a tela existe para permitir.

## Aviso de interação medicamentosa — fora do fluxo

O texto que alertava sobre interação dos análogos de GLP-1 com tratamentos em
curso **não aparece mais em nenhum lugar**. Ele era o `help` da pergunta
`condicoes_restritivas` (o que alarmava todos, inclusive quem marcaria
"Nenhuma das anteriores"), virou a tela `alerta_contraindicacao`, e a tela foi
removida a pedido.

Quem marca pancreatite, CMT, MEN 2, doença hepática, transtorno alimentar ou
bariátrica hoje segue o questionário sem receber nenhum aviso. A resposta
continua registrada e vai para o médico — muda a comunicação com o paciente,
não o dado clínico.

Para voltar, o texto está no histórico do git (constante `riskWarning`, commit
`fb84fcd`).

## Conteúdo de cuidado removido do fluxo

Três telas foram retiradas a pedido, e com elas saíram avisos que o fluxo
antes dava. Fica registrado porque **nenhum deles existe mais em nenhum
ponto** — o dado continua sendo coletado e vai para o médico; o que mudou é a
comunicação com o paciente.

| Tela | O que dizia | Recuperar de |
| --- | --- | --- |
| `alerta_contraindicacao` | interação dos análogos de GLP-1 com tratamentos em curso | `fb84fcd` |
| `info_purgacao` | riscos da purgação e o canal do CVV (188) | `8df40ba` |
| `info_seguranca` | que nada é liberado sem prescrição médica | `8df40ba` |

O caso do CVV é o mais delicado: aparecia só para quem relatava vómito
induzido, e era o único canal de apoio oferecido no produto.

## Cabe na primeira tela

Cada passo cabe sem rolagem: a tela é um grid de `100dvh` com cabeçalho,
corpo e rodapé, e o corpo só rola se o conteúdo realmente estourar. Listas
com mais de 6 opções vão para duas colunas, e abaixo de 720px de altura um
modo compacto reduz alturas e espaçamentos — calibrado para a tela mais alta
(13 opções) caber num laptop de 1366×768.

Duas exceções: o `<details>` "Por que o IMC importa", que rola dentro do
corpo quando aberto (é o usuário que inicia, e é reversível), e o prontuário,
que é um documento e rola normalmente — não usa o grid de `100dvh`.

Atenção ao editar: o corpo é `overflow-y: auto`, então uma tela alta demais
rola **sem nenhum aviso** — não gera erro. Confira as telas novas a 1366×768.

## Condicionais

Em `showIf`: `equals`, `includes`, `includesAny` sobre uma resposta gravada,
ou `when: (getValue) => boolean` para o que não é resposta — como "o IMC já
pode ser calculado".

## Testes

```bash
cd tools
npm install
npm test
```

Executa o `app.js` real dentro do jsdom e percorre o questionário de ponta a
ponta nos dois ramos de sexo biológico. Cobre o que já quebrou antes: o
Continuar travado em passo de campo, o auto-avanço navegando a partir de um
passo já trocado, e a rota de passo condicional invisível caindo na pergunta
1. O `package.json` fica em `tools/` de propósito, para a Vercel não tratar o
projeto como um build.

## Design

Paleta sage da marca, com um tom mais escuro para texto e botões:

| Token | Valor | Uso |
| --- | --- | --- |
| `--sage` | `#8c9c81` | superfícies e detalhes |
| `--sage-deep` | `#5f6b56` | texto e botões — 5.64:1 no branco (AA) |
| `--cream` | `#faf6f1` | fundo da seleção |
| `--ink` | `#16110f` | títulos |

`#8c9c81` com texto branco dá 2.92:1 e não passa AA, por isso não é usado
como fundo de botão.

Tipografia:

- **Ezra** — só em título, no peso **700**. O 800 foi abandonado: somado ao
  tracking apertado, travava a leitura. O tracking também foi afrouxado, de
  -0.035em para -0.018em nos títulos grandes.

  Ficam embutidos apenas os pesos **600** (o “&” do wordmark) e **700**, os
  únicos que algum seletor pede. Cada peso custa cerca de 44 KB em base64,
  então vale conferir se algum ficou órfão depois de mexer em título —
  `grep -c "@font-face" styles.css` deve bater com os pesos em uso.
- **Montserrat** — todo o resto (corpo, opções, campos, botões), via Google
  Fonts com `Arial, Helvetica` no fallback. É a única dependência externa do
  projeto; se o Google Fonts não responder, a página cai em Arial.
- **Mono do sistema** — rótulos curtos, selos e contadores. Não usa arquivo.

Para reintroduzir um peso da Ezra, recupere o `@font-face` do histórico do
git (commit anterior à poda) ou gere do `.otf` original.

O indicador de seleção é o mesmo em todo o questionário — um quadrado de raio
5px, tanto para escolha única quanto para múltipla. O que diferencia é a dica
"Selecione todas que se aplicam", exibida só nos passos de múltipla escolha.

## Rodar localmente

```bash
python tools/dev-server.py
```

Abra `http://localhost:4173/pages/consultorio`. O servidor replica o
`vercel.json`: serve o arquivo se ele existir, senão devolve o `index.html`.

## Deploy

Vercel, ligada ao repositório. Push na `main` publica em produção; push em
outra branch gera um preview.
