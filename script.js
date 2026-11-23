/* ==========================================================
   THOMPSONS FESTIVAL | Credenciamento digital (Música & Cultura)
   Fluxo: Inscrição -> QR Code -> Check-in -> Certificado em PDF
   ========================================================== */

/* ---------- CONFIGURAÇÃO DO EVENTO ---------- */

// Nome da chave do localStorage adaptado ao projeto (antes: "sgja_inscritos")
const CHAVE_STORAGE = "thompsons_inscritos";

// Regra de negócio: o PDF só libera com pelo menos 75% de presença
const FREQUENCIA_MINIMA = 75;

// As 4 atividades do circuito. Cada uma só conta uma vez por participante.
const ATIVIDADES = [
  { id: "show-abertura",     nome: "Show de abertura no Palco Principal" },
  { id: "workshop-producao", nome: "Workshop de produção musical" },
  { id: "mostra-cinema",     nome: "Mostra de cinema independente" },
  { id: "roda-bastidores",   nome: "Roda de conversa nos bastidores" }
];
const TOTAL_ATIVIDADES = ATIVIDADES.length; // 4 atividades -> 3 presenças = 75%

// Participante exibido no painel de check-in (usado na hora de gerar o PDF)
let participanteSelecionado = null;

/* ---------- localStorage: só guarda texto (String) ---------- */

// JSON.parse() converte o texto salvo de volta em Array/Objeto
function carregarInscritos() {
  const dados = localStorage.getItem(CHAVE_STORAGE);
  if (!dados) return [];
  try {
    return JSON.parse(dados);
  } catch (erro) {
    return []; // dado corrompido: começa uma lista nova
  }
}

// JSON.stringify() converte Array/Objeto em texto antes de salvar
function salvarInscritos(lista) {
  localStorage.setItem(CHAVE_STORAGE, JSON.stringify(lista));
}

/* ---------- Captura dos elementos com document.querySelector() ---------- */

const formInscricao    = document.querySelector("#form-inscricao");
const inputNome        = document.querySelector("#nome");
const inputCpf         = document.querySelector("#cpf");
const inputEmail       = document.querySelector("#email");
const selectAcesso     = document.querySelector("#acesso");
const selectEstilo     = document.querySelector("#estilo");
const msgInscricao     = document.querySelector("#msg-inscricao");

const ingressoVazio    = document.querySelector("#ingresso-vazio");
const areaQr           = document.querySelector("#area-qr");
const saudacao         = document.querySelector("#saudacao");
const imgQr            = document.querySelector("#img-qr");
const ingAcesso        = document.querySelector("#ing-acesso");
const ingEstilo        = document.querySelector("#ing-estilo");
const ingCpf           = document.querySelector("#ing-cpf");

const inputCpfCheckin  = document.querySelector("#cpf-checkin");
const selectAtividade  = document.querySelector("#atividade");
const btnCheckin       = document.querySelector("#btn-checkin");
const statusCheckin    = document.querySelector("#status-checkin");

const progresso        = document.querySelector("#progresso");
const barraProgresso   = document.querySelector("#barra-progresso");
const textoProgresso   = document.querySelector("#texto-progresso");
const listaCarimbos    = document.querySelector("#lista-carimbos");

const btnPdf           = document.querySelector("#btn-pdf");
const statusCertificado = document.querySelector("#status-certificado");
const formLogin        = document.querySelector("#form-login");
const inputCpfLogin    = document.querySelector("#cpf-login");
const statusLogin      = document.querySelector("#status-login");
const resultadoPdf     = document.querySelector("#resultado-pdf");
const abrirPdf         = document.querySelector("#abrir-pdf");
const baixarPdf        = document.querySelector("#baixar-pdf");
const visualizadorPdf  = document.querySelector("#visualizador-pdf");
let urlPdfAtual        = null;

/* ---------- Funções de apoio ---------- */

// Remove tudo que não for número: "123.456.789-01" -> "12345678901"
function limparCpf(valor) {
  return valor.replace(/\D/g, "");
}

