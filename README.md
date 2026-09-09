# Consultório — the men's & the ladies

Reconstrução estática do consultório digital. HTML, CSS e JavaScript puro,
sem build: a Ezra vai embutida em base64 no CSS, a Montserrat vem do Google
Fonts e as respostas ficam em `localStorage`.

O logotipo é o arquivo oficial (`assets/logo-tml.png`, horizontal, recortado
sem margem). A marca nunca é remontada em texto: a Ezra não tem o "&"
desenhado do logo nem o espaçamento do original. O CSS controla só a altura
(`.wordmark`), e a largura acompanha o aspecto de 13,3:1.

## Rotas

| Rota | Tela |
| --- | --- |
| `/pages/consultorio` | Seleção de protocolo |
| `/pages/consultorio-inicio` | Como funciona a avaliação |
| `/pages/consultorio-1` … `-41` | Passos do fluxo (o total visível varia com as condicionais) |
| `/pages/consultorio-42` | Prontuário e checkout |

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

Cada protocolo tem um `subtitulo` — o benefício em uma linha, embaixo do nome
no card ("Perder peso com qualidade", "Ter mais potência"). O título da tela
de seleção é "Qual Tratamento Você Busca?".

Os seis aparecem numa grade de 3 por linha no desktop e 2 em tablet. **No
celular fica um por linha**, e os cinco “em breve” passam a linha horizontal
com o selo à direita: em duas colunas os nomes longos quebravam em três
linhas apertadas, e seis cards em bloco dariam uma página longa demais.

Só o card aberto é um link. As `specs` do protocolo aparecem na tela seguinte
("como funciona"), não na seleção. O `resumo` do emagrecimento descreve o
processo completo, acompanhamento incluído — o texto que havia ali antes,
sobre análogos de GLP-1, é que foi removido a pedido.

A tela "como funciona" lista **cinco** etapas: avaliação, análise médica,
protocolo liberado, acompanhamento com a nutricionista e acompanhamento médico
contínuo. As duas últimas trazem o rótulo de recorrência ("TODA SEMANA",
"DURANTE O TRATAMENTO") no lugar de prazo.

### Como a lista de etapas é desenhada

**Duas colunas, 2 + 2 + 1**, com a quinta etapa atravessando a largura toda
(`grid-column: 1 / -1`) e, só ela, o ícone ao lado do texto em vez de acima.
Em coluna única a seção passava da dobra no desktop e empurrava o botão para
fora da tela.

Cada etapa é um **card** de fundo creme, cantos de 20px, sem borda desenhada —
só um `inset` de 1px a 4,5% de opacidade e uma sombra rasa. Uma versão sem
caixa nenhuma foi testada e não funcionou: em duas colunas, sem moldura, os
textos ficam soltos e a quinta etapa parece órfã.

Três detalhes de acabamento que fazem a diferença entre grade e bagunça:

- **altura igual na linha** (o `stretch` padrão do grid), então os cards
  vizinhos terminam juntos mesmo com textos de tamanhos diferentes;
- **selo no rodapé do card** (`margin-top: auto` no `.ci__when`), alinhado com
  o fim do card ao lado. `p:has(+ .ci__when) { margin-bottom: 16px }` garante a
  folga mínima no card mais alto da linha, onde o `auto` não tem sobra para
  distribuir;
- **número no canto** superior direito, e não em cima do título: identifica a
  etapa sem competir com ela. "ETAPA 01" cinco vezes era mais rótulo do que
  informação.

