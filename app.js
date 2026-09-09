const STORAGE_KEY = "tl-consulta-emagrecimento";
const PROTOCOL_KEY = "tl-consulta-protocolo";
const CHECKOUT_URL = "/cart/45368212062242:1?checkout";

/* ------------------------------------------------------------------
   Protocolos do consultório.

   Para abrir um protocolo novo: troque "status" para "aberto" e
   preencha "resumo" e "specs". Enquanto o status for "breve", o
   protocolo aparece na fila de espera e não é clicável.

   O fluxo de perguntas hoje é compartilhado (o array `steps` abaixo,
   de emagrecimento). Ao abrir um segundo protocolo, dê a ele o
   próprio array de perguntas e selecione por `protocol.id`.
   ------------------------------------------------------------------ */
const protocols = [
  {
    id: "emagrecimento",
    nome: "Emagrecimento",
    subtitulo: "Perder peso com qualidade",
    resumo:
      "Avaliação médica online, protocolo liberado para receber em casa e acompanhamento semanal com a nutricionista do time até você chegar na sua meta.",
    status: "aberto",
    specs: [
      ["Atua em", "Apetite, saciedade e esvaziamento gástrico"],
      ["Via", "Oral ou injetável"],
      ["Prescrição", "Sujeita à avaliação médica"],
    ],
  },
  { id: "cabelo", nome: "Cabelo", subtitulo: "Rejuvenescer com os cabelos", status: "breve" },
  { id: "forca", nome: "Força", subtitulo: "Obter mais força", status: "breve" },
  { id: "sono", nome: "Sono", subtitulo: "Dormir melhor", status: "breve" },
  { id: "ejaculacao-precoce", nome: "Ejaculação precoce", subtitulo: "Demorar mais na cama", status: "breve" },
  { id: "disfuncao-eretil", nome: "Disfunção erétil", subtitulo: "Ter mais potência", status: "breve" },
];

