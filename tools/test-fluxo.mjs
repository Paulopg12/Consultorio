/**
 * Testes do fluxo do consultório.
 *
 *   cd tools && npm install && npm test
 *
 * Executa o app.js real dentro do jsdom e percorre o questionário de ponta
 * a ponta. Cobre o que já quebrou antes: o Continuar travado em passo de
 * campo, o auto-avanço navegando a partir de um passo trocado, e a rota de
 * passo condicional invisível caindo na pergunta 1.
 */
import { JSDOM, VirtualConsole } from "jsdom";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appJs = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let falhas = 0;
let total = 0;

function check(nome, condicao, detalhe = "") {
  total += 1;
  if (condicao) {
    console.log(`  ok    ${nome}`);
  } else {
    falhas += 1;
    console.log(`  FALHA ${nome}${detalhe ? "  — " + detalhe : ""}`);
  }
}

function boot(rota, estado = null) {
  /* jsdom nao implementa scrollTo nem navegacao; o resto passa. */
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    if (!/Not implemented/.test(e.message)) console.error("  jsdom:", e.message);
  });
  const dom = new JSDOM(`<!doctype html><html><body><div id="app"></div></body></html>`, {
    url: `https://consultorio.test${rota}`,
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const { window } = dom;
  const erros = [];
  window.onerror = (m) => erros.push(String(m));
  if (estado) window.localStorage.setItem("tl-consulta-emagrecimento", JSON.stringify(estado));
  /* function declarations vazam para o global no eval, mas `const steps`
     não — por isso o array é exposto explicitamente. */
  window.eval(appJs + ";window.__api = { steps, visibleSteps, computeImc, posImc };");
  window.scrollTo = () => {};
  return { window, doc: window.document, erros };
}

const resposta = (valor, rotulo = "x") => ({ rotulo, valor });

/* A rota depende da posicao no array, que muda a cada tela nova. */
function rotaDe(field) {
  const { window } = boot("/pages/consultorio-1");
  const step = window.__api.steps.find((s) => s.field === field);
  if (!step) throw new Error("step nao encontrado: " + field);
  return step.path;
}

const ROTA_IMC = rotaDe("insight_imc");

/* ------------------------------------------------------------------ */
console.log("\n1. cálculo de IMC");
{
  const casos = [
    ["cm inteiro", { peso_atual: "92", altura: "178" }, "29"],
    ["metros com vírgula", { peso_atual: "92", altura: "1,78" }, "29"],
    ["peso com vírgula", { peso_atual: "92,5", altura: "178" }, "29,2"],
    ["altura com sufixo", { peso_atual: "80", altura: "170 cm" }, "27,7"],
  ];
  for (const [nome, dados, esperado] of casos) {
    const estado = Object.fromEntries(Object.entries(dados).map(([k, v]) => [k, resposta(v)]));
    const { doc } = boot(ROTA_IMC, estado);
    const valor = doc.querySelector(".imc__value")?.textContent.trim();
    check(`${nome} → IMC ${esperado}`, valor === esperado, `veio "${valor}"`);
  }

  // sem dados a tela nem deve existir
  const { doc } = boot(ROTA_IMC, {});
  check("sem peso/altura a tela de IMC não aparece", !doc.querySelector(".imc"));
  check("  e não renderiza NaN em lugar nenhum", !doc.body.textContent.includes("NaN"));
}

/* ------------------------------------------------------------------ */
console.log("\n1b. peso atual, depois meta e altura");
{
  /* O peso atual vem sozinho e antes da meta: as faixas em quilos da meta
     de perda saem dele. */
  const peso = boot(rotaDe("peso_atual"));
  const camposPeso = [...peso.doc.querySelectorAll("[data-field-key]")].map((f) => f.dataset.fieldKey);
  check("peso atual sozinho na tela", camposPeso.join(",") === "peso_atual", camposPeso.join(","));
  check("vem antes da meta de perda", rotaDe("peso_atual") < rotaDe("meta_perda"), "ordem trocada");
  check("Continuar travado sem o peso", peso.doc.querySelector("[data-next]").getAttribute("aria-disabled") === "true");

  /* Faixa em quilos calculada sobre o peso informado. */
  const metaSemPeso = boot(rotaDe("meta_perda"));
  check("sem peso, a opcao nao inventa quilo", !metaSemPeso.doc.querySelector(".cq__option-detail"));
  const meta = boot(rotaDe("meta_perda"), { peso_atual: resposta("100") });
  const detalhes = [...meta.doc.querySelectorAll(".cq__option-detail")].map((d) => d.textContent.trim());
  check("cada faixa mostra o quilo", detalhes.length === 3, detalhes.join(" | "));
  check("5% de 100 kg = ate 5 kg", (detalhes[0] || "").includes("5 kg"), detalhes[0]);
  check("faixa do meio de 6 a 15 kg", (detalhes[1] || "").includes("6 kg") && (detalhes[1] || "").includes("15 kg"), detalhes[1]);
  check("acima de 16 kg ou mais", (detalhes[2] || "").includes("16 kg"), detalhes[2]);
  check(
    "o valor gravado continua sendo a faixa",
    [...meta.doc.querySelectorAll("[data-option]")].every((o) => o.value.includes("%"))
  );

  const { doc, window, erros } = boot(rotaDe("medidas"));
  const campos = [...doc.querySelectorAll("[data-field-key]")].map((f) => f.dataset.fieldKey);
  check("meta e altura na mesma tela", campos.join(",") === "peso_meta,altura", campos.join(","));
  check("em duas colunas", !!doc.querySelector(".cq__grid-2"));
  check("cada um com rotulo", doc.querySelectorAll(".cq__label").length === 2);
  check(
    "sufixos kg e cm",
    [...doc.querySelectorAll(".cq__unit")].map((u) => u.textContent.trim()).join(",") === "kg,cm"
  );
  check("avisa da altura sem pontuacao", (doc.querySelector(".cq__aviso")?.textContent || "").includes("175"));
  check(
    "todos obrigatorios",
    [...doc.querySelectorAll(".cq__input")].every((i) => i.hasAttribute("data-required"))
  );
  check("Continuar comeca travado", doc.querySelector("[data-next]").getAttribute("aria-disabled") === "true");

  for (const [id, valor] of [["peso_meta", "78"], ["altura", "178"]]) {
    const input = doc.getElementById(id);
    input.value = valor;
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  }
  check("destrava com os dois preenchidos", doc.querySelector("[data-next]").getAttribute("aria-disabled") === "false");

  const estado = JSON.parse(window.localStorage.getItem("tl-consulta-emagrecimento") || "{}");
  check("grava nas chaves antigas", ["peso_meta", "altura"].every((k) => estado[k]));
  check("sem erro de runtime", erros.length === 0, erros.join(" | "));
}

/* ------------------------------------------------------------------ */
console.log("\n1c. barra por etapas");
{
  const { doc } = boot(rotaDe("identificacao"));
  const segmentos = [...doc.querySelectorAll(".cq__bar-seg")];
  check("a barra tem um segmento por etapa", segmentos.length >= 5, String(segmentos.length));
  check("primeira etapa em andamento", (segmentos[0]?.getAttribute("style") || "").includes("--seg:"));
  check("as seguintes vazias", (segmentos[1]?.getAttribute("style") || "").includes("--seg:0%"));
  check("o cabecalho diz a etapa", /Etapa 1\//.test(doc.querySelector(".cq__meta").textContent));
  check("e o nome dela", (doc.querySelector(".cq__etapa-nome")?.textContent || "").length > 3);

  const fim = boot(rotaDe("cpf"));
  const ultimos = [...fim.doc.querySelectorAll(".cq__bar-seg")];
  check("na ultima etapa as anteriores estao cheias", (ultimos[0]?.getAttribute("style") || "").includes("--seg:100%"));
  check(
    "e o contador de etapa chegou no fim",
    /Etapa (\d+)\/\1/.test(fim.doc.querySelector(".cq__meta").textContent),
    fim.doc.querySelector(".cq__meta").textContent.trim()
  );
}

/* ------------------------------------------------------------------ */
console.log("\n1d. perguntas encadeadas na mesma tela");
{
  /* Uso anterior: "Sim" abre qual dos dois, e a escolha abre "Emagreceu?". */
  const { doc, window } = boot(rotaDe("semaglutida_tirzepatida"));
  const subs = [...doc.querySelectorAll("[data-sub-wrap]")];
  check("dois subgrupos no DOM", subs.length === 2, String(subs.length));
  check("ambos escondidos no comeco", subs.every((s) => s.hidden));

  const sim = [...doc.querySelectorAll("[data-option]")].find((o) => o.value === "Sim");
  sim.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  check("o Sim abre qual dos dois", !doc.querySelector('[data-sub-key="semaglutida_tirzepatida_qual"]').hidden);
  check("mas ainda nao o Emagreceu", doc.querySelector('[data-sub-key="semaglutida_tirzepatida_emagreceu"]').hidden);
  check("Continuar travado enquanto falta o qual", doc.querySelector("[data-next]").getAttribute("aria-disabled") === "true");

  const qual = doc.querySelector('[data-sub-of="semaglutida_tirzepatida_qual"]');
  qual.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  check("escolher o medicamento abre o Emagreceu", !doc.querySelector('[data-sub-key="semaglutida_tirzepatida_emagreceu"]').hidden);

  const emagreceu = doc.querySelector('[data-sub-of="semaglutida_tirzepatida_emagreceu"]');
  emagreceu.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  const estado = () => JSON.parse(window.localStorage.getItem("tl-consulta-emagrecimento") || "{}");
  check("grava as tres respostas", ["semaglutida_tirzepatida", "semaglutida_tirzepatida_qual", "semaglutida_tirzepatida_emagreceu"].every((k) => estado()[k]));

  /* Voltar para "Nunca usei" nao pode deixar resposta orfa. */
  const nunca = [...doc.querySelectorAll("[data-option]")].find((o) => o.value === "Nunca usei");
  nunca.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  check(
    "trocar para Nunca usei limpa a cascata",
    !estado().semaglutida_tirzepatida_qual && !estado().semaglutida_tirzepatida_emagreceu
  );

  /* Efeito colateral: "Sim" abre a lista, e a lista abre a caixa de texto. */
  const col = boot(rotaDe("colateral"));
  check("a pergunta virou efeito colateral", col.doc.querySelector(".cq__question").textContent.includes("colateral"));
  const colSim = [...col.doc.querySelectorAll("[data-option]")].find((o) => o.value === "Sim");
  colSim.dispatchEvent(new col.window.MouseEvent("click", { bubbles: true }));
  const lista = col.doc.querySelector('[data-sub-key="colateral_quais"]');
  check("o Sim abre a lista de exemplos", !lista.hidden);
  check("a caixa de texto ainda esta fechada", col.doc.querySelector('[data-field-key="colateral_relato"]').hidden);
  const doisPrimeiros = [...col.doc.querySelectorAll('[data-sub-of="colateral_quais"]')].slice(0, 2);
  doisPrimeiros.forEach((b) => b.dispatchEvent(new col.window.MouseEvent("click", { bubbles: true })));
  check("aceita mais de um efeito", doisPrimeiros.every((b) => b.getAttribute("aria-pressed") === "true"));
  check("escolher um efeito abre a caixa", !col.doc.querySelector('[data-field-key="colateral_relato"]').hidden);
  check("a alergia saiu do fluxo", !col.window.__api.steps.some((s) => s.field === "alergia"));
  check("a via de tratamento saiu do fluxo", !col.window.__api.steps.some((s) => s.field === "via_tratamento"));
  check("a tela de validacao saiu do fluxo", !col.window.__api.steps.some((s) => s.field === "info_validacao"));
}

/* ------------------------------------------------------------------ */
console.log("\n1e. identificacao, e-mail e CPF");
{
  const ident = boot(rotaDe("identificacao"));
  const campos = [...ident.doc.querySelectorAll("[data-field-key]")].map((f) => f.dataset.fieldKey);
  check("identificacao pede so nome e telefone", campos.join(",") === "nome,telefone", campos.join(","));

  const email = boot(rotaDe("email"));
  check("o e-mail virou tela propria", email.doc.querySelector(".cq__input")?.type === "email");
  check("e vem antes das horas de sono", rotaDe("email") < rotaDe("horas_sono"), "ordem trocada");

  const cpf = boot(rotaDe("cpf"));
  check("o CPF vem depois das fotos", rotaDe("cpf") > rotaDe("fotos_corpo"), "ordem trocada");
  check("e explica que e da prescricao", (cpf.doc.querySelector(".cq__help")?.textContent || "").includes("prescri"));

  const nasc = boot(rotaDe("nascimento"));
  check("a idade virou tela propria", nasc.doc.querySelector(".cq__input")?.type === "date");
  check("com o titulo da idade", nasc.doc.querySelector(".cq__question").textContent.includes("idade"));
}

/* ------------------------------------------------------------------ */
console.log("\n1f. exame anexado na propria pergunta");
{
  const { doc, window } = boot(rotaDe("tem_exame"));
  const area = doc.querySelector(".cq__anexo");
  check("a area de envio existe", !!area);
  check("escondida antes da resposta", area.hidden);
  const sim = [...doc.querySelectorAll("[data-option]")].find((o) => o.value === "Sim");
  sim.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  check("o Sim abre a area de envio", !doc.querySelector(".cq__anexo").hidden);
  check("com um card de arquivo", doc.querySelectorAll(".cq__anexo .ph__card").length === 1);
  check("aceita PDF", (doc.querySelector(".cq__anexo .ph__btn--ghost [data-input]")?.accept || "").includes("pdf"));
  check("sem silhueta de corpo", !doc.querySelector(".cq__anexo .ph__silhueta"));
  check("nao avanca sozinho", window.location.pathname === rotaDe("tem_exame"));

  const nao = [...doc.querySelectorAll("[data-option]")].find((o) => o.value === "N\u00e3o");
  nao.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  check("o Nao fecha a area de envio", doc.querySelector(".cq__anexo").hidden);
}

/* ------------------------------------------------------------------ */
console.log("\n2. telas informativas");
{
  const estado = { peso_atual: resposta("92"), peso_meta: resposta("78"), altura: resposta("178") };
  const { doc, erros } = boot(ROTA_IMC, estado);
  const next = doc.querySelector("[data-next]");
  check("Continuar nasce habilitado", next?.getAttribute("aria-disabled") === "false");
  check("rodapé sem rótulo de atalho", !doc.querySelector(".cq__foot").textContent.includes("Enter"));
  check("contador dá lugar ao rótulo", doc.querySelector(".cq__meta span:last-child")?.textContent.trim() === "Seus números");
  check("tem régua com posição", !!doc.querySelector(".imc__scale")?.getAttribute("style")?.includes("--pos"));
  check("sem erro de runtime", erros.length === 0, erros.join(" | "));

  // clicar avança
  const antes = doc.defaultView.location.pathname;
  next.dispatchEvent(new doc.defaultView.MouseEvent("click", { bubbles: true }));
  check("Continuar avança", doc.defaultView.location.pathname !== antes);
}

/* ------------------------------------------------------------------ */
console.log("\n3. condicionais das telas informativas");
{
  /* As telas de purgacao e de contraindicacao foram removidas a pedido:
     nenhum aviso de cuidado clinico sobrou no fluxo. */
  const comSim = boot("/pages/consultorio-1", { "vômito_induzido": resposta("Sim") });
  const temPurgacao = comSim.window.eval('visibleSteps().some(s => s.field === "info_purgacao")');
  check("tela de purgação nao existe mais", temPurgacao === false);
  check(
    "o canal do CVV nao aparece em passo nenhum",
    comSim.window.__api.steps.every((s) => !JSON.stringify(s).includes("188"))
  );

  /* A tela de alerta de contraindicacao foi removida a pedido; o aviso de
     interacao medicamentosa nao existe mais em ponto nenhum do fluxo. */
  const comCondicao = boot("/pages/consultorio-1", { condicoes_restritivas: resposta(["Pancreatite aguda ou crônica"]) });
  const temAlerta = comCondicao.window.eval('visibleSteps().some(s => s.field === "alerta_contraindicacao")');
  check("tela de alerta nao existe mais", temAlerta === false);
  check(
    "o aviso de interacao nao aparece em passo nenhum",
    comCondicao.window.__api.steps.every((s) => !JSON.stringify(s).includes("podem interagir com os tratamentos"))
  );
}

/* ------------------------------------------------------------------ */
console.log("\n4. rota de passo invisível não cai na pergunta 1");
{
  // consultorio-4 = grávida/amamentando, só existe se sexo = Feminino
  const { doc, window } = boot(rotaDe("grávida_amamentando"), { sexo_biologico: resposta("Masculino") });
  const pergunta = doc.querySelector(".cq__question")?.textContent.trim() || "";
  check("não renderiza a Identificação", !pergunta.startsWith("Identificação"), `veio "${pergunta}"`);
  check("reescreve a URL para um passo visível", window.location.pathname !== rotaDe("grávida_amamentando"));
}

/* ------------------------------------------------------------------ */
console.log("\n5. unicidade de field (duplicado quebraria goNext em loop)");
{
  const { window } = boot("/pages/consultorio-1");
  const vistos = new Set();
  const dups = [];
  window.__api.steps.forEach((s) => {
    if (vistos.has(s.field)) dups.push(s.field);
    vistos.add(s.field);
  });
  check("nenhum field duplicado", dups.length === 0, dups.join(", "));
  check("todo step tem field", window.__api.steps.every((s) => !!s.field));
  console.log(`        (${window.__api.steps.length} steps, ${window.__api.steps.filter((s) => s.kind === "info").length} telas informativas)`);
}

/* ------------------------------------------------------------------ */
console.log("\n6. por que perguntamos (pop-up)");
{
  const { doc, window } = boot(rotaDe("sexo_biologico"));
  const botao = doc.querySelector("[data-why]");
  const dialog = doc.querySelector("[data-why-dialog]");
  check("pergunta de sexo tem o botao", !!botao);
  check("o dialog existe no DOM", !!dialog);
  check("comeca fechado", dialog ? !dialog.open : false);
  if (botao && dialog) {
    botao.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    check("clicar abre", dialog.open === true);
    dialog.querySelector("[data-why-close]").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    check("botao de fechar fecha", dialog.open === false);
  }
  check("tem a nota de privacidade", !!doc.querySelector(".modal__note"));
  const outra = boot(rotaDe("alcool"));
  check("pergunta sem `why` nao ganha botao", !outra.doc.querySelector("[data-why]"));
}

/* ------------------------------------------------------------------ */
console.log("\n7. envio de fotos");
{
  const { doc } = boot(rotaDe("fotos_corpo"));
  check("dois cards", doc.querySelectorAll(".ph__card").length === 2);
  const rotulos = [...doc.querySelectorAll(".ph__label")].map((l) => l.textContent.trim()).join(" | ");
  check("rotulos corretos", rotulos === "Corpo de frente | Corpo de lado", rotulos);
  check(
    "cada card tem camera e arquivo",
    [...doc.querySelectorAll(".ph__card")].every((c) => c.querySelectorAll("[data-input]").length === 2)
  );
  check("botao de camera usa capture", !!doc.querySelector('[capture="environment"]'));
  check(
    "aceita so jpg e png",
    [...doc.querySelectorAll("[data-input]")].every((i) => i.accept === "image/jpeg,image/png")
  );
  check("Continuar liberado (foto e opcional)", doc.querySelector("[data-next]").getAttribute("aria-disabled") === "false");
  check("status inicial", doc.querySelector(".ph__status").textContent.includes("Não enviado"));
  const silhuetas = [...doc.querySelectorAll(".ph__silhueta img")];
  check("cada card mostra a silhueta", silhuetas.length === 2);
  check(
    "silhuetas vem de assets e têm alt",
    silhuetas.every((i) => i.getAttribute("src").startsWith("/assets/corpo-") && (i.getAttribute("alt") || "").length > 10)
  );
  check(
    "frente e lado são arquivos diferentes",
    new Set(silhuetas.map((i) => i.getAttribute("src"))).size === 2
  );
  check("mostra o limite", doc.querySelector(".ph__hint").textContent.includes("5 MB"));

  const comFoto = boot(rotaDe("fotos_corpo"), {
    corpo_frente: { rotulo: "Corpo de frente", valor: { nome: "frente.jpg", bytes: 1048576, tipo: "image/jpeg" } },
  });
  check("card com foto fica marcado", !!comFoto.doc.querySelector(".ph__card--done"));
  check(
    "mostra nome e tamanho",
    comFoto.doc.querySelector(".ph__card--done .ph__status").textContent.includes("frente.jpg")
  );
  check("oferece remover", !!comFoto.doc.querySelector("[data-remove]"));
  check("sem IndexedDB nao quebra", comFoto.erros.length === 0, comFoto.erros.join(" | "));
}

/* ------------------------------------------------------------------ */
console.log("\n8. prontuario");
{
  const estado = {
    nome: { rotulo: "Nome", valor: "Maria Silva" },
    cpf: { rotulo: "CPF", valor: "123.456.789-09" },
    sexo_biologico: { rotulo: "Sexo biológico", valor: "Feminino" },
    peso_atual: { rotulo: "Peso atual", valor: "92" },
    peso_meta: { rotulo: "Meta de peso", valor: "78" },
    altura: { rotulo: "Altura", valor: "178" },
    condicoes_atuais: { rotulo: "Condicoes atuais", valor: ["Depressão", "Apneia do sono"] },
    corpo_frente: { rotulo: "Corpo de frente", valor: { nome: "frente.jpg", bytes: 524288, tipo: "image/jpeg" } },
  };
  const totalSteps = boot("/pages/consultorio-1").window.__api.steps.length;
  const rotaFim = "/pages/consultorio-" + (totalSteps + 1);
  const { doc, window, erros } = boot(rotaFim, estado);

  check("renderiza o prontuario", !!doc.querySelector(".pr"));
  check("usa o primeiro nome no titulo", doc.querySelector(".pr__titulo").textContent.includes("Maria"));
  check("agrupa em secoes", doc.querySelectorAll(".pr__secao").length >= 4);
  check(
    "cada linha tem marcador",
    doc.querySelectorAll(".pr__linha .pr__marca").length === doc.querySelectorAll(".pr__linha").length
  );
  check("secoes sao recolhiveis", doc.querySelectorAll("details.pr__secao").length >= 4);
  check(
    "cada secao tem status",
    doc.querySelectorAll(".pr__cabeca .pr__status").length === doc.querySelectorAll(".pr__secao").length
  );
  check(
    "secao com pendencia vem aberta",
    [...doc.querySelectorAll(".pr__secao--falta")].every((s) => s.open)
  );
  check(
    "secao completa vem fechada",
    [...doc.querySelectorAll(".pr__secao:not(.pr__secao--falta)")].every((s) => !s.open)
  );
  check("pendencia aparece como nao informado", doc.body.textContent.includes("Não informado"));
  check("o topo conta as pendencias", /pendência/.test(doc.querySelector(".pr__sub").textContent));
  check("lista multipla escolha junta", doc.body.textContent.includes("Depressão, Apneia do sono"));
  check("calcula o IMC nas medidas", !!doc.querySelector(".pr__linha--calc") && doc.body.textContent.includes("29"));
  check("mostra a foto anexada", doc.body.textContent.includes("frente.jpg"));
  check("avisa da foto que falta", doc.querySelector(".pr__aviso").textContent.toLowerCase().includes("lado"));
  check("nao imprime undefined nem null", !doc.body.textContent.includes("undefined") && !doc.body.textContent.includes("null"));
  const cta = doc.querySelector(".pr__rodape .btn");
  check("tem botao de checkout", cta.getAttribute("href").includes("checkout"));
  check("o rótulo é 'Quero saber mais'", cta.textContent.trim().startsWith("Quero saber mais"), cta.textContent.trim());
  check(
    "explica que é durante a análise",
    (doc.querySelector(".pr__espera") || {}).textContent?.includes("médico analisa")
  );
  check("nao auto-redireciona", !doc.body.textContent.includes("Abrindo o checkout"));
  check("sem erro de runtime", erros.length === 0, erros.join(" | "));

  const editar = [...doc.querySelectorAll("[data-editar]")].find((b) => b.dataset.editar);
  check("secao tem link de editar", !!editar);
  if (editar) {
    editar.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    check("editar navega com a flag de revisao", window.location.search.includes("revisao"));
    check(
      "o CTA muda para salvar e voltar",
      doc.querySelector("[data-next]").textContent.trim().startsWith("Salvar e voltar")
    );
  }
}

/* ------------------------------------------------------------------ */
console.log("\n9. depoimento dentro do questionario");
{
  const intro = boot("/pages/consultorio-inicio");
  check("resumo do GLP-1 saiu da intro", !intro.doc.body.textContent.includes("GLP-1"));
  const desc = intro.doc.querySelector(".ci__desc");
  check("a descricao do protocolo nao fica vazia", !desc || desc.textContent.trim().length > 20, desc?.textContent);
  check("a intro fala do acompanhamento", /acompanhamento/i.test(intro.doc.body.textContent));
  check("e cita a nutricionista", /nutricionista/i.test(intro.doc.body.textContent));
  check("com as cinco etapas do processo", intro.doc.querySelectorAll(".ci__step").length === 5, String(intro.doc.querySelectorAll(".ci__step").length));
  check("depoimento nao esta mais na intro", !intro.doc.querySelector(".dep"));

  /* Agora e uma tela do questionario. */
  const { doc, erros, window } = boot(rotaDe("info_depoimento"), {
    peso_atual: resposta("92"),
    altura: resposta("178"),
  });
  const passo = window.__api.visibleSteps().find((s) => s.path === window.location.pathname);
  check("a tela certa abriu", passo && passo.field === "info_depoimento", passo && passo.field);
  check("nao mostra rotulo no cabecalho", !doc.querySelector(".cq__meta").textContent.includes("Quem já passou"));
  check("o cabecalho mostra a etapa", /Etapa \d+\//.test(doc.querySelector(".cq__protocol").textContent));
  check("Continuar nasce habilitado", doc.querySelector("[data-next]").getAttribute("aria-disabled") === "false");

  const dep = doc.querySelector(".dep");
  check("depoimento aparece", !!dep);
  const fotos = [...doc.querySelectorAll(".dep__foto img")];
  check("duas fotos", fotos.length === 2);
  check(
    "antes e depois, nesta ordem",
    (fotos[0] || {}).getAttribute?.("src")?.includes("antes") &&
      (fotos[1] || {}).getAttribute?.("src")?.includes("depois")
  );
  check(
    "as duas têm alt descritivo",
    fotos.every((i) => (i.getAttribute("alt") || "").length > 20)
  );
  check(
    "legendas Antes e Depois",
    [...doc.querySelectorAll(".dep__foto figcaption")].map((f) => f.textContent.trim()).join("|") === "Antes|Depois"
  );
  check("fala enxuta, dois parágrafos", doc.querySelectorAll(".dep__fala p").length === 2);
  check("abre com os 43 kg", doc.querySelector(".dep__fala p").textContent.includes("43 kg"));
  check("o titulo fala do IMC alto da Lais", doc.querySelector(".cq__question").textContent.includes("IMC alto"));
  check("nao repete o dia 1 na fala", !doc.querySelector(".dep__fala").textContent.includes("dia 1"));

  /* Sem material de homem, a tela sai do fluxo em vez de mostrar a Lais
     para um homem. */
  const homem = boot(rotaDe("info_depoimento"), {
    sexo_biologico: resposta("Masculino"),
    peso_atual: resposta("92"),
    altura: resposta("178"),
  });
  check(
    "homem nao ve o depoimento da Lais",
    !homem.doc.querySelector(".dep") || !homem.doc.body.textContent.includes("Laís")
  );
  check("credita a autora", doc.querySelector(".dep__autora").textContent.includes("Laís"));
  check("credita o perfil", doc.body.textContent.includes("@laispavese"));
  check(
    "traz a ressalva de resultado individual",
    doc.querySelector(".dep__nota").textContent.includes("Resultado individual")
  );
  check("sem erro de runtime", erros.length === 0, erros.join(" | "));
}

/* ------------------------------------------------------------------ */
console.log("\n10. fluxo completo ate a conclusao");

const FILL = {
  text: (id) => (id === "cpf" ? "12345678909" : "Teste Silva"),
  tel: () => "11912345678",
  date: () => "1990-05-10",
  email: () => "teste@teste.com",
  number: (id) => (id === "altura" ? "178" : id === "peso_meta" ? "78" : "92"),
  textarea: () => "Nada a declarar",
};

async function percorrer(sexo) {
  const { window, doc, erros } = boot("/pages/consultorio-1");
  const visitadas = [];
  let guarda = 0;

  while (guarda++ < 90) {
    if (doc.querySelector(".pr")) break;
    const rota = window.location.pathname;
    const passo = window.__api.visibleSteps().find((s) => s.path === rota);
    const campo = passo ? passo.field : null;

    const visiveis = () =>
      [...doc.querySelectorAll(".cq__input")].filter((i) => {
        const wrap = i.closest("[data-field-wrap]");
        return !wrap?.hidden && !i.hidden;
      });

    for (const input of visiveis()) {
      const tipo = input.tagName === "TEXTAREA" ? "textarea" : input.type;
      if (!FILL[tipo]) continue;
      input.value = FILL[tipo](input.id);
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    }

    const opts = [...doc.querySelectorAll("[data-option]")];
    if (opts.length) {
      let alvo = opts.find((o) => o.getAttribute("aria-pressed") !== "true");
      const q = doc.querySelector(".cq__question")?.textContent || "";
      if (q.includes("Qual seu sexo")) alvo = opts.find((o) => o.value === sexo);
      if (alvo && alvo.getAttribute("aria-pressed") !== "true") {
        alvo.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      }
      await sleep(300);

      /* Pergunta encadeada: responde cada subgrupo que apareceu, e o
         proprio clique pode revelar o seguinte. */
      for (let volta = 0; volta < 4; volta++) {
        const pendentes = [...doc.querySelectorAll("[data-sub-wrap]")].filter(
          (wrap) => !wrap.hidden && !wrap.querySelector('[aria-pressed="true"]')
        );
        if (!pendentes.length) break;
        pendentes.forEach((wrap) =>
          wrap.querySelector("[data-sub-option]").dispatchEvent(new window.MouseEvent("click", { bubbles: true }))
        );
      }
      if (window.location.pathname !== rota) {
        visitadas.push({ rota, campo });
        continue;
      }
      for (const input of visiveis()) {
        if (input.value) continue;
        input.value = "Nada a declarar";
        input.dispatchEvent(new window.Event("input", { bubbles: true }));
      }
    }

    const next = doc.querySelector("[data-next]");
    if (!next || next.getAttribute("aria-disabled") === "true") {
      return { visitadas, fim: false, travou: rota, erros };
    }
    next.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await sleep(20);
    if (window.location.pathname === rota) return { visitadas, fim: false, travou: rota, erros };
    visitadas.push({ rota, campo });
  }

  return { visitadas, fim: !!doc.querySelector(".pr"), travou: null, erros, window };
}

for (const sexo of ["Masculino", "Feminino"]) {
  const r = await percorrer(sexo);
  const vistos = r.visitadas.map((v) => v.campo).filter(Boolean);
  check(`${sexo}: chega na conclusão`, r.fim, r.travou ? `travou em ${r.travou}` : "");

  /* Nomear em vez de contar: assim remover uma tela informativa nao
     quebra o teste, mas remover uma destas quebra — que e o ponto. */
  const esperadas = sexo === "Feminino" ? ["insight_imc", "info_depoimento"] : ["insight_imc"];
  const faltando = esperadas.filter((f) => !vistos.includes(f));
  check(`${sexo}: passou pelas telas informativas do caminho`, faltando.length === 0, "faltou: " + faltando.join(", "));
  check(`${sexo}: sem erro de runtime`, r.erros.length === 0, r.erros.join(" | "));
  if (r.window) {
    const gravadas = Object.keys(JSON.parse(r.window.localStorage.getItem("tl-consulta-emagrecimento") || "{}"));
    const lixo = gravadas.filter((k) => k.startsWith("info_") || k.startsWith("insight_") || k.startsWith("alerta_"));
    check(`${sexo}: tela informativa não grava resposta`, lixo.length === 0, lixo.join(", "));
  }
}

/* ------------------------------------------------------------------ */
console.log(`\n${"=".repeat(56)}`);
console.log(falhas === 0 ? `${total} verificações, todas passaram.` : `${total} verificações, ${falhas} FALHARAM.`);
process.exit(falhas === 0 ? 0 : 1);