// Aplica a máscara 000.000.000-00 enquanto a pessoa digita
function mascararCpf(valor) {
  return limparCpf(valor)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

// Escreve uma mensagem na tela. O tipo ("ok", "erro" ou "info") muda a cor no CSS
function mostrarMensagem(elemento, texto, tipo = "info") {
  elemento.textContent = texto;
  elemento.dataset.tipo = tipo;
}

// Porcentagem de presença: atividades concluídas / total de atividades
function calcularFrequencia(participante) {
  if (!participante) return 0;
  return Math.round((participante.atividades.length / TOTAL_ATIVIDADES) * 100);
}

/* ---------- Montagem inicial da tela de check-in ---------- */

function montarCheckin() {
  // Lista de atividades no <select>, usando Template Literals
  selectAtividade.innerHTML =
    `<option value="" selected disabled>Escolha a atividade</option>` +
    ATIVIDADES.map((atividade) => `<option value="${atividade.id}">${atividade.nome}</option>`).join("");

  // Um "carimbo" para cada atividade do circuito
  ATIVIDADES.forEach((atividade) => {
    const item = document.createElement("li");
    item.className = "carimbo";
    item.dataset.id = atividade.id;
    item.innerHTML = `
      <span class="carimbo__selo" aria-hidden="true"></span>
      <span>
        <strong class="carimbo__nome">${atividade.nome}</strong>
        <span class="carimbo__estado">Pendente</span>
      </span>`;
    listaCarimbos.appendChild(item);
  });
}

/* ---------- ETAPA 1: INSCRIÇÃO + TEMPLATE LITERALS + QR CODE ---------- */

// Máscara de CPF nos dois campos
inputCpf.addEventListener("input", () => {
  inputCpf.value = mascararCpf(inputCpf.value);
});

// Exibe o ingresso do participante com o QR Code
function mostrarIngresso(participante) {
  // Template Literals com crases e ${variavel}
  saudacao.textContent = `Olá, ${participante.nome}! Sua inscrição está confirmada.`;
  ingAcesso.textContent = participante.acesso;
  ingEstilo.textContent = participante.estilo;
  ingCpf.textContent = mascararCpf(participante.cpf);

  // O QR Code guarda um LINK do site com o CPF como parâmetro.
  // Assim, o leitor abre o Thompsons Festival em vez de interpretar os números como telefone.
  const urlCredenciamento = new URL(window.location.href);
  urlCredenciamento.search = "";
  urlCredenciamento.hash = "checkin";
  urlCredenciamento.searchParams.set("cpf", participante.cpf);
  imgQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(urlCredenciamento.toString())}`;
  imgQr.alt = `QR Code de credenciamento de ${participante.nome}, acesso ${participante.acesso}, estilo favorito ${participante.estilo}`;

  ingressoVazio.hidden = true;
  areaQr.hidden = false;
}

// Quando o QR Code é escaneado, o navegador abre o site e preenche o CPF
// no campo de check-in. A presença só é registrada após ação do responsável.
function carregarCredenciamentoPeloQr() {
  const parametros = new URLSearchParams(window.location.search);
  const cpfQr = limparCpf(parametros.get("cpf") || "");
  if (cpfQr.length !== 11) return;

  inputCpfCheckin.value = mascararCpf(cpfQr);
  inputCpfLogin.value = mascararCpf(cpfQr);
  const participante = carregarInscritos().find((item) => item.cpf === cpfQr);
  atualizarPainel(participante || null);

  if (participante) {
    mostrarMensagem(statusCheckin, `Ingresso de ${participante.nome} identificado. Escolha a atividade e confirme o check-in.`, "ok");
  } else {
    mostrarMensagem(statusCheckin, "QR Code identificado. Para localizar o cadastro, use o mesmo dispositivo/navegador em que a inscrição foi feita ou consulte o responsável pelo credenciamento.", "info");
  }
}

formInscricao.addEventListener("submit", (evento) => {
  evento.preventDefault(); // não recarrega a página

  const nome = inputNome.value.trim();
  const cpf = limparCpf(inputCpf.value);
  const email = inputEmail.value.trim();
  const acesso = selectAcesso.value;
  const estilo = selectEstilo.value;

  if (!nome || !email || !acesso || !estilo) {
    mostrarMensagem(msgInscricao, "Preencha todos os campos para concluir a inscrição.", "erro");
    return;
  }

  if (cpf.length !== 11) {
    mostrarMensagem(msgInscricao, "O CPF precisa ter 11 números. Confira e tente de novo.", "erro");
    return;
  }

  const inscritos = carregarInscritos();

  // Evita inscrição duplicada com o mesmo CPF
  const existente = inscritos.find((participante) => participante.cpf === cpf);
  if (existente) {
    mostrarIngresso(existente);
    mostrarMensagem(msgInscricao, `O CPF ${mascararCpf(cpf)} já está inscrito. Mostramos o ingresso de ${existente.nome}.`, "info");
    return;
  }

  const novo = { nome, cpf, email, acesso, estilo, atividades: [] };
  inscritos.push(novo);
  salvarInscritos(inscritos);

  mostrarIngresso(novo);
  mostrarMensagem(msgInscricao, `Inscrição concluída, ${nome}! Seu ingresso com QR Code já está disponível.`, "ok");
  formInscricao.reset();

  // Facilita o teste: já deixa o CPF pronto no check-in
  inputCpfCheckin.value = mascararCpf(cpf);
  atualizarPainel(novo);
});

/* ---------- LOGIN DO PARTICIPANTE ---------- */
inputCpfLogin.addEventListener("input", () => {
  inputCpfLogin.value = mascararCpf(inputCpfLogin.value);
});

formLogin.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const cpf = limparCpf(inputCpfLogin.value);
  if (cpf.length !== 11) {
    mostrarMensagem(statusLogin, "Digite um CPF com 11 números.", "erro");
    return;
  }
  const participante = carregarInscritos().find((item) => item.cpf === cpf);
  if (!participante) {
    atualizarPainel(null);
    mostrarMensagem(statusLogin, "Cadastro não encontrado. Faça sua inscrição primeiro.", "erro");
    return;
  }
  inputCpfCheckin.value = mascararCpf(cpf);
  atualizarPainel(participante);
  mostrarMensagem(statusLogin, `Olá, ${participante.nome}! Login realizado. Seu progresso foi carregado.`, "ok");
  document.querySelector("#checkin").scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ---------- ETAPA 2: CHECK-IN + REGRA DOS 75% ---------- */

// Atualiza barra, carimbos, mensagem e o bloqueio do botão de PDF
function atualizarPainel(participante) {
  participanteSelecionado = participante;
  resultadoPdf.hidden = true;

  const feitas = participante ? participante.atividades.length : 0;
  const frequencia = calcularFrequencia(participante);
  const liberado = frequencia >= FREQUENCIA_MINIMA;
  const necessarias = Math.ceil((TOTAL_ATIVIDADES * FREQUENCIA_MINIMA) / 100); // 3

  // Barra de progresso
  barraProgresso.style.width = `${frequencia}%`;
  progresso.setAttribute("aria-valuenow", frequencia);
  progresso.dataset.liberado = liberado;
  textoProgresso.textContent = `${feitas} de ${TOTAL_ATIVIDADES} atividades (${frequencia}%)`;

  // Carimbos de cada atividade
  listaCarimbos.querySelectorAll(".carimbo").forEach((item) => {
    const feito = Boolean(participante) && participante.atividades.includes(item.dataset.id);
    item.classList.toggle("carimbo--feito", feito);
    item.querySelector(".carimbo__estado").textContent = feito ? "Presença registrada" : "Pendente";
  });

  // Trava de segurança: o botão do PDF só é liberado com frequência >= 75%
  btnPdf.disabled = !liberado;

  // Mensagem do certificado
  if (!participante) {
    mostrarMensagem(statusCertificado, "Informe um CPF inscrito no check-in para acompanhar a liberação.", "info");
  } else if (liberado) {
    mostrarMensagem(statusCertificado, `Certificado liberado para ${participante.nome}. Pode baixar o PDF.`, "ok");
  } else {
    const faltam = necessarias - feitas;
    const textoFaltam = faltam === 1 ? "Falta 1 atividade" : `Faltam ${faltam} atividades`;
    mostrarMensagem(statusCertificado, `${textoFaltam} para liberar o certificado de ${participante.nome}.`, "info");
  }
}

// Ao digitar um CPF completo, mostra o circuito dessa pessoa (sem registrar presença)
inputCpfCheckin.addEventListener("input", () => {
  inputCpfCheckin.value = mascararCpf(inputCpfCheckin.value);
  const cpf = limparCpf(inputCpfCheckin.value);

  statusCheckin.textContent = "";

  if (cpf.length < 11) {
    atualizarPainel(null);
    return;
  }

  const participante = carregarInscritos().find((item) => item.cpf === cpf);
  atualizarPainel(participante || null);

  if (!participante) {
    mostrarMensagem(statusCheckin, "CPF não encontrado no cadastro. Faça a inscrição primeiro.", "erro");
  }
});

btnCheckin.addEventListener("click", () => {
  const cpf = limparCpf(inputCpfCheckin.value);
  const atividadeId = selectAtividade.value;

  if (cpf.length !== 11) {
    mostrarMensagem(statusCheckin, "Digite o CPF completo (11 números) lido do QR Code.", "erro");
    return;
  }

  const inscritos = carregarInscritos();

  // Busca o participante pelo CPF lido do QR Code
  const participante = inscritos.find((item) => item.cpf === cpf);
  if (!participante) {
    atualizarPainel(null);
    mostrarMensagem(statusCheckin, "CPF não encontrado no cadastro. Faça a inscrição primeiro.", "erro");
    return;
  }

  if (!atividadeId) {
    atualizarPainel(participante);
    mostrarMensagem(statusCheckin, "Escolha a atividade em que você está fazendo check-in.", "erro");
    return;
  }

  const atividade = ATIVIDADES.find((item) => item.id === atividadeId);

  if (participante.atividades.includes(atividadeId)) {
    // A mesma atividade não conta duas vezes
    mostrarMensagem(statusCheckin, `${participante.nome} já tem presença em "${atividade.nome}".`, "info");
  } else {
    // Regra de negócio: registra a presença e salva de novo no localStorage
    participante.atividades.push(atividadeId);
    salvarInscritos(inscritos);

    const frequencia = calcularFrequencia(participante);
    mostrarMensagem(
      statusCheckin,
      `Presença registrada para ${participante.nome} em "${atividade.nome}": ${participante.atividades.length}/${TOTAL_ATIVIDADES} (${frequencia}%).`,
      "ok"
    );
  }

  atualizarPainel(participante);
});

/* ---------- ETAPA 3: GERAÇÃO DO PDF NO NAVEGADOR COM jsPDF ---------- */

btnPdf.addEventListener("click", () => {
  const cpf = limparCpf(inputCpfCheckin.value);
  const participante = carregarInscritos().find((item) => item.cpf === cpf);
  if (!participante) {
    mostrarMensagem(statusCertificado, "Faça login com o CPF da inscrição para localizar seu cadastro.", "erro");
    return;
  }
  participanteSelecionado = participante;
  const frequencia = calcularFrequencia(participante);
  if (frequencia < FREQUENCIA_MINIMA) {
    mostrarMensagem(statusCertificado, "O certificado é liberado após 3 das 4 atividades (75%).", "erro");
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    mostrarMensagem(statusCertificado, "A biblioteca de PDF não carregou. Verifique a internet e atualize a página.", "erro");
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const largura = 297, altura = 210, centro = largura / 2;
    const cobalto = [28, 42, 214], tinta = [11, 14, 61], papel = [250, 248, 255];
    const rosa = [255, 92, 168], laranja = [255, 138, 31];
    const atividadesFeitas = ATIVIDADES.filter((a) => participante.atividades.includes(a.id)).map((a) => a.nome);
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const codigo = `THOMPSONS-${participante.cpf.slice(-4)}-${Date.now().toString(36).toUpperCase()}`;

    // Certificado A4 horizontal com identidade visual Thompsons.
    doc.setFillColor(...cobalto); doc.rect(0, 0, largura, altura, "F");
    doc.setFillColor(...papel); doc.roundedRect(9, 9, largura - 18, altura - 18, 3, 3, "F");
    doc.setDrawColor(...tinta); doc.setLineWidth(1.2); doc.roundedRect(9, 9, largura - 18, altura - 18, 3, 3, "S");
    doc.setFillColor(...tinta); doc.rect(10, 10, largura - 20, 35, "F");
    doc.setFillColor(...rosa); doc.rect(10, 45, largura - 20, 2.5, "F");
    doc.setFont("helvetica", "bold"); doc.setTextColor(...papel); doc.setFontSize(28);
    doc.text("THOMPSONS", centro, 29, { align: "center" });
    doc.setFontSize(10); doc.setTextColor(...laranja);
    doc.text("FESTIVAL DE MÚSICA E CULTURA 2026", centro, 38, { align: "center" });
    doc.setTextColor(...tinta); doc.setFontSize(27);
    doc.text("CERTIFICADO CULTURAL", centro, 69, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(13);
    doc.text("Certificamos que", centro, 84, { align: "center" });
    let tamanhoNome = 28; doc.setFont("helvetica", "bold"); doc.setFontSize(tamanhoNome);
    while (doc.getTextWidth(participante.nome) > 245 && tamanhoNome > 14) { tamanhoNome--; doc.setFontSize(tamanhoNome); }
    doc.setTextColor(...cobalto); doc.text(participante.nome, centro, 101, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setTextColor(...tinta); doc.setFontSize(10);
    doc.text(`CPF: ${mascararCpf(participante.cpf)}  |  Acesso: ${participante.acesso}  |  Estilo: ${participante.estilo}`, centro, 112, { align: "center" });
    doc.setFontSize(12);
    const texto = doc.splitTextToSize(`participou do Thompsons Festival de Música e Cultura 2026, concluindo ${participante.atividades.length} de ${TOTAL_ATIVIDADES} atividades (${frequencia}% de presença): ${atividadesFeitas.join("; ")}.`, 235);
    doc.text(texto, centro, 127, { align: "center" });
    // Assinatura da coordenadora (imagem incorporada para funcionar sem arquivo externo).
    const assinaturaCoordenadora = "data:image/png;base64,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";
    doc.addImage(assinaturaCoordenadora, "PNG", centro - 24, 145, 48, 26);
    doc.setDrawColor(...tinta); doc.setLineWidth(0.4); doc.line(105, 171, 192, 171);
    doc.setFontSize(9); doc.text("Coordenadora do Thompsons Festival", centro, 177, { align: "center" });
    doc.text(`Emitido em ${dataEmissao}`, 23, 188);
    doc.text(`Código de validação: ${codigo}`, largura - 23, 188, { align: "right" });

    const blob = doc.output("blob");
    if (urlPdfAtual) URL.revokeObjectURL(urlPdfAtual);
    urlPdfAtual = URL.createObjectURL(blob);
    abrirPdf.href = urlPdfAtual;
    baixarPdf.href = urlPdfAtual;
    baixarPdf.download = `certificado-thompsons-${participante.cpf}.pdf`;
    visualizadorPdf.src = urlPdfAtual + "#toolbar=1&navpanes=0";
    resultadoPdf.hidden = false;
    mostrarMensagem(statusCertificado, "Certificado gerado com sucesso! Visualize ou baixe o PDF abaixo.", "ok");
    resultadoPdf.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (erro) {
    console.error("Erro ao gerar certificado PDF:", erro);
    mostrarMensagem(statusCertificado, "Não foi possível gerar o PDF. Atualize a página e tente novamente.", "erro");
  }
});

/* ---------- Início da página ---------- */

montarCheckin();
atualizarPainel(null); // começa sem participante: botão do PDF bloqueado


// Trata links abertos a partir da leitura do QR Code.
carregarCredenciamentoPeloQr();