const steps = [
  {
    field: "identificacao",
    label: "Identificação",
    kind: "fields",
    title: "Identificação",
    help: "Preencha seus dados para iniciar a avaliação médica.",
    fields: [
      { key: "nome", label: "Nome", type: "text", placeholder: "Nome completo", required: true },
      { key: "telefone", label: "Telefone", type: "tel", placeholder: "(11) 91234-5678", required: true, format: "phone" },
    ],
  },
  {
    field: "sexo_biologico",
    label: "Sexo biológico",
    kind: "single",
    title: "Qual seu sexo?",
    help: "Perguntamos para adaptar as questões de segurança. Isso não define a sua identidade de gênero.",
    options: ["Feminino", "Masculino"],
    auto: true,
    /* Basta adicionar `why` em qualquer passo para ele ganhar o botão e o
       pop-up de explicação. */
    why: {
      titulo: "Por que perguntamos?",
      body: [
        "O sexo atribuído ao nascer muda a avaliação clínica: parte das contraindicações e das doses depende dele, e algumas perguntas de segurança só se aplicam a parte das pessoas — gravidez e amamentação, por exemplo.",
        "Algumas condições podem tornar o tratamento online inadequado. Todas as suas respostas são revisadas por um médico antes de qualquer prescrição.",
      ],
      nota: "Suas respostas não são usadas para publicidade.",
    },
  },
  {
    field: "grávida_amamentando",
    label: "Gravidez ou amamentação",
    kind: "single",
    title: "Você está grávida ou amamentando?",
    help: "Os tratamentos propostos não são indicados para gestantes ou lactantes sem orientação da obstetra.",
    options: ["Não! Não amamento.", "Sim"],
    showIf: { field: "sexo_biologico", equals: "Feminino" },
    auto: true,
  },
  {
    field: "nascimento",
    label: "Nascimento",
    kind: "fields",
    title: "Qual sua idade?",
    help: "Preencha a sua data de nascimento.",
    fields: [{ key: "nascimento", label: "Data de nascimento", type: "date", required: true }],
  },
  {
    field: "peso_atual",
    label: "Peso atual",
    kind: "fields",
    title: "Qual o seu peso atual?",
    help: "É a base do cálculo do IMC e das faixas da sua meta.",
    fields: [{ key: "peso_atual", label: "Peso atual", type: "number", placeholder: "0", suffix: "kg", required: true }],
  },
  {
    field: "bloqueio_gravidez",
    kind: "block",
    label: "Avaliação encerrada",
    eyebrow: "Avaliação encerrada",
    title: "Não podemos seguir com este tratamento agora.",
    render: () => bloqueioMarkup(BLOQUEIOS.gravidez.motivo),
    showIf: { when: () => bloqueado("gravidez") },
  },
  {
    field: "meta_perda",
    label: "Meta de perda de peso",
    kind: "single",
    title: "Qual a sua meta de perda de peso?",
    help: "Os quilos de cada faixa saem do peso que você acabou de informar.",
    /* Faixa em quilos calculada sobre o peso atual: "5% do peso corporal" não
       diz nada, "até 4 kg" diz. O `value` continua sendo o texto da faixa —
       mudar o peso depois não desmarca a resposta já gravada. */
    options: () => {
      const peso = toNumber(getValue("peso_atual"));
      const kg = (fracao) => `${Math.round(peso * fracao)} kg`;
      return [
        { value: "Menos de 5% do peso corporal", detail: peso ? `até ${kg(0.05)}` : "" },
        { value: "Entre 6%-15% do peso corporal", detail: peso ? `de ${kg(0.06)} a ${kg(0.15)}` : "" },
        { value: "Acima de 16% do peso corporal", detail: peso ? `${kg(0.16)} ou mais` : "" },
      ];
    },
    auto: true,
  },
  {
    field: "medidas",
    label: "Medidas",
    kind: "fields",
    title: "Sua meta e sua altura.",
    help: "A meta é o peso que você quer alcançar — não precisa ser exata.",
    aviso: "A altura vai em centímetros e sem pontuação: 175, e não 1,75.",
    fields: [
      { key: "peso_meta", label: "Meta de peso", type: "number", placeholder: "0", suffix: "kg", required: true },
      { key: "altura", label: "Altura", type: "number", placeholder: "175", suffix: "cm", required: true },
    ],
  },
  {
    field: "insight_imc",
    kind: "info",
    label: "Seus números",
    eyebrow: "Seus números",
    title: "O que os seus números dizem até aqui.",
    render: () => renderImc(),
    /* Só aparece se peso e altura já foram respondidos. */
    showIf: { when: () => computeImc() !== null },
  },
  {
    field: "info_depoimento",
    kind: "info",
    label: "Depoimento",
    /* Logo depois da devolutiva de IMC: a pessoa acabou de ver o próprio
       número, e é quando o relato de quem passou pelo mesmo pesa mais. */
    title: () => depoimentoDoSexo().titulo,
    render: () => depoimento(depoimentoDoSexo()),
    /* Sem material da pessoa do mesmo sexo, a tela sai do fluxo. */
    showIf: { when: () => depoimentoDoSexo().pronto },
  },
  {
    field: "gordura_acumulada",
    label: "Gordura acumulada",
    kind: "single",
    title: "Qual parte do corpo você nota que tem mais gordura acumulada?",
    options: ["Na barriga", "Quadris e coxas", "Corpo todo"],
    auto: true,
  },
  {
    field: "email",
    label: "E-mail",
    kind: "fields",
    title: "Qual o seu e-mail?",
    help: "É por onde chega a indicação do médico e o seu acompanhamento.",
    fields: [{ key: "email", label: "E-mail", type: "email", placeholder: "você@email.com", required: true }],
  },
  {
    field: "horas_sono",
    label: "Sono",
    kind: "single",
    title: "Você dorme por quantas horas diariamente?",
    options: ["Mais de 9h por dia", "Entre 7h-9h por dia", "Menos de 7h por dia"],
    auto: true,
  },
  {
    field: "frequencia_treino",
    label: "Treino",
    kind: "single",
    title: "Qual a sua frequência de treino/exercícios?",
    options: ["Me exercito todos os dias", "Me exercito entre 3-6 vezes na semana", "Me exercito entre 1 a 2 vezes na semana", "Não me exercito"],
    auto: true,
  },
  {
    field: "vontade_incontrolável",
    label: "Vontade de comer",
    kind: "single",
    title: "Você tem vontade de comer de forma quase incontrolável fora das refeições tradicionais?",
    options: ["Sim", "Não"],
    auto: true,
  },
  {
    field: "vômito_induzido",
    label: "Vomito induzido",
    kind: "single",
    title: "Você já se arrependeu de uma refeição mais farta e, por isso, recorreu ao vômito induzido ou pensou nisso?",
    options: ["Sim", "Não"],
    auto: true,
  },
  {
    field: "condicoes_restritivas",
    label: "Condicoes restritivas",
    kind: "multiple",
    title: "Você já foi diagnosticado com alguma destas condições?",
    help: "São as que mudam a indicação do tratamento ou impedem a prescrição.",
    options: [
      "Insuficiência renal moderada ou grave",
      "Doença hepática (fígado)",
      "Pancreatite aguda ou crônica",
      "Câncer de tireoide (CMT ou carcinoma medular da tireoide)",
      "Síndrome de neoplasia endócrina múltipla tipo 2 (MEN 2)",
      "Câncer em tratamento atualmente",
      "Diabetes tipo 1",
      "Diabetes tipo 2",
      "Doença inflamatória intestinal",
      "Cirurgia bariátrica",
      "Nenhuma das anteriores",
    ],
    exclusive: "Nenhuma das anteriores",
  },
  {
    field: "bloqueio_tireoide",
    kind: "block",
    label: "Avaliação encerrada",
    eyebrow: "Avaliação encerrada",
    title: "Este tratamento não é indicado para você.",
    render: () => bloqueioMarkup(BLOQUEIOS.tireoide.motivo),
    showIf: { when: () => bloqueado("tireoide") },
  },
  {
    field: "visao_diabetes",
    label: "Visão devido a diabetes",
    kind: "singleWithText",
    title: "Você tem algum problema de visão devido a diabetes?",
    options: ["Não", "Sim"],
    fields: [
      {
        key: "visao_diabetes_descricao",
        label: "Descreva detalhadamente o problema e o tratamento correspondente",
        type: "textarea",
        placeholder: "Descreva aqui",
        revealValues: ["Sim"],
      },
    ],
    showIf: { field: "condicoes_restritivas", includesAny: ["Diabetes tipo 1", "Diabetes tipo 2"] },
  },
  {
    field: "medicamentos_diabetes",
    label: "Medicamentos para diabetes",
    kind: "singleWithText",
    title: "Você utiliza insulina ou outro remédio para diabetes?",
    options: ["Sim", "Não"],
    fields: [
      {
        key: "medicamentos_diabetes_quais",
        label: "Quais medicamentos?",
        type: "textarea",
        placeholder: "Nome, dose e frequência de cada um (insulina, metformina, e o que mais estiver em uso).",
        revealValues: ["Sim"],
      },
    ],
    showIf: { field: "condicoes_restritivas", includesAny: ["Diabetes tipo 1", "Diabetes tipo 2"] },
  },
  {
    field: "historico_familiar",
    label: "Histórico familiar",
    kind: "multiple",
    title: "Algum familiar de primeiro grau já foi diagnosticado com:",
    options: ["Carcinoma medular da tireoide (CMT)", "Síndrome MEN 2", "Pancreatite", "Nenhuma das anteriores"],
    exclusive: "Nenhuma das anteriores",
  },
  {
    field: "bloqueio_familiar",
    kind: "block",
    label: "Avaliação encerrada",
    eyebrow: "Avaliação encerrada",
    title: "Este tratamento não é indicado para você.",
    render: () => bloqueioMarkup(BLOQUEIOS.familiar.motivo),
    showIf: { when: () => bloqueado("familiar") },
  },
  {
    field: "toma_medicamento",
    label: "Uso de medicamentos",
    kind: "singleWithText",
    title: "Você toma algum medicamento ou suplemento regularmente?",
    help: "Vale o que você usou nos últimos 30 dias, receitado ou não.",
    options: ["Sim", "Não"],
    fields: [
      {
        key: "medicamentos_descricao",
        label: "Quais medicamentos ou suplementos?",
        type: "textarea",
        placeholder: "Descreva todos, incluindo nome, dosagem e frequência.",
        revealValues: ["Sim"],
      },
    ],
  },
  {
    field: "tempo_tentando",
    label: "Tempo tentando emagrecer",
    kind: "single",
    title: "Há quanto tempo você está tentando emagrecer?",
    options: ["Menos de 1 mês", "1 a 3 meses", "3 a 6 meses", "6 a 12 meses", "Mais de 1 ano"],
    auto: true,
  },
  {
    field: "tentativas",
    label: "Tentativas anteriores",
    kind: "multiple",
    title: "O que você já tentou ao emagrecer?",
    options: [
      "Suplementos",
      "Dieta",
      "Contagem de calorias",
      "Shakes",
      "Acompanhamento com nutricionista",
      "Acompanhamento com nutrólogo/endocrinologista",
      "Nenhuma das anteriores",
    ],
    exclusive: "Nenhuma das anteriores",
  },
  {
    field: "come_estressado",
    label: "Alimentação emocional",
    kind: "single",
    title: "Você costuma comer alguma coisa quando sente-se estressado ou sobrecarregado?",
    options: ["Sim", "Não"],
    auto: true,
  },
  {
    field: "alcool",
    label: "Álcool",
    kind: "single",
    title: "Qual a frequência que você consome 3 ou mais doses de bebidas alcoólicas em um único dia?",
    options: ["Muito raramente", "Frequentemente", "Nunca"],
    auto: true,
  },
  {
    field: "transtorno_alimentar",
    label: "Transtorno alimentar",
    kind: "singleWithText",
    title: "Você possui algum transtorno alimentar diagnosticado por um médico?",
    options: ["Não", "Sim"],
    fields: [{ key: "transtorno_alimentar_qual", label: "Se sim, qual?", type: "textarea", placeholder: "Se sim, qual?", revealValues: ["Sim"] }],
  },
  {
    field: "saude_mental",
    label: "Saude mental",
    kind: "singleWithText",
    title: "Você possui alguma condição relacionada a sua saúde mental diagnosticada por um médico?",
    options: ["Não", "Sim"],
    fields: [{ key: "saude_mental_qual", label: "Se sim, qual?", type: "textarea", placeholder: "Se sim, qual?", revealValues: ["Sim"] }],
  },
  {
    field: "condicoes_medicas",
    label: "Condicoes medicas",
    kind: "multiple",
    title: "E alguma destas?",
    help: "Interessam pela interação com o tratamento, mesmo quando estão controladas.",
    options: [
      "Hipotireoidismo ou hipertireoidismo",
      "Outra doença hormonal",
      "Hipertensão ou outra doença do coração",
      "Refluxo, gastrite ou outra doença do estômago",
      "Histórico de convulsões",
      "Glaucoma",
      "Fibrose cística",
      "Nenhuma das anteriores",
    ],
    exclusive: "Nenhuma das anteriores",
  },
  {
    field: "condicoes_atuais",
    label: "Condicoes atuais",
    kind: "multiple",
    title: "Alguma destas te acompanha hoje?",
    help: "Muitas melhoram junto com a perda de peso, e o médico acompanha isso.",
    options: [
      "Depressão",
      "Colesterol/triglicerídeos altos ou gordura no fígado",
      "Inchaço crônico nas pernas ou linfedema",
      "Dores nas costas ou osteoartrite",
      "Apneia do sono",
      "Disfunção erétil",
      "Asma",
      "Infecções fúngicas na pele (micose)",
      "SOP (síndrome do ovário policístico)",
      "Nenhuma das anteriores",
    ],
    exclusive: "Nenhuma das anteriores",
  },
  {
    field: "semaglutida_tirzepatida",
    label: "Uso anterior",
    kind: "singleWithText",
    title: "Você já utilizou Semaglutida ou Tirzepatida?",
    options: ["Nunca usei", "Sim"],
    /* Cascata na mesma tela: o "Sim" abre qual dos dois, e a escolha abre o
       "Emagreceu?". A ordem do array é a ordem da cascata. */
    subgrupos: [
      {
        key: "semaglutida_tirzepatida_qual",
        label: "Qual deles?",
        options: ["Semaglutida", "Tirzepatida"],
        reveal: { values: ["Sim"] },
      },
      {
        key: "semaglutida_tirzepatida_emagreceu",
        label: "Emagreceu?",
        options: ["Sim", "Não"],
        reveal: { from: "semaglutida_tirzepatida_qual", values: ["Semaglutida", "Tirzepatida"] },
      },
    ],
    fields: [
      {
        key: "semaglutida_tirzepatida_relato",
        label: "Como foi o tratamento?",
        type: "textarea",
        placeholder: "Se sim, nos conte como foi (teve alguma reação adversa)",
        revealValues: ["Sim"],
      },
    ],
  },
  {
    field: "preferência_tratamento",
    label: "Preferência de tratamento",
    kind: "single",
    title: "Você tem alguma preferência pelo tipo de tratamento?",
    options: [
      "Prefiro Tirzepatida (Mounjaro) como tratamento",
      "Prefiro Semaglutida (Ozempic) como tratamento",
      "Estou aberto a qualquer opção, escolhendo o que for mais adequado para mim",
    ],
    auto: true,
  },
  {
    field: "alergia",
    label: "Alergia",
    kind: "multiple",
    title: "Você tem alergia a algum destes medicamentos?",
    help: "Marque todas que se aplicam. Se você é alérgico a um dos dois, o médico indica o outro no lugar.",
    /* Por ativo, e nao um "Sim" solto: alergia a dipirona nao pode encerrar o
       questionario, e alergia ao ativo do protocolo nao pode passar em
       branco. Semaglutida e tirzepatida ficam separadas porque uma substitui
       a outra na prescricao. */
    options: ["Semaglutida", "Tirzepatida", "Outra alergia (medicamento ou alimento)", "Não tenho alergia"],
    exclusive: "Não tenho alergia",
    fields: [
      {
        key: "alergia_outra",
        label: "Qual alergia?",
        type: "textarea",
        placeholder: "Qual medicamento ou alimento, e o que acontece",
        revealValues: ["Outra alergia (medicamento ou alimento)"],
      },
    ],
  },
  {
    field: "bloqueio_alergia",
    kind: "block",
    label: "Avaliação encerrada",
    eyebrow: "Avaliação encerrada",
    title: "Este tratamento não é indicado para você.",
    render: () => bloqueioMarkup(BLOQUEIOS.alergia.motivo),
    showIf: { when: () => bloqueado("alergia") },
  },
  {
    field: "colateral",
    label: "Efeitos colaterais",
    kind: "singleWithText",
    title: "Teve algum efeito colateral?",
    help: "Se você já usou algum tratamento para emagrecer, conte como o seu corpo reagiu.",
    options: ["Sim", "Não"],
    subgrupos: [
      {
        key: "colateral_quais",
        label: "Quais?",
        multiple: true,
        options: [
          "Náusea",
          "Vómito",
          "Diarreia",
          "Constipação",
          "Azia ou refluxo",
          "Dor de cabeça",
          "Cansaço",
          "Outro",
        ],
        reveal: { values: ["Sim"] },
      },
    ],
    fields: [
      {
        key: "colateral_relato",
        label: "Conte como foi",
        type: "textarea",
        placeholder: "O que você sentiu, quanto tempo durou e o que fez para melhorar.",
        /* Revelado pela escolha do subgrupo, nao pela resposta principal:
           "*" e qualquer selecao. */
        revealFrom: "colateral_quais",
        revealValues: ["*"],
      },
    ],
  },
  {
    field: "dosagem_baixa",
    label: "Dosagem inicial",
    kind: "single",
    title: "Você gostaria de começar com uma dosagem mais baixa para evitar possíveis efeitos colaterais e entender como seu corpo vai reagir?",
    options: ["Sim", "Não"],
    auto: true,
  },
  {
    field: "informacoes_medico",
    label: "Informacoes adicionais",
    kind: "singleWithText",
    title: "Há alguma outra informação sobre sua saúde que você queira compartilhar com seu médico?",
    options: ["Sim", "Não"],
    fields: [
      {
        key: "informacoes_medico_relato",
        label: "O que o médico precisa saber?",
        type: "textarea",
        placeholder: "Digite aqui outras informações relevantes",
        revealValues: ["Sim"],
      },
    ],
  },
  {
    field: "tem_exame",
    label: "Exames",
    kind: "single",
    title: "Você já tem algum exame?",
    options: ["Sim", "Não"],
    /* Sem `auto`: o "Sim" abre a área de envio na mesma tela, e avançar
       sozinho tiraria a pessoa de cima dela. */
    slotsReveal: ["Sim"],
    slotsHint: "JPG, PNG ou PDF · até 5 MB",
    slots: [
      /* `opcional`: quem respondeu "Sim" pode nao ter o arquivo na mao agora,
         e isso nao pode travar o Continuar nem virar pendencia no prontuario. */
      { key: "exame_arquivo", label: "Exame", opcional: true, tipos: ["image/jpeg", "image/png", "application/pdf"] },
    ],
  },
  {
    field: "fotos_corpo",
    kind: "photos",
    label: "Fotos do corpo",
    title: "Envie duas fotos do seu corpo.",
    help: "As duas são obrigatórias: é com elas que o médico avalia composição corporal e compara a sua evolução durante o tratamento. Use roupa leve, boa luz e o corpo inteiro no quadro.",
  },
  {
    field: "cpf",
    label: "CPF",
    kind: "fields",
    title: "Qual o seu CPF?",
    help: "O CPF é obrigatório na prescrição: sem ele o médico não consegue emitir a receita no seu nome.",
    fields: [{ key: "cpf", label: "CPF", type: "text", placeholder: "000.000.000-00", required: true, format: "cpf" }],
  },
];