O ícone vive num quadrado arredondado de 46px em branco sobre o creme do card
(o círculo com borda de 1px lia como marcador de lista). Como a coluna estreita
cobra do título, os dois últimos encurtaram ("Acompanhamento com a
nutricionista", "Acompanhamento médico contínuo") — a recorrência já está no
selo — e o `h3` ganhou `text-wrap: balance`.

No **celular** é um card por linha, todos com o ícone ao lado do texto:
empilhado, o tile em cima de cada card dava cinco blocos altos demais.

A entrada é por **scroll**, não por carga: `revelarNoScroll()` usa
IntersectionObserver para revelar cada etapa quando ela aparece, porque no
celular as duas últimas nascem fora da tela e a cascata do CSS já teria
acabado. Três cuidados que valem a leitura:

- a classe que esconde (`ci--espera`) só é aplicada **depois** de o
  observador existir. Navegador sem IntersectionObserver não esconde nada e
  cai na cascata do CSS;
- um `setTimeout` de 1,6s revela o que sobrou. Tela sem conteúdo é muito pior
  que tela sem animação, e isso já aconteceu: com `rootMargin` em
  porcentagem o aviso do observador não chegou ao botão e ele ficou invisível;
- o CTA ficou **fora** do observador de propósito, pelo mesmo motivo.

O easing é `cubic-bezier(0.16, 1, 0.3, 1)` em 760ms, com 90ms de atraso entre
os itens — desaceleração longa, sem overshoot.

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
| `photos` | envio de arquivo; o Continuar exige todo slot sem `opcional` |
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
- **`eyebrow`** substitui o contador no cabeçalho. Sem ele, a tela não mostra
  rótulo nenhum — nem o separador, que ficaria solto ao lado do nome do
  protocolo. É o caso de `info_depoimento`.
- **Nunca use `auto`** numa tela informativa: não há opção para clicar.

As telas informativas são **só texto**. Uma tentativa com ilustração de banco
de imagens foi revertida — a faixa de foto competia com o título e empurrava
o texto para baixo, sem acrescentar informação. Está no histórico do git
(commit `fb84fcd`) se alguém quiser retomar com material próprio.

### Etapas, contador e barra de progresso

O questionário é dividido em **etapas nomeadas** (array `ETAPAS`): cada uma
termina no passo `ate`, e a barra ganha um segmento por etapa, com peso
proporcional ao número de passos dela. Trinta e tantas perguntas atrás de uma
barra única pareciam não andar; em segmentos dá para ver o que já ficou para
trás. O cabeçalho diz "Etapa 3/7" e o nome da etapa — no celular só o número,
que o nome não cabe.

As etapas são medidas sobre o **fluxo visível**: passo condicional que não
apareceu não conta como progresso, e etapa que ficou sem nenhum passo sai da
barra. `ate` apontando para um field inexistente derruba um `console.error` na
carga, como o field duplicado.

O **contador** continua contando apenas perguntas, e desaparece nas telas
informativas, dando lugar ao `eyebrow`.

### Peso, meta e altura

`peso_atual` vem **sozinho e antes** da meta de perda: as faixas em quilos da
`meta_perda` são calculadas sobre ele. `medidas` ficou com `peso_meta` e
`altura`, em duas colunas.

As chaves gravadas seguem sendo `peso_atual`, `peso_meta` e `altura` — o
cálculo de IMC e o prontuário dependem delas, e o `localStorage` é indexado
por chave, então quem respondeu antes da mudança não perde nada.

O `fieldLayout` aceita `grid: 3` além de `grid: true` (duas colunas).

O passo `medidas` traz um `aviso`: a altura vai em centímetros e sem
pontuação. Qualquer passo pode ter `aviso` — ele aparece abaixo dos campos,
com o ícone de alerta e peso de nota, não de erro.

### Opções com faixa em quilos

`options` aceita array de strings **ou função**, e cada opção pode ser
`{ value, detail }`. O `value` é o que fica gravado; o `detail` é a linha de
apoio. É assim que "Menos de 5% do peso corporal" ganha "até 5 kg" embaixo
sem que trocar o peso depois desmarque a resposta já gravada.

### Caixa de texto numa pergunta de opção (`fields`)

`fields` com `revealValues` funciona em `singleWithText`, `single` e
`multiple` — o markup sai do mesmo `camposNinho()`. É assim que a alergia
"Outra" (múltipla escolha) abre a descrição.

### Perguntas encadeadas na mesma tela (`subgrupos`)

Um passo `singleWithText` pode trazer `subgrupos`: perguntas de opção que
aparecem **na mesma tela**, reveladas pela resposta principal
(`reveal: { values: [...] }`) ou por outro subgrupo (`reveal: { from: "chave" }`).
`multiple: true` deixa marcar mais de uma. A ordem do array é a ordem da
cascata, e subgrupo que se esconde **limpa a própria resposta** — senão
"Emagreceu?" continuaria de pé depois de voltar para "Nunca usei".

Dois casos hoje:

- `semaglutida_tirzepatida` — "Sim" abre "Qual deles?", e a escolha abre
  "Emagreceu?".
- `colateral` (era a pergunta de alergia) — "Teve algum efeito colateral?"
  com "Sim" abrindo a lista de exemplos, e a lista abrindo a caixa de texto.
  O campo de texto usa `revealFrom` + `revealValues: ["*"]`: revelado por
  qualquer seleção do subgrupo, não pela resposta principal.

### Anexo pendurado numa pergunta (`slots`)

`tem_exame` é uma pergunta de opção com `slots`: o "Sim" abre a área de envio
do exame na própria tela, e por isso o passo **não** tem `auto`. O slot aceita
PDF além de JPG e PNG (`tipos`), e sem `silhueta` o card mostra o ícone de
arquivo. Reusa a máquina das fotos do corpo — IndexedDB para o arquivo,
metadados no `localStorage`.

Some daqui o texto de apoio que dizia "se o IMC ficar abaixo de 25, a
indicação tende a priorizar alternativa oral" — ele contradizia a bula dos
GLP-1 (≥30, ou ≥27 com comorbidade), e a divergência estava a duas telas de
distância da régua de IMC.

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

## Contraindicação encerra o questionário

Três telas `kind: "block"` — terminais, sem Continuar, só com Voltar — param o
fluxo quando a resposta é uma **contraindicação absoluta da bula** dos
análogos de GLP-1. Seguir pedindo peso, hábito e foto de quem não pode receber
prescrição seria coletar dado que ninguém vai usar.

As condições ficam em `BLOQUEIOS`, e cada tela é um passo logo **depois** da
pergunta que a dispara:

| Tela | Dispara quando | Fica depois de |
| --- | --- | --- |
| `bloqueio_gravidez` | gravidez ou amamentação = Sim | `grávida_amamentando` |
| `bloqueio_tireoide` | CMT ou MEN 2 no próprio histórico | `condicoes_restritivas` |
| `bloqueio_familiar` | CMT ou MEN 2 em familiar de primeiro grau | `historico_familiar` |
| `bloqueio_alergia` | alergia à semaglutida **e** à tirzepatida | `alergia` |

O corte é **só o da bula**, de propósito. Pancreatite, doença renal ou
hepática, diabetes tipo 1, câncer ativo, transtorno alimentar, vômito induzido
e cirurgia bariátrica continuam no fluxo: são caso de avaliação médica, não de
corte automático.

A pergunta de alergia é **por ativo** (`kind: "multiple"`: Semaglutida,
Tirzepatida, "Outra alergia", "Não tenho alergia"), e não um "Sim" solto como
era antes. Um "Sim" genérico não serve para bloquear — alergia a dipirona
encerraria o questionário de graça — e também não serve para liberar, porque
alergia ao ativo do protocolo é contraindicação direta.

Os dois ativos ficam **separados de propósito**: um substitui o outro na
prescrição, então alergia a só um deles não encerra nada — o médico indica o
que sobrou. É o que o `todas: true` do `BLOQUEIOS.alergia` diz: a tela
terminal exige as **duas** marcadas. "Outra alergia" revela uma caixa de
descrição (`alergia_outra`) e segue o fluxo.

O prontuário também fica fechado enquanto o bloqueio vale — `bloqueioAtivo()`
é consultado no roteador, então link direto para a rota final volta para a
tela terminal em vez de contornar o encerramento.

A tela não oferece link nenhum: não existe canal de contato no código. Quando
existir um (WhatsApp do time, por exemplo), o lugar dele é o
`bloqueioMarkup()`.

## Nenhuma pergunta repetida

O questionário tinha **duas perguntas com o título idêntico** ("Você já foi
diagnosticado com alguma das condições abaixo?") e a mesma condição pedida em
listas diferentes — diabetes tipo 2 em duas, fígado em três, pressão alta em
duas. Quem responde jura que já respondeu aquilo, e com razão.

As quatro perguntas de condições viraram três, cada uma com um recorte e sem
nenhuma opção em comum:

| Passo | Recorte | Itens |
| --- | --- | --- |
| `condicoes_restritivas` | histórico que muda ou impede a indicação (renal, hepática, pancreatite, CMT, MEN 2, câncer em tratamento, diabetes 1 e 2, doença inflamatória intestinal, bariátrica) | 11 |
| `condicoes_medicas` | o que interessa pela interação (tireoide, hormonal, coração, estômago, convulsões, glaucoma, fibrose cística) | 8 |
| `condicoes_atuais` | comorbidades que costumam melhorar com a perda de peso | 10 |

Ficaram **duas perguntas a menos** no fluxo: `diagnosticos_metabolicos` foi
absorvida pela primeira (e as duas condicionais de diabetes passaram a olhar
`condicoes_restritivas`), e `medicamento_suplemento_30d` foi absorvida por
`toma_medicamento`, que agora pergunta "medicamento **ou suplemento**
regularmente" com "os últimos 30 dias" no texto de apoio. "Transtorno
alimentar" saiu da lista de condições porque já tem pergunta própria.

**Não são repetição, e ficam como estão**: CMT/MEN 2 e pancreatite aparecem em
`condicoes_restritivas` e em `historico_familiar` porque a bula pede o
histórico próprio **e** o do familiar de primeiro grau; `medicamentos_diabetes`
repete o assunto de `toma_medicamento` mas só aparece para quem marcou
diabetes, e pergunta especificamente por insulina.

O teste `1h` do `test-fluxo.mjs` guarda isso: falha se duas perguntas voltarem
a ter o mesmo título, se a mesma opção aparecer em duas listas, ou se alguma
lista passar de 11 itens — acima disso a tela rola no celular.

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

**As duas fotos são obrigatórias**: o Continuar só destrava com as duas
anexadas, e falta de foto vira pendência no prontuário. Quem controla isso é
`anexosCompletos()`, sobre os slots do passo: slot com `opcional: true` (o
exame) não trava nada, os das fotos travam.

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

O depoimento é **recortado por sexo** (`DEPOIMENTOS`, com `feminino` e
`masculino`). Cada entrada tem `pronto`: enquanto o material de um sexo não
chega, a tela sai do fluxo em vez de mostrar a pessoa do outro. Hoje só o
feminino está pronto — o masculino espera fotos e fala de um paciente homem
(salve as duas fotos em `/assets`, preencha os campos e troque `pronto` para
`true`). O título da tela vem do próprio depoimento.

O passo `info_depoimento` traz um depoimento com antes e depois, montado a
partir da constante `DEPOIMENTO` no `app.js`: fotos em
`assets/depoimento-antes.jpg` e `assets/depoimento-depois.jpg`, três
parágrafos de fala, crédito à autora e uma ressalva de que o resultado é
individual.

Ele fica **logo depois da devolutiva de IMC**: a pessoa acabou de ver o
próprio número, e é quando o relato de quem passou pelo mesmo pesa mais.

Layout em **coluna única** — fotos em cima ocupando a largura toda, fala
embaixo — igual no desktop e no celular.

A fala é uma **versão encurtada** do depoimento: duas frases, palavras dela,
sem reescrita. Saíram os exemplos do meio (o primeiro quilo, o primeiro treino)
e a frase final, que virou o título da tela. O texto completo está no commit
`c9e15fc`.

As fotos estão em **4:5 integral**, a proporção em que foram tiradas: a pessoa
aparece inteira, sem recorte.

> **É a única tela do questionário que rola — e de propósito.** Foto completa
> em 4:5, largura cheia e altura de uma tela só são incompatíveis: duas fotos
> de 336 px dariam 420 px apenas de imagem, e com cabeçalho, rodapé e a fala o
> total vai a 774 px contra 620 disponíveis num laptop. Não caberia nem com
> texto mínimo.
>
> A rolagem aqui custa pouco: não há opção de resposta que possa ficar
> escondida, e o rodapé faz parte do grid de `100dvh`, então o **Continuar
> permanece visível** durante a rolagem. Cabe inteira em telas de 1080 px.
>
> Para voltar a caber num laptop seria preciso ceder uma das três coisas:
> recortar a foto, estreitar as fotos (cerca de 440 px no total) ou cortar mais
> a fala.

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

Quem marca pancreatite, doença hepática, transtorno alimentar ou bariátrica
hoje segue o questionário sem receber nenhum aviso. A resposta continua
registrada e vai para o médico — muda a comunicação com o paciente, não o dado
clínico.

CMT e MEN 2 são a exceção desde a criação das telas de bloqueio: essas duas
não seguem mais o fluxo, encerram. Ver "Contraindicação encerra o
questionário".

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

Três exceções: o `<details>` "Por que o IMC importa", que rola dentro do
corpo quando aberto (é o usuário que inicia, e é reversível); o prontuário,
que é um documento e rola normalmente — não usa o grid de `100dvh`; e a tela
de depoimento, pelo motivo explicado na seção dela.

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
