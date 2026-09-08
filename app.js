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
    status: "aberto",
    resumo:
      "Avaliação para tratamento com análogos de GLP-1 — tirzepatida e semaglutida — ou alternativa oral, conforme o seu quadro clínico.",
    specs: [
      ["Atua em", "Apetite, saciedade e esvaziamento gástrico"],
      ["Via", "Oral ou injetável"],
      ["Prescrição", "Sujeita à avaliação médica"],
    ],
  },
  { id: "cabelo", nome: "Cabelo", status: "breve" },
  { id: "forca", nome: "Força", status: "breve" },
  { id: "sono", nome: "Sono", status: "breve" },
  { id: "ejaculacao-precoce", nome: "Ejaculação precoce", status: "breve" },
  { id: "disfuncao-eretil", nome: "Disfunção erétil", status: "breve" },
];

const riskWarning =
  "Se algum dos casos acima for o seu, os medicamentos injetáveis ou voltados para emagrecimento podem interagir com os tratamentos que você realiza. Sugerimos a ida até seu médico para que ele avalie o uso concomitante de semaglutida, tirzepatida, metformina, entre outros.";

const steps = [
  {
    field: "identificacao",
    label: "Identificação",
    kind: "fields",
    title: "Identificação",
    help: "Preencha seus dados para iniciar a avaliação médica.",
    fields: [
      { key: "cpf", label: "CPF", type: "text", placeholder: "000.000.000-00", required: true, format: "cpf" },
      { key: "nome", label: "Nome", type: "text", placeholder: "Nome completo", required: true },
      { key: "telefone", label: "Telefone", type: "tel", placeholder: "(11) 91234-5678", required: true, format: "phone" },
      { key: "nascimento", label: "Nascimento", type: "date", required: true },
      { key: "email", label: "E-mail", type: "email", placeholder: "você@email.com", required: true },
    ],
  },
  {
    field: "info_normalizacao",
    kind: "info",
    label: "Contexto",
    eyebrow: "Contexto",
    title: "Emagrecer não é só força de vontade.",
    body: [
      "Peso corporal depende de hormônios, sono, rotina e histórico de saúde — não apenas de disciplina. É por isso que as próximas perguntas cobrem tanto o seu dia a dia quanto o seu histórico médico.",
      "Quanto mais preciso o retrato, melhor a indicação que o médico consegue fazer.",
    ],
    cta: "Entendi",
  },
  { field: "sexo_biologico", label: "Sexo biológico", kind: "single", title: "Qual seu sexo biológico?", options: ["Masculino", "Feminino"], auto: true },
  {
    field: "grávida_amamentando",
    label: "Gravidez ou amamentação",
    kind: "single",
    title: "Você está grávida ou amamentando?",
    help: "Os tratamentos propostos não são indicados para gestantes ou lactantes sem orientação da obstetra.",
    options: ["Não", "Sim"],
    showIf: { field: "sexo_biologico", equals: "Feminino" },
    auto: true,
  },
  {
    field: "meta_perda",
    label: "Meta de perda de peso",
    kind: "single",
    title: "Qual a sua meta de perda de peso?",
    options: ["Menos de 5% do peso corporal", "Entre 6%-15% do peso corporal", "Acima de 16% do peso corporal"],
    auto: true,
  },
  {
    field: "peso_atual",
    label: "Peso atual",
    kind: "number",
    title: "Qual seu peso?",
    fields: [{ key: "peso_atual", type: "number", placeholder: "Digite seu peso em kg", suffix: "kg", required: true }],
  },
  {
    field: "peso_meta",
    label: "Meta de peso",
    kind: "number",
    title: "Qual sua meta de peso?",
    fields: [{ key: "peso_meta", type: "number", placeholder: "Digite sua meta de peso em kg", suffix: "kg", required: true }],
  },
  {
    field: "altura",
    label: "Altura",
    kind: "number",
    title: "Qual sua altura?",
    help: "Se o IMC calculado ficar abaixo de 25, a indicação tende a priorizar alternativa oral ou dietética.",
    fields: [{ key: "altura", type: "number", placeholder: "Digite sua altura em cm", suffix: "cm", required: true }],
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
    field: "gordura_acumulada",
    label: "Gordura acumulada",
    kind: "single",
    title: "Qual parte do corpo você nota que tem mais gordura acumulada?",
    options: ["Na barriga", "Quadris e coxas", "Corpo todo"],
    auto: true,
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
    field: "info_transicao_saude",
    kind: "info",
    label: "Próxima etapa",
    eyebrow: "Próxima etapa",
    title: "Agora, o seu histórico de saúde.",
    body: [
      "As próximas perguntas são sobre diagnósticos, medicamentos em uso e histórico familiar. Algumas parecem distantes do emagrecimento, mas são elas que descartam interações e contraindicações.",
      "Se não souber responder alguma com precisão, responda o mais próximo do que lembra — há um campo aberto no fim para detalhar.",
    ],
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
    field: "info_purgacao",
    kind: "info",
    label: "Cuidado",
    eyebrow: "Cuidado",
    title: "Sobre o que você acabou de relatar.",
    body: [
      "Provocar vómito depois de comer — com ou sem laxantes ou diuréticos — traz risco real ao esôfago, aos dentes e ao equilíbrio de potássio e sódio no sangue, e pode alterar o ritmo do coração.",
      "Isso não interrompe a sua avaliação, mas muda a conduta e o médico vai olhar para esse ponto com atenção. Se quiser falar com alguém agora, o CVV atende de graça, 24 horas, no 188.",
    ],
    cta: "Entendi",
    showIf: { field: "vômito_induzido", equals: "Sim" },
  },
  {
    field: "condicoes_restritivas",
    label: "Condicoes restritivas",
    kind: "multiple",
    title: "Você já foi diagnosticado com alguma das condições abaixo?",
    options: [
      "Insuficiência renal moderada ou grave",
      "Pancreatite aguda ou crônica",
      "Câncer de tireoide (CMT ou carcinoma medular da tireoide)",
      "Síndrome de neoplasia endócrina múltipla tipo 2 (MEN 2)",
      "Doença hepática",
      "Transtorno alimentar (ex: bulimia, anorexia)",
      "Cirurgia bariátrica",
      "Nenhuma das anteriores",
    ],
    exclusive: "Nenhuma das anteriores",
  },
  {
    field: "alerta_contraindicacao",
    kind: "info",
    label: "Atenção",
    eyebrow: "Atenção",
    title: "Uma das condições que você marcou pede cautela.",
    body: [riskWarning],
    cta: "Entendi",
    showIf: {
      field: "condicoes_restritivas",
      includesAny: [
        "Insuficiência renal moderada ou grave",
        "Pancreatite aguda ou crônica",
        "Câncer de tireoide (CMT ou carcinoma medular da tireoide)",
        "Síndrome de neoplasia endócrina múltipla tipo 2 (MEN 2)",
        "Doença hepática",
        "Transtorno alimentar (ex: bulimia, anorexia)",
        "Cirurgia bariátrica",
      ],
    },
  },
  {
    field: "diagnosticos_metabolicos",
    label: "Diagnósticos metabólicos",
    kind: "multiple",
    title: "Você já foi diagnosticado com alguma das condições abaixo?",
    options: ["Diabetes tipo 1", "Diabetes tipo 2", "Doença inflamatória intestinal", "Hipotireoidismo / Hipertireoidismo", "Nenhuma das anteriores"],
    exclusive: "Nenhuma das anteriores",
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
    showIf: { field: "diagnosticos_metabolicos", includesAny: ["Diabetes tipo 1", "Diabetes tipo 2"] },
  },
  {
    field: "medicamentos_diabetes",
    label: "Medicamentos para diabetes",
    kind: "textarea",
    title: "Você utiliza insulina ou outro remédio para diabetes?",
    fields: [
      {
        key: "medicamentos_diabetes",
        type: "textarea",
        placeholder: "Descreva todos os medicamentos que você utiliza, incluindo nome, dosagem e frequência.",
        required: true,
      },
    ],
    showIf: { field: "diagnosticos_metabolicos", includesAny: ["Diabetes tipo 1", "Diabetes tipo 2"] },
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
    field: "toma_medicamento",
    label: "Uso de medicamentos",
    kind: "singleWithText",
    title: "Você toma algum medicamento?",
    options: ["Sim", "Não"],
    fields: [
      {
        key: "medicamentos_descricao",
        label: "Quais medicamentos?",
        type: "textarea",
        placeholder: "Descreva todos os medicamentos que você utiliza, incluindo nome, dosagem e frequência.",
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
    field: "info_validacao",
    kind: "info",
    label: "Contexto",
    eyebrow: "Contexto",
    title: "Você já tentou pelos caminhos certos.",
    body: [
      "Dieta, contagem de calorias e acompanhamento profissional funcionam para muita gente — e quando não funcionam, isso raramente é falta de esforço. A regulação do apetite tem componente hormonal, e é aí que o tratamento medicamentoso pode entrar.",
      "O médico considera o que você já tentou justamente para não repetir o que não deu resultado.",
    ],
    showIf: {
      field: "tentativas",
      includesAny: [
        "Dieta",
        "Contagem de calorias",
        "Acompanhamento com nutricionista",
        "Acompanhamento com nutrólogo/endocrinologista",
      ],
    },
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
    title: "Você possui alguma das condições médicas listadas abaixo?",
    options: [
      "Doenças do coração, ou relacionadas ao coração (ex: pressão alta)",
      "Doenças hormonais, renais(rins) ou hepáticas(fígado)",
      "Doenças do estômago ou intestino",
      "Histórico de convulsões",
      "Glaucoma",
      "Câncer (atualmente)",
      "Fibrose cística",
      "Nenhuma das anteriores",
    ],
    exclusive: "Nenhuma das anteriores",
  },
  {
    field: "condicoes_atuais",
    label: "Condicoes atuais",
    kind: "multiple",
    title: "Você tem atualmente, ou já foi diagnosticado com alguma das seguintes condições?",
    options: [
      "Depressão",
      "Hipertensão (pressão alta)",
      "Colesterol/triglicerídeos altos ou gordura no fígado",
      "Inchaço crônico nas pernas ou linfedema",
      "Refluxo esofágico",
      "Dores nas costas ou osteoartrite",
      "Síndrome metabólica ou diabetes tipo 2",
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
    field: "medicamento_suplemento_30d",
    label: "Medicamentos ou suplementos",
    kind: "singleWithText",
    title: "Nos últimos 30 dias você tomou algum medicamento ou suplemento regularmente?",
    options: ["Não", "Sim"],
    fields: [{ key: "medicamento_suplemento_30d_quais", label: "Se sim, quais?", type: "textarea", placeholder: "Se sim, quais?", revealValues: ["Sim"] }],
  },
  {
    field: "semaglutida_tirzepatida",
    label: "Uso anterior",
    kind: "singleWithText",
    title: "Você já utilizou Semaglutida ou Tirzepatida? Como foi o tratamento?",
    options: ["Nunca usei", "Sim"],
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
    field: "info_seguranca",
    kind: "info",
    label: "Segurança",
    eyebrow: "Segurança",
    title: "Como a prescrição funciona aqui.",
    body: [
      "Nenhum medicamento é liberado sem prescrição. Um médico revisa as suas respostas, decide se há indicação e define o princípio ativo, a via de administração e a dose inicial.",
      "As próximas perguntas são sobre a sua preferência. Elas orientam o médico, mas não substituem a decisão clínica dele.",
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
    kind: "singleWithText",
    title: "Você possui alguma alergia? (Exemplo: Semaglutida, Tirzepatida, Liraglutida, etc)",
    options: ["Sim", "Não"],
    fields: [{ key: "alergia_qual", label: "Se sim, qual medicamento?", type: "textarea", placeholder: "Se sim, qual medicamento?", revealValues: ["Sim"] }],
  },
  { field: "via_tratamento", label: "Via de tratamento", kind: "single", title: "Você gostaria de um tratamento por via oral ou injetável?", options: ["Oral", "Injetável"], auto: true },
  {
    field: "dosagem_baixa",
    label: "Dosagem inicial",
    kind: "single",
    title: "Você gostaria de começar com uma dosagem mais baixa para evitar possíveis efeitos colaterais e entender como seu corpo vai reagir?",
    options: ["Sim", "Não"],
    auto: true,
  },
  {
    field: "info_quase_la",
    kind: "info",
    label: "Quase lá",
    eyebrow: "Quase lá",
    title: "Faltam duas perguntas.",
    body: [
      "A próxima é um campo aberto, para contar qualquer coisa que as perguntas anteriores não cobriram. É opcional — mas é onde o médico costuma encontrar o detalhe que muda a conduta.",
    ],
  },
  {
    field: "informacoes_medico",
    label: "Informacoes adicionais",
    kind: "textarea",
    title: "Há alguma outra informação sobre sua saúde que você queira compartilhar com seu médico?",
    fields: [{ key: "informacoes_medico", type: "textarea", placeholder: "Digite aqui outras informações relevantes" }],
    optional: true,
  },
  { field: "tem_exame", label: "Exames", kind: "single", title: "Você já tem algum exame?", options: ["Sim", "Não"], auto: true },
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

/* Layout dos passos com muitos campos: evita campo solto em meia coluna. */
const fieldLayout = {
  identificacao: {
    grid: true,
    order: ["nome", "cpf", "nascimento", "telefone", "email"],
    wide: ["nome"],
  },
};

const app = document.querySelector("#app");
let doneTimer;
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

function wordmark() {
  return `<span class="wordmark">the men&rsquo;s <i>&amp;</i> the ladies</span>`;
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
          <h2 class="ps__card-name">${item.nome}</h2>
          <span class="ps__card-cta">Começar avaliação ${icon("arrow")}</span>
        </a>`;
      }
      return `
        <div class="ps__card ps__card--soon" role="listitem" aria-disabled="true">
          <span class="ps__badge ps__badge--soon">Em breve</span>
          <h2 class="ps__card-name">${item.nome}</h2>
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
        <h1 class="ps__title">O que você quer tratar?</h1>
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
              ([nomeIcone, titulo, texto, quando]) => `
            <li class="ci__step">
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
  const revealValues = field.revealValues ? ` data-reveal-values="${field.revealValues.join("|")}" hidden` : "";
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

function optionMarkup(step, selected) {
  /* Listas longas vão para duas colunas: mantém tudo na primeira tela. */
  const dense = step.options.length > 6 ? " cq__options--dense" : "";
  const multi = step.kind === "multiple" ? " cq__options--multi" : "";

  const hint = step.kind === "multiple" ? `<p class="cq__multi-hint">Selecione todas que se aplicam</p>` : "";

  return `
    ${hint}
    <div class="cq__options${dense}${multi}" role="group">
      ${step.options
        .map((option) => {
          const pressed = Array.isArray(selected) ? selected.includes(option) : selected === option;
          return `<button class="cq__option" type="button" value="${option}" aria-pressed="${pressed}" data-option>${option}</button>`;
        })
        .join("")}
    </div>
  `;
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

/* --------------------- 3 · tela de pergunta --------------------- */

function renderStep(index) {
  const flow = visibleSteps();
  const step = flow[index] || flow[0];
  const progress = `${((index + 1) / flow.length) * 100}%`;
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
  const showHint = !interstitial && step.kind !== "single" && step.kind !== "multiple";

  app.innerHTML = `
    <main class="cq" style="--progress:${progress}">
      <header class="cq__top">
        <div class="cq__top-inner">
          ${wordmark()}
          <div class="cq__meta">
            <span class="cq__protocol">${protocolo.nome}</span>
            <span class="cq__meta-sep" aria-hidden="true"></span>
            <span>${interstitial ? step.eyebrow || "Informação" : `${questionNumber}/${questionTotal}`}</span>
          </div>
        </div>
        <div class="cq__bar" role="progressbar" aria-valuemin="1" aria-valuemax="${flow.length}" aria-valuenow="${index + 1}">
          <span></span>
        </div>
      </header>

      <div class="cq__body">
        <div class="cq__body-inner">
          <h1 class="cq__question">${step.title}</h1>
          ${step.help ? `<p class="cq__help">${step.help}</p>` : ""}
          ${renderControls(step, selected)}
        </div>
      </div>

      <footer class="cq__foot">
        <div class="cq__foot-inner">
          <button class="btn" type="button" aria-disabled="${interstitial ? "false" : "true"}" data-next>${step.cta || "Continuar"} ${icon("arrow")}</button>
          ${showBack ? `<button class="cq__back" type="button" data-back>Voltar</button>` : ""}
          ${showHint ? `<span class="cq__hint">Enter para avançar</span>` : ""}
        </div>
      </footer>
    </main>
  `;

  wireStep(index);
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

  if (step.kind === "single" || step.kind === "multiple") return optionMarkup(step, selected);

  const layout = fieldLayout[step.field];
  const ordered = layout?.order
    ? layout.order.map((key) => step.fields.find((field) => field.key === key)).filter(Boolean)
    : step.fields;
  const wrapClass = layout?.grid ? "cq__field cq__grid-2" : "cq__field";

  if (step.kind === "singleWithText") {
    return `
      ${optionMarkup(step, selected)}
      <div class="cq__field cq__field--nested">
        ${step.fields.map((field) => fieldMarkup(field, step)).join("")}
      </div>
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

  if (step.kind === "single" || step.kind === "multiple" || step.kind === "singleWithText") {
    wireOptionsStep(step, goNext, setEnabled);
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

  const updateFieldsVisibility = () => {
    const selectedValues = buttons.filter((button) => button.getAttribute("aria-pressed") === "true").map((button) => button.value);
    document.querySelectorAll("[data-field-wrap]").forEach((wrap) => {
      const reveal = wrap.dataset.revealValues;
      if (!reveal) return;
      const show = reveal.split("|").some((value) => selectedValues.includes(value));
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
    updateFieldsVisibility();

    let enabled = chosen.length > 0;
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

function renderDone() {
  app.innerHTML = `
    <main class="done">
      <div class="done__inner">
        <span class="done__seal">${icon("check")}</span>
        <h1>Recebemos as suas respostas</h1>
        <p>Um especialista entra em contato com o resultado da avaliação médica. Abrindo o checkout em <b data-count>5</b>s.</p>
        <a class="btn" href="${CHECKOUT_URL}">Ir para o checkout ${icon("arrow")}</a>
      </div>
    </main>
  `;

  let remaining = 5;
  const count = document.querySelector("[data-count]");
  doneTimer = window.setInterval(() => {
    remaining -= 1;
    count.textContent = String(Math.max(remaining, 0));
    if (remaining <= 0) {
      window.clearInterval(doneTimer);
      window.location.href = CHECKOUT_URL;
    }
  }, 1000);
}

/* ------------------------------ router ------------------------------ */

function render() {
  if (doneTimer) window.clearInterval(doneTimer);
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