const SELECT_PATH = "/pages/consultorio";
const INTRO_PATH = "/pages/consultorio-inicio";

steps.forEach((step, index) => {
  step.path = `/pages/consultorio-${index + 1}`;
});

/* field duplicado quebra o goNext em loop: o findIndex casa com o passo
   errado e a navegação nunca sai do lugar. Falha alto, na carga. */
const seenFields = new Set();
steps.forEach((step) => {
  if (seenFields.has(step.field)) console.error("field duplicado em steps:", step.field);
  seenFields.add(step.field);
});

/* --------------------------- bloqueios --------------------------- */

/* Contraindicações absolutas dos análogos de GLP-1, direto da bula: com
   qualquer uma delas não existe prescrição possível, então o questionário
   para na hora em vez de seguir pedindo peso, hábito e foto que ninguém vai
   usar. A tela é `kind: "block"`: terminal, sem Continuar, com Voltar para
   quem errou o clique.

   Aqui entram só as contraindicações da bula. Pancreatite, doença
   renal/hepática, diabetes tipo 1, câncer ativo e transtorno alimentar
   seguem no fluxo de propósito — são caso de avaliação médica, não de
   corte automático. */
const BLOQUEIOS = {
  gravidez: {
    field: "grávida_amamentando",
    valores: ["Sim"],
    motivo: "Gravidez ou amamentação",
  },
  tireoide: {
    field: "condicoes_restritivas",
    valores: [
      "Câncer de tireoide (CMT ou carcinoma medular da tireoide)",
      "Síndrome de neoplasia endócrina múltipla tipo 2 (MEN 2)",
    ],
    motivo: "Carcinoma medular da tireoide ou MEN 2 no seu histórico",
  },
  familiar: {
    field: "historico_familiar",
    valores: ["Carcinoma medular da tireoide (CMT)", "Síndrome MEN 2"],
    motivo: "Carcinoma medular da tireoide ou MEN 2 em familiar de primeiro grau",
  },
  /* `todas`: aqui as duas alergias precisam estar marcadas. Alergia a um dos
     ativos não encerra nada — o médico indica o outro no lugar. Só quando
     ambos estão fora é que não resta o que prescrever. */
  alergia: {
    field: "alergia",
    valores: ["Semaglutida", "Tirzepatida"],
    todas: true,
    motivo: "Alergia à semaglutida e à tirzepatida",
  },
};

function bloqueado(nome) {
  const { field, valores, todas } = BLOQUEIOS[nome];
  const resposta = getValue(field);
  const marcadas = Array.isArray(resposta) ? resposta : resposta ? [resposta] : [];
  return todas
    ? valores.every((valor) => marcadas.includes(valor))
    : valores.some((valor) => marcadas.includes(valor));
}

/* Usado também pelo roteador: com bloqueio ativo, o prontuário nao pode ser
   alcancado por link direto. */
function bloqueioAtivo() {
  return steps.find((step) => step.kind === "block" && matchesCondition(step.showIf));
}

/* Mensagem única: o motivo muda, o encaminhamento não. Sem canal de contato
   inventado — quando existir um, entra aqui. */
function bloqueioMarkup(motivo) {
  return `
    <div class="blk">
      <p class="blk__motivo">${icon("alert")}<span>${motivo}</span></p>
      <p class="blk__texto">Os medicamentos deste protocolo — análogos de GLP-1, como a semaglutida e a tirzepatida — são contraindicados nesse caso. Não é questao de dose nem de ajuste: nenhum médico pode prescrever por aqui.</p>
      <p class="blk__texto">O caminho é uma avaliação presencial. Um médico pode investigar o seu caso e indicar alternativas seguras para você.</p>
      <p class="blk__nota">Se marcou por engano, use o Voltar e corrija a resposta. O que você respondeu fica guardado só neste navegador.</p>
    </div>
  `;
}

/* ---------------------------- etapas ---------------------------- */

/* Trinta e tantas perguntas atrás de uma barra única parecem não andar. O
   questionário é dividido em etapas nomeadas: cada uma termina no passo
   `ate` e a barra ganha um segmento por etapa, então dá para ver o que já
   ficou para trás. A ordem aqui é a ordem do array `steps`. */
const ETAPAS = [
  { nome: "Seus dados", ate: "nascimento" },
  { nome: "Peso e meta", ate: "info_depoimento" },
  { nome: "Hábitos", ate: "vómito_induzido" },
  { nome: "Histórico médico", ate: "tentativas" },
  { nome: "Sua saúde", ate: "condicoes_atuais" },
  { nome: "Tratamento", ate: "dosagem_baixa" },
  { nome: "Finalizar", ate: "cpf" },
];

/* `ate` que nao casa com nenhum field deixaria a etapa vazia e sumiria da
   barra sem ninguem notar. Falha alto, na carga, como o field duplicado. */
ETAPAS.forEach((etapa) => {
  if (!steps.some((step) => step.field === etapa.ate)) console.error("etapa aponta para field inexistente:", etapa.ate);
});

/* Medido sobre o fluxo visível: passo condicional que não apareceu não pode
   contar como progresso, nem sustentar uma etapa inteira. */
function etapasDoFluxo(flow) {
  const limites = ETAPAS.map((etapa) => steps.findIndex((step) => step.field === etapa.ate));
  return ETAPAS.map((etapa, i) => {
    const inicio = i === 0 ? 0 : limites[i - 1] + 1;
    const fim = limites[i];
    const passos = flow.filter((step) => {
      const at = steps.indexOf(step);
      return at >= inicio && at <= fim;
    });
    return { nome: etapa.nome, passos };
  }).filter((etapa) => etapa.passos.length > 0);
}

/* Layout dos passos com muitos campos: evita campo solto em meia coluna. */
const fieldLayout = {
  medidas: { grid: true },
};

const app = document.querySelector("#app");
let autoTimer;

/* ------------------------------ estado ------------------------------ */

function readState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveAnswer(key, label, value) {
  const state = readState();
  const empty = value === "" || value === null || (Array.isArray(value) && value.length === 0);
  if (empty) {
    delete state[key];
  } else {
    state[key] = { rotulo: label, valor: value };
  }
  writeState(state);
}

function getValue(key) {
  return readState()[key]?.valor;
}

function clearAnswer(key) {
  const state = readState();
  delete state[key];
  writeState(state);
}

function openProtocols() {
  return protocols.filter((item) => item.status === "aberto");
}

function setProtocol(id) {
  try {
    localStorage.setItem(PROTOCOL_KEY, id);
  } catch {
    /* navegação anônima com storage bloqueado: segue sem persistir */
  }
}

/* Sem escolha salva, cai no único protocolo aberto — deep link não trava. */
function getProtocol() {
  let saved = null;
  try {
    saved = localStorage.getItem(PROTOCOL_KEY);
  } catch {
    saved = null;
  }
  const match = protocols.find((item) => item.id === saved && item.status === "aberto");
  return match || openProtocols()[0] || protocols[0];
}

function navigate(path) {
  history.pushState({}, "", path);
  window.scrollTo(0, 0);
  render();
}

/* ------------------------------ peças ------------------------------ */

/* Logotipo oficial em SVG. A marca nunca deve ser remontada em texto: a
   Ezra nao tem o "&" desenhado do logo nem o espacamento do original. */
function wordmark() {
  return `<img class="wordmark" src="/assets/logo-tml.png" alt="the men&rsquo;s &amp; the ladies" width="799" height="60">`;
}

function icon(type) {
  const icons = {
    arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15"></path><path d="m13 6 6 6-6 6"></path></svg>`,
    back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12H5"></path><path d="m11 6-6 6 6 6"></path></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2.4"></rect><path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9"></path></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 12.5 5 5 10-11"></path></svg>`,
    form: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3.4H6.8a2 2 0 0 0-2 2v13.2a2 2 0 0 0 2 2h10.4a2 2 0 0 0 2-2V5.4a2 2 0 0 0-2-2H15"></path><rect x="9" y="2" width="6" height="3.4" rx="1.3"></rect><path d="M8.6 11h5.2"></path><path d="M8.6 15h6.8"></path></svg>`,
    stethoscope: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5.4 3v4.6a4.2 4.2 0 0 0 8.4 0V3"></path><path d="M5.4 3H3.8"></path><path d="M13.8 3h1.6"></path><path d="M9.6 11.8v2.4a4.6 4.6 0 0 0 9.2 0v-1.1"></path><circle cx="18.8" cy="10.9" r="2.1"></circle></svg>`,
    box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.6 3.4 7v10l8.6 4.4L20.6 17V7z"></path><path d="M3.4 7 12 11.4 20.6 7"></path><path d="M12 11.4v10"></path></svg>`,
    camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.6A2 2 0 0 1 5 6.6h2.2l1.2-2h7.2l1.2 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><circle cx="12" cy="13" r="3.6"></circle></svg>`,
    folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.4a2 2 0 0 1 2-2h3.6l2 2.4H19a2 2 0 0 1 2 2v8.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>`,
    image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3.4" y="4.4" width="17.2" height="15.2" rx="2.2"></rect><circle cx="9" cy="10" r="1.7"></circle><path d="m4.2 17.4 4.6-4.2 3.4 3 2.8-2.4 4.8 4"></path></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5.4"></path><path d="M12 7.8h.01"></path></svg>`,
    chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 12.2c0 4-3.8 7.2-8.4 7.2a9.6 9.6 0 0 1-2.6-.35L4.6 20.8l1.3-3.6A6.9 6.9 0 0 1 3.6 12.2C3.6 8.2 7.4 5 12 5s8.4 3.2 8.4 7.2Z"></path></svg>`,
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.8 4.8 5.6v6c0 4.2 3 7.6 7.2 9.6 4.2-2 7.2-5.4 7.2-9.6v-6z"></path><path d="m8.8 12.2 2.2 2.2 4.2-4.4"></path></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6.4 6.4l11.2 11.2"></path><path d="M17.6 6.4 6.4 17.6"></path></svg>`,
    alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.6 2.6 20.4h18.8z"></path><path d="M12 9.6v4.6"></path><path d="M12 17.2h.01"></path></svg>`,
    chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m7 10 5 5 5-5"></path></svg>`,
  };
  return icons[type];
}

function privacyNote() {
  return `<p class="privacy">${icon("lock")} Somente o médico tem acesso às suas respostas.</p>`;
}

