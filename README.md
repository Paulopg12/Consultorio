# Consultório — the men's & the ladies

Reconstrução estática do consultório digital. HTML, CSS e JavaScript puro,
sem build e sem dependências externas: as fontes Ezra vão embutidas em
base64 no CSS e as respostas ficam em `localStorage`.

## Rotas

| Rota | Tela |
| --- | --- |
| `/pages/consultorio` | Seleção de protocolo |
| `/pages/consultorio-inicio` | Como funciona a avaliação |
| `/pages/consultorio-1` … `-34` | Perguntas (o total varia com as respostas condicionais) |
| `/pages/consultorio-35` | Conclusão e checkout |

Rota desconhecida cai na seleção de protocolo. Deep link direto numa
pergunta funciona: sem protocolo salvo, assume o único que está aberto.

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

## Questionário

Cada pergunta cabe na primeira tela, sem rolagem: a tela é um grid de
`100dvh` com cabeçalho, corpo e rodapé, e o corpo só rola se o conteúdo
realmente estourar. Listas com mais de 6 opções vão para duas colunas, e
abaixo de 720px de altura um modo compacto reduz alturas e espaçamentos.

As perguntas saíram do fluxo `?type=wl` e a lógica condicional está em
`showIf` (`equals`, `includes`, `includesAny`).

O indicador de seleção é o mesmo em todo o questionário — um quadrado de raio
5px, tanto para escolha única quanto para múltipla. O que diferencia é a dica
"Selecione todas que se aplicam", exibida só nos passos de múltipla escolha.

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

Tipografia: Ezra (4 pesos) para títulos e corpo, mono do sistema para
rótulos e dados clínicos.

## Rodar localmente

```bash
python tools/dev-server.py
```

Abra `http://localhost:4173/pages/consultorio`. O servidor replica o
`vercel.json`: serve o arquivo se ele existir, senão devolve o `index.html`.

## Deploy

Vercel, ligada ao repositório. Push na `main` publica em produção; push em
outra branch gera um preview.
