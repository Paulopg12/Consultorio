const STORAGE_KEY = "tl-consulta-emagrecimento";
const CHECKOUT_URL = "/cart/45368212062242:1?checkout";

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
    title: "Você já foi diagnosticado com alguma das condições abaixo?",
    help: riskWarning,
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
    field: "informacoes_medico",
    label: "Informacoes adicionais",
    kind: "textarea",
    title: "Há alguma outra informação sobre sua saúde que você queira compartilhar com seu médico?",
    fields: [{ key: "informacoes_medico", type: "textarea", placeholder: "Digite aqui outras informações relevantes" }],
    optional: true,
  },
  { field: "tem_exame", label: "Exames", kind: "single", title: "Você já tem algum exame?", options: ["Sim", "Não"], auto: true },
];

steps.forEach((step, index) => {
  step.path = `/pages/consultorio-${index + 1}`;
});

const app = document.querySelector("#app");
let doneTimer;

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

function navigate(path) {
  history.pushState({}, "", path);
  render();
}

function logo() {
  return `<span class="cq__logo">the men's <span>&</span> the ladies</span>`;
}

function icon(type) {
  const icons = {
    phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="6.8" y="2.4" width="10.4" height="19.2" rx="2.6"></rect><path d="M10.4 5.6h3.2"></path><path d="M8.6 13h1.8l.9-2.1 1.5 4.2 1-2.1h1.6"></path></svg>`,
    cart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3h2.3l2 10.2a1.7 1.7 0 0 0 1.7 1.4h7.8a1.7 1.7 0 0 0 1.7-1.4L19.2 7H6"></path><circle cx="9.5" cy="19.4" r="1.4"></circle><circle cx="16.4" cy="19.4" r="1.4"></circle><path d="m10.6 9.4 1.7 1.7 3.4-3.4"></path></svg>`,
    box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.6 3.4 7v10l8.6 4.4L20.6 17V7z"></path><path d="M3.4 7 12 11.4 20.6 7"></path><path d="M12 11.4v10"></path></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 12.5 5 5 10-11"></path></svg>`,
  };
  return icons[type];
}

function renderIntro() {
  app.innerHTML = `
    <main class="cf">
      <header class="cf__bar"><h1>Emagrecimento</h1></header>
      <section class="cf__body">
        <h2 class="cf__title">Entenda como funciona:</h2>
        <ol class="cf__steps">
          <li class="cf__step">
            <span class="cf__icon">${icon("phone")}</span>
            <h3>Fale sobre sua saúde</h3>
            <p>Explique suas queixas, sintomas, histórico médico e estilo de vida.</p>
          </li>
          <li class="cf__step">
            <span class="cf__icon">${icon("cart")}</span>
            <h3>Finalize a consulta e aguarde o médico</h3>
            <p>Depois da avaliação medica você receberá a indicação do protocolo mais adequado ao seu caso.</p>
          </li>
          <li class="cf__step">
            <span class="cf__icon">${icon("box")}</span>
            <h3>Diagnóstico realizado e protocolo liberado</h3>
            <p>Com a devida indicação, poderá efetivar seu pedido na plataforma parceira e recebê-lo em sua casa.</p>
          </li>
        </ol>
        <div class="cf__cta">
          <a class="btn btn--intro" href="/pages/consultorio-1" data-link>Começar minha consulta</a>
          <p class="cf__note">*Somente o médico tem acesso ao seu histórico</p>
        </div>
      </section>
    </main>
  `;
}

function matchesCondition(condition) {
  if (!condition) return true;
  const value = getValue(condition.field);
  if (condition.equals !== undefined) return value === condition.equals;
  if (condition.includes !== undefined) return Array.isArray(value) ? value.includes(condition.includes) : value === condition.includes;
  if (condition.includesAny) {
    const values = Array.isArray(value) ? value : [value];
    return condition.includesAny.some((item) => values.includes(item));
  }
  return true;
}

function visibleSteps() {
  return steps.filter((step) => matchesCondition(step.showIf));
}

function donePath() {
  return `/pages/consultorio-${steps.length + 1}`;
}

function fieldMarkup(field, step) {
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
  const className = field.suffix ? "cq__group cq__measure" : "cq__group";

  return `
    <div class="${className}" data-field-wrap data-field-key="${field.key}" data-step-field="${step.field}"${revealValues}>
      ${label}
      ${control}
      ${suffix}
    </div>
  `;
}

function optionMarkup(step, selected) {
  return `
    <div class="cq__options">
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

function renderStep(index) {
  const flow = visibleSteps();
  const step = flow[index] || flow[0];
  const progress = `${((index + 1) / flow.length) * 100}%`;
  const selected = getValue(step.field);
  const showBack = index > 0;

  app.innerHTML = `
    <main class="cq" style="--progress:${progress}">
      <header class="cq__top">
        <div class="cq__top-inner">
          ${logo()}
          <span class="cq__count">Pergunta ${index + 1} de ${flow.length}</span>
        </div>
        <div class="cq__bar" role="progressbar" aria-valuemin="1" aria-valuemax="${flow.length}" aria-valuenow="${index + 1}">
          <span></span>
        </div>
      </header>
      <section class="cq__body">
        <h1 class="cq__question">${step.title}</h1>
        ${step.help ? `<p class="cq__help">${step.help}</p>` : ""}
        ${renderControls(step, selected)}
      </section>
      <footer class="cq__foot">
        <div class="cq__foot-inner">
          <button class="btn cq__btn" type="button" aria-disabled="true" data-next>Continuar</button>
          ${showBack ? `<button class="cq__back" type="button" data-back>Voltar</button>` : ""}
        </div>
      </footer>
    </main>
  `;

  wireStep(index);
}

function renderControls(step, selected) {
  if (step.kind === "single" || step.kind === "multiple") return optionMarkup(step, selected);

  if (step.kind === "singleWithText") {
    return `
      ${optionMarkup(step, selected)}
      <div class="cq__field cq__field--nested">
        ${step.fields.map((field) => fieldMarkup(field, step)).join("")}
      </div>
    `;
  }

  return `<div class="cq__field">${step.fields.map((field) => fieldMarkup(field, step)).join("")}</div>`;
}

function wireStep(index) {
  const flow = visibleSteps();
  const step = flow[index];
  const nextButton = document.querySelector("[data-next]");
  const backButton = document.querySelector("[data-back]");

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
  backButton?.addEventListener("click", () => navigate(flow[index - 1].path));

  if (step.kind === "single" || step.kind === "multiple" || step.kind === "singleWithText") {
    wireOptionsStep(step, goNext, setEnabled);
    return;
  }

  wireFieldsStep(step, goNext, setEnabled);
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
        if (step.auto) window.setTimeout(goNext, 220);
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
    if (!step.optional && inputs.every((input) => !input.dataset.required) && !hasOptionalValue) enabled = false;
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

function renderDone() {
  app.innerHTML = `
    <main class="done">
      <section class="done__inner">
        <span class="done__seal">${icon("check")}</span>
        <h1>Recebemos o seu pedido, um especialista deverá entrar em contato!</h1>
        <p>Estamos abrindo o seu checkout em <b data-count>5</b>s</p>
        <a class="btn cq__btn" href="${CHECKOUT_URL}">Ir para o checkout</a>
      </section>
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

function render() {
  if (doneTimer) window.clearInterval(doneTimer);
  const path = window.location.pathname.replace(/\/$/, "") || "/pages/consultorio";
  document.title = path.includes("consultorio-") ? "Consultorio - Perguntas - The Ladies" : "Consultorio - The Ladies";

  if (path === "/pages/consultorio") {
    renderIntro();
  } else if (path === donePath()) {
    renderDone();
  } else {
    const flow = visibleSteps();
    const index = flow.findIndex((step) => step.path === path);
    renderStep(index >= 0 ? index : 0);
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