/* --------------------- 1 · seleção de protocolo --------------------- */

function renderSelect() {
  const aberto = openProtocols()[0];

  const cards = protocols
    .map((item) => {
      if (item.status === "aberto") {
        return `
        <a class="ps__card ps__card--open" role="listitem" href="${INTRO_PATH}" data-protocol="${item.id}">
          <span class="ps__badge">Aberto agora</span>
          <div class="ps__card-text">
            <h2 class="ps__card-name">${item.nome}</h2>
            ${item.subtitulo ? `<p class="ps__card-sub">${item.subtitulo}</p>` : ""}
          </div>
          <span class="ps__card-cta">Começar avaliação ${icon("arrow")}</span>
        </a>`;
      }
      return `
        <div class="ps__card ps__card--soon" role="listitem" aria-disabled="true">
          <span class="ps__badge ps__badge--soon">Em breve</span>
          <div class="ps__card-text">
            <h2 class="ps__card-name">${item.nome}</h2>
            ${item.subtitulo ? `<p class="ps__card-sub">${item.subtitulo}</p>` : ""}
          </div>
        </div>`;
    })
    .join("");

  app.innerHTML = `
    <main class="ps">
      <header class="ps__bar">
        <div class="ps__bar-inner">
          ${wordmark()}
          <span class="ps__tag">Consultório digital</span>
        </div>
      </header>

      <div class="ps__main">
        <p class="eyebrow">Escolha seu protocolo</p>
        <h1 class="ps__title">Qual Tratamento Você Busca?</h1>
        <p class="ps__lede">Um médico avalia suas respostas e indica o tratamento.</p>

        <div class="ps__grid" role="list">${cards}</div>

        <div class="ps__foot">${privacyNote()}</div>
      </div>
    </main>
  `;

  app.querySelector("[data-protocol]")?.addEventListener("click", (event) => {
    event.preventDefault();
    setProtocol(aberto.id);
    navigate(INTRO_PATH);
  });
}

/* --------------------------- depoimento --------------------------- */

/* Material real, cedido por quem fez o tratamento. Foto de banco nunca pode
   ocupar este lugar: seria prova social fabricada. Por isso cada depoimento
   tem `pronto`: enquanto o material do sexo correspondente não chega, a tela
   sai do fluxo em vez de mostrar a pessoa do outro sexo. */
const DEPOIMENTOS = {
  feminino: {
    pronto: true,
    titulo: "A Laís também estava com IMC alto, e conseguiu emagrecer.",
    nome: "Laís",
    arroba: "@laispavese",
    antes: { arquivo: "depoimento-antes.jpg", alt: "Laís durante uma corrida de rua, antes do tratamento" },
    depois: { arquivo: "depoimento-depois.jpg", alt: "Laís hoje, depois do tratamento" },
    paragrafos: [
      "Perdi 43 kg, e o mais importante que aprendi foi não esperar o resultado final para reconhecer a minha evolução.",
      "Você não precisa chegar ao peso ideal para valorizar o quanto já andou.",
    ],
  },
  /* TODO: fotos e fala de um paciente homem. Ao receber o material, salve as
     duas fotos em /assets, preencha os campos e troque `pronto` para true. */
  masculino: {
    pronto: false,
    titulo: "",
    nome: "",
    arroba: "",
    antes: { arquivo: "", alt: "" },
    depois: { arquivo: "", alt: "" },
    paragrafos: [],
  },
};

function depoimentoDoSexo() {
  return getValue("sexo_biologico") === "Masculino" ? DEPOIMENTOS.masculino : DEPOIMENTOS.feminino;
}

function depoimento(dados) {
  const { nome, arroba, antes, depois, paragrafos } = dados;

  return `
    <section class="dep">
      <div class="dep__fotos">
        <figure class="dep__foto">
          <img src="/assets/${antes.arquivo}" alt="${antes.alt}" width="680" height="850" loading="lazy" decoding="async">
          <figcaption>Antes</figcaption>
        </figure>
        <figure class="dep__foto">
          <img src="/assets/${depois.arquivo}" alt="${depois.alt}" width="680" height="850" loading="lazy" decoding="async">
          <figcaption>Depois</figcaption>
        </figure>
      </div>

      <blockquote class="dep__fala">
        ${paragrafos.map((p) => `<p>${p}</p>`).join("")}
      </blockquote>

      <p class="dep__autora"><b>${nome}</b> <span>${arroba}</span></p>

      <p class="dep__nota">Resultado individual. A resposta ao tratamento varia de pessoa para pessoa e depende de avaliação médica, alimentação e atividade física.</p>
    </section>
  `;
}

/* ----------------------- 2 · como funciona ----------------------- */

function renderIntro() {
  const protocolo = getProtocol();

  /* Prazos reais (avaliação médica, envio) entram como quarto item de
     cada etapa: [icone, "Título", "Descrição", "ATÉ 24H"]. */
  const etapas = [
    [
      "form",
      "Você responde a avaliação",
      "Queixas, histórico médico, medicamentos em uso e hábitos. Tudo por escrito, sem consulta por vídeo.",
      "",
    ],
    [
      "stethoscope",
      "Um médico analisa o seu caso",
      "Ele confirma se há indicação e define o princípio ativo, a via de administração e a dose inicial.",
      "",
    ],
    [
      "box",
      "O protocolo é liberado",
      "Com a indicação médica, você finaliza o pedido na plataforma parceira e recebe em casa.",
      "",
    ],
    [
      "chat",
      "Acompanhamento semanal com a nutricionista",
      "Toda semana você fala com a nutricionista do time: ajuste da alimentação, dúvidas do dia a dia e o que fazer para o resultado se sustentar.",
      "TODA SEMANA",
    ],
    [
      "shield",
      "Acompanhamento médico até o fim do protocolo",
      "O médico reavalia a sua resposta ao tratamento, ajusta a dose quando for preciso e orienta sobre efeitos colaterais.",
      "DURANTE O TRATAMENTO",
    ],
  ];

  app.innerHTML = `
    <main class="ci">
      <header class="ci__bar">
        <div class="ci__bar-inner">
          <button class="ci__back" type="button" data-to-select>${icon("back")} Trocar protocolo</button>
          ${wordmark()}
        </div>
      </header>

      <div class="ci__main">
        <p class="eyebrow">Protocolo selecionado</p>
        <h1 class="ci__title">${protocolo.nome}</h1>
        ${protocolo.resumo ? `<p class="ci__desc">${protocolo.resumo}</p>` : ""}

        <ol class="ci__track">
          ${etapas
            .map(
              ([nomeIcone, titulo, texto, quando], i) => `
            <li class="ci__step" style="--i:${i}">
              <span class="ci__icon" aria-hidden="true">${icon(nomeIcone)}</span>
              <div>
                <span class="ci__etapa"></span>
                <h3>${titulo}</h3>
                <p>${texto}</p>
                ${quando ? `<span class="ci__when">${quando}</span>` : ""}
              </div>
            </li>`
            )
            .join("")}
        </ol>

        <div class="ci__cta">
          <a class="btn" href="${steps[0].path}" data-link>Começar avaliação ${icon("arrow")}</a>
          ${privacyNote()}
        </div>
      </div>
    </main>
  `;

  app.querySelector("[data-to-select]")?.addEventListener("click", () => navigate(SELECT_PATH));
}

/* ------------------------ fluxo condicional ------------------------ */

function matchesCondition(condition) {
  if (!condition) return true;
  /* Escotilha para condições que não são sobre uma resposta gravada,
     como "o IMC já pode ser calculado". */
  if (typeof condition.when === "function") return condition.when(getValue);
  const value = getValue(condition.field);
  if (condition.equals !== undefined) return value === condition.equals;
  if (condition.includes !== undefined) return Array.isArray(value) ? value.includes(condition.includes) : value === condition.includes;
  if (condition.includesAny) {
    const values = Array.isArray(value) ? value : [value];
    return condition.includesAny.some((item) => values.includes(item));
  }
  return true;
}

/* Telas que apenas informam e avançam: não gravam resposta e não contam
   como pergunta no contador. */
const INTERSTITIAL_KINDS = new Set(["info", "block"]);

function isInterstitial(step) {
  return INTERSTITIAL_KINDS.has(step.kind);
}

function isQuestion(step) {
  return !isInterstitial(step);
}

function visibleSteps() {
  return steps.filter((step) => matchesCondition(step.showIf));
}

function donePath() {
  return `/pages/consultorio-${steps.length + 1}`;
}

/* --------------------------------- IMC --------------------------------- */

