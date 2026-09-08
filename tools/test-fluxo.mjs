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
console.log("\n2. telas informativas");
{
  const estado = { peso_atual: resposta("92"), peso_meta: resposta("78"), altura: resposta("178") };
  const { doc, erros } = boot(ROTA_IMC, estado);
  const next = doc.querySelector("[data-next]");
  check("Continuar nasce habilitado", next?.getAttribute("aria-disabled") === "false");
  check("não mostra hint de Enter", !doc.querySelector(".cq__hint"));
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
  const comSim = boot("/pages/consultorio-1", { "vômito_induzido": resposta("Sim") });
  const temPurgacao = comSim.window.eval('visibleSteps().some(s => s.field === "info_purgacao")');
  check('vômito_induzido "Sim" → tela de purgação entra no fluxo', temPurgacao === true);

  const comNao = boot("/pages/consultorio-1", { "vômito_induzido": resposta("Não") });
  const semPurgacao = comNao.window.eval('visibleSteps().some(s => s.field === "info_purgacao")');
  check('vômito_induzido "Não" → tela de purgação fica fora', semPurgacao === false);

  const nenhuma = boot("/pages/consultorio-1", { condicoes_restritivas: resposta(["Nenhuma das anteriores"]) });
  const semAlerta = nenhuma.window.eval('visibleSteps().some(s => s.field === "alerta_contraindicacao")');
  check('"Nenhuma das anteriores" → sem tela de alerta', semAlerta === false);

  const comCondicao = boot("/pages/consultorio-1", { condicoes_restritivas: resposta(["Pancreatite aguda ou crônica"]) });
  const comAlerta = comCondicao.window.eval('visibleSteps().some(s => s.field === "alerta_contraindicacao")');
  check("contraindicação marcada → tela de alerta entra", comAlerta === true);

  const { doc } = boot("/pages/consultorio-1", {});
  check("o aviso de risco saiu do help da pergunta", !doc.body.textContent.includes("podem interagir com os tratamentos"));
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
  check("tem botao de checkout", doc.querySelector(".pr__rodape .btn").getAttribute("href").includes("checkout"));
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
console.log("\n9. imagens das telas informativas");
{
  /* Estas telas sao condicionais: sem o estado que as torna visiveis, o
     router recua para o passo anterior e o teste mediria a tela errada. */
  const ATIVACAO = {
    info_normalizacao: {},
    info_transicao_saude: {},
    info_validacao: { tentativas: { rotulo: "Tentativas anteriores", valor: ["Dieta"] } },
    info_seguranca: {},
    info_purgacao: { "vômito_induzido": { rotulo: "Vomito induzido", valor: "Sim" } },
    alerta_contraindicacao: {
      condicoes_restritivas: { rotulo: "Condicoes restritivas", valor: ["Pancreatite aguda ou crônica"] },
    },
  };

  function abrirTela(field) {
    const { doc, window } = boot(rotaDe(field), ATIVACAO[field]);
    const passo = window.__api.visibleSteps().find((s) => s.path === window.location.pathname);
    return { doc, campoRenderizado: passo ? passo.field : null };
  }

  for (const field of ["info_normalizacao", "info_transicao_saude", "info_validacao", "info_seguranca"]) {
    const { doc, campoRenderizado } = abrirTela(field);
    check(field + ": a tela certa abriu", campoRenderizado === field, "abriu " + campoRenderizado);
    const img = doc.querySelector(".cq__img");
    check(field + ": tem imagem", !!img);
    if (img) {
      check(field + ": alt descritivo", (img.getAttribute("alt") || "").length > 15, img.getAttribute("alt"));
      check(field + ": aponta para assets", img.getAttribute("src").startsWith("/assets/"), img.getAttribute("src"));
      check(field + ": dimensoes e lazy", !!img.getAttribute("width") && img.getAttribute("loading") === "lazy");
    }
  }

  // telas sobre risco seguem sem ilustracao, de proposito
  for (const field of ["info_purgacao", "alerta_contraindicacao"]) {
    const { doc, campoRenderizado } = abrirTela(field);
    check(field + ": a tela certa abriu", campoRenderizado === field, "abriu " + campoRenderizado);
    check(field + ": segue sem imagem (proposital)", !doc.querySelector(".cq__img"));
  }
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
    const info = !!doc.querySelector(".imc, .cq__text");

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
      if (q.includes("sexo biológico")) alvo = opts.find((o) => o.value === sexo);
      if (alvo && alvo.getAttribute("aria-pressed") !== "true") {
        alvo.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      }
      await sleep(300);
      if (window.location.pathname !== rota) {
        visitadas.push({ rota, info });
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
    visitadas.push({ rota, info });
  }

  return { visitadas, fim: !!doc.querySelector(".pr"), travou: null, erros, window };
}

for (const sexo of ["Masculino", "Feminino"]) {
  const r = await percorrer(sexo);
  const infos = r.visitadas.filter((v) => v.info).length;
  check(`${sexo}: chega na conclusão`, r.fim, r.travou ? `travou em ${r.travou}` : "");
  check(`${sexo}: passou por telas informativas`, infos >= 4, `passou por ${infos}`);
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
