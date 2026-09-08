# Consultório — the men's & the ladies

Reconstrução estática do consultório digital. HTML, CSS e JavaScript puro,
sem build: a Ezra vai embutida em base64 no CSS, a Montserrat vem do Google
Fonts e as respostas ficam em `localStorage`.

## Rotas

| Rota | Tela |
| --- | --- |
| `/pages/consultorio` | Seleção de protocolo |
| `/pages/consultorio-inicio` | Como funciona a avaliação |
| `/pages/consultorio-1` … `-42` | Passos do fluxo (o total visível varia com as condicionais) |
| `/pages/consultorio-43` | Conclusão e checkout |

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

Os seis aparecem numa grade de 3 por linha, com cards de mesmo tamanho. Só o
card aberto é um link; `resumo` e `specs` do protocolo são exibidos na tela
seguinte ("como funciona"), não na seleção.

Para abrir um protocolo novo: troque o `status` para `"aberto"` e preencha
`resumo` e `specs`. O fluxo de perguntas hoje é compartilhado — o array
`steps` é o de emagrecimento. Um segundo protocolo aberto precisa do próprio
array de perguntas, selecionado por `protocol.id`.

## Passos do fluxo

O array `steps` mistura perguntas e telas informativas. O `kind` diz qual é
qual:

| `kind` | comportamento |
| --- | --- |
| `single`, `multiple`, `singleWithText` | opções |
| `fields`, `number`, `textarea` | campos |
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

## Cabe na primeira tela

Cada passo cabe sem rolagem: a tela é um grid de `100dvh` com cabeçalho,
corpo e rodapé, e o corpo só rola se o conteúdo realmente estourar. Listas
com mais de 6 opções vão para duas colunas, e abaixo de 720px de altura um
modo compacto reduz alturas e espaçamentos — calibrado para a tela mais alta
(13 opções) caber num laptop de 1366×768.

A única exceção é o `<details>` "Por que o IMC importa", que rola dentro do
corpo quando aberto. É o usuário que inicia, e é reversível.

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

- **Ezra** — só em título. Aplicada em 7 seletores: `.wordmark`, `.ps__title`,
  `.ps__card-name`, `.ci__title`, `.ci__step h3`, `.cq__question` e `.done h1`.
  Ficaram embutidos apenas os pesos 600 e 800, os únicos alcançados por esses
  seletores; os pesos 400 e 700 foram removidos e cortaram 88 KB do CSS.
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