const NUM_BR = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function toNumber(raw) {
  if (raw === undefined || raw === null) return null;
  const cleaned = String(raw).replace(",", ".").replace(/[^\d.]/g, "");
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

/* O campo pede centímetros, mas tolera quem digitou 1,78. */
function alturaEmMetros(raw) {
  const value = toNumber(raw);
  if (value === null) return null;
  if (value > 3) return value / 100;
  if (value >= 0.5) return value;
  return null;
}

const FAIXAS_IMC = [
  [18.5, "abaixo do peso"],
  [25, "peso normal"],
  [30, "sobrepeso"],
  [35, "obesidade grau I"],
  [40, "obesidade grau II"],
  [Infinity, "obesidade grau III"],
];

function faixaImc(imc) {
  const faixa = FAIXAS_IMC.find(([limite]) => imc < limite);
  return faixa ? faixa[1] : "";
}

/* Devolve null se faltar peso ou altura — é o que impede a tela de
   aparecer com "IMC: NaN" quando alguem entra por link direto. */
function computeImc() {
  const peso = toNumber(getValue("peso_atual"));
  const alturaM = alturaEmMetros(getValue("altura"));
  if (!peso || !alturaM) return null;
  const imc = peso / (alturaM * alturaM);
  if (!Number.isFinite(imc) || imc <= 0) return null;
  const meta = toNumber(getValue("peso_meta"));
  const imcAlvo = meta ? meta / (alturaM * alturaM) : null;
  return {
    peso,
    alturaM,
    imc,
    faixa: faixaImc(imc),
    meta,
    imcAlvo,
    perdaPct: meta && meta < peso ? ((peso - meta) / peso) * 100 : null,
  };
}

/* Domínio fixo da régua. As paradas do gradiente estão como percentuais
   literais no styles.css, então mudar estes limites exige mexer no CSS. */
const IMC_MIN = 18;
const IMC_MAX = 45;

function posImc(imc) {
  const clamped = Math.min(Math.max(imc, IMC_MIN), IMC_MAX);
  return ((clamped - IMC_MIN) / (IMC_MAX - IMC_MIN)) * 100;
}

function renderImc() {
  const dados = computeImc();
  if (!dados) return "";
  const imcTexto = NUM_BR.format(dados.imc);
  const meta =
    dados.imcAlvo && dados.perdaPct
      ? `<p class="imc__read">Sua meta de <b>${NUM_BR.format(dados.meta)} kg</b> levaria o IMC a <b>${NUM_BR.format(
          dados.imcAlvo
        )}</b> — uma redução de <b>${NUM_BR.format(dados.perdaPct)}%</b> do peso atual.</p>`
      : "";

  return `
    <div class="imc">
      <dl class="imc__stats">
        <div><dt>Peso</dt><dd>${NUM_BR.format(dados.peso)} kg</dd></div>
        <div><dt>Altura</dt><dd>${NUM_BR.format(dados.alturaM * 100)} cm</dd></div>
        <div><dt>IMC atual</dt><dd>${imcTexto}</dd></div>
      </dl>

      <div class="imc__scale" style="--pos:${posImc(dados.imc)}">
        <span class="imc__value">${imcTexto}</span>
        <span class="imc__pin" aria-hidden="true"></span>
        <span class="imc__track" aria-hidden="true"></span>
        <span class="imc__tick" style="--at:${posImc(25)}">25</span>
        <span class="imc__tick" style="--at:${posImc(30)}">30</span>
        <span class="imc__tick" style="--at:${posImc(40)}">40</span>
      </div>

      <p class="imc__faixa">Isso coloca você na faixa de <b>${dados.faixa}</b>.</p>
      ${meta}

      <details class="imc__why">
        <summary>Por que o IMC importa nesta avaliação?</summary>
        <p>O IMC relaciona peso e altura e é um dos dados que o médico usa para definir a conduta. Ele não separa massa magra de gordura nem descreve a sua saúde por inteiro — por isso entra junto com o histórico, os exames e os hábitos que você está relatando aqui. Somente o médico define se há indicação de tratamento.</p>
      </details>
    </div>
  `;
}

/* ------------------------- campos e opções ------------------------- */

function fieldMarkup(field, step, layout) {
  const saved = getValue(field.key) || "";
  const label = field.label ? `<label class="cq__label" for="${field.key}">${field.label}</label>` : "";
  const inputMode = field.type === "tel" ? "tel" : field.type === "number" ? "decimal" : "";
  const revealValues = field.revealValues
    ? ` data-reveal-values="${field.revealValues.join("|")}" data-reveal-from="${field.revealFrom || ""}" hidden`
    : "";
  const attrs = [
    `id="${field.key}"`,
    `name="${field.key}"`,
    `placeholder="${field.placeholder || ""}"`,
    inputMode ? `inputmode="${inputMode}"` : "",
    field.required ? "data-required" : "",
    field.format ? `data-format="${field.format}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const control =
    field.type === "textarea"
      ? `<textarea class="cq__input cq__textarea" ${attrs}>${saved}</textarea>`
      : `<input class="cq__input" type="${field.type}" value="${saved}" ${attrs}>`;
  const suffix = field.suffix ? `<span class="cq__unit">${field.suffix}</span>` : "";
  const wide = layout?.wide?.includes(field.key) ? ' style="grid-column:1/-1"' : "";
  const className = field.suffix ? "cq__group cq__measure" : "cq__group";

  return `
    <div class="${className}" data-field-wrap data-field-key="${field.key}" data-step-field="${step.field}"${revealValues}${wide}>
      ${label}
      ${control}
      ${suffix}
    </div>
  `;
}

/* `options` aceita array de strings ou função, para faixas que dependem de
   uma resposta anterior. Cada opção pode ser `{ value, detail }`: o value é
   o que fica gravado, o detail é só a linha de apoio. */
function stepOptions(step) {
  const raw = typeof step.options === "function" ? step.options() : step.options;
  return (raw || []).map((option) => (typeof option === "string" ? { value: option, detail: "" } : option));
}

/* Título também pode ser função: o depoimento troca de nome com o sexo. */
function stepTitle(step) {
  return typeof step.title === "function" ? step.title() : step.title;
}

function optionMarkup(step, selected) {
  const options = stepOptions(step);
  /* Listas longas vão para duas colunas: mantém tudo na primeira tela. */
  const dense = options.length > 6 ? " cq__options--dense" : "";
  const multi = step.kind === "multiple" ? " cq__options--multi" : "";

  const hint = step.kind === "multiple" ? `<p class="cq__multi-hint">Selecione todas que se aplicam</p>` : "";

  return `
    ${hint}
    <div class="cq__options${dense}${multi}" role="group">
      ${options
        .map(({ value, detail }) => {
          const pressed = Array.isArray(selected) ? selected.includes(value) : selected === value;
          return `<button class="cq__option" type="button" value="${value}" aria-pressed="${pressed}" data-option><span class="cq__option-text">${value}${
            detail ? `<span class="cq__option-detail">${detail}</span>` : ""
          }</span></button>`;
        })
        .join("")}
    </div>
  `;
}

/* Caixa de texto pendurada numa pergunta de opção — vale para escolha
   única e para múltipla (a alergia "Outra" abre a descrição). */
function camposNinho(step) {
  if (!step.fields?.length) return "";
  return `
    <div class="cq__field cq__field--nested">
      ${step.fields.map((field) => fieldMarkup(field, step)).join("")}
    </div>
  `;
}

/* Subgrupo: pergunta encadeada dentro da mesma tela. Fica entre as opcoes
   principais e os campos de texto, e cada um pode ser revelado pela resposta
   principal (`reveal.values`) ou por outro subgrupo (`reveal.from`). */
function subgruposMarkup(step) {
  return (step.subgrupos || [])
    .map((grupo) => {
      const escolhido = getValue(grupo.key);
      const marcados = Array.isArray(escolhido) ? escolhido : escolhido ? [escolhido] : [];
      const dense = grupo.options.length > 6 ? " cq__options--dense" : "";
      const multi = grupo.multiple ? " cq__options--multi" : "";
      return `
        <div class="cq__sub" data-sub-wrap data-sub-key="${grupo.key}" data-sub-source="${
          grupo.reveal?.from || step.field
        }" data-sub-values="${(grupo.reveal?.values || []).join("|")}" hidden>
          <p class="cq__sub-label">${grupo.label}</p>
          <div class="cq__options${dense}${multi}" role="group">
            ${grupo.options
              .map(
                (option) =>
                  `<button class="cq__option" type="button" value="${option}" aria-pressed="${marcados.includes(
                    option
                  )}" data-sub-option data-sub-of="${grupo.key}">${option}</button>`
              )
              .join("")}
          </div>
        </div>`;
    })
    .join("");
}

function digits(text) {
  return (text.match(/\d/g) || []).join("");
}

function formatPhone(text) {
  const d = digits(text).slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  const split = d.length > 10 ? 7 : 6;
  const end = d.slice(split);
  return `(${d.slice(0, 2)}) ${d.slice(2, split)}${end ? `-${end}` : ""}`;
}

function formatCpf(text) {
  const d = digits(text).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/* ------------------------------- fotos ------------------------------- */

const PHOTO_DB = "tl-consulta-fotos";
const PHOTO_STORE = "fotos";
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png"];

const PHOTO_SLOTS = [
  { key: "corpo_frente", label: "Corpo de frente", silhueta: "frente" },
  { key: "corpo_lado", label: "Corpo de lado", silhueta: "lado" },
];

/* As fotos vão para o IndexedDB, não para o localStorage: um JPEG de 3 MB
   em base64 passa de 4 MB e estoura a cota de 5 MB do localStorage inteiro,
   levando as respostas junto. O localStorage guarda só os metadados, que é
   o que o prontuário precisa ler de forma síncrona. */
/* Modo privado restrito e alguns navegadores nao expoem IndexedDB. Sem ele
   nao da para guardar a foto, mas o passo e opcional: degrada com aviso no
   card em vez de derrubar o fluxo. */
function photoStorageAvailable() {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

function openPhotoDb() {
  return new Promise((resolve, reject) => {
    if (!photoStorageAvailable()) {
      reject(new Error("IndexedDB indisponivel"));
      return;
    }
    const request = indexedDB.open(PHOTO_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function photoTx(mode, acao) {
  return openPhotoDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(PHOTO_STORE, mode);
        const pedido = acao(tx.objectStore(PHOTO_STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(pedido && "result" in pedido ? pedido.result : undefined);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
}

function savePhoto(key, blob) {
  return photoTx("readwrite", (store) => store.put(blob, key));
}

function loadPhoto(key) {
  return photoTx("readonly", (store) => store.get(key));
}

function removePhoto(key) {
  return photoTx("readwrite", (store) => store.delete(key));
}

function photoMeta(key) {
  return getValue(key) || null;
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${NUM_BR.format(bytes / 1024 / 1024)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/* Silhuetas fornecidas pela marca, em PNG com fundo transparente. */
const SILHUETAS = {
  frente: { arquivo: "corpo-frente.png", alt: "Contorno de um corpo visto de frente" },
  lado: { arquivo: "corpo-lado.png", alt: "Contorno de um corpo visto de lado" },
};

function silhueta(tipo) {
  const img = SILHUETAS[tipo] || SILHUETAS.frente;
  return `<img src="/assets/${img.arquivo}" alt="${img.alt}" width="300" height="460" decoding="async">`;
}

/* Um passo pode trazer os proprios slots (o exame, por exemplo); sem isso
   valem os dois slots de foto do corpo. */
function slotsDoPasso(step) {
  return step?.slots || PHOTO_SLOTS;
}

function slotPorChave(key) {
  return steps.flatMap((step) => step.slots || []).find((slot) => slot.key === key) || PHOTO_SLOTS.find((slot) => slot.key === key);
}

function photoCard(slot) {
  const meta = photoMeta(slot.key);
  const enviada = !!meta;
  const tipos = (slot.tipos || PHOTO_TYPES).join(",");

  return `
    <div class="ph__card${enviada ? " ph__card--done" : ""}" data-slot="${slot.key}">
      <div class="ph__thumb" data-thumb>
        ${
          enviada
            ? ""
            : slot.silhueta
              ? `<span class="ph__silhueta">${silhueta(slot.silhueta)}</span>`
              : `<span class="ph__arquivo">${icon("folder")}</span>`
        }
      </div>
      <h2 class="ph__label">${slot.label}</h2>

      <label class="btn ph__btn">
        ${icon("camera")} Usar câmera
        <input type="file" accept="image/jpeg,image/png" capture="environment" data-input hidden>
      </label>
      <label class="btn ph__btn ph__btn--ghost">
        ${icon("folder")} Escolher arquivo
        <input type="file" accept="${tipos}" data-input hidden>
      </label>

      <p class="ph__status" data-status>
        <span class="ph__dot"></span>
        ${enviada ? `${meta.nome} · ${formatBytes(meta.bytes)}` : "Não enviado"}
      </p>
      ${enviada ? `<button class="ph__remove" type="button" data-remove>Remover</button>` : ""}
    </div>
  `;
}

/* Passo de anexo só libera o Continuar quando todo slot obrigatório tem
   arquivo. O `optional` do passo ainda vale como atalho. */
function anexosCompletos(step) {
  if (step.optional) return true;
  return slotsDoPasso(step).every((slot) => slot.opcional || photoMeta(slot.key));
}

function photosMarkup(step) {
  return `
    <div class="ph">
      <div class="ph__grid">${slotsDoPasso(step).map(photoCard).join("")}</div>
      <p class="ph__hint">${icon("image")} ${step?.slotsHint || "JPG ou PNG · até 5 MB cada"}</p>
    </div>
  `;
}

/* Área de anexo pendurada numa pergunta de opção: usa o mesmo
   data-field-wrap dos campos revelados, entao aparece e desaparece junto com
   a resposta sem nenhuma fiação extra. */
function slotsMarkup(step) {
  if (!step.slots || step.kind === "photos") return "";
  return `
    <div class="cq__anexo" data-field-wrap data-reveal-values="${(step.slotsReveal || []).join("|")}" data-reveal-from="" hidden>
      ${photosMarkup(step)}
    </div>
  `;
}

function wirePhotosStep(step, goNext, setEnabled) {
  /* Enviar arquivo faz o passo re-renderizar (navigate), então basta medir
     uma vez na montagem. */
  setEnabled(anexosCompletos(step));


  const cards = [...document.querySelectorAll("[data-slot]")];

  const pintar = async (card) => {
    const key = card.dataset.slot;
    const thumb = card.querySelector("[data-thumb]");
    const meta = photoMeta(key);
    if (!meta || !photoStorageAvailable()) return;
    /* PDF nao tem miniatura: mostra o icone de arquivo e para aqui. */
    if (!String(meta.tipo || "").startsWith("image/")) {
      thumb.innerHTML = `<span class="ph__arquivo">${icon("folder")}</span>`;
      return;
    }
    try {
      const blob = await loadPhoto(key);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      thumb.innerHTML = `<img src="${url}" alt="Pré-visualização de ${key.replace("_", " ")}">`;
      thumb.querySelector("img").addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
    } catch (error) {
      console.error("falha ao ler a foto guardada:", key, error);
    }
  };

  const erro = (card, texto) => {
    const status = card.querySelector("[data-status]");
    card.classList.add("ph__card--erro");
    card.classList.remove("ph__card--done");
    status.innerHTML = `<span class="ph__dot"></span>${texto}`;
  };

  cards.forEach((card) => {
    pintar(card);

    card.querySelectorAll("[data-input]").forEach((input) => {
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        input.value = "";
        if (!file) return;

        const key = card.dataset.slot;
        if (!photoStorageAvailable()) {
          erro(card, "Este navegador nao permite guardar a foto.");
          return;
        }
        const slot = slotsDoPasso(step).find((item) => item.key === key);
        const tipos = slot?.tipos || PHOTO_TYPES;
        if (!tipos.includes(file.type)) {
          erro(card, `Formato não aceito. Envie ${tipos.includes("application/pdf") ? "JPG, PNG ou PDF" : "JPG ou PNG"}.`);
          return;
        }
        if (file.size > PHOTO_MAX_BYTES) {
          erro(card, `Arquivo de ${formatBytes(file.size)}. O limite é 5 MB.`);
          return;
        }

        try {
          await savePhoto(key, file);
        } catch (error) {
          console.error("falha ao guardar a foto:", key, error);
          erro(card, "Não foi possível guardar a foto neste navegador.");
          return;
        }

        saveAnswer(key, slot?.label || step.label, { nome: file.name, bytes: file.size, tipo: file.type });
        navigate(window.location.pathname);
      });
    });

    card.querySelector("[data-remove]")?.addEventListener("click", async () => {
      const key = card.dataset.slot;
      try {
        await removePhoto(key);
      } catch (error) {
        console.error("falha ao remover a foto:", key, error);
      }
      clearAnswer(key);
      navigate(window.location.pathname);
    });
  });
}

/* ------------------------- por que perguntamos ------------------------- */

function whyButton(step) {
  if (!step.why) return "";
  return `<button class="cq__why" type="button" data-why>${icon("info")} Por que perguntamos?</button>`;
}

function whyDialog(step) {
  if (!step.why) return "";
  const { titulo, body, nota } = step.why;
  return `
    <dialog class="modal" data-why-dialog aria-labelledby="why-titulo">
      <div class="modal__box">
        <button class="modal__close" type="button" data-why-close aria-label="Fechar">${icon("close")}</button>
        <span class="modal__icon">${icon("chat")}</span>
        <h2 class="modal__title" id="why-titulo">${titulo || "Por que perguntamos?"}</h2>
        ${(body || []).map((p) => `<p class="modal__text">${p}</p>`).join("")}
        ${nota ? `<p class="modal__note">${icon("shield")} ${nota}</p>` : ""}
      </div>
    </dialog>
  `;
}

function wireWhy() {
  const dialog = document.querySelector("[data-why-dialog]");
  if (!dialog) return;

  /* <dialog> nativo tem suporte amplo, mas em navegador antigo o atributo
     open ainda mostra o conteudo -- sem backdrop modal, e funcional. */
  const abrir = () => {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  };
  const fechar = () => {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  };

  document.querySelector("[data-why]")?.addEventListener("click", abrir);
  dialog.querySelector("[data-why-close]")?.addEventListener("click", fechar);
  /* Clique no backdrop fecha: o dialog ocupa a tela toda, então um clique
     que aterrissa nele (e não na caixa) veio de fora. */
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) fechar();
  });
}

/* ----------------------------- prontuário ----------------------------- */

const REVISAO_FLAG = "revisao";

function emRevisao() {
  return new URLSearchParams(window.location.search).has(REVISAO_FLAG);
}

const PRONTUARIO = [
  { titulo: "Identificação", campos: ["nome", "telefone", "email", "nascimento", "cpf"] },
  { titulo: "Perfil", campos: ["sexo_biologico", "grávida_amamentando"] },
  { titulo: "Medidas e meta", campos: ["peso_atual", "peso_meta", "altura", "meta_perda"], imc: true },
  {
    titulo: "Hábitos",
    campos: [
      "gordura_acumulada",
      "horas_sono",
      "frequencia_treino",
      "vontade_incontrolável",
      "come_estressado",
      "alcool",
      "vômito_induzido",
    ],
  },
  {
    titulo: "Histórico de saúde",
    campos: [
      "condicoes_restritivas",
      "visao_diabetes",
      "visao_diabetes_descricao",
      "historico_familiar",
      "condicoes_medicas",
      "condicoes_atuais",
      "transtorno_alimentar",
      "transtorno_alimentar_qual",
      "saude_mental",
      "saude_mental_qual",
    ],
  },
  {
    titulo: "Medicamentos e alergias",
    campos: [
      "medicamentos_diabetes",
      "medicamentos_diabetes_quais",
      "toma_medicamento",
      "medicamentos_descricao",
      "semaglutida_tirzepatida",
      "semaglutida_tirzepatida_qual",
      "semaglutida_tirzepatida_emagreceu",
      "semaglutida_tirzepatida_relato",
      "alergia",
      "alergia_outra",
      "colateral",
      "colateral_quais",
      "colateral_relato",
    ],
  },
  { titulo: "Tentativas anteriores", campos: ["tempo_tentando", "tentativas"] },
  { titulo: "Preferências", campos: ["preferência_tratamento", "dosagem_baixa"] },
  { titulo: "Anexos", campos: ["tem_exame", "exame_arquivo", "corpo_frente", "corpo_lado"], anexos: true },
  { titulo: "Observações", campos: ["informacoes_medico", "informacoes_medico_relato"] },
];

/* Um campo pode ser o próprio passo (sexo_biologico) ou um input dentro de
   um passo de campos (nome vive em identificacao). */
function pathDoCampo(key) {
  const direto = steps.find((step) => step.field === key);
  if (direto) return direto.path;
  const dono = donoDoCampo(key);
  return dono ? dono.path : null;
}

/* O passo que fez a pergunta: pode ser o proprio passo, um campo de texto
   dentro dele, um subgrupo encadeado ou um slot de anexo. */
function donoDoCampo(key) {
  return (
    steps.find((step) => step.field === key) ||
    steps.find((step) => (step.fields || []).some((field) => field.key === key)) ||
    steps.find((step) => (step.subgrupos || []).some((grupo) => grupo.key === key)) ||
    steps.find((step) => (step.slots || []).some((slot) => slot.key === key))
  );
}

function valorLegivel(key) {
  const registro = readState()[key];
  if (!registro) return null;
  const valor = registro.valor;
  if (Array.isArray(valor)) return valor.length ? valor.join(", ") : null;
  if (valor && typeof valor === "object") {
    /* metadados de foto */
    return valor.nome ? `${valor.nome} · ${formatBytes(valor.bytes)}` : null;
  }
  const texto = String(valor).trim();
  return texto.length ? texto : null;
}

function rotuloDoCampo(key) {
  const registro = readState()[key];
  if (registro?.rotulo && registro.rotulo !== "x") return registro.rotulo;
  const slot = slotPorChave(key);
  if (slot) return slot.label;
  const dono = donoDoCampo(key);
  const campo = (dono?.fields || []).find((field) => field.key === key);
  const grupo = (dono?.subgrupos || []).find((item) => item.key === key);
  return campo?.label || grupo?.label || dono?.label || key;
}

/* Um campo "esperado" é o que o fluxo realmente pediu a esta pessoa: o passo
   dono tem de estar visível, não ser opcional, e um campo revelado por opção
   só conta se a opção que o revela foi escolhida. Sem isso o prontuário
   acusaria falta de resposta em pergunta que nunca apareceu. */
function campoEsperado(key) {
  const dono = donoDoCampo(key);
  if (!dono) return false;
  if (!matchesCondition(dono.showIf)) return false;
  if (dono.optional || isInterstitial(dono)) return false;
  if (dono.field === key) return true;

  /* Slot de anexo: as fotos do corpo são cobradas, o exame não. */
  const slot = slotsDoPasso(dono.kind === "photos" ? dono : { slots: dono.slots || [] }).find((item) => item.key === key);
  if (slot) return !slot.opcional;

  const grupo = (dono.subgrupos || []).find((item) => item.key === key);
  if (grupo) return valoresDeOrigem(grupo.reveal?.from || dono.field).some((valor) => (grupo.reveal?.values || []).includes(valor));

  const campo = (dono.fields || []).find((field) => field.key === key);
  if (!campo) return false;
  if (campo.revealValues) {
    const valores = valoresDeOrigem(campo.revealFrom || dono.field);
    if (campo.revealValues.includes("*")) return valores.length > 0;
    return campo.revealValues.some((valor) => valores.includes(valor));
  }
  return !!campo.required;
}

function valoresDeOrigem(key) {
  const valor = getValue(key);
  if (Array.isArray(valor)) return valor;
  return valor ? [valor] : [];
}

function linhaProntuario(key, esperado) {
  const valor = valorLegivel(key);

  if (!valor) {
    /* Opcional em branco não é pendência: sai do prontuário. */
    if (!esperado) return "";
    return `
    <div class="pr__linha pr__linha--falta">
      <span class="pr__marca pr__marca--falta" aria-hidden="true">${icon("alert")}</span>
      <span class="pr__campo">${rotuloDoCampo(key)}</span>
      <span class="pr__valor pr__valor--falta">Não informado</span>
    </div>
  `;
  }

  return `
    <div class="pr__linha">
      <span class="pr__marca" aria-hidden="true">${icon("check")}</span>
      <span class="pr__campo">${rotuloDoCampo(key)}</span>
      <span class="pr__valor">${valor}</span>
    </div>
  `;
}

function renderDone() {
  const estado = readState();
  const respondidas = Object.keys(estado).length;
  const nome = valorLegivel("nome");
  const dados = computeImc();

  let totalFaltando = 0;

  const secoes = PRONTUARIO.map((secao) => {
    const esperados = secao.campos.filter(campoEsperado);
    const faltando = esperados.filter((key) => !valorLegivel(key));
    const respondidos = secao.campos.filter((key) => valorLegivel(key));
    totalFaltando += faltando.length;

    const linhas = secao.campos.map((key) => linhaProntuario(key, esperados.includes(key))).filter(Boolean);

    const extra =
      secao.imc && dados
        ? `
        <div class="pr__linha pr__linha--calc">
          <span class="pr__marca" aria-hidden="true">${icon("check")}</span>
          <span class="pr__campo">IMC calculado</span>
          <span class="pr__valor">${NUM_BR.format(dados.imc)} · ${dados.faixa}</span>
        </div>`
        : "";

    if (!linhas.length && !extra) return "";

    const completa = faltando.length === 0;
    const alvo = secao.campos.map(pathDoCampo).find(Boolean);
    const editar = alvo ? `<button class="pr__editar" type="button" data-editar="${alvo}">Editar respostas</button>` : "";

    /* Fechada por padrão; se falta algo, abre para a pendência não passar
       despercebida atrás de um botão. */
    return `
      <details class="pr__secao${completa ? "" : " pr__secao--falta"}"${completa ? "" : " open"}>
        <summary class="pr__cabeca">
          <span class="pr__status" aria-hidden="true">${icon(completa ? "check" : "alert")}</span>
          <h2>${secao.titulo}</h2>
          <span class="pr__resumo">${
            completa
              ? `${respondidos.length} ${respondidos.length === 1 ? "resposta" : "respostas"}`
              : `falta ${faltando.length}`
          }</span>
          <span class="pr__seta" aria-hidden="true">${icon("chevron")}</span>
        </summary>
        <div class="pr__corpo">
          ${linhas.join("")}
          ${extra}
          ${editar}
        </div>
      </details>
    `;
  })
    .filter(Boolean)
    .join("");

  const semFoto = PHOTO_SLOTS.filter((slot) => !photoMeta(slot.key));
  const avisoFoto = semFoto.length
    ? `<p class="pr__aviso">${icon("image")} ${
        semFoto.length === 2 ? "Nenhuma foto enviada" : "Falta a foto de " + semFoto[0].label.toLowerCase()
      }. As fotos são opcionais, mas ajudam na avaliação. <button class="pr__link" type="button" data-editar="${
        steps.find((step) => step.kind === "photos")?.path || ""
      }">Enviar agora</button></p>`
    : "";

  /* totalFaltando já foi somado no map acima. */
  app.innerHTML = `
    <main class="pr">
      <div class="pr__inner">
        <header class="pr__topo">
          <span class="pr__selo">${icon("check")}</span>
          <p class="eyebrow">Avaliação concluída</p>
          <h1 class="pr__titulo">Prontuário${nome ? " de " + nome.split(" ")[0] : ""}</h1>
          <p class="pr__sub">${respondidas} ${
            respondidas === 1 ? "resposta registrada" : "respostas registradas"
          }${
            totalFaltando
              ? `, e ${totalFaltando} ${totalFaltando === 1 ? "pendência" : "pendências"} destacada${
                  totalFaltando === 1 ? "" : "s"
                } abaixo`
              : ""
          }. Toque numa seção para abrir — depois disso, quem lê é a equipe médica.</p>
        </header>

        ${avisoFoto}
        ${secoes}

        <footer class="pr__rodape">
          <p class="pr__espera">Enquanto o médico analisa as suas respostas:</p>
          <a class="btn" href="${CHECKOUT_URL}">Quero saber mais ${icon("arrow")}</a>
          ${privacyNote()}
        </footer>
      </div>
    </main>
  `;

  app.querySelectorAll("[data-editar]").forEach((botao) => {
    const destino = botao.dataset.editar;
    if (!destino) return;
    botao.addEventListener("click", () => navigate(`${destino}?${REVISAO_FLAG}=1`));
  });
}

/* --------------------- 3 · tela de pergunta --------------------- */

function renderStep(index) {
  const flow = visibleSteps();
  const step = flow[index] || flow[0];
  const etapas = etapasDoFluxo(flow);
  const etapaAtual = etapas.findIndex((item) => item.passos.includes(step));
  const etapa = etapas[etapaAtual];
  const dentroDaEtapa = etapa ? etapa.passos.indexOf(step) + 1 : 0;
  const selected = getValue(step.field);
  const showBack = index > 0;
  const protocolo = getProtocol();
  const interstitial = isInterstitial(step);
  /* O contador conta perguntas; a barra mede o fluxo inteiro. Barra que
     congela numa tela informativa parece defeito, e contador que anda sem
     pergunta nova mente sobre o que falta — então o número desaparece nas
     telas informativas e dá lugar ao rótulo. */
  const questionTotal = flow.filter(isQuestion).length;
  const questionNumber = flow.slice(0, index + 1).filter(isQuestion).length;
  /* Fotos são opcionais, então o Continuar também nasce liberado. */
  /* Tela informativa sem eyebrow nao mostra rotulo nenhum -- nem o
     separador, que ficaria solto ao lado do nome do protocolo. */
  const rotuloMeta = interstitial ? step.eyebrow || "" : questionNumber + "/" + questionTotal;
  const startsEnabled = interstitial || (step.kind === "photos" && anexosCompletos(step));
  const revisao = emRevisao();

  /* Um segmento por etapa, com peso proporcional ao número de passos: a
     etapa curta não finge ser longa. */
  const barra = etapas
    .map((item, i) => {
      const preenchido = i < etapaAtual ? "100%" : i === etapaAtual ? `${(dentroDaEtapa / item.passos.length) * 100}%` : "0%";
      return `<span class="cq__bar-seg" style="flex-grow:${item.passos.length};--seg:${preenchido}" title="${item.nome}"><i></i></span>`;
    })
    .join("");

  app.innerHTML = `
    <main class="cq">
      <header class="cq__top">
        <div class="cq__top-inner">
          ${wordmark()}
          <div class="cq__meta">
            ${etapa ? `<span class="cq__protocol">Etapa ${etapaAtual + 1}/${etapas.length}</span>` : ""}
            ${etapa ? `<span class="cq__meta-sep" aria-hidden="true"></span><span class="cq__etapa-nome">${etapa.nome}</span>` : ""}
            ${rotuloMeta ? `<span class="cq__meta-sep" aria-hidden="true"></span><span>${rotuloMeta}</span>` : ""}
          </div>
        </div>
        <div class="cq__bar" role="progressbar" aria-valuemin="1" aria-valuemax="${flow.length}" aria-valuenow="${
          index + 1
        }" aria-valuetext="${etapa ? `Etapa ${etapaAtual + 1} de ${etapas.length}: ${etapa.nome}` : ""}">
          ${barra}
        </div>
      </header>

      <div class="cq__body">
        <div class="cq__body-inner">
          <h1 class="cq__question">${stepTitle(step)}</h1>
          ${step.help ? `<p class="cq__help">${step.help}</p>` : ""}
          ${whyButton(step)}
          ${renderControls(step, selected)}
          ${step.aviso ? `<p class="cq__aviso">${icon("alert")}<span>${step.aviso}</span></p>` : ""}
        </div>
      </div>

      <footer class="cq__foot">
        <div class="cq__foot-inner">
          ${
            step.kind === "block"
              ? ""
              : `<button class="btn" type="button" aria-disabled="${startsEnabled ? "false" : "true"}" data-next>${
                  revisao ? "Salvar e voltar" : step.cta || "Continuar"
                } ${icon("arrow")}</button>`
          }
          ${showBack ? `<button class="cq__back" type="button" data-back>Voltar</button>` : ""}
        </div>
      </footer>
      ${whyDialog(step)}
    </main>
  `;

  wireStep(index);
  wireWhy();
}

function renderControls(step, selected) {
  /* Tela informativa não tem step.fields. Sem esta guarda o .map lá embaixo
     lança dentro do template de innerHTML e a página inteira fica branca,
     sem nenhuma mensagem. */
  if (isInterstitial(step)) {
    if (typeof step.render === "function") {
      try {
        return step.render();
      } catch (error) {
        console.error("falha ao renderizar tela informativa:", step.field, error);
        return "";
      }
    }
    return (step.body || []).map((paragraph) => `<p class="cq__text">${paragraph}</p>`).join("");
  }

  if (step.kind === "photos") return photosMarkup(step);

  if (step.kind === "single" || step.kind === "multiple")
    return `${optionMarkup(step, selected)}${subgruposMarkup(step)}${slotsMarkup(step)}${camposNinho(step)}`;

  const layout = fieldLayout[step.field];
  const ordered = layout?.order
    ? layout.order.map((key) => step.fields.find((field) => field.key === key)).filter(Boolean)
    : step.fields;
  const wrapClass = layout?.grid === 3 ? "cq__field cq__grid-3" : layout?.grid ? "cq__field cq__grid-2" : "cq__field";

  if (step.kind === "singleWithText") {
    return `
      ${optionMarkup(step, selected)}
      ${subgruposMarkup(step)}
      ${camposNinho(step)}
    `;
  }

  return `<div class="${wrapClass}">${ordered.map((field) => fieldMarkup(field, step, layout)).join("")}</div>`;
}

/* ---------------------------- interação ---------------------------- */

function wireStep(index) {
  const flow = visibleSteps();
  const step = flow[index];
  const nextButton = document.querySelector("[data-next]");
  const backButton = document.querySelector("[data-back]");

  /* Voltar recalcula o fluxo, como o goNext já faz: uma tela condicional
     pode ter deixado de existir desde que esta foi montada. */
  backButton?.addEventListener("click", () => {
    const freshFlow = visibleSteps();
    const at = freshFlow.findIndex((item) => item.field === step.field);
    const previous = at > 0 ? freshFlow[at - 1] : null;
    navigate(previous ? previous.path : INTRO_PATH);
  });

  /* Tela terminal (kind "block") não tem Continuar. */
  if (!nextButton) return;

  const setEnabled = (enabled) => {
    nextButton.setAttribute("aria-disabled", enabled ? "false" : "true");
  };

  const goNext = () => {
    if (nextButton.getAttribute("aria-disabled") === "true") return;
    /* Vindo do "Editar" do prontuário, salvar volta para lá em vez de
       repetir o resto do fluxo. */
    if (emRevisao()) {
      navigate(donePath());
      return;
    }
    const freshFlow = visibleSteps();
    const currentIndex = freshFlow.findIndex((item) => item.field === step.field);
    const nextStep = freshFlow[currentIndex + 1];
    navigate(nextStep ? nextStep.path : donePath());
  };

  nextButton.addEventListener("click", goNext);

  /* Precisa vir antes das perguntas: wireFieldsStep desabilitaria o botão
     numa tela sem inputs, deixando a tela sem saída. */
  if (isInterstitial(step)) {
    wireInterstitialStep(nextButton, setEnabled);
    return;
  }

  if (step.kind === "photos") {
    wirePhotosStep(step, goNext, setEnabled);
    return;
  }

  if (step.kind === "single" || step.kind === "multiple" || step.kind === "singleWithText") {
    wireOptionsStep(step, goNext, setEnabled);
    /* O anexo nao manda no Continuar: quem decide é a resposta da pergunta,
       por isso o setEnabled aqui é um no-op. */
    if (step.slots) wirePhotosStep(step, goNext, () => {});
    return;
  }

  wireFieldsStep(step, goNext, setEnabled);
}

function wireInterstitialStep(nextButton, setEnabled) {
  setEnabled(true);
  /* preventScroll é essencial: o .cq__body rola, e focar o rodapé sem ele
     faz a tela saltar. O foco também faz o Enter funcionar sem listener. */
  nextButton.focus({ preventScroll: true });
}

function wireOptionsStep(step, goNext, setEnabled) {
  const buttons = [...document.querySelectorAll("[data-option]")];
  const inputs = [...document.querySelectorAll(".cq__input")];
  const subWraps = [...document.querySelectorAll("[data-sub-wrap]")];
  const subButtons = [...document.querySelectorAll("[data-sub-option]")];

  const subGrupo = (key) => (step.subgrupos || []).find((grupo) => grupo.key === key);

  const subValores = (key) =>
    subButtons.filter((button) => button.dataset.subOf === key && button.getAttribute("aria-pressed") === "true").map((button) => button.value);

  /* Cascata: um subgrupo escondido perde a resposta antes de o proximo ser
     avaliado, senao "Emagreceu?" continuaria de pe depois de voltar para
     "Nunca usei". A ordem do DOM e a ordem do array de subgrupos. */
  const updateSubVisibility = (chosen) => {
    subWraps.forEach((wrap) => {
      const origem = wrap.dataset.subSource === step.field ? chosen : subValores(wrap.dataset.subSource);
      const valores = (wrap.dataset.subValues || "").split("|").filter(Boolean);
      const show = valores.some((valor) => origem.includes(valor));
      wrap.hidden = !show;
      if (!show) {
        wrap.querySelectorAll("[data-sub-option]").forEach((button) => button.setAttribute("aria-pressed", "false"));
        clearAnswer(wrap.dataset.subKey);
      }
    });
  };

  const updateFieldsVisibility = () => {
    const selectedValues = buttons.filter((button) => button.getAttribute("aria-pressed") === "true").map((button) => button.value);
    document.querySelectorAll("[data-field-wrap]").forEach((wrap) => {
      const reveal = wrap.dataset.revealValues;
      if (!reveal) return;
      const from = wrap.dataset.revealFrom;
      const origem = from ? subValores(from) : selectedValues;
      const pedidos = reveal.split("|");
      const show = pedidos.includes("*") ? origem.length > 0 : pedidos.some((value) => origem.includes(value));
      wrap.hidden = !show;
      wrap.querySelectorAll(".cq__input").forEach((input) => {
        input.hidden = !show;
        if (!show) clearAnswer(input.name || input.id);
      });
    });
  };

  const update = () => {
    const chosen = buttons.filter((button) => button.getAttribute("aria-pressed") === "true").map((button) => button.value);
    saveAnswer(step.field, step.label, step.kind === "multiple" ? chosen : chosen[0] || "");
    updateSubVisibility(chosen);
    updateFieldsVisibility();

    let enabled = chosen.length > 0;

    subWraps.forEach((wrap) => {
      if (wrap.hidden) return;
      const key = wrap.dataset.subKey;
      const grupo = subGrupo(key);
      const marcados = subValores(key);
      saveAnswer(key, grupo?.label || step.label, grupo?.multiple ? marcados : marcados[0] || "");
      if (!marcados.length) enabled = false;
    });
    inputs.forEach((input) => {
      const wrap = input.closest("[data-field-wrap]");
      if (wrap?.hidden) return;
      const value = input.value.trim();
      const label = wrap?.querySelector(".cq__label")?.textContent || step.label;
      saveAnswer(input.name || input.id, label, value);
      if (wrap?.dataset.revealValues && value.length === 0) enabled = false;
    });
    setEnabled(enabled);
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const pressed = button.getAttribute("aria-pressed") === "true";
      if (step.kind !== "multiple") {
        buttons.forEach((item) => item.setAttribute("aria-pressed", "false"));
        button.setAttribute("aria-pressed", "true");
        update();
        if (step.auto) autoTimer = window.setTimeout(goNext, 220);
        return;
      }

      button.setAttribute("aria-pressed", pressed ? "false" : "true");
      if (!pressed && button.value === step.exclusive) {
        buttons.forEach((item) => {
          if (item !== button) item.setAttribute("aria-pressed", "false");
        });
      } else if (!pressed) {
        buttons
          .filter((item) => item.value === step.exclusive)
          .forEach((item) => item.setAttribute("aria-pressed", "false"));
      }
      update();
    });
  });

  subButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const grupo = subGrupo(button.dataset.subOf);
      const pressed = button.getAttribute("aria-pressed") === "true";
      if (grupo?.multiple) {
        button.setAttribute("aria-pressed", pressed ? "false" : "true");
      } else {
        subButtons
          .filter((item) => item.dataset.subOf === button.dataset.subOf)
          .forEach((item) => item.setAttribute("aria-pressed", "false"));
        button.setAttribute("aria-pressed", "true");
      }
      update();
    });
  });

  inputs.forEach((input) => input.addEventListener("input", update));
  update();
}

function wireFieldsStep(step, goNext, setEnabled) {
  const inputs = [...document.querySelectorAll(".cq__input")];
  const update = () => {
    let enabled = true;
    let hasOptionalValue = false;

    inputs.forEach((input) => {
      let value = input.value.trim();
      const format = input.dataset.format;
      if (format === "phone") {
        const end = input.selectionStart === input.value.length;
        input.value = formatPhone(input.value);
        if (end) input.selectionStart = input.selectionEnd = input.value.length;
        value = input.value;
      }
      if (format === "cpf") {
        const end = input.selectionStart === input.value.length;
        input.value = formatCpf(input.value);
        if (end) input.selectionStart = input.selectionEnd = input.value.length;
        value = input.value;
      }

      const config = step.fields.find((field) => field.key === input.name || field.key === input.id);
      const valid =
        format === "phone"
          ? digits(value).length >= 10
          : format === "cpf"
            ? digits(value).length === 11
            : input.type === "email"
              ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
              : value.length > 0;

      saveAnswer(input.name || input.id, config?.label || step.label, valid || !config?.required ? value : "");
      if (config?.required && !valid) enabled = false;
      if (!config?.required && value.length > 0) hasOptionalValue = true;
    });

    if (step.optional) enabled = true;
    if (!inputs.length) enabled = true;
    /* Passo só com campos opcionais: exige ao menos um preenchido.
       hasAttribute, e não dataset.required — o atributo é `data-required`
       sem valor, então dataset.required é "" e qualquer teste de
       verdade nele trava todo campo obrigatório. */
    const anyRequired = inputs.some((input) => input.hasAttribute("data-required"));
    if (!step.optional && !anyRequired && !hasOptionalValue) enabled = false;
    setEnabled(enabled);
  };

  inputs.forEach((input) => {
    input.addEventListener("input", update);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && input.tagName !== "TEXTAREA") {
        event.preventDefault();
        goNext();
      }
    });
  });
  update();
}

/* ------------------------- 4 · conclusão ------------------------- */

/* ------------------------------ router ------------------------------ */

function render() {
  /* Cancela auto-avanco pendente: sem isso, um clique em Continuar dentro
     da janela de 220ms deixa o timer do passo anterior navegar depois. */
  if (autoTimer) window.clearTimeout(autoTimer);
  const path = window.location.pathname.replace(/\/$/, "") || SELECT_PATH;

  if (path === SELECT_PATH) {
    document.title = "Consultório — the men's & the ladies";
    renderSelect();
  } else if (path === INTRO_PATH) {
    document.title = `${getProtocol().nome} — como funciona`;
    renderIntro();
  } else if (path === donePath()) {
    /* Bloqueio ativo fecha o prontuário também por link direto: a tela
       terminal não pode ser contornada pela URL. */
    const bloqueio = bloqueioAtivo();
    if (bloqueio) {
      history.replaceState({}, "", bloqueio.path);
      render();
      return;
    }
    document.title = "Avaliação enviada — Consultório";
    renderDone();
  } else {
    const flow = visibleSteps();
    const index = flow.findIndex((step) => step.path === path);
    const rawIndex = steps.findIndex((step) => step.path === path);

    if (index < 0 && rawIndex < 0) {
      history.replaceState({}, "", SELECT_PATH);
      document.title = "Consultório — the men's & the ladies";
      renderSelect();
      return;
    }

    document.title = `Avaliação — ${getProtocol().nome}`;

    /* O passo existe mas está invisível agora (condicional que deixou de
       valer). Recua até o primeiro visível em vez de despejar o usuário
       na pergunta 1. */
    if (index < 0) {
      let at = -1;
      for (let i = rawIndex; i >= 0 && at < 0; i--) {
        at = flow.findIndex((step) => step.field === steps[i].field);
      }
      const target = at >= 0 ? at : 0;
      history.replaceState({}, "", flow[target].path);
      renderStep(target);
      return;
    }

    renderStep(index);
  }

  document.querySelectorAll("[data-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      navigate(link.getAttribute("href"));
    });
  });
}

window.addEventListener("popstate", render);
render();
