const form = document.querySelector("#budget-form");
const printButton = document.querySelector("#printButton");
const clearButton = document.querySelector("#clearButton");
const shutdownButton = document.querySelector("#shutdownButton");
const addSurgeryButton = document.querySelector("#addSurgeryButton");
const removeSurgeryButton = document.querySelector("#removeSurgeryButton");
const addHospitalButton = document.querySelector("#addHospitalButton");
const removeHospitalButton = document.querySelector("#removeHospitalButton");
const addPaymentButton = document.querySelector("#addPaymentButton");
const removePaymentButton = document.querySelector("#removePaymentButton");
const addExtrasButton = document.querySelector("#addExtrasButton");
const removeExtrasButton = document.querySelector("#removeExtrasButton");
const extrasEnabledInput = document.querySelector("#extrasEnabled");
const extrasFieldset = document.querySelector("#extrasFieldset");
const extrasFormContent = document.querySelector("#extrasFormContent");
const extrasPreviewSection = document.querySelector("#extrasPreviewSection");
const addGuidanceButton = document.querySelector("#addGuidanceButton");
const removeGuidanceButton = document.querySelector("#removeGuidanceButton");
const guidancePreview = document.querySelector("#guidancePreview");
const paymentPreview = document.querySelector("#paymentPreview");
const extrasQuickList = document.querySelector("#extrasQuickList");
const extrasList = document.querySelector("#extrasList");
const extrasHistoryDropdown = document.querySelector("#extrasHistoryDropdown");
const extrasPreview = document.querySelector("#extrasPreview");
const appShell = document.querySelector(".app-shell");
const panelResizeHandle = document.querySelector("#panelResizeHandle");
const previewPanel = document.querySelector(".preview-panel");
const printPage = document.querySelector("#printPage");
const documentFlow = document.querySelector("#documentFlow");
const surgeryList = document.querySelector("#surgeryList");
const surgeryHistoryDropdown = document.querySelector("#surgeryHistoryDropdown");
const paymentQuickList = document.querySelector("#paymentQuickList");
const paymentList = document.querySelector("#paymentList");
const paymentHistoryDropdown = document.querySelector("#paymentHistoryDropdown");
const guidanceQuickList = document.querySelector("#guidanceQuickList");
const guidanceList = document.querySelector("#guidanceList");
const guidanceHistoryDropdown = document.querySelector("#guidanceHistoryDropdown");
const hospitalEnabledInput = document.querySelector("#hospitalEnabled");
const hospitalFieldset = document.querySelector("#hospitalFieldset");
const hospitalFormContent = document.querySelector("#hospitalFormContent");
const hospitalInput = document.querySelector("#hospital");
const hospitalList = document.querySelector("#hospitalList");
const hospitalHistoryDropdown = document.querySelector("#hospitalHistoryDropdown");
const patientInput = document.querySelector("#patientName");
const patientHistoryDropdown = document.querySelector("#patientHistoryDropdown");
const implantsEnabledInput = document.querySelector("#implantsEnabled");
const implantsFieldset = document.querySelector("#implantsFieldset");
const implantsFormContent = document.querySelector("#implantsFormContent");
const implantSelect = document.querySelector("#implantSelect");
const implantsPreviewSection = document.querySelector("#implantsPreviewSection");
const technologiesEnabledInput = document.querySelector("#technologiesEnabled");
const technologiesFieldset = document.querySelector("#technologiesFieldset");
const technologiesFormContent = document.querySelector("#technologiesFormContent");
const technologyInput = document.querySelector("#technologyName");
const technologyValueInput = document.querySelector("#technologyValue");
const technologyHistoryDropdown = document.querySelector("#technologyHistoryDropdown");
const technologiesPreviewSection = document.querySelector("#technologiesPreviewSection");
const teamValueInput = document.querySelector("#teamValue");
let surgeryHistory = [];
let activeSurgeryInput = null;
let isInteractingWithHistoryDropdown = false;
let surgeryDragState = null;
let paymentHistory = [];
let activePaymentInput = null;
let isInteractingWithPaymentDropdown = false;
let deselectedPaymentQuickItems = new Set();
let paymentDragState = null;
let extrasHistory = [];
let activeExtrasInput = null;
let isInteractingWithExtrasDropdown = false;
let deselectedExtrasQuickItems = new Set();
let extrasDragState = null;
let guidanceHistory = [];
let activeGuidanceInput = null;
let isInteractingWithGuidanceDropdown = false;
let deselectedGuidanceQuickItems = new Set();
let guidanceDragState = null;
let hospitalHistory = [];
let activeHospitalInput = null;
let isInteractingWithHospitalDropdown = false;
let patientHistory = [];
let activePatientInput = null;
let isInteractingWithPatientDropdown = false;
let technologyHistory = [];
let isInteractingWithTechnologyDropdown = false;
let hospitalTables = null;
let reginaHospitalProcedureOptions = [];
let sapirangaHospitalProcedureOptions = [];
let activeHospitalDetailInput = null;
let isInteractingWithHospitalProcedureDropdown = false;
const hospitalProcedureDropdown = document.createElement("div");
hospitalProcedureDropdown.id = "hospitalProcedureDropdown";
hospitalProcedureDropdown.className = "hospital-procedure-dropdown";
hospitalProcedureDropdown.hidden = true;
document.body.append(hospitalProcedureDropdown);
let implantTable = null;

const previewFields = {
  patientName: "Nome da paciente",
};

const minFormPanelWidth = 320;
const maxFormPanelWidth = 760;

function getCurrentFormPanelWidth() {
  const currentWidth = getComputedStyle(document.documentElement).getPropertyValue("--form-panel-width");
  return Number.parseFloat(currentWidth) || 560;
}

function setFormPanelWidth(width) {
  const nextWidth = Math.min(Math.max(width, minFormPanelWidth), maxFormPanelWidth);
  document.documentElement.style.setProperty("--form-panel-width", `${nextWidth}px`);
  panelResizeHandle?.setAttribute("aria-valuenow", String(Math.round(nextWidth)));
}

function formatDateForInput(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateForDocument(value) {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatHospitalStay(value) {
  if (!value) {
    return "Tempo previsto de hospital";
  }

  const normalizedValue = value.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalizedValue)) {
    return value;
  }

  const totalMinutes = Math.round(Number(normalizedValue) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];

  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "hora" : "horas"}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? "minuto" : "minutos"}`);
  }

  return parts.join(" e ") || "0 minutos";
}

function getFieldValue(fieldName) {
  const field = form.elements[fieldName];
  return field?.value.trim() || "";
}

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getSurgeryInputs() {
  return [...surgeryList.querySelectorAll(".surgery-input")];
}

function getSurgeryFieldRows() {
  return Array.from(surgeryList.querySelectorAll(".surgery-field"));
}

function ensureSurgeryFieldRow(label) {
  if (label.querySelector(".surgery-field-row")) {
    return;
  }

  const input = label.querySelector(".surgery-input");
  if (!input) {
    return;
  }

  const row = document.createElement("div");
  row.className = "surgery-field-row";

  const handle = label.querySelector(".surgery-drag-handle");
  if (handle) {
    row.append(handle, input);
  } else {
    const newHandle = document.createElement("span");
    newHandle.className = "surgery-drag-handle";
    newHandle.setAttribute("aria-label", "Reordenar cirurgia");
    newHandle.hidden = true;
    row.append(newHandle, input);
  }

  label.append(row);
}

function updateSurgeryFieldStructure() {
  const rows = getSurgeryFieldRows();
  const showHandles = rows.length > 1;

  rows.forEach((label, index) => {
    ensureSurgeryFieldRow(label);

    const input = label.querySelector(".surgery-input");
    const handle = label.querySelector(".surgery-drag-handle");

    if (handle) {
      handle.hidden = !showHandles;
    }

    if (index === 0) {
      label.classList.remove("unlabeled-field");

      let caption = label.querySelector(".surgery-field-caption");
      if (!caption) {
        caption = document.createElement("span");
        caption.className = "surgery-field-caption";
        caption.textContent = "Cirurgia proposta";
        label.prepend(caption);
      }

      if (input && !input.id) {
        input.id = "surgery";
      }
    } else {
      label.classList.add("unlabeled-field");
      label.querySelector(".surgery-field-caption")?.remove();

      if (input?.id === "surgery") {
        input.removeAttribute("id");
      }
    }

    input?.setAttribute("aria-label", `Cirurgia proposta ${index + 1}`);
  });
}

function getSurgeryValues() {
  return getSurgeryInputs()
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function getPaymentInputs() {
  return [...paymentList.querySelectorAll(".payment-input")];
}

function getManualPaymentValues() {
  return getPaymentInputs()
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function getPaymentQuickValues() {
  return [...paymentQuickList.querySelectorAll('input[name="paymentQuickItems"]:checked')]
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function getPaymentValues() {
  const seen = new Set();
  return [...getPaymentQuickValues(), ...getManualPaymentValues()].filter((payment) => {
    const normalizedPayment = normalizeText(payment);
    if (seen.has(normalizedPayment)) {
      return false;
    }

    seen.add(normalizedPayment);
    return true;
  });
}

function getGuidanceInputs() {
  return [...guidanceList.querySelectorAll(".guidance-input")];
}

function getManualGuidanceValues() {
  return getGuidanceInputs()
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function getGuidanceQuickValues() {
  return [...guidanceQuickList.querySelectorAll('input[name="guidanceQuickItems"]:checked')]
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function getGuidanceValues() {
  const seen = new Set();
  return [...getGuidanceQuickValues(), ...getManualGuidanceValues()].filter((guidance) => {
    const normalizedGuidance = normalizeText(guidance);
    if (seen.has(normalizedGuidance)) {
      return false;
    }

    seen.add(normalizedGuidance);
    return true;
  });
}

function getExtrasInputs() {
  return [...extrasList.querySelectorAll(".extras-input")];
}

function getManualExtrasValues() {
  return getExtrasInputs()
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function getExtrasQuickValues() {
  return [...extrasQuickList.querySelectorAll('input[name="extrasQuickItems"]:checked')]
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function getExtrasValues() {
  const seen = new Set();
  return [...getExtrasQuickValues(), ...getManualExtrasValues()].filter((extra) => {
    const normalizedExtra = normalizeText(extra);
    if (seen.has(normalizedExtra)) {
      return false;
    }

    seen.add(normalizedExtra);
    return true;
  });
}

function getHospitalInputs() {
  return [...hospitalList.querySelectorAll(".hospital-input")];
}

function getHospitalValues() {
  return getHospitalInputs()
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function getHospitalDetailConfig(value) {
  const normalizedValue = normalizeText(value);

  if (normalizedValue.includes("regin")) {
    return {
      datalistId: "reginaHospitalOptions",
      labelPrefix: "Reg",
      name: "hospitalReg",
      placeholder: "Buscar pacote ou taxa Regina",
      source: "regina",
    };
  }

  if (normalizedValue.includes("sapirang")) {
    return {
      datalistId: "sapirangaHospitalOptions",
      labelPrefix: "Sap",
      name: "hospitalSap",
      placeholder: "Buscar pacote Sapiranga",
      source: "sapiranga",
    };
  }

  return null;
}

function formatReginaOption(item, type) {
  if (type === "taxa") {
    return `${item.descricao} - ${item.valor}`;
  }

  return `${item.pacote} - Sala ${item.tempoSala} - SR ${item.tempoSR} - ${item.valor}`;
}

function formatSapirangaOption(item, type) {
  if (type === "diaria") {
    return `${item.descricao} - ${item.valor}`;
  }

  if (type === "excedente") {
    return `${item.descricao} - ${item.valor}`;
  }

  return `${item.pacote} - Sala ${item.tempoSala} - ${item.valor}`;
}

function parseHourValue(value) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalizedValue)) {
    return null;
  }

  return Number(normalizedValue);
}

function parseCurrencyValue(value) {
  return Number(
    value
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim()
  );
}

function formatCurrency(value) {
  return value
    .toLocaleString("pt-BR", {
      currency: "BRL",
      style: "currency",
    })
    .replace(/\u00a0/g, " ");
}

function normalizeCurrencyInputValue(value) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  if (!/\d/.test(trimmedValue)) {
    return "";
  }

  const currencyValue = parseCurrencyValue(trimmedValue);
  return Number.isFinite(currencyValue) ? formatCurrency(currencyValue) : trimmedValue;
}

function normalizeTechnologyValueField() {
  technologyValueInput.value = normalizeCurrencyInputValue(technologyValueInput.value);
}

function normalizeTeamValueField() {
  teamValueInput.value = normalizeCurrencyInputValue(teamValueInput.value);
}

function parseMultiplierValue(value) {
  const normalizedValue = value.replace(",", ".").trim();
  const multiplier = Number(normalizedValue);
  return Number.isFinite(multiplier) ? multiplier : 1;
}

function createHospitalPreviewOptionMap() {
  const options = new Map();

  hospitalTables?.regina?.pacotesCirurgiaPlastica?.forEach((item) => {
    options.set(formatReginaOption(item, "pacote"), {
      label: item.pacote,
      tempoSala: item.tempoSala,
      value: parseCurrencyValue(item.valor),
    });
  });

  hospitalTables?.regina?.taxasAdicionais?.forEach((item) => {
    options.set(formatReginaOption(item, "taxa"), {
      label: item.descricao,
      tempoSala: "",
      value: parseCurrencyValue(item.valor),
    });
  });

  hospitalTables?.sapiranga?.cirurgiasPlasticasCentroCirurgico?.forEach((item) => {
    options.set(formatSapirangaOption(item, "centro"), {
      label: item.pacote,
      tempoSala: item.tempoSala,
      value: parseCurrencyValue(item.valor),
    });
  });

  hospitalTables?.sapiranga?.cirurgiasPlasticasAmbulatorio?.forEach((item) => {
    options.set(formatSapirangaOption(item, "ambulatorio"), {
      label: item.pacote,
      tempoSala: item.tempoSala,
      value: parseCurrencyValue(item.valor),
    });
  });

  hospitalTables?.sapiranga?.diarias?.forEach((item) => {
    options.set(formatSapirangaOption(item, "diaria"), {
      label: item.descricao,
      tempoSala: "",
      value: parseCurrencyValue(item.valor),
    });
  });

  hospitalTables?.sapiranga?.excedente?.forEach((item) => {
    options.set(formatSapirangaOption(item, "excedente"), {
      label: item.descricao,
      tempoSala: "",
      value: parseCurrencyValue(item.valor),
    });
  });

  return options;
}

function createSapirangaOptionMap(items = [], type, category) {
  return new Map(
    items.map((item, order) => {
      const optionText = formatSapirangaOption(item, type);
      return [
        optionText,
        {
          category,
          hours: item.tempoSalaHoras,
          optionText,
          order,
          value: parseCurrencyValue(item.valor),
        },
      ];
    })
  );
}

function getSapirangaOptionMaps() {
  return {
    ambulatorio: createSapirangaOptionMap(
      hospitalTables?.sapiranga?.cirurgiasPlasticasAmbulatorio,
      "ambulatorio",
      "ambulatorio"
    ),
    centro: createSapirangaOptionMap(
      hospitalTables?.sapiranga?.cirurgiasPlasticasCentroCirurgico,
      "centro",
      "centro"
    ),
    diaria: createSapirangaOptionMap(hospitalTables?.sapiranga?.diarias, "diaria", "diaria"),
    excedente: createSapirangaOptionMap(hospitalTables?.sapiranga?.excedente, "excedente", "excedente"),
  };
}

function getReginaOptionMaps() {
  return {
    pacote: new Map(
      (hospitalTables?.regina?.pacotesCirurgiaPlastica || []).map((item, order) => {
        const optionText = formatReginaOption(item, "pacote");
        return [
          optionText,
          {
            category: "pacote",
            hours: item.tempoSalaHoras,
            optionText,
            order,
            value: parseCurrencyValue(item.valor),
          },
        ];
      })
    ),
    taxa: new Map(
      (hospitalTables?.regina?.taxasAdicionais || []).map((item, order) => {
        const optionText = formatReginaOption(item, "taxa");
        return [
          optionText,
          {
            category: "taxa",
            optionText,
            order,
          },
        ];
      })
    ),
  };
}

function getReginaHalfHourOption() {
  const halfHourTax = hospitalTables?.regina?.taxasAdicionais?.find(
    (item) => item.descricao === "SALA CIRÚRGICA - MEIA HORA SUBSEQUENTE"
  );
  if (!halfHourTax) {
    return null;
  }

  return {
    category: "taxa",
    optionText: formatReginaOption(halfHourTax, "taxa"),
    order: hospitalTables.regina.taxasAdicionais.indexOf(halfHourTax),
    value: parseCurrencyValue(halfHourTax.valor),
  };
}

function getSapirangaExcedenteOption() {
  const excedente = hospitalTables?.sapiranga?.excedente?.[0];
  if (!excedente) {
    return null;
  }

  return {
    category: "excedente",
    optionText: formatSapirangaOption(excedente, "excedente"),
    order: 0,
    value: parseCurrencyValue(excedente.valor),
  };
}

function buildHospitalDatalists() {
  if (!hospitalTables) {
    reginaHospitalProcedureOptions = [];
    sapirangaHospitalProcedureOptions = [];
    return;
  }

  reginaHospitalProcedureOptions = [
    ...hospitalTables.regina.pacotesCirurgiaPlastica.map((item) => formatReginaOption(item, "pacote")),
    ...hospitalTables.regina.taxasAdicionais.map((item) => formatReginaOption(item, "taxa")),
  ];

  sapirangaHospitalProcedureOptions = [
    ...hospitalTables.sapiranga.cirurgiasPlasticasCentroCirurgico.map((item) => formatSapirangaOption(item, "centro")),
    ...hospitalTables.sapiranga.cirurgiasPlasticasAmbulatorio.map((item) => formatSapirangaOption(item, "ambulatorio")),
    ...(hospitalTables.sapiranga.excedente || []).map((item) => formatSapirangaOption(item, "excedente")),
    ...hospitalTables.sapiranga.diarias.map((item) => formatSapirangaOption(item, "diaria")),
  ];

  document.querySelector("#reginaHospitalOptions")?.remove();
  document.querySelector("#sapirangaHospitalOptions")?.remove();
}

function getHospitalProcedureOptionsForInput(input) {
  const datalistId = input.closest(".hospital-detail-list")?.dataset.datalistId;

  if (datalistId === "reginaHospitalOptions") {
    return reginaHospitalProcedureOptions;
  }

  if (datalistId === "sapirangaHospitalOptions") {
    return sapirangaHospitalProcedureOptions;
  }

  return [];
}

function positionHospitalProcedureDropdown(input) {
  const rect = input.getBoundingClientRect();
  const gap = 8;
  const viewportMargin = 12;
  const top = viewportMargin;
  const height = window.innerHeight - viewportMargin * 2;

  hospitalProcedureDropdown.style.top = `${top}px`;
  hospitalProcedureDropdown.style.left = `${rect.right + gap}px`;
  hospitalProcedureDropdown.style.height = `${height}px`;
  hospitalProcedureDropdown.style.maxHeight = `${height}px`;
  hospitalProcedureDropdown.style.minWidth = `${Math.max(360, rect.width)}px`;
  hospitalProcedureDropdown.style.maxWidth = `${Math.max(360, window.innerWidth - rect.right - gap - viewportMargin)}px`;
}

function updateHospitalProcedureDropdown(query = "") {
  if (!activeHospitalDetailInput) {
    hospitalProcedureDropdown.hidden = true;
    return;
  }

  const normalizedQuery = normalizeText(query);
  const options = getHospitalProcedureOptionsForInput(activeHospitalDetailInput).filter(
    (item) => !normalizedQuery || normalizeText(item).includes(normalizedQuery)
  );

  hospitalProcedureDropdown.innerHTML = "";
  hospitalProcedureDropdown.hidden = options.length === 0;

  if (options.length === 0) {
    return;
  }

  options.forEach((optionText) => {
    const option = document.createElement("div");
    option.className = "history-option hospital-procedure-option";
    option.dataset.value = optionText;
    option.setAttribute("role", "option");
    option.setAttribute("tabindex", "0");
    option.textContent = optionText;
    hospitalProcedureDropdown.append(option);
  });

  positionHospitalProcedureDropdown(activeHospitalDetailInput);
}

function hideHospitalProcedureDropdown() {
  hospitalProcedureDropdown.hidden = true;
  activeHospitalDetailInput = null;
}

function showHospitalProcedureDropdown(input) {
  activeHospitalDetailInput = input;
  updateHospitalProcedureDropdown(input.value);
}

function selectHospitalProcedureOption(option, shouldAdvance = false) {
  const input = activeHospitalDetailInput;
  if (!input) {
    return;
  }

  input.value = option.dataset.value;
  updatePreview();
  isInteractingWithHospitalProcedureDropdown = false;
  hideHospitalProcedureDropdown();

  if (shouldAdvance) {
    focusNextTextField(input);
    return;
  }

  input.focus();
}

async function loadHospitalTables() {
  try {
    hospitalTables = await AppApi.loadTable("hospitalares");
    buildHospitalDatalists();
  } catch {
    hospitalTables = null;
    console.warn("Não foi possível carregar as tabelas hospitalares locais.");
  }
}

function getImplantDisplayName(item) {
  return item.rotulo || item.modelo || item.referencia;
}

function formatImplantOption(item) {
  const displayName = getImplantDisplayName(item);
  const detailParts = [item.modelo, item.referencia].filter(Boolean);
  const optionText = detailParts.length > 0 ? `${displayName} - ${detailParts.join(" - ")}` : displayName;
  return item.favorito ? `${optionText} ★` : optionText;
}

function buildImplantOptions() {
  implantSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Selecione um implante";
  implantSelect.append(placeholder);

  (implantTable?.itens || []).forEach((item, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = formatImplantOption(item);
    option.dataset.favorite = String(item.favorito === true);
    if (item.favorito) {
      option.className = "implant-option-favorite";
    }
    implantSelect.append(option);
  });
}

async function loadImplantTable() {
  try {
    implantTable = await AppApi.loadTable("implantes");
    buildImplantOptions();
  } catch {
    implantTable = null;
    console.warn("Não foi possível carregar a tabela de implantes local.");
  }
}

function createHospitalDetailEntry(detailList, detailConfig, shouldFocus = false) {
  const fieldNumber = detailList.querySelectorAll(".hospital-detail-field").length + 1;
  const detailField = document.createElement("div");
  detailField.className = "hospital-detail-field";

  const detailLabel = document.createElement("span");
  detailLabel.textContent = `${detailConfig.labelPrefix}${fieldNumber}:`;

  const detailInput = document.createElement("input");
  detailInput.name = `${detailConfig.name}${fieldNumber}`;
  detailInput.type = "text";
  detailInput.className = "hospital-detail-input";
  detailInput.setAttribute("placeholder", detailConfig.placeholder);
  detailInput.setAttribute("aria-label", `${detailConfig.labelPrefix}${fieldNumber}`);

  const multiplierLabel = document.createElement("span");
  multiplierLabel.className = "hospital-detail-multiplier-label";
  multiplierLabel.textContent = "x";

  const multiplierInput = document.createElement("input");
  multiplierInput.name = `${detailConfig.name}${fieldNumber}Multiplier`;
  multiplierInput.type = "text";
  multiplierInput.className = "hospital-detail-multiplier";
  multiplierInput.value = "1";
  multiplierInput.setAttribute("aria-label", `Multiplicador ${detailConfig.labelPrefix}${fieldNumber}`);

  detailField.append(detailLabel);
  detailField.append(detailInput);
  detailField.append(multiplierLabel);
  detailField.append(multiplierInput);
  detailList.append(detailField);

  if (shouldFocus) {
    detailInput.focus();
  }
}

function createHospitalDetailActions(detailConfig) {
  const actions = document.createElement("div");
  actions.className = "hospital-detail-actions";

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "add-button hospital-detail-add";
  addButton.textContent = "+";
  addButton.setAttribute("aria-label", "Adicionar entrada adicional");

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-button hospital-detail-remove";
  removeButton.textContent = "-";
  removeButton.setAttribute("aria-label", "Remover última entrada adicional");

  const autofillButton = document.createElement("button");
  autofillButton.type = "button";
  autofillButton.className = "hospital-detail-autofill";
  autofillButton.dataset.autofillSource = detailConfig.source;
  autofillButton.setAttribute("aria-label", `Completar entradas automaticamente - ${detailConfig.labelPrefix}`);
  autofillButton.append(document.createElement("span"));

  actions.append(addButton);
  actions.append(removeButton);
  actions.append(autofillButton);

  return actions;
}

function wrapHospitalInputWithActions(input, detailConfig) {
  if (input.parentElement?.classList.contains("hospital-control-row")) {
    const autofillButton = input.parentElement.querySelector(".hospital-detail-autofill");
    if (autofillButton) {
      autofillButton.dataset.autofillSource = detailConfig.source;
      autofillButton.setAttribute("aria-label", `Completar entradas automaticamente - ${detailConfig.labelPrefix}`);
    }

    return input.parentElement;
  }

  const controlRow = document.createElement("div");
  controlRow.className = "hospital-control-row";
  input.insertAdjacentElement("beforebegin", controlRow);
  controlRow.append(input);
  controlRow.append(createHospitalDetailActions(detailConfig));

  return controlRow;
}

function unwrapHospitalInput(input) {
  const controlRow = input.parentElement;
  if (!controlRow?.classList.contains("hospital-control-row")) {
    return;
  }

  controlRow.insertAdjacentElement("beforebegin", input);
  controlRow.remove();
}

function updateHospitalDetailButtons(detailList) {
  const label = detailList.closest("label");
  const removeButton = label.querySelector(".hospital-detail-remove");
  if (!removeButton) {
    return;
  }

  removeButton.disabled = detailList.querySelectorAll(".hospital-detail-field").length <= 1;
}

function addHospitalDetailEntryFromButton(button) {
  const label = button.closest("label");
  const detailList = label.querySelector(".hospital-detail-list");
  if (!detailList) {
    return;
  }

  createHospitalDetailEntry(detailList, getHospitalDetailConfigFromList(detailList), true);
  updateHospitalDetailButtons(detailList);
}

function removeHospitalDetailEntryFromButton(button) {
  const label = button.closest("label");
  const detailList = label.querySelector(".hospital-detail-list");
  if (!detailList) {
    return;
  }

  const detailFields = detailList.querySelectorAll(".hospital-detail-field");
  if (detailFields.length <= 1) {
    return;
  }

  detailFields[detailFields.length - 1].remove();
  updateHospitalDetailButtons(detailList);
}

function getHospitalDetailRows(detailList) {
  return [...detailList.querySelectorAll(".hospital-detail-field")].map((field) => ({
    field,
    input: field.querySelector(".hospital-detail-input"),
    multiplier: field.querySelector(".hospital-detail-multiplier"),
  }));
}

function autofillSapirangaDetails(button) {
  const label = button.closest("label");
  const detailList = label.querySelector(".hospital-detail-list");
  if (!detailList) {
    return;
  }

  const sapirangaOptions = getSapirangaOptionMaps();
  const excedenteOption = getSapirangaExcedenteOption();
  const rows = getHospitalDetailRows(detailList);
  const centroEntries = [];
  const ambulatorioEntries = [];
  const diariaEntries = [];
  const otherEntries = [];

  rows.forEach((row) => {
    if (row.input.value === excedenteOption?.optionText) {
      return;
    }

    const centroOption = sapirangaOptions.centro.get(row.input.value);
    if (centroOption) {
      centroEntries.push(centroOption);
      return;
    }

    const ambulatorioOption = sapirangaOptions.ambulatorio.get(row.input.value);
    if (ambulatorioOption) {
      ambulatorioEntries.push({
        ...ambulatorioOption,
        multiplierValue: row.multiplier.value,
      });
      return;
    }

    const diariaOption = sapirangaOptions.diaria.get(row.input.value);
    if (diariaOption) {
      diariaEntries.push({
        ...diariaOption,
        multiplierValue: row.multiplier.value,
      });
      return;
    }

    otherEntries.push({
      optionText: row.input.value,
      multiplierValue: row.multiplier.value,
    });
  });

  centroEntries.sort((left, right) => right.value - left.value || left.order - right.order);
  ambulatorioEntries.sort((left, right) => left.order - right.order);
  diariaEntries.sort((left, right) => left.order - right.order);

  const totalCentroHours = centroEntries.reduce((total, entry) => total + (entry.hours || 0), 0);
  const expectedHours = parseHourValue(getFieldValue("hospitalStay"));
  const missingHours = expectedHours === null ? 0 : Math.max(0, expectedHours - totalCentroHours);
  const excessEntries = missingHours > 0 && excedenteOption
    ? [{ ...excedenteOption, multiplierValue: String(Number(missingHours.toFixed(2))) }]
    : [];
  const orderedEntries = [...centroEntries, ...ambulatorioEntries, ...excessEntries, ...diariaEntries, ...otherEntries];
  if (orderedEntries.length === 0) {
    orderedEntries.push({ optionText: "", multiplierValue: "1" });
  }

  while (getHospitalDetailRows(detailList).length < orderedEntries.length) {
    createHospitalDetailEntry(detailList, getHospitalDetailConfigFromList(detailList));
  }

  getHospitalDetailRows(detailList).slice(orderedEntries.length).forEach((row) => row.field.remove());

  getHospitalDetailRows(detailList).forEach((row, index) => {
    const entry = orderedEntries[index];
    row.input.value = entry.optionText;

    if (index < centroEntries.length) {
      row.multiplier.value = index === 0 ? "1" : index === 1 ? "0.7" : "0.6";
      return;
    }

    row.multiplier.value = entry.multiplierValue;
  });

  updateHospitalDetailButtons(detailList);
}

function autofillReginaDetails(button) {
  const label = button.closest("label");
  const detailList = label.querySelector(".hospital-detail-list");
  if (!detailList) {
    return;
  }

  const reginaOptions = getReginaOptionMaps();
  const halfHourOption = getReginaHalfHourOption();
  const rows = getHospitalDetailRows(detailList);
  const packageEntries = [];
  const taxEntries = [];
  const otherEntries = [];

  rows.forEach((row) => {
    if (row.input.value === halfHourOption?.optionText) {
      return;
    }

    const packageOption = reginaOptions.pacote.get(row.input.value);
    if (packageOption) {
      packageEntries.push({
        ...packageOption,
        multiplierValue: row.multiplier.value,
      });
      return;
    }

    const taxOption = reginaOptions.taxa.get(row.input.value);
    if (taxOption) {
      taxEntries.push({
        ...taxOption,
        multiplierValue: row.multiplier.value,
      });
      return;
    }

    otherEntries.push({
      optionText: row.input.value,
      multiplierValue: row.multiplier.value,
    });
  });

  packageEntries.sort((left, right) => right.value - left.value || left.order - right.order);
  taxEntries.sort((left, right) => left.order - right.order);

  const totalPackageHours = packageEntries.reduce((total, entry) => total + (entry.hours || 0), 0);
  const expectedHours = parseHourValue(getFieldValue("hospitalStay"));
  const missingHours = expectedHours === null ? 0 : Math.max(0, expectedHours - totalPackageHours);
  const halfHourMultiplier = Number((missingHours / 0.5).toFixed(2));
  const excessEntries = missingHours > 0 && halfHourOption
    ? [{ ...halfHourOption, multiplierValue: String(halfHourMultiplier) }]
    : [];
  const orderedTaxEntries = [...taxEntries, ...excessEntries].sort((left, right) => left.order - right.order);
  const orderedEntries = [...packageEntries, ...orderedTaxEntries, ...otherEntries];

  if (orderedEntries.length === 0) {
    orderedEntries.push({ optionText: "", multiplierValue: "1" });
  }

  while (getHospitalDetailRows(detailList).length < orderedEntries.length) {
    createHospitalDetailEntry(detailList, getHospitalDetailConfigFromList(detailList));
  }

  getHospitalDetailRows(detailList).slice(orderedEntries.length).forEach((row) => row.field.remove());

  getHospitalDetailRows(detailList).forEach((row, index) => {
    const entry = orderedEntries[index];
    row.input.value = entry.optionText;

    if (index < packageEntries.length) {
      row.multiplier.value = index === 0 ? "1" : index === 1 ? "0.7" : "0.5";
      return;
    }

    row.multiplier.value = entry.multiplierValue;
  });

  updateHospitalDetailButtons(detailList);
}

function autofillHospitalDetails(button) {
  if (button.dataset.autofillSource === "regina") {
    autofillReginaDetails(button);
    return;
  }

  if (button.dataset.autofillSource === "sapiranga") {
    autofillSapirangaDetails(button);
  }
}

function getHospitalDetailConfigFromList(detailList) {
  return {
    datalistId: detailList.dataset.datalistId,
    labelPrefix: detailList.dataset.labelPrefix,
    name: detailList.dataset.detailName,
    placeholder: detailList.dataset.placeholder,
    source: detailList.dataset.autofillSource,
  };
}

function syncHospitalDetailField(input) {
  hideHospitalProcedureDropdown();
  const label = input.closest("label");
  const existingList = label.querySelector(".hospital-detail-list");
  const detailConfig = getHospitalDetailConfig(input.value);

  if (!detailConfig) {
    existingList?.remove();
    unwrapHospitalInput(input);
    return;
  }

  if (existingList?.dataset.detailName === detailConfig.name) {
    wrapHospitalInputWithActions(input, detailConfig);
    updateHospitalDetailButtons(existingList);
    return;
  }

  existingList?.remove();
  wrapHospitalInputWithActions(input, detailConfig);

  const detailList = document.createElement("div");
  detailList.className = "hospital-detail-list";
  detailList.dataset.datalistId = detailConfig.datalistId;
  detailList.dataset.detailName = detailConfig.name;
  detailList.dataset.labelPrefix = detailConfig.labelPrefix;
  detailList.dataset.placeholder = detailConfig.placeholder;
  detailList.dataset.autofillSource = detailConfig.source;

  createHospitalDetailEntry(detailList, detailConfig);
  input.parentElement.insertAdjacentElement("afterend", detailList);
  updateHospitalDetailButtons(detailList);
}

function syncAllHospitalDetailFields() {
  getHospitalInputs().forEach(syncHospitalDetailField);
}

async function loadSurgeryHistory() {
  try {
    surgeryHistory = await AppApi.getHistory("cirurgias");
  } catch {
    surgeryHistory = [];
  }
}

async function loadPaymentHistory() {
  try {
    paymentHistory = await AppApi.getHistory("pagamentos");
  } catch {
    paymentHistory = [];
  }
}

async function loadGuidanceHistory() {
  try {
    guidanceHistory = await AppApi.getHistory("observacoes");
  } catch {
    guidanceHistory = [];
  }
}

async function loadExtrasHistory() {
  try {
    extrasHistory = await AppApi.getHistory("extras");
  } catch {
    extrasHistory = [];
  }
}

async function loadHospitalHistory() {
  try {
    hospitalHistory = await AppApi.getHistory("hospitais");
  } catch {
    hospitalHistory = [];
  }
}

async function loadPatientHistory() {
  try {
    patientHistory = await AppApi.getHistory("pacientes");
  } catch {
    patientHistory = [];
  }
}

async function loadTechnologyHistory() {
  try {
    const items = await AppApi.getTechnologies();
    technologyHistory = Array.isArray(items) ? items : [];
  } catch {
    technologyHistory = [];
  }
}

async function saveSurgeryToHistory(value, sourceInput = null) {
  const surgery = value.trim();
  if (!surgery) {
    return;
  }

  if (sourceInput?.dataset.skipHistoryValue === normalizeText(surgery)) {
    return;
  }

  const alreadyExists = surgeryHistory.some((item) => normalizeText(item) === normalizeText(surgery));
  if (alreadyExists) {
    return;
  }

  try {
    surgeryHistory = await AppApi.addHistory("cirurgias", surgery);
    if (activeSurgeryInput) {
      updateSurgeryHistoryDropdown(activeSurgeryInput.value);
    }
  } catch {
    console.warn("Não foi possível salvar a cirurgia no histórico local.");
  }
}

async function deleteSurgeryFromHistory(value) {
  const deletedKey = normalizeText(value);
  surgeryHistory = surgeryHistory.filter((item) => normalizeText(item) !== deletedKey);
  updateSurgeryHistoryDropdown(activeSurgeryInput?.value || "");

  try {
    surgeryHistory = await AppApi.removeHistory("cirurgias", value);
    updateSurgeryHistoryDropdown(activeSurgeryInput?.value || "");
  } catch {
    console.warn("Não foi possível remover a cirurgia do histórico local.");
  }
}

async function savePaymentToHistory(value, sourceInput = null) {
  const payment = value.trim();
  if (!payment) {
    return;
  }

  if (sourceInput?.dataset.skipHistoryValue === normalizeText(payment)) {
    return;
  }

  const alreadyExists = paymentHistory.some((item) => normalizeText(item) === normalizeText(payment));
  if (alreadyExists) {
    return;
  }

  try {
    paymentHistory = await AppApi.addHistory("pagamentos", payment);
    renderPaymentQuickList();
    if (activePaymentInput) {
      updatePaymentHistoryDropdown(activePaymentInput.value);
    }
  } catch {
    console.warn("Não foi possível salvar a forma de pagamento no histórico local.");
  }
}

async function deletePaymentFromHistory(value) {
  const deletedKey = normalizeText(value);
  paymentHistory = paymentHistory.filter((item) => normalizeText(item) !== deletedKey);
  deselectedPaymentQuickItems.delete(deletedKey);
  renderPaymentQuickList();
  updatePaymentHistoryDropdown(activePaymentInput?.value || "");

  try {
    paymentHistory = await AppApi.removeHistory("pagamentos", value);
    renderPaymentQuickList();
    updatePaymentHistoryDropdown(activePaymentInput?.value || "");
  } catch {
    console.warn("Não foi possível remover a forma de pagamento do histórico local.");
  }
}

async function saveGuidanceToHistory(value, sourceInput = null) {
  const guidance = value.trim();
  if (!guidance) {
    return;
  }

  if (sourceInput?.dataset.skipHistoryValue === normalizeText(guidance)) {
    return;
  }

  const alreadyExists = guidanceHistory.some((item) => normalizeText(item) === normalizeText(guidance));
  if (alreadyExists) {
    return;
  }

  try {
    guidanceHistory = await AppApi.addHistory("observacoes", guidance);
    renderGuidanceQuickList();
    if (activeGuidanceInput) {
      updateGuidanceHistoryDropdown(activeGuidanceInput.value);
    }
  } catch {
    console.warn("Não foi possível salvar a observação no histórico local.");
  }
}

async function deleteGuidanceFromHistory(value) {
  const deletedKey = normalizeText(value);
  guidanceHistory = guidanceHistory.filter((item) => normalizeText(item) !== deletedKey);
  deselectedGuidanceQuickItems.delete(deletedKey);
  renderGuidanceQuickList();
  updateGuidanceHistoryDropdown(activeGuidanceInput?.value || "");

  try {
    guidanceHistory = await AppApi.removeHistory("observacoes", value);
    renderGuidanceQuickList();
    updateGuidanceHistoryDropdown(activeGuidanceInput?.value || "");
  } catch {
    console.warn("Não foi possível remover a observação do histórico local.");
  }
}

async function saveExtrasToHistory(value, sourceInput = null) {
  const extra = value.trim();
  if (!extra) {
    return;
  }

  if (sourceInput?.dataset.skipHistoryValue === normalizeText(extra)) {
    return;
  }

  const alreadyExists = extrasHistory.some((item) => normalizeText(item) === normalizeText(extra));
  if (alreadyExists) {
    return;
  }

  try {
    extrasHistory = await AppApi.addHistory("extras", extra);
    renderExtrasQuickList();
    if (activeExtrasInput) {
      updateExtrasHistoryDropdown(activeExtrasInput.value);
    }
  } catch {
    console.warn("Não foi possível salvar o extra no histórico local.");
  }
}

async function deleteExtrasFromHistory(value) {
  const deletedKey = normalizeText(value);
  extrasHistory = extrasHistory.filter((item) => normalizeText(item) !== deletedKey);
  deselectedExtrasQuickItems.delete(deletedKey);
  renderExtrasQuickList();
  updateExtrasHistoryDropdown(activeExtrasInput?.value || "");

  try {
    extrasHistory = await AppApi.removeHistory("extras", value);
    renderExtrasQuickList();
    updateExtrasHistoryDropdown(activeExtrasInput?.value || "");
  } catch {
    console.warn("Não foi possível remover o extra do histórico local.");
  }
}

async function saveHospitalToHistory(value, sourceInput = null) {
  const hospital = value.trim();
  if (!hospital) {
    return;
  }

  if (sourceInput?.dataset.skipHistoryValue === normalizeText(hospital)) {
    return;
  }

  const alreadyExists = hospitalHistory.some((item) => normalizeText(item) === normalizeText(hospital));
  if (alreadyExists) {
    return;
  }

  try {
    hospitalHistory = await AppApi.addHistory("hospitais", hospital);
    updateHospitalHistoryDropdown(activeHospitalInput?.value || "");
  } catch {
    console.warn("Não foi possível salvar o hospital no histórico local.");
  }
}

async function deleteHospitalFromHistory(value) {
  const deletedKey = normalizeText(value);
  hospitalHistory = hospitalHistory.filter((item) => normalizeText(item) !== deletedKey);
  updateHospitalHistoryDropdown(activeHospitalInput?.value || "");

  try {
    hospitalHistory = await AppApi.removeHistory("hospitais", value);
    updateHospitalHistoryDropdown(activeHospitalInput?.value || "");
  } catch {
    console.warn("Não foi possível remover o hospital do histórico local.");
  }
}

async function savePatientToHistory(value, sourceInput = null) {
  const patient = value.trim();
  if (!patient) {
    return;
  }

  if (sourceInput?.dataset.skipHistoryValue === normalizeText(patient)) {
    return;
  }

  const alreadyExists = patientHistory.some((item) => normalizeText(item) === normalizeText(patient));
  if (alreadyExists) {
    return;
  }

  try {
    patientHistory = await AppApi.addHistory("pacientes", patient);
    updatePatientHistoryDropdown(patientInput.value);
  } catch {
    console.warn("Não foi possível salvar o paciente no histórico local.");
  }
}

async function deletePatientFromHistory(value) {
  const deletedKey = normalizeText(value);
  patientHistory = patientHistory.filter((item) => normalizeText(item) !== deletedKey);
  updatePatientHistoryDropdown(patientInput.value);

  try {
    patientHistory = await AppApi.removeHistory("pacientes", value);
    updatePatientHistoryDropdown(patientInput.value);
  } catch {
    console.warn("Não foi possível remover o paciente do histórico local.");
  }
}

async function saveTechnologyToHistory() {
  const technology = technologyInput.value.trim();
  if (!technology) {
    return;
  }
  normalizeTechnologyValueField();

  try {
    technologyHistory = await AppApi.addTechnology(
      technology,
      technologyValueInput.value.trim(),
    );
    if (document.activeElement === technologyInput || technologyHistoryDropdown.contains(document.activeElement)) {
      updateTechnologyHistoryDropdown(technologyInput.value);
    }
  } catch {
    console.warn("Não foi possível salvar a tecnologia no histórico local.");
  }
}

async function deleteTechnologyFromHistory(value) {
  const deletedKey = normalizeText(value);
  technologyHistory = technologyHistory.filter((item) => normalizeText(item.nome || item) !== deletedKey);
  updateTechnologyHistoryDropdown(technologyInput.value);

  try {
    technologyHistory = await AppApi.removeTechnology(value);
    updateTechnologyHistoryDropdown(technologyInput.value);
  } catch {
    console.warn("Não foi possível remover a tecnologia do histórico local.");
  }
}

function hideSurgeryHistoryDropdown() {
  if (isInteractingWithHistoryDropdown) {
    return;
  }

  surgeryHistoryDropdown.hidden = true;
  activeSurgeryInput = null;
}

function hidePaymentHistoryDropdown() {
  if (isInteractingWithPaymentDropdown) {
    return;
  }

  paymentHistoryDropdown.hidden = true;
  activePaymentInput = null;
}

function hideGuidanceHistoryDropdown() {
  if (isInteractingWithGuidanceDropdown) {
    return;
  }

  guidanceHistoryDropdown.hidden = true;
  activeGuidanceInput = null;
}

function hideExtrasHistoryDropdown() {
  if (isInteractingWithExtrasDropdown) {
    return;
  }

  extrasHistoryDropdown.hidden = true;
  activeExtrasInput = null;
}

function hideHospitalHistoryDropdown() {
  if (isInteractingWithHospitalDropdown) {
    return;
  }

  hospitalHistoryDropdown.hidden = true;
  activeHospitalInput = null;
}

function hidePatientHistoryDropdown() {
  if (isInteractingWithPatientDropdown) {
    return;
  }

  patientHistoryDropdown.hidden = true;
  activePatientInput = null;
}

function hideTechnologyHistoryDropdown() {
  if (isInteractingWithTechnologyDropdown) {
    return;
  }

  technologyHistoryDropdown.hidden = true;
}

function showSurgeryHistoryDropdown(input) {
  activeSurgeryInput = input;
  input.closest("label").append(surgeryHistoryDropdown);
  updateSurgeryHistoryDropdown(input.value);
}

function showPaymentHistoryDropdown(input) {
  activePaymentInput = input;
  input.closest("label").append(paymentHistoryDropdown);
  updatePaymentHistoryDropdown(input.value);
}

function showGuidanceHistoryDropdown(input) {
  activeGuidanceInput = input;
  input.closest("label").append(guidanceHistoryDropdown);
  updateGuidanceHistoryDropdown(input.value);
}

function showExtrasHistoryDropdown(input) {
  activeExtrasInput = input;
  input.closest("label").append(extrasHistoryDropdown);
  updateExtrasHistoryDropdown(input.value);
}

function showHospitalHistoryDropdown(input) {
  activeHospitalInput = input;
  input.closest("label").append(hospitalHistoryDropdown);
  updateHospitalHistoryDropdown(input.value);
}

function showPatientHistoryDropdown() {
  activePatientInput = patientInput;
  updatePatientHistoryDropdown(patientInput.value);
}

function showTechnologyHistoryDropdown() {
  updateTechnologyHistoryDropdown(technologyInput.value);
}

function updateSurgeryHistoryDropdown(query = "") {
  if (!activeSurgeryInput) {
    surgeryHistoryDropdown.hidden = true;
    return;
  }

  const normalizedQuery = normalizeText(query);
  const options = surgeryHistory
    .filter((item) => !normalizedQuery || normalizeText(item).includes(normalizedQuery))
    .slice(0, 12);

  surgeryHistoryDropdown.innerHTML = "";
  surgeryHistoryDropdown.hidden = options.length === 0;

  options.forEach((optionText) => {
    const option = document.createElement("div");
    option.className = "history-option";
    option.dataset.value = optionText;
    option.setAttribute("role", "button");
    option.setAttribute("tabindex", "0");

    const optionLabel = document.createElement("span");
    optionLabel.textContent = optionText;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "history-delete";
    deleteButton.textContent = "x";
    deleteButton.setAttribute("aria-label", `Remover ${optionText} do histórico`);

    option.append(optionLabel);
    option.append(deleteButton);
    surgeryHistoryDropdown.append(option);
  });
}

function updatePaymentHistoryDropdown(query = "") {
  renderPaymentQuickList();

  if (!activePaymentInput) {
    paymentHistoryDropdown.hidden = true;
    return;
  }

  const normalizedQuery = normalizeText(query);
  const options = paymentHistory
    .filter((item) => !normalizedQuery || normalizeText(item).includes(normalizedQuery))
    .slice(0, 12);

  paymentHistoryDropdown.innerHTML = "";
  paymentHistoryDropdown.hidden = options.length === 0;

  options.forEach((optionText) => {
    const option = document.createElement("div");
    option.className = "history-option";
    option.dataset.value = optionText;
    option.setAttribute("role", "button");
    option.setAttribute("tabindex", "0");

    const optionLabel = document.createElement("span");
    optionLabel.textContent = optionText;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "history-delete";
    deleteButton.textContent = "x";
    deleteButton.setAttribute("aria-label", `Remover ${optionText} do histórico`);

    option.append(optionLabel);
    option.append(deleteButton);
    paymentHistoryDropdown.append(option);
  });
}

function renderPaymentQuickList() {
  paymentQuickList.innerHTML = "";
  paymentQuickList.hidden = paymentHistory.length === 0;

  paymentHistory.forEach((optionText) => {
    const row = document.createElement("label");
    row.className = "payment-quick-option";
    row.dataset.value = optionText;

    const optionLabel = document.createElement("span");
    optionLabel.textContent = optionText;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "paymentQuickItems";
    checkbox.value = optionText;
    checkbox.checked = !deselectedPaymentQuickItems.has(normalizeText(optionText));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "payment-quick-delete";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", `Remover ${optionText} do histórico de pagamentos`);
    deleteButton.dataset.value = optionText;

    row.append(checkbox, optionLabel, deleteButton);
    paymentQuickList.append(row);
  });
}

function updateGuidanceHistoryDropdown(query = "") {
  renderGuidanceQuickList();

  if (!activeGuidanceInput) {
    guidanceHistoryDropdown.hidden = true;
    return;
  }

  const normalizedQuery = normalizeText(query);
  const options = guidanceHistory
    .filter((item) => !normalizedQuery || normalizeText(item).includes(normalizedQuery))
    .slice(0, 12);

  guidanceHistoryDropdown.innerHTML = "";
  guidanceHistoryDropdown.hidden = options.length === 0;

  options.forEach((optionText) => {
    const option = document.createElement("div");
    option.className = "history-option";
    option.dataset.value = optionText;
    option.setAttribute("role", "button");
    option.setAttribute("tabindex", "0");

    const optionLabel = document.createElement("span");
    optionLabel.textContent = optionText;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "history-delete";
    deleteButton.textContent = "x";
    deleteButton.setAttribute("aria-label", `Remover ${optionText} do histórico`);

    option.append(optionLabel);
    option.append(deleteButton);
    guidanceHistoryDropdown.append(option);
  });
}

function renderGuidanceQuickList() {
  guidanceQuickList.innerHTML = "";
  guidanceQuickList.hidden = guidanceHistory.length === 0;

  guidanceHistory.forEach((optionText) => {
    const row = document.createElement("label");
    row.className = "quick-option";
    row.dataset.value = optionText;

    const optionLabel = document.createElement("span");
    optionLabel.textContent = optionText;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "guidanceQuickItems";
    checkbox.value = optionText;
    checkbox.checked = !deselectedGuidanceQuickItems.has(normalizeText(optionText));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "quick-delete";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", `Remover ${optionText} do histórico de observações`);
    deleteButton.dataset.value = optionText;

    row.append(checkbox, optionLabel, deleteButton);
    guidanceQuickList.append(row);
  });
}

function updateExtrasHistoryDropdown(query = "") {
  renderExtrasQuickList();

  if (!activeExtrasInput) {
    extrasHistoryDropdown.hidden = true;
    return;
  }

  const normalizedQuery = normalizeText(query);
  const options = extrasHistory
    .filter((item) => !normalizedQuery || normalizeText(item).includes(normalizedQuery))
    .slice(0, 12);

  extrasHistoryDropdown.innerHTML = "";
  extrasHistoryDropdown.hidden = options.length === 0;

  options.forEach((optionText) => {
    const option = document.createElement("div");
    option.className = "history-option";
    option.dataset.value = optionText;
    option.setAttribute("role", "button");
    option.setAttribute("tabindex", "0");

    const optionLabel = document.createElement("span");
    optionLabel.textContent = optionText;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "history-delete";
    deleteButton.textContent = "x";
    deleteButton.setAttribute("aria-label", `Remover ${optionText} do histórico`);

    option.append(optionLabel);
    option.append(deleteButton);
    extrasHistoryDropdown.append(option);
  });
}

function renderExtrasQuickList() {
  extrasQuickList.innerHTML = "";
  extrasQuickList.hidden = extrasHistory.length === 0;

  extrasHistory.forEach((optionText) => {
    const row = document.createElement("label");
    row.className = "extras-quick-option";
    row.dataset.value = optionText;

    const optionLabel = document.createElement("span");
    optionLabel.textContent = optionText;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "extrasQuickItems";
    checkbox.value = optionText;
    checkbox.checked = !deselectedExtrasQuickItems.has(normalizeText(optionText));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "extras-quick-delete";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", `Remover ${optionText} do histórico de extras`);
    deleteButton.dataset.value = optionText;

    row.append(checkbox, optionLabel, deleteButton);
    extrasQuickList.append(row);
  });
}

async function savePaymentOrderToHistory(items) {
  try {
    paymentHistory = await AppApi.replaceHistory("pagamentos", items);
    renderPaymentQuickList();
    updatePaymentHistoryDropdown(activePaymentInput?.value || "");
    updatePreview();
  } catch {
    console.warn("Não foi possível salvar a ordem das formas de pagamento.");
    renderPaymentQuickList();
  }
}

function getPaymentQuickRows() {
  return Array.from(paymentQuickList.querySelectorAll(".payment-quick-option"));
}

function createPaymentDropIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "payment-quick-drop-indicator";
  return indicator;
}

function movePaymentDropIndicator(clientY) {
  if (!paymentDragState) {
    return;
  }

  const rows = getPaymentQuickRows().filter((row) => row !== paymentDragState.row);
  const nextRow = rows.find((row) => {
    const rect = row.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });

  paymentQuickList.insertBefore(paymentDragState.indicator, nextRow || null);
}

function endPaymentQuickDrag({ shouldCommit = true } = {}) {
  if (!paymentDragState) {
    return;
  }

  const { row, indicator, pointerId } = paymentDragState;
  const hasNewPosition = indicator.parentElement === paymentQuickList;

  row.classList.remove("is-dragging");
  paymentQuickList.classList.remove("is-dragging-payment");

  if (hasNewPosition && shouldCommit) {
    paymentQuickList.insertBefore(row, indicator);
  }

  indicator.remove();

  if (row.hasPointerCapture?.(pointerId)) {
    row.releasePointerCapture(pointerId);
  }

  row.removeEventListener("pointermove", handlePaymentQuickPointerMove);
  row.removeEventListener("pointerup", handlePaymentQuickPointerUp);
  row.removeEventListener("pointercancel", handlePaymentQuickPointerCancel);

  paymentDragState = null;

  if (!hasNewPosition || !shouldCommit) {
    renderPaymentQuickList();
    return;
  }

  const nextHistory = getPaymentQuickRows()
    .map((item) => item.dataset.value)
    .filter(Boolean);

  paymentHistory = nextHistory;
  updatePaymentHistoryDropdown(activePaymentInput?.value || "");
  updatePreview();
  savePaymentOrderToHistory(nextHistory);
}

function handlePaymentQuickPointerMove(event) {
  if (!paymentDragState) {
    return;
  }

  event.preventDefault();
  movePaymentDropIndicator(event.clientY);
}

function handlePaymentQuickPointerUp(event) {
  event.preventDefault();
  endPaymentQuickDrag();
}

function handlePaymentQuickPointerCancel() {
  endPaymentQuickDrag({ shouldCommit: false });
}

function createSurgeryDropIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "payment-quick-drop-indicator";
  return indicator;
}

function moveSurgeryDropIndicator(clientY) {
  if (!surgeryDragState) {
    return;
  }

  const rows = getSurgeryFieldRows().filter((row) => row !== surgeryDragState.row);
  const nextRow = rows.find((row) => {
    const rect = row.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });

  surgeryList.insertBefore(surgeryDragState.indicator, nextRow || null);
}

function endSurgeryFieldDrag({ shouldCommit = true } = {}) {
  if (!surgeryDragState) {
    return;
  }

  const { row, handle, indicator, pointerId, originalNextSibling } = surgeryDragState;
  const hasNewPosition = indicator.parentElement === surgeryList;

  row.classList.remove("is-dragging");
  surgeryList.classList.remove("is-dragging-surgery");

  if (hasNewPosition && shouldCommit) {
    surgeryList.insertBefore(row, indicator);
  } else {
    surgeryList.insertBefore(row, originalNextSibling);
  }

  indicator.remove();

  if (handle.hasPointerCapture?.(pointerId)) {
    handle.releasePointerCapture(pointerId);
  }

  handle.removeEventListener("pointermove", handleSurgeryFieldPointerMove);
  handle.removeEventListener("pointerup", handleSurgeryFieldPointerUp);
  handle.removeEventListener("pointercancel", handleSurgeryFieldPointerCancel);

  surgeryDragState = null;
  updateSurgeryFieldStructure();

  if (!hasNewPosition || !shouldCommit) {
    return;
  }

  updatePreview();
}

function handleSurgeryFieldPointerMove(event) {
  if (!surgeryDragState) {
    return;
  }

  event.preventDefault();
  moveSurgeryDropIndicator(event.clientY);
}

function handleSurgeryFieldPointerUp(event) {
  event.preventDefault();
  endSurgeryFieldDrag();
}

function handleSurgeryFieldPointerCancel() {
  endSurgeryFieldDrag({ shouldCommit: false });
}

async function saveGuidanceOrderToHistory(items) {
  try {
    guidanceHistory = await AppApi.replaceHistory("observacoes", items);
    renderGuidanceQuickList();
    updateGuidanceHistoryDropdown(activeGuidanceInput?.value || "");
    updatePreview();
  } catch {
    console.warn("Não foi possível salvar a ordem das observações.");
    renderGuidanceQuickList();
  }
}

function getGuidanceQuickRows() {
  return Array.from(guidanceQuickList.querySelectorAll(".quick-option"));
}

function createGuidanceDropIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "payment-quick-drop-indicator";
  return indicator;
}

function moveGuidanceDropIndicator(clientY) {
  if (!guidanceDragState) {
    return;
  }

  const rows = getGuidanceQuickRows().filter((row) => row !== guidanceDragState.row);
  const nextRow = rows.find((row) => {
    const rect = row.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });

  guidanceQuickList.insertBefore(guidanceDragState.indicator, nextRow || null);
}

function endGuidanceQuickDrag({ shouldCommit = true } = {}) {
  if (!guidanceDragState) {
    return;
  }

  const { row, indicator, pointerId } = guidanceDragState;
  const hasNewPosition = indicator.parentElement === guidanceQuickList;

  row.classList.remove("is-dragging");
  guidanceQuickList.classList.remove("is-dragging-guidance");

  if (hasNewPosition && shouldCommit) {
    guidanceQuickList.insertBefore(row, indicator);
  }

  indicator.remove();

  if (row.hasPointerCapture?.(pointerId)) {
    row.releasePointerCapture(pointerId);
  }

  row.removeEventListener("pointermove", handleGuidanceQuickPointerMove);
  row.removeEventListener("pointerup", handleGuidanceQuickPointerUp);
  row.removeEventListener("pointercancel", handleGuidanceQuickPointerCancel);

  guidanceDragState = null;

  if (!hasNewPosition || !shouldCommit) {
    renderGuidanceQuickList();
    return;
  }

  const nextHistory = getGuidanceQuickRows()
    .map((item) => item.dataset.value)
    .filter(Boolean);

  guidanceHistory = nextHistory;
  updateGuidanceHistoryDropdown(activeGuidanceInput?.value || "");
  updatePreview();
  saveGuidanceOrderToHistory(nextHistory);
}

function handleGuidanceQuickPointerMove(event) {
  if (!guidanceDragState) {
    return;
  }

  event.preventDefault();
  moveGuidanceDropIndicator(event.clientY);
}

function handleGuidanceQuickPointerUp(event) {
  event.preventDefault();
  endGuidanceQuickDrag();
}

function handleGuidanceQuickPointerCancel() {
  endGuidanceQuickDrag({ shouldCommit: false });
}

async function saveExtrasOrderToHistory(items) {
  try {
    extrasHistory = await AppApi.replaceHistory("extras", items);
    renderExtrasQuickList();
    updateExtrasHistoryDropdown(activeExtrasInput?.value || "");
    updatePreview();
  } catch {
    console.warn("Não foi possível salvar a ordem dos extras.");
    renderExtrasQuickList();
  }
}

function getExtrasQuickRows() {
  return Array.from(extrasQuickList.querySelectorAll(".extras-quick-option"));
}

function createExtrasDropIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "payment-quick-drop-indicator";
  return indicator;
}

function moveExtrasDropIndicator(clientY) {
  if (!extrasDragState) {
    return;
  }

  const rows = getExtrasQuickRows().filter((row) => row !== extrasDragState.row);
  const nextRow = rows.find((row) => {
    const rect = row.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });

  extrasQuickList.insertBefore(extrasDragState.indicator, nextRow || null);
}

function endExtrasQuickDrag({ shouldCommit = true } = {}) {
  if (!extrasDragState) {
    return;
  }

  const { row, indicator, pointerId } = extrasDragState;
  const hasNewPosition = indicator.parentElement === extrasQuickList;

  row.classList.remove("is-dragging");
  extrasQuickList.classList.remove("is-dragging-extras");

  if (hasNewPosition && shouldCommit) {
    extrasQuickList.insertBefore(row, indicator);
  }

  indicator.remove();

  if (row.hasPointerCapture?.(pointerId)) {
    row.releasePointerCapture(pointerId);
  }

  row.removeEventListener("pointermove", handleExtrasQuickPointerMove);
  row.removeEventListener("pointerup", handleExtrasQuickPointerUp);
  row.removeEventListener("pointercancel", handleExtrasQuickPointerCancel);

  extrasDragState = null;

  if (!hasNewPosition || !shouldCommit) {
    renderExtrasQuickList();
    return;
  }

  const nextHistory = getExtrasQuickRows()
    .map((item) => item.dataset.value)
    .filter(Boolean);

  extrasHistory = nextHistory;
  updateExtrasHistoryDropdown(activeExtrasInput?.value || "");
  updatePreview();
  saveExtrasOrderToHistory(nextHistory);
}

function handleExtrasQuickPointerMove(event) {
  if (!extrasDragState) {
    return;
  }

  event.preventDefault();
  moveExtrasDropIndicator(event.clientY);
}

function handleExtrasQuickPointerUp(event) {
  event.preventDefault();
  endExtrasQuickDrag();
}

function handleExtrasQuickPointerCancel() {
  endExtrasQuickDrag({ shouldCommit: false });
}

function updateHospitalHistoryDropdown(query = "") {
  if (!activeHospitalInput) {
    hospitalHistoryDropdown.hidden = true;
    return;
  }

  const normalizedQuery = normalizeText(query);
  const options = hospitalHistory
    .filter((item) => !normalizedQuery || normalizeText(item).includes(normalizedQuery))
    .slice(0, 12);

  hospitalHistoryDropdown.innerHTML = "";
  hospitalHistoryDropdown.hidden = options.length === 0;

  options.forEach((optionText) => {
    const option = document.createElement("div");
    option.className = "history-option";
    option.dataset.value = optionText;
    option.setAttribute("role", "button");
    option.setAttribute("tabindex", "0");

    const optionLabel = document.createElement("span");
    optionLabel.textContent = optionText;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "history-delete";
    deleteButton.textContent = "x";
    deleteButton.setAttribute("aria-label", `Remover ${optionText} do histórico`);

    option.append(optionLabel);
    option.append(deleteButton);
    hospitalHistoryDropdown.append(option);
  });
}

function updatePatientHistoryDropdown(query = "") {
  if (!activePatientInput) {
    patientHistoryDropdown.hidden = true;
    return;
  }

  const normalizedQuery = normalizeText(query);
  const options = patientHistory
    .filter((item) => !normalizedQuery || normalizeText(item).includes(normalizedQuery))
    .slice(0, 12);

  patientHistoryDropdown.innerHTML = "";
  patientHistoryDropdown.hidden = options.length === 0;

  options.forEach((optionText) => {
    const option = document.createElement("div");
    option.className = "history-option";
    option.dataset.value = optionText;
    option.setAttribute("role", "button");
    option.setAttribute("tabindex", "0");

    const optionLabel = document.createElement("span");
    optionLabel.textContent = optionText;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "history-delete";
    deleteButton.textContent = "x";
    deleteButton.setAttribute("aria-label", `Remover ${optionText} do histórico`);

    option.append(optionLabel);
    option.append(deleteButton);
    patientHistoryDropdown.append(option);
  });
}

function updateTechnologyHistoryDropdown(query = "") {
  if (technologyInput.disabled) {
    technologyHistoryDropdown.hidden = true;
    return;
  }

  const normalizedQuery = normalizeText(query);
  const options = technologyHistory
    .filter((item) => {
      const name = item.nome || item;
      return !normalizedQuery || normalizeText(name).includes(normalizedQuery);
    })
    .slice(0, 12);

  technologyHistoryDropdown.innerHTML = "";
  technologyHistoryDropdown.hidden = options.length === 0;

  options.forEach((item) => {
    const optionText = item.nome || item;
    const option = document.createElement("div");
    option.className = "history-option";
    option.dataset.value = optionText;
    option.dataset.amount = item.valor || "";
    option.setAttribute("role", "button");
    option.setAttribute("tabindex", "0");

    const optionLabel = document.createElement("span");
    optionLabel.textContent = optionText;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "history-delete";
    deleteButton.textContent = "x";
    deleteButton.setAttribute("aria-label", `Remover ${optionText} do histórico`);

    option.append(optionLabel);
    option.append(deleteButton);
    technologyHistoryDropdown.append(option);
  });
}

function createSurgeryField() {
  const fieldNumber = getSurgeryInputs().length + 1;
  const label = document.createElement("label");
  label.className = "surgery-field unlabeled-field";

  const row = document.createElement("div");
  row.className = "surgery-field-row";

  const handle = document.createElement("span");
  handle.className = "surgery-drag-handle";
  handle.setAttribute("aria-label", "Reordenar cirurgia");
  handle.hidden = true;

  const input = document.createElement("input");
  input.name = "surgery";
  input.type = "text";
  input.className = "surgery-input";
  input.setAttribute("aria-label", `Cirurgia proposta ${fieldNumber}`);
  input.setAttribute("autocomplete", "off");

  row.append(handle, input);
  label.append(row);
  surgeryList.append(label);
  updateSurgeryButtons();
  input.focus();
}

function createPaymentField() {
  const fieldNumber = getPaymentInputs().length + 1;
  const label = document.createElement("label");
  label.className = "unlabeled-field";

  const input = document.createElement("input");
  input.name = "paymentTerms";
  input.type = "text";
  input.className = "payment-input";
  input.setAttribute("aria-label", `Forma de pagamento ${fieldNumber}`);
  input.setAttribute("autocomplete", "off");

  label.append(input);
  paymentList.append(label);
  updatePaymentButtons();
  input.focus();
}

function createExtrasField() {
  const fieldNumber = getExtrasInputs().length + 1;
  const label = document.createElement("label");
  label.className = "unlabeled-field";

  const input = document.createElement("input");
  input.name = "customExtras";
  input.type = "text";
  input.className = "extras-input";
  input.setAttribute("aria-label", `Extra adicional ${fieldNumber}`);
  input.setAttribute("autocomplete", "off");

  label.append(input);
  extrasList.append(label);
  updateExtrasButtons();
  input.focus();
}

function createGuidanceField() {
  const fieldNumber = getGuidanceInputs().length + 1;
  const label = document.createElement("label");
  label.className = "unlabeled-field";

  const input = document.createElement("input");
  input.name = "customGuidance";
  input.type = "text";
  input.className = "guidance-input";
  input.setAttribute("aria-label", `Observação adicional ${fieldNumber}`);
  input.setAttribute("autocomplete", "off");

  label.append(input);
  guidanceList.append(label);
  updateGuidanceButtons();
  input.focus();
}

function createHospitalField() {
  const fieldNumber = getHospitalInputs().length + 1;
  const label = document.createElement("label");
  label.className = "unlabeled-field";

  const input = document.createElement("input");
  input.name = "hospital";
  input.type = "text";
  input.className = "hospital-input";
  input.setAttribute("aria-label", `Hospital ${fieldNumber}`);
  input.setAttribute("autocomplete", "off");

  label.append(input);
  hospitalList.append(label);
  updateHospitalButtons();
  input.focus();
}

function removeLastSurgeryField() {
  const inputs = getSurgeryInputs();
  if (inputs.length <= 1) {
    inputs[0].value = "";
    inputs[0].focus();
    updatePreview();
    return;
  }

  inputs.at(-1).closest("label").remove();
  updateSurgeryButtons();
  updatePreview();
}

function removeLastPaymentField() {
  const inputs = getPaymentInputs();
  if (inputs.length <= 1) {
    inputs[0].value = "";
    inputs[0].focus();
    updatePreview();
    return;
  }

  inputs.at(-1).closest("label").remove();
  updatePaymentButtons();
  updatePreview();
}

function removeLastExtrasField() {
  const inputs = getExtrasInputs();
  if (inputs.length <= 1) {
    inputs[0].value = "";
    inputs[0].focus();
    updatePreview();
    return;
  }

  inputs.at(-1).closest("label").remove();
  updateExtrasButtons();
  updatePreview();
}

function removeLastGuidanceField() {
  const inputs = getGuidanceInputs();
  if (inputs.length <= 1) {
    inputs[0].value = "";
    inputs[0].focus();
    updatePreview();
    return;
  }

  inputs.at(-1).closest("label").remove();
  updateGuidanceButtons();
  updatePreview();
}

function removeLastHospitalField() {
  const inputs = getHospitalInputs();
  if (inputs.length <= 1) {
    inputs[0].value = "";
    syncHospitalDetailField(inputs[0]);
    inputs[0].focus();
    updatePreview();
    return;
  }

  inputs.at(-1).closest("label").remove();
  updateHospitalButtons();
  updatePreview();
}

function updateSurgeryButtons() {
  removeSurgeryButton.disabled = getSurgeryInputs().length <= 1;
  updateSurgeryFieldStructure();
}

function updatePaymentButtons() {
  removePaymentButton.disabled = getPaymentInputs().length <= 1;
}

function updateExtrasButtons() {
  removeExtrasButton.disabled = getExtrasInputs().length <= 1;
}

function updateGuidanceButtons() {
  removeGuidanceButton.disabled = getGuidanceInputs().length <= 1;
}

function updateHospitalButtons() {
  removeHospitalButton.disabled = getHospitalInputs().length <= 1;
}

function isTextField(element) {
  return element.matches('input[type="date"], input[type="text"], textarea');
}

function getDynamicFieldListContainer(field) {
  return field.closest("#surgeryList, #hospitalList, #extrasList, #paymentList, #guidanceList");
}

function focusNextTextField(currentField) {
  isInteractingWithHistoryDropdown = false;
  isInteractingWithPaymentDropdown = false;
  isInteractingWithExtrasDropdown = false;
  isInteractingWithGuidanceDropdown = false;
  isInteractingWithHospitalDropdown = false;
  isInteractingWithPatientDropdown = false;
  isInteractingWithTechnologyDropdown = false;
  hideSurgeryHistoryDropdown();
  hidePaymentHistoryDropdown();
  hideExtrasHistoryDropdown();
  hideGuidanceHistoryDropdown();
  hideHospitalHistoryDropdown();
  hidePatientHistoryDropdown();
  hideTechnologyHistoryDropdown();

  const dynamicList = getDynamicFieldListContainer(currentField);
  const scope = dynamicList || form;
  const textFields = [...scope.querySelectorAll('input[type="date"], input[type="text"], textarea')]
    .filter((field) => !field.disabled && !field.readOnly && field.offsetParent !== null);
  const currentIndex = textFields.indexOf(currentField);
  const nextField = textFields[currentIndex + 1];

  if (nextField) {
    nextField.focus();
  } else {
    currentField.blur();
  }
}

function getDropdownOptions(dropdown) {
  return [...dropdown.querySelectorAll(".history-option")];
}

function focusDropdownOption(dropdown, index) {
  const options = getDropdownOptions(dropdown);
  const option = options[index];

  if (option) {
    option.focus();
  }
}

function selectSurgeryHistoryOption(option, shouldAdvance = false) {
  const input = activeSurgeryInput;
  if (!input) {
    return;
  }

  input.value = option.dataset.value;
  updatePreview();
  isInteractingWithHistoryDropdown = false;
  hideSurgeryHistoryDropdown();

  if (shouldAdvance) {
    focusNextTextField(input);
    return;
  }

  input.focus();
}

function selectPaymentHistoryOption(option, shouldAdvance = false) {
  const input = activePaymentInput;
  if (!input) {
    return;
  }

  input.value = option.dataset.value;
  updatePreview();
  isInteractingWithPaymentDropdown = false;
  hidePaymentHistoryDropdown();

  if (shouldAdvance) {
    focusNextTextField(input);
    return;
  }

  input.focus();
}

function selectExtrasHistoryOption(option, shouldAdvance = false) {
  const input = activeExtrasInput;
  if (!input) {
    return;
  }

  input.value = option.dataset.value;
  updatePreview();
  isInteractingWithExtrasDropdown = false;
  hideExtrasHistoryDropdown();

  if (shouldAdvance) {
    focusNextTextField(input);
    return;
  }

  input.focus();
}

function selectGuidanceHistoryOption(option, shouldAdvance = false) {
  const input = activeGuidanceInput;
  if (!input) {
    return;
  }

  input.value = option.dataset.value;
  updatePreview();
  isInteractingWithGuidanceDropdown = false;
  hideGuidanceHistoryDropdown();

  if (shouldAdvance) {
    focusNextTextField(input);
    return;
  }

  input.focus();
}

function selectHospitalHistoryOption(option, shouldAdvance = false) {
  const input = activeHospitalInput;
  if (!input) {
    return;
  }

  input.value = option.dataset.value;
  syncHospitalDetailField(input);
  updatePreview();
  isInteractingWithHospitalDropdown = false;
  hideHospitalHistoryDropdown();

  if (shouldAdvance) {
    focusNextTextField(input);
    return;
  }

  input.dataset.skipNextHistoryFocus = "true";
  input.focus();
}

function selectPatientHistoryOption(option, shouldAdvance = false) {
  patientInput.value = option.dataset.value;
  updatePreview();
  isInteractingWithPatientDropdown = false;
  hidePatientHistoryDropdown();

  if (shouldAdvance) {
    focusNextTextField(patientInput);
    return;
  }

  patientInput.focus();
}

function selectTechnologyHistoryOption(option, shouldAdvance = false) {
  technologyInput.value = option.dataset.value;
  technologyValueInput.value = normalizeCurrencyInputValue(option.dataset.amount || "");
  updatePreview();
  isInteractingWithTechnologyDropdown = false;
  hideTechnologyHistoryDropdown();

  if (shouldAdvance) {
    technologyValueInput.focus();
    return;
  }

  technologyInput.focus();
}

function getHospitalPreviewRows(input, optionMap) {
  const detailList = input.closest("label")?.querySelector(".hospital-detail-list");
  if (!detailList) {
    return [];
  }

  return getHospitalDetailRows(detailList)
    .map((row) => {
      const option = optionMap.get(row.input.value);
      if (!option) {
        return null;
      }

      const multiplier = parseMultiplierValue(row.multiplier.value);
      return {
        label: option.label,
        tempoSala: option.tempoSala,
        totalValue: option.value * multiplier,
      };
    })
    .filter(Boolean);
}

function createHospitalPreviewItem(hospital, rows = []) {
  const previewItem = document.createElement("dd");
  previewItem.className = "hospital-preview-item";
  previewItem.dataset.preview = "hospital";

  const hospitalName = document.createElement("span");
  hospitalName.className = "hospital-preview-name";
  hospitalName.textContent = hospital;

  const procedures = document.createElement("span");
  procedures.className = "hospital-preview-procedures";

  const values = document.createElement("span");
  values.className = "hospital-preview-values";

  if (rows.length === 0) {
    procedures.textContent = "";
    values.textContent = "";
  } else {
    rows.forEach((row) => {
      const procedureLine = document.createElement("span");
      procedureLine.textContent = row.tempoSala ? `${row.label} - ${row.tempoSala}` : row.label;
      procedures.append(procedureLine);
    });

    const totalValueLine = document.createElement("span");
    totalValueLine.textContent = formatCurrency(rows.reduce((total, row) => total + row.totalValue, 0));
    values.append(totalValueLine);
  }

  previewItem.append(hospitalName);
  previewItem.append(procedures);
  previewItem.append(values);

  return previewItem;
}

function updateHospitalPreview() {
  const hospitalSummary = document.querySelector(".hospital-summary");
  if (!hospitalSummary) {
    return;
  }

  hospitalSummary.querySelectorAll(".hospital-preview-item").forEach((item) => item.remove());

  const isEnabled = hospitalEnabledInput.checked;
  hospitalFieldset.classList.toggle("is-collapsed", !isEnabled);
  hospitalFormContent.hidden = !isEnabled;
  hospitalFormContent.querySelectorAll("input, button").forEach((control) => {
    control.disabled = !isEnabled;
  });
  hospitalSummary.hidden = !isEnabled;

  if (!isEnabled) {
    hideHospitalHistoryDropdown();
    return;
  }

  updateHospitalButtons();
  hospitalFormContent
    .querySelectorAll(".hospital-detail-list")
    .forEach(updateHospitalDetailButtons);

  const optionMap = createHospitalPreviewOptionMap();
  const hospitalInputs = getHospitalInputs();
  const filledHospitalInputs = hospitalInputs.filter((input) => input.value.trim());

  if (filledHospitalInputs.length === 0) {
    hospitalSummary.append(createHospitalPreviewItem("Hospital"));
    return;
  }

  filledHospitalInputs.forEach((input) => {
    hospitalSummary.append(createHospitalPreviewItem(input.value.trim(), getHospitalPreviewRows(input, optionMap)));
  });
}

function getSelectedImplant() {
  if (!implantsEnabledInput.checked || !implantSelect.value) {
    return null;
  }

  return implantTable?.itens?.[Number(implantSelect.value)] || null;
}

function updateImplantsPreview() {
  const isEnabled = implantsEnabledInput.checked;
  implantsFieldset.classList.toggle("is-collapsed", !isEnabled);
  implantsFormContent.hidden = !isEnabled;
  implantSelect.disabled = !isEnabled;

  if (!isEnabled) {
    implantSelect.value = "";
  }

  implantsPreviewSection.hidden = !isEnabled;

  const implant = getSelectedImplant();
  const implantSummaryPreview = document.querySelector('[data-preview="implantSummary"]');
  implantSummaryPreview.innerHTML = "";

  if (!implant) {
    implantSummaryPreview.textContent = "Selecione um implante.";
    return;
  }

  const description = document.createElement("span");
  description.className = "implant-preview-description";
  description.textContent = [
    implant.marca,
    getImplantDisplayName(implant),
    implant.modelo,
    implant.referencia,
  ].filter(Boolean).join(" - ");

  const values = document.createElement("span");
  values.className = "implant-preview-values";

  const cashValue = document.createElement("span");
  cashValue.textContent = `${implant.valorAVista || "R$"} à vista`;

  const cardValue = document.createElement("span");
  cardValue.textContent = `${implant.valorCartao7x || "R$"} em 7x no cartão`;

  values.append(cashValue, cardValue);
  implantSummaryPreview.append(description, values);
}

function updateTechnologiesPreview() {
  const isEnabled = technologiesEnabledInput.checked;
  technologiesFieldset.classList.toggle("is-collapsed", !isEnabled);
  technologiesFormContent.hidden = !isEnabled;
  technologyInput.disabled = !isEnabled;
  technologyValueInput.disabled = !isEnabled;

  if (!isEnabled) {
    technologyInput.value = "";
    technologyValueInput.value = "";
    hideTechnologyHistoryDropdown();
  }

  technologiesPreviewSection.hidden = !isEnabled;

  const technologyNamePreview = document.querySelector('[data-preview="technologyName"]');
  const technologyValuePreview = document.querySelector('[data-preview="technologyValue"]');
  technologyNamePreview.textContent = technologyInput.value.trim() || "Selecione uma tecnologia.";
  technologyValuePreview.textContent = normalizeCurrencyInputValue(technologyValueInput.value) || "R$";
}

function updateTeamPreview() {
  const teamItemsPreview = document.querySelector('[data-preview="teamItems"]');
  const teamValuePreview = document.querySelector('[data-preview="teamValue"]');
  const selectedTeamItems = [...form.querySelectorAll('input[name="teamItems"]:checked')]
    .map((input) => input.value);
  teamItemsPreview.textContent = selectedTeamItems.join(" + ") || "Equipe";
  teamValuePreview.textContent = normalizeCurrencyInputValue(teamValueInput.value) || "R$";
}

function updateSimpleFields() {
  Object.entries(previewFields).forEach(([fieldName, fallback]) => {
    const preview = document.querySelector(`[data-preview="${fieldName}"]`);
    if (!preview) {
      return;
    }

    preview.textContent = getFieldValue(fieldName) || fallback;
  });

  const hospitalStayPreview = document.querySelector('[data-preview="hospitalStay"]');
  hospitalStayPreview.textContent = formatHospitalStay(getFieldValue("hospitalStay"));

  const surgeryPreview = document.querySelector('[data-preview="surgery"]');
  surgeryPreview.textContent = getSurgeryValues().join("\n") || "Cirurgia proposta";

  updateHospitalPreview();
  updateImplantsPreview();
  updateTechnologiesPreview();
  updateTeamPreview();
}

function updatePaymentPreview() {
  const paymentValues = getPaymentValues();
  paymentPreview.innerHTML = "";

  if (paymentValues.length === 0) {
    const emptyItem = document.createElement("p");
    emptyItem.textContent = "Preencha as formas de pagamento.";
    paymentPreview.append(emptyItem);
    return;
  }

  paymentValues.forEach((payment) => {
    const item = document.createElement("p");
    item.textContent = payment;
    paymentPreview.append(item);
  });
}

function updateExtrasPreview() {
  const isEnabled = extrasEnabledInput.checked;
  extrasFieldset.classList.toggle("is-collapsed", !isEnabled);
  extrasFormContent.hidden = !isEnabled;
  extrasFormContent.querySelectorAll("input, button").forEach((control) => {
    control.disabled = !isEnabled;
  });
  extrasPreviewSection.hidden = !isEnabled;

  if (!isEnabled) {
    hideExtrasHistoryDropdown();
    return;
  }

  updateExtrasButtons();

  const extrasValues = getExtrasValues();
  extrasPreview.innerHTML = "";

  if (extrasValues.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "Selecione os extras desejados.";
    extrasPreview.append(emptyItem);
    return;
  }

  extrasValues.forEach((extra) => {
    const item = document.createElement("li");
    item.textContent = extra;
    extrasPreview.append(item);
  });
}

function updateGuidance() {
  const selectedGuidance = getGuidanceValues();

  guidancePreview.innerHTML = "";

  if (selectedGuidance.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "Selecione as observações desejadas.";
    guidancePreview.append(emptyItem);
    return;
  }

  selectedGuidance.forEach((guidance) => {
    const item = document.createElement("li");
    item.textContent = guidance;
    guidancePreview.append(item);
  });
}

function updateDocumentDates() {
  const formattedDate = formatDateForDocument(getFieldValue("budgetDate"));
  document.querySelectorAll('[data-preview="budgetDate"]').forEach((datePreview) => {
    datePreview.textContent = formattedDate;
  });
}

function updateDocumentPageCounters() {
  const pages = [printPage, ...document.querySelectorAll(".generated-print-page")];
  const totalPages = pages.length;

  pages.forEach((page, index) => {
    const pageCounter = page.querySelector('[data-preview="pageCounter"]');
    if (!pageCounter) {
      return;
    }

    pageCounter.hidden = totalPages <= 1;
    pageCounter.textContent = totalPages > 1 ? `Página ${index + 1} de ${totalPages}` : "";
  });
}

function createDocumentPage() {
  const page = document.createElement("article");
  page.className = "print-page generated-print-page";

  const background = document.createElement("img");
  background.className = "letterhead-background";
  background.src = "assets/papel-timbrado.png";
  background.alt = "";
  background.setAttribute("aria-hidden", "true");

  const content = document.createElement("div");
  content.className = "document-content";

  const flow = document.createElement("div");
  flow.className = "document-flow";

  const pageCounter = document.createElement("p");
  pageCounter.className = "document-page-counter";
  pageCounter.dataset.preview = "pageCounter";
  pageCounter.hidden = true;

  const date = document.createElement("p");
  date.className = "document-date";
  date.dataset.preview = "budgetDate";
  date.textContent = formatDateForDocument(getFieldValue("budgetDate"));

  content.append(flow, pageCounter, date);
  page.append(background, content);
  previewPanel.append(page);

  return page;
}

function paginateDocument() {
  const pages = [printPage, ...document.querySelectorAll(".generated-print-page")];
  const blocks = pages.flatMap((page) => [...page.querySelector(".document-flow").children]);
  document.querySelectorAll(".generated-print-page").forEach((page) => page.remove());
  documentFlow.replaceChildren();
  updateDocumentDates();

  let currentPage = printPage;
  let currentFlow = documentFlow;
  const content = currentPage.querySelector(".document-content");
  const date = currentPage.querySelector(".document-date");
  const reservedDateSpace = date.offsetHeight + 14;
  const availableHeight = content.clientHeight - reservedDateSpace;

  blocks.forEach((block) => {
    currentFlow.append(block);

    if (block.offsetTop + block.offsetHeight <= availableHeight || currentFlow.children.length === 1) {
      return;
    }

    currentPage = createDocumentPage();
    currentFlow = currentPage.querySelector(".document-flow");
    currentFlow.append(block);
  });

  updateDocumentDates();
  updateDocumentPageCounters();
}

function restorePreviewScroll(scrollTop, scrollLeft) {
  const maxScrollTop = Math.max(0, previewPanel.scrollHeight - previewPanel.clientHeight);
  const maxScrollLeft = Math.max(0, previewPanel.scrollWidth - previewPanel.clientWidth);
  previewPanel.scrollTop = Math.min(scrollTop, maxScrollTop);
  previewPanel.scrollLeft = Math.min(scrollLeft, maxScrollLeft);
}

function getPrintPagesHtml() {
  return [...document.querySelectorAll("#printPage, .generated-print-page")]
    .map((page) => page.outerHTML)
    .join("\n");
}

async function exportPdfDocument() {
  const pagesHtml = getPrintPagesHtml();
  if (!pagesHtml) {
    return;
  }

  try {
    const result = await AppApi.exportPdf(getFieldValue("patientName"), pagesHtml);
    console.info(`PDF salvo em ${result.path}`);
  } catch (error) {
    console.warn("Não foi possível gerar o PDF automaticamente.", error);
  }
}

function updatePreview() {
  const previewScrollTop = previewPanel.scrollTop;
  const previewScrollLeft = previewPanel.scrollLeft;

  updateSimpleFields();
  updateExtrasPreview();
  updatePaymentPreview();
  updateGuidance();
  paginateDocument();
  restorePreviewScroll(previewScrollTop, previewScrollLeft);
  requestAnimationFrame(() => restorePreviewScroll(previewScrollTop, previewScrollLeft));
}

function clearForm() {
  form.reset();
  deselectedPaymentQuickItems = new Set();
  deselectedExtrasQuickItems = new Set();
  deselectedGuidanceQuickItems = new Set();
  renderPaymentQuickList();
  renderExtrasQuickList();
  renderGuidanceQuickList();
  getSurgeryInputs().slice(1).forEach((input) => input.closest("label").remove());
  getExtrasInputs().slice(1).forEach((input) => input.closest("label").remove());
  getPaymentInputs().slice(1).forEach((input) => input.closest("label").remove());
  getGuidanceInputs().slice(1).forEach((input) => input.closest("label").remove());
  getHospitalInputs().slice(1).forEach((input) => input.closest("label").remove());
  syncAllHospitalDetailFields();
  form.elements.budgetDate.value = formatDateForInput(new Date());
  updateSurgeryButtons();
  updateExtrasButtons();
  updatePaymentButtons();
  updateGuidanceButtons();
  updateHospitalButtons();
  updatePreview();
}

form.elements.budgetDate.value = formatDateForInput(new Date());
form.addEventListener("input", updatePreview);
form.addEventListener("change", updatePreview);
form.addEventListener("input", (event) => {
  if (event.target.matches(".patient-input")) {
    if (event.target.dataset.skipHistoryValue !== normalizeText(event.target.value)) {
      delete event.target.dataset.skipHistoryValue;
    }

    showPatientHistoryDropdown();
  }

  if (event.target.matches(".surgery-input")) {
    if (event.target.dataset.skipHistoryValue !== normalizeText(event.target.value)) {
      delete event.target.dataset.skipHistoryValue;
    }

    showSurgeryHistoryDropdown(event.target);
  }

  if (event.target.matches(".payment-input")) {
    if (event.target.dataset.skipHistoryValue !== normalizeText(event.target.value)) {
      delete event.target.dataset.skipHistoryValue;
    }

    showPaymentHistoryDropdown(event.target);
  }

  if (event.target.matches(".extras-input")) {
    if (event.target.dataset.skipHistoryValue !== normalizeText(event.target.value)) {
      delete event.target.dataset.skipHistoryValue;
    }

    showExtrasHistoryDropdown(event.target);
  }

  if (event.target.matches(".guidance-input")) {
    if (event.target.dataset.skipHistoryValue !== normalizeText(event.target.value)) {
      delete event.target.dataset.skipHistoryValue;
    }

    showGuidanceHistoryDropdown(event.target);
  }

  if (event.target.matches(".hospital-input")) {
    if (event.target.dataset.skipHistoryValue !== normalizeText(event.target.value)) {
      delete event.target.dataset.skipHistoryValue;
    }

    syncHospitalDetailField(event.target);
    showHospitalHistoryDropdown(event.target);
  }

  if (event.target.matches(".hospital-detail-input")) {
    showHospitalProcedureDropdown(event.target);
  }

  if (event.target.matches(".technology-input")) {
    showTechnologyHistoryDropdown();
  }
});
form.addEventListener("focusin", (event) => {
  if (event.target.matches(".patient-input")) {
    showPatientHistoryDropdown();
  }

  if (event.target.matches(".surgery-input")) {
    showSurgeryHistoryDropdown(event.target);
  }

  if (event.target.matches(".payment-input")) {
    showPaymentHistoryDropdown(event.target);
  }

  if (event.target.matches(".extras-input")) {
    showExtrasHistoryDropdown(event.target);
  }

  if (event.target.matches(".guidance-input")) {
    showGuidanceHistoryDropdown(event.target);
  }

  if (event.target.matches(".hospital-input")) {
    if (event.target.dataset.skipNextHistoryFocus === "true") {
      delete event.target.dataset.skipNextHistoryFocus;
      return;
    }

    showHospitalHistoryDropdown(event.target);
  }

  if (event.target.matches(".hospital-detail-input")) {
    showHospitalProcedureDropdown(event.target);
  }

  if (event.target.matches(".technology-input")) {
    showTechnologyHistoryDropdown();
  }
});
paymentQuickList.addEventListener("change", (event) => {
  if (!event.target.matches('input[name="paymentQuickItems"]')) {
    return;
  }

  const paymentKey = normalizeText(event.target.value);
  if (event.target.checked) {
    deselectedPaymentQuickItems.delete(paymentKey);
  } else {
    deselectedPaymentQuickItems.add(paymentKey);
  }

  updatePreview();
});
extrasQuickList.addEventListener("change", (event) => {
  if (!event.target.matches('input[name="extrasQuickItems"]')) {
    return;
  }

  const extraKey = normalizeText(event.target.value);
  if (event.target.checked) {
    deselectedExtrasQuickItems.delete(extraKey);
  } else {
    deselectedExtrasQuickItems.add(extraKey);
  }

  updatePreview();
});
paymentQuickList.addEventListener("pointerdown", (event) => {
  const row = event.target.closest(".payment-quick-option");
  if (!row || event.button !== 0 || event.target.closest("input, button")) {
    return;
  }

  event.preventDefault();
  hidePaymentHistoryDropdown();

  paymentDragState = {
    row,
    indicator: createPaymentDropIndicator(),
    pointerId: event.pointerId,
  };

  row.classList.add("is-dragging");
  paymentQuickList.classList.add("is-dragging-payment");
  row.setPointerCapture(event.pointerId);
  movePaymentDropIndicator(event.clientY);

  row.addEventListener("pointermove", handlePaymentQuickPointerMove);
  row.addEventListener("pointerup", handlePaymentQuickPointerUp);
  row.addEventListener("pointercancel", handlePaymentQuickPointerCancel);
});
extrasQuickList.addEventListener("pointerdown", (event) => {
  const row = event.target.closest(".extras-quick-option");
  if (!row || event.button !== 0 || event.target.closest("input, button")) {
    return;
  }

  event.preventDefault();
  hideExtrasHistoryDropdown();

  extrasDragState = {
    row,
    indicator: createExtrasDropIndicator(),
    pointerId: event.pointerId,
  };

  row.classList.add("is-dragging");
  extrasQuickList.classList.add("is-dragging-extras");
  row.setPointerCapture(event.pointerId);
  moveExtrasDropIndicator(event.clientY);

  row.addEventListener("pointermove", handleExtrasQuickPointerMove);
  row.addEventListener("pointerup", handleExtrasQuickPointerUp);
  row.addEventListener("pointercancel", handleExtrasQuickPointerCancel);
});
guidanceQuickList.addEventListener("change", (event) => {
  if (!event.target.matches('input[name="guidanceQuickItems"]')) {
    return;
  }

  const guidanceKey = normalizeText(event.target.value);
  if (event.target.checked) {
    deselectedGuidanceQuickItems.delete(guidanceKey);
  } else {
    deselectedGuidanceQuickItems.add(guidanceKey);
  }

  updatePreview();
});
guidanceQuickList.addEventListener("pointerdown", (event) => {
  const row = event.target.closest(".quick-option");
  if (!row || event.button !== 0 || event.target.closest("input, button")) {
    return;
  }

  event.preventDefault();
  hideGuidanceHistoryDropdown();

  guidanceDragState = {
    row,
    indicator: createGuidanceDropIndicator(),
    pointerId: event.pointerId,
  };

  row.classList.add("is-dragging");
  guidanceQuickList.classList.add("is-dragging-guidance");
  row.setPointerCapture(event.pointerId);
  moveGuidanceDropIndicator(event.clientY);

  row.addEventListener("pointermove", handleGuidanceQuickPointerMove);
  row.addEventListener("pointerup", handleGuidanceQuickPointerUp);
  row.addEventListener("pointercancel", handleGuidanceQuickPointerCancel);
});
surgeryList.addEventListener("pointerdown", (event) => {
  const handle = event.target.closest(".surgery-drag-handle");
  if (!handle || event.button !== 0 || handle.hidden) {
    return;
  }

  const row = handle.closest(".surgery-field");
  if (!row) {
    return;
  }

  event.preventDefault();
  hideSurgeryHistoryDropdown();

  surgeryDragState = {
    row,
    handle,
    indicator: createSurgeryDropIndicator(),
    pointerId: event.pointerId,
    originalNextSibling: row.nextElementSibling,
  };

  row.classList.add("is-dragging");
  surgeryList.classList.add("is-dragging-surgery");
  handle.setPointerCapture(event.pointerId);
  moveSurgeryDropIndicator(event.clientY);

  handle.addEventListener("pointermove", handleSurgeryFieldPointerMove);
  handle.addEventListener("pointerup", handleSurgeryFieldPointerUp);
  handle.addEventListener("pointercancel", handleSurgeryFieldPointerCancel);
});
form.addEventListener("focusout", (event) => {
  if (event.target.matches(".patient-input")) {
    if (patientHistoryDropdown.contains(event.relatedTarget)) {
      return;
    }

    if (!isInteractingWithPatientDropdown) {
      savePatientToHistory(event.target.value, event.target);
      hidePatientHistoryDropdown();
    }
  }

  if (event.target.matches(".surgery-input")) {
    if (surgeryHistoryDropdown.contains(event.relatedTarget)) {
      return;
    }

    if (!isInteractingWithHistoryDropdown) {
      saveSurgeryToHistory(event.target.value, event.target);
      hideSurgeryHistoryDropdown();
    }
  }

  if (event.target.matches(".payment-input")) {
    if (paymentHistoryDropdown.contains(event.relatedTarget)) {
      return;
    }

    if (!isInteractingWithPaymentDropdown) {
      savePaymentToHistory(event.target.value, event.target);
      hidePaymentHistoryDropdown();
    }
  }

  if (event.target.matches(".extras-input")) {
    if (extrasHistoryDropdown.contains(event.relatedTarget)) {
      return;
    }

    if (!isInteractingWithExtrasDropdown) {
      saveExtrasToHistory(event.target.value, event.target);
      hideExtrasHistoryDropdown();
    }
  }

  if (event.target.matches(".guidance-input")) {
    if (guidanceHistoryDropdown.contains(event.relatedTarget)) {
      return;
    }

    if (!isInteractingWithGuidanceDropdown) {
      saveGuidanceToHistory(event.target.value, event.target);
      hideGuidanceHistoryDropdown();
    }
  }

  if (event.target.matches(".hospital-input")) {
    if (hospitalHistoryDropdown.contains(event.relatedTarget)) {
      return;
    }

    if (!isInteractingWithHospitalDropdown) {
      saveHospitalToHistory(event.target.value, event.target);
      hideHospitalHistoryDropdown();
    }
  }

  if (event.target.matches(".hospital-detail-input")) {
    if (hospitalProcedureDropdown.contains(event.relatedTarget)) {
      return;
    }

    if (!isInteractingWithHospitalProcedureDropdown) {
      hideHospitalProcedureDropdown();
    }
  }

  if (event.target.matches(".technology-input, #technologyValue")) {
    if (technologyHistoryDropdown.contains(event.relatedTarget)) {
      return;
    }

    if (!isInteractingWithTechnologyDropdown) {
      if (event.target === technologyValueInput) {
        normalizeTechnologyValueField();
        updatePreview();
      }

      saveTechnologyToHistory();
      hideTechnologyHistoryDropdown();
    }
  }

  if (event.target === teamValueInput) {
    normalizeTeamValueField();
    updatePreview();
  }
});
form.addEventListener("keydown", (event) => {
  if (event.target.matches(".surgery-input") && event.shiftKey && event.key === "Enter") {
    event.preventDefault();
    createSurgeryField();
    return;
  }

  if (event.target.matches(".payment-input") && event.shiftKey && event.key === "Enter") {
    event.preventDefault();
    createPaymentField();
    return;
  }

  if (event.target.matches(".extras-input") && event.shiftKey && event.key === "Enter") {
    event.preventDefault();
    createExtrasField();
    return;
  }

  if (event.target.matches(".guidance-input") && event.shiftKey && event.key === "Enter") {
    event.preventDefault();
    createGuidanceField();
    return;
  }

  if (event.target.matches(".hospital-input") && event.shiftKey && event.key === "Enter") {
    event.preventDefault();
    createHospitalField();
    return;
  }

  if (event.target.matches(".hospital-detail-input") && event.shiftKey && event.key === "Enter") {
    event.preventDefault();
    const detailList = event.target.closest(".hospital-detail-list");
    createHospitalDetailEntry(detailList, getHospitalDetailConfigFromList(detailList), true);
    updateHospitalDetailButtons(detailList);
    return;
  }

  if (event.target.matches(".patient-input") && event.key === "ArrowDown") {
    event.preventDefault();
    showPatientHistoryDropdown();
    isInteractingWithPatientDropdown = true;
    focusDropdownOption(patientHistoryDropdown, 0);
    setTimeout(() => {
      isInteractingWithPatientDropdown = false;
    });
    return;
  }

  if (event.target.matches(".technology-input") && event.key === "ArrowDown") {
    event.preventDefault();
    showTechnologyHistoryDropdown();
    isInteractingWithTechnologyDropdown = true;
    focusDropdownOption(technologyHistoryDropdown, 0);
    setTimeout(() => {
      isInteractingWithTechnologyDropdown = false;
    });
    return;
  }

  if (event.target.matches(".hospital-input") && event.key === "ArrowDown") {
    event.preventDefault();
    showHospitalHistoryDropdown(event.target);
    isInteractingWithHospitalDropdown = true;
    focusDropdownOption(hospitalHistoryDropdown, 0);
    setTimeout(() => {
      isInteractingWithHospitalDropdown = false;
    });
    return;
  }

  if (event.target.matches(".surgery-input") && event.key === "ArrowDown") {
    event.preventDefault();
    showSurgeryHistoryDropdown(event.target);
    isInteractingWithHistoryDropdown = true;
    focusDropdownOption(surgeryHistoryDropdown, 0);
    setTimeout(() => {
      isInteractingWithHistoryDropdown = false;
    });
    return;
  }

  if (event.target.matches(".payment-input") && event.key === "ArrowDown") {
    event.preventDefault();
    showPaymentHistoryDropdown(event.target);
    isInteractingWithPaymentDropdown = true;
    focusDropdownOption(paymentHistoryDropdown, 0);
    setTimeout(() => {
      isInteractingWithPaymentDropdown = false;
    });
    return;
  }

  if (event.target.matches(".extras-input") && event.key === "ArrowDown") {
    event.preventDefault();
    showExtrasHistoryDropdown(event.target);
    isInteractingWithExtrasDropdown = true;
    focusDropdownOption(extrasHistoryDropdown, 0);
    setTimeout(() => {
      isInteractingWithExtrasDropdown = false;
    });
    return;
  }

  if (event.target.matches(".guidance-input") && event.key === "ArrowDown") {
    event.preventDefault();
    showGuidanceHistoryDropdown(event.target);
    isInteractingWithGuidanceDropdown = true;
    focusDropdownOption(guidanceHistoryDropdown, 0);
    setTimeout(() => {
      isInteractingWithGuidanceDropdown = false;
    });
    return;
  }

  if (event.target.matches(".hospital-detail-input") && event.key === "ArrowDown") {
    event.preventDefault();
    showHospitalProcedureDropdown(event.target);
    isInteractingWithHospitalProcedureDropdown = true;
    focusDropdownOption(hospitalProcedureDropdown, 0);
    setTimeout(() => {
      isInteractingWithHospitalProcedureDropdown = false;
    });
    return;
  }

  if (event.target.matches(".patient-input") && event.key === "ArrowUp") {
    event.preventDefault();
    showPatientHistoryDropdown();
    isInteractingWithPatientDropdown = true;
    focusDropdownOption(patientHistoryDropdown, getDropdownOptions(patientHistoryDropdown).length - 1);
    setTimeout(() => {
      isInteractingWithPatientDropdown = false;
    });
    return;
  }

  if (event.target.matches(".technology-input") && event.key === "ArrowUp") {
    event.preventDefault();
    showTechnologyHistoryDropdown();
    isInteractingWithTechnologyDropdown = true;
    focusDropdownOption(technologyHistoryDropdown, getDropdownOptions(technologyHistoryDropdown).length - 1);
    setTimeout(() => {
      isInteractingWithTechnologyDropdown = false;
    });
    return;
  }

  if (event.target.matches(".hospital-input") && event.key === "ArrowUp") {
    event.preventDefault();
    showHospitalHistoryDropdown(event.target);
    isInteractingWithHospitalDropdown = true;
    focusDropdownOption(hospitalHistoryDropdown, getDropdownOptions(hospitalHistoryDropdown).length - 1);
    setTimeout(() => {
      isInteractingWithHospitalDropdown = false;
    });
    return;
  }

  if (event.target.matches(".surgery-input") && event.key === "ArrowUp") {
    event.preventDefault();
    showSurgeryHistoryDropdown(event.target);
    isInteractingWithHistoryDropdown = true;
    focusDropdownOption(surgeryHistoryDropdown, getDropdownOptions(surgeryHistoryDropdown).length - 1);
    setTimeout(() => {
      isInteractingWithHistoryDropdown = false;
    });
    return;
  }

  if (event.target.matches(".payment-input") && event.key === "ArrowUp") {
    event.preventDefault();
    showPaymentHistoryDropdown(event.target);
    isInteractingWithPaymentDropdown = true;
    focusDropdownOption(paymentHistoryDropdown, getDropdownOptions(paymentHistoryDropdown).length - 1);
    setTimeout(() => {
      isInteractingWithPaymentDropdown = false;
    });
    return;
  }

  if (event.target.matches(".extras-input") && event.key === "ArrowUp") {
    event.preventDefault();
    showExtrasHistoryDropdown(event.target);
    isInteractingWithExtrasDropdown = true;
    focusDropdownOption(extrasHistoryDropdown, getDropdownOptions(extrasHistoryDropdown).length - 1);
    setTimeout(() => {
      isInteractingWithExtrasDropdown = false;
    });
    return;
  }

  if (event.target.matches(".guidance-input") && event.key === "ArrowUp") {
    event.preventDefault();
    showGuidanceHistoryDropdown(event.target);
    isInteractingWithGuidanceDropdown = true;
    focusDropdownOption(guidanceHistoryDropdown, getDropdownOptions(guidanceHistoryDropdown).length - 1);
    setTimeout(() => {
      isInteractingWithGuidanceDropdown = false;
    });
    return;
  }

  if (isTextField(event.target) && event.key === "Enter") {
    event.preventDefault();
    focusNextTextField(event.target);
  }
});
patientHistoryDropdown.addEventListener("pointerdown", (event) => {
  isInteractingWithPatientDropdown = true;
  event.preventDefault();
});
patientHistoryDropdown.addEventListener("click", (event) => {
  const option = event.target.closest(".history-option");
  if (!option || !activePatientInput) {
    isInteractingWithPatientDropdown = false;
    return;
  }

  const optionText = option.dataset.value;
  if (event.target.closest(".history-delete")) {
    event.stopPropagation();
    patientInput.dataset.skipHistoryValue = normalizeText(optionText);
    deletePatientFromHistory(optionText);
    updatePatientHistoryDropdown(patientInput.value);
    patientInput.focus();
    isInteractingWithPatientDropdown = false;
    return;
  }

  selectPatientHistoryOption(option);
});
patientHistoryDropdown.addEventListener("keydown", (event) => {
  const option = event.target.closest(".history-option");
  if (!option) {
    return;
  }

  const options = getDropdownOptions(patientHistoryDropdown);
  const currentIndex = options.indexOf(option);

  if (event.key === "ArrowDown") {
    event.preventDefault();
    focusDropdownOption(patientHistoryDropdown, Math.min(currentIndex + 1, options.length - 1));
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (currentIndex <= 0) {
      patientInput.focus();
      return;
    }

    focusDropdownOption(patientHistoryDropdown, currentIndex - 1);
  }

  if (event.key === "Enter") {
    event.preventDefault();
    selectPatientHistoryOption(option, true);
  }

  if (event.key === "Escape") {
    event.preventDefault();
    isInteractingWithPatientDropdown = false;
    hidePatientHistoryDropdown();
    patientInput.focus();
  }
});
surgeryHistoryDropdown.addEventListener("pointerdown", (event) => {
  isInteractingWithHistoryDropdown = true;
  event.preventDefault();
});
surgeryHistoryDropdown.addEventListener("click", (event) => {
  const option = event.target.closest(".history-option");
  if (!option || !activeSurgeryInput) {
    isInteractingWithHistoryDropdown = false;
    return;
  }

  const optionText = option.dataset.value;
  if (event.target.closest(".history-delete")) {
    event.stopPropagation();
    const input = activeSurgeryInput;
    input.dataset.skipHistoryValue = normalizeText(optionText);
    deleteSurgeryFromHistory(optionText);
    updateSurgeryHistoryDropdown(input.value);
    input.focus();
    isInteractingWithHistoryDropdown = false;
    return;
  }

  selectSurgeryHistoryOption(option);
});
surgeryHistoryDropdown.addEventListener("keydown", (event) => {
  const option = event.target.closest(".history-option");
  if (!option || !activeSurgeryInput) {
    return;
  }

  const options = getDropdownOptions(surgeryHistoryDropdown);
  const currentIndex = options.indexOf(option);

  if (event.key === "ArrowDown") {
    event.preventDefault();
    focusDropdownOption(surgeryHistoryDropdown, Math.min(currentIndex + 1, options.length - 1));
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (currentIndex <= 0) {
      activeSurgeryInput.focus();
      return;
    }

    focusDropdownOption(surgeryHistoryDropdown, currentIndex - 1);
  }

  if (event.key === "Enter") {
    event.preventDefault();
    selectSurgeryHistoryOption(option, true);
  }

  if (event.key === "Escape") {
    event.preventDefault();
    const input = activeSurgeryInput;
    isInteractingWithHistoryDropdown = false;
    hideSurgeryHistoryDropdown();
    input.focus();
  }
});
paymentHistoryDropdown.addEventListener("pointerdown", (event) => {
  isInteractingWithPaymentDropdown = true;
  event.preventDefault();
});
paymentHistoryDropdown.addEventListener("click", (event) => {
  const option = event.target.closest(".history-option");
  if (!option || !activePaymentInput) {
    isInteractingWithPaymentDropdown = false;
    return;
  }

  const optionText = option.dataset.value;
  if (event.target.closest(".history-delete")) {
    event.stopPropagation();
    const input = activePaymentInput;
    input.dataset.skipHistoryValue = normalizeText(optionText);
    deletePaymentFromHistory(optionText);
    updatePaymentHistoryDropdown(input.value);
    input.focus();
    isInteractingWithPaymentDropdown = false;
    return;
  }

  selectPaymentHistoryOption(option);
});
paymentHistoryDropdown.addEventListener("keydown", (event) => {
  const option = event.target.closest(".history-option");
  if (!option || !activePaymentInput) {
    return;
  }

  const options = getDropdownOptions(paymentHistoryDropdown);
  const currentIndex = options.indexOf(option);

  if (event.key === "ArrowDown") {
    event.preventDefault();
    focusDropdownOption(paymentHistoryDropdown, Math.min(currentIndex + 1, options.length - 1));
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (currentIndex <= 0) {
      activePaymentInput.focus();
      return;
    }

    focusDropdownOption(paymentHistoryDropdown, currentIndex - 1);
  }

  if (event.key === "Enter") {
    event.preventDefault();
    selectPaymentHistoryOption(option, true);
  }

  if (event.key === "Escape") {
    event.preventDefault();
    const input = activePaymentInput;
    isInteractingWithPaymentDropdown = false;
    hidePaymentHistoryDropdown();
    input.focus();
  }
});
extrasHistoryDropdown.addEventListener("pointerdown", (event) => {
  isInteractingWithExtrasDropdown = true;
  event.preventDefault();
});
extrasHistoryDropdown.addEventListener("click", (event) => {
  const option = event.target.closest(".history-option");
  if (!option || !activeExtrasInput) {
    isInteractingWithExtrasDropdown = false;
    return;
  }

  const optionText = option.dataset.value;
  if (event.target.closest(".history-delete")) {
    event.stopPropagation();
    const input = activeExtrasInput;
    input.dataset.skipHistoryValue = normalizeText(optionText);
    deleteExtrasFromHistory(optionText);
    updateExtrasHistoryDropdown(input.value);
    input.focus();
    isInteractingWithExtrasDropdown = false;
    return;
  }

  selectExtrasHistoryOption(option);
});
extrasHistoryDropdown.addEventListener("keydown", (event) => {
  const option = event.target.closest(".history-option");
  if (!option || !activeExtrasInput) {
    return;
  }

  const options = getDropdownOptions(extrasHistoryDropdown);
  const currentIndex = options.indexOf(option);

  if (event.key === "ArrowDown") {
    event.preventDefault();
    focusDropdownOption(extrasHistoryDropdown, Math.min(currentIndex + 1, options.length - 1));
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (currentIndex <= 0) {
      activeExtrasInput.focus();
      return;
    }

    focusDropdownOption(extrasHistoryDropdown, currentIndex - 1);
  }

  if (event.key === "Enter") {
    event.preventDefault();
    selectExtrasHistoryOption(option, true);
  }

  if (event.key === "Escape") {
    event.preventDefault();
    const input = activeExtrasInput;
    isInteractingWithExtrasDropdown = false;
    hideExtrasHistoryDropdown();
    input.focus();
  }
});
guidanceHistoryDropdown.addEventListener("pointerdown", (event) => {
  isInteractingWithGuidanceDropdown = true;
  event.preventDefault();
});
guidanceHistoryDropdown.addEventListener("click", (event) => {
  const option = event.target.closest(".history-option");
  if (!option || !activeGuidanceInput) {
    isInteractingWithGuidanceDropdown = false;
    return;
  }

  const optionText = option.dataset.value;
  if (event.target.closest(".history-delete")) {
    event.stopPropagation();
    const input = activeGuidanceInput;
    input.dataset.skipHistoryValue = normalizeText(optionText);
    deleteGuidanceFromHistory(optionText);
    updateGuidanceHistoryDropdown(input.value);
    input.focus();
    isInteractingWithGuidanceDropdown = false;
    return;
  }

  selectGuidanceHistoryOption(option);
});
guidanceHistoryDropdown.addEventListener("keydown", (event) => {
  const option = event.target.closest(".history-option");
  if (!option || !activeGuidanceInput) {
    return;
  }

  const options = getDropdownOptions(guidanceHistoryDropdown);
  const currentIndex = options.indexOf(option);

  if (event.key === "ArrowDown") {
    event.preventDefault();
    focusDropdownOption(guidanceHistoryDropdown, Math.min(currentIndex + 1, options.length - 1));
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (currentIndex <= 0) {
      activeGuidanceInput.focus();
      return;
    }

    focusDropdownOption(guidanceHistoryDropdown, currentIndex - 1);
  }

  if (event.key === "Enter") {
    event.preventDefault();
    selectGuidanceHistoryOption(option, true);
  }

  if (event.key === "Escape") {
    event.preventDefault();
    const input = activeGuidanceInput;
    isInteractingWithGuidanceDropdown = false;
    hideGuidanceHistoryDropdown();
    input.focus();
  }
});
hospitalHistoryDropdown.addEventListener("pointerdown", (event) => {
  isInteractingWithHospitalDropdown = true;
  event.preventDefault();
});
hospitalHistoryDropdown.addEventListener("click", (event) => {
  const option = event.target.closest(".history-option");
  if (!option || !activeHospitalInput) {
    isInteractingWithHospitalDropdown = false;
    return;
  }

  const optionText = option.dataset.value;
  if (event.target.closest(".history-delete")) {
    event.stopPropagation();
    const input = activeHospitalInput;
    input.dataset.skipHistoryValue = normalizeText(optionText);
    deleteHospitalFromHistory(optionText);
    updateHospitalHistoryDropdown(input.value);
    input.focus();
    isInteractingWithHospitalDropdown = false;
    return;
  }

  selectHospitalHistoryOption(option);
});
hospitalHistoryDropdown.addEventListener("keydown", (event) => {
  const option = event.target.closest(".history-option");
  if (!option || !activeHospitalInput) {
    return;
  }

  const options = getDropdownOptions(hospitalHistoryDropdown);
  const currentIndex = options.indexOf(option);

  if (event.key === "ArrowDown") {
    event.preventDefault();
    focusDropdownOption(hospitalHistoryDropdown, Math.min(currentIndex + 1, options.length - 1));
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (currentIndex <= 0) {
      activeHospitalInput.focus();
      return;
    }

    focusDropdownOption(hospitalHistoryDropdown, currentIndex - 1);
  }

  if (event.key === "Enter") {
    event.preventDefault();
    selectHospitalHistoryOption(option, true);
  }

  if (event.key === "Escape") {
    event.preventDefault();
    isInteractingWithHospitalDropdown = false;
    hideHospitalHistoryDropdown();
    activeHospitalInput.focus();
  }
});
hospitalProcedureDropdown.addEventListener("pointerdown", (event) => {
  isInteractingWithHospitalProcedureDropdown = true;
  event.preventDefault();
});
hospitalProcedureDropdown.addEventListener("click", (event) => {
  const option = event.target.closest(".history-option");
  if (!option || !activeHospitalDetailInput) {
    isInteractingWithHospitalProcedureDropdown = false;
    return;
  }

  selectHospitalProcedureOption(option);
});
hospitalProcedureDropdown.addEventListener("keydown", (event) => {
  const option = event.target.closest(".history-option");
  if (!option || !activeHospitalDetailInput) {
    return;
  }

  const options = getDropdownOptions(hospitalProcedureDropdown);
  const currentIndex = options.indexOf(option);

  if (event.key === "ArrowDown") {
    event.preventDefault();
    focusDropdownOption(hospitalProcedureDropdown, Math.min(currentIndex + 1, options.length - 1));
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (currentIndex <= 0) {
      activeHospitalDetailInput.focus();
      return;
    }

    focusDropdownOption(hospitalProcedureDropdown, currentIndex - 1);
  }

  if (event.key === "Enter") {
    event.preventDefault();
    selectHospitalProcedureOption(option, true);
  }

  if (event.key === "Escape") {
    event.preventDefault();
    isInteractingWithHospitalProcedureDropdown = false;
    hideHospitalProcedureDropdown();
    activeHospitalDetailInput.focus();
  }
});
technologyHistoryDropdown.addEventListener("pointerdown", (event) => {
  isInteractingWithTechnologyDropdown = true;
  event.preventDefault();
});
technologyHistoryDropdown.addEventListener("click", (event) => {
  const option = event.target.closest(".history-option");
  if (!option) {
    isInteractingWithTechnologyDropdown = false;
    return;
  }

  const optionText = option.dataset.value;
  if (event.target.closest(".history-delete")) {
    event.stopPropagation();
    deleteTechnologyFromHistory(optionText);
    updateTechnologyHistoryDropdown(technologyInput.value);
    technologyInput.focus();
    isInteractingWithTechnologyDropdown = false;
    return;
  }

  selectTechnologyHistoryOption(option);
});
technologyHistoryDropdown.addEventListener("keydown", (event) => {
  const option = event.target.closest(".history-option");
  if (!option) {
    return;
  }

  const options = getDropdownOptions(technologyHistoryDropdown);
  const currentIndex = options.indexOf(option);

  if (event.key === "ArrowDown") {
    event.preventDefault();
    focusDropdownOption(technologyHistoryDropdown, Math.min(currentIndex + 1, options.length - 1));
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (currentIndex <= 0) {
      technologyInput.focus();
      return;
    }

    focusDropdownOption(technologyHistoryDropdown, currentIndex - 1);
  }

  if (event.key === "Enter") {
    event.preventDefault();
    selectTechnologyHistoryOption(option, true);
  }

  if (event.key === "Escape") {
    event.preventDefault();
    isInteractingWithTechnologyDropdown = false;
    hideTechnologyHistoryDropdown();
    technologyInput.focus();
  }
});
document.addEventListener("pointerdown", (event) => {
  if (
    event.target.closest(".patient-input") ||
    event.target.closest("#patientHistoryDropdown") ||
    event.target.closest(".surgery-input") ||
    event.target.closest("#surgeryHistoryDropdown") ||
    event.target.closest(".payment-input") ||
    event.target.closest("#paymentHistoryDropdown") ||
    event.target.closest(".extras-input") ||
    event.target.closest("#extrasHistoryDropdown") ||
    event.target.closest(".guidance-input") ||
    event.target.closest("#guidanceHistoryDropdown") ||
    event.target.closest(".hospital-input") ||
    event.target.closest("#hospitalHistoryDropdown") ||
    event.target.closest(".hospital-detail-input") ||
    event.target.closest("#hospitalProcedureDropdown") ||
    event.target.closest(".technology-input") ||
    event.target.closest("#technologyHistoryDropdown")
  ) {
    return;
  }

  hidePatientHistoryDropdown();
  hideSurgeryHistoryDropdown();
  hidePaymentHistoryDropdown();
  hideExtrasHistoryDropdown();
  hideGuidanceHistoryDropdown();
  hideHospitalHistoryDropdown();
  hideHospitalProcedureDropdown();
  hideTechnologyHistoryDropdown();
});
window.addEventListener("resize", () => {
  if (activeHospitalDetailInput && !hospitalProcedureDropdown.hidden) {
    positionHospitalProcedureDropdown(activeHospitalDetailInput);
  }
});
document.querySelector(".form-panel")?.addEventListener("scroll", () => {
  if (activeHospitalDetailInput && !hospitalProcedureDropdown.hidden) {
    positionHospitalProcedureDropdown(activeHospitalDetailInput);
  }
});
panelResizeHandle?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  panelResizeHandle.setPointerCapture(event.pointerId);
  appShell.classList.add("is-resizing");

  const startX = event.clientX;
  const startWidth = getCurrentFormPanelWidth();

  function handlePointerMove(moveEvent) {
    setFormPanelWidth(startWidth + moveEvent.clientX - startX);
  }

  function handlePointerUp() {
    panelResizeHandle.releasePointerCapture(event.pointerId);
    appShell.classList.remove("is-resizing");
    panelResizeHandle.removeEventListener("pointermove", handlePointerMove);
    panelResizeHandle.removeEventListener("pointerup", handlePointerUp);
    panelResizeHandle.removeEventListener("pointercancel", handlePointerUp);
  }

  panelResizeHandle.addEventListener("pointermove", handlePointerMove);
  panelResizeHandle.addEventListener("pointerup", handlePointerUp);
  panelResizeHandle.addEventListener("pointercancel", handlePointerUp);
});
panelResizeHandle?.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }

  event.preventDefault();
  const direction = event.key === "ArrowRight" ? 1 : -1;
  setFormPanelWidth(getCurrentFormPanelWidth() + direction * 20);
});
form.addEventListener("click", (event) => {
  const paymentQuickDelete = event.target.closest(".payment-quick-delete");
  if (paymentQuickDelete) {
    event.preventDefault();
    deletePaymentFromHistory(paymentQuickDelete.dataset.value);
    updatePreview();
    return;
  }

  const extrasQuickDelete = event.target.closest(".extras-quick-delete");
  if (extrasQuickDelete) {
    event.preventDefault();
    deleteExtrasFromHistory(extrasQuickDelete.dataset.value);
    updatePreview();
    return;
  }

  const guidanceQuickDelete = event.target.closest(".quick-delete");
  if (guidanceQuickDelete) {
    event.preventDefault();
    deleteGuidanceFromHistory(guidanceQuickDelete.dataset.value);
    updatePreview();
    return;
  }

  if (event.target.closest(".hospital-detail-add")) {
    addHospitalDetailEntryFromButton(event.target);
    updatePreview();
    return;
  }

  if (event.target.closest(".hospital-detail-remove")) {
    removeHospitalDetailEntryFromButton(event.target);
    updatePreview();
    return;
  }

  if (event.target.closest(".hospital-detail-autofill")) {
    autofillHospitalDetails(event.target.closest(".hospital-detail-autofill"));
    updatePreview();
  }
});
clearButton.addEventListener("click", clearForm);
addSurgeryButton.addEventListener("click", createSurgeryField);
removeSurgeryButton.addEventListener("click", removeLastSurgeryField);
addPaymentButton.addEventListener("click", createPaymentField);
removePaymentButton.addEventListener("click", removeLastPaymentField);
addExtrasButton.addEventListener("click", createExtrasField);
removeExtrasButton.addEventListener("click", removeLastExtrasField);
addGuidanceButton.addEventListener("click", createGuidanceField);
removeGuidanceButton.addEventListener("click", removeLastGuidanceField);
addHospitalButton.addEventListener("click", createHospitalField);
removeHospitalButton.addEventListener("click", removeLastHospitalField);
printButton.addEventListener("click", async () => {
  await Promise.all(
    [
      savePatientToHistory(patientInput.value, patientInput),
      ...getSurgeryInputs().map((input) => saveSurgeryToHistory(input.value, input)),
      ...getManualPaymentValues().map((payment) => savePaymentToHistory(payment)),
      ...(extrasEnabledInput.checked ? getManualExtrasValues().map((extra) => saveExtrasToHistory(extra)) : []),
      ...getManualGuidanceValues().map((guidance) => saveGuidanceToHistory(guidance)),
      ...getHospitalInputs().map((input) => saveHospitalToHistory(input.value, input)),
      saveTechnologyToHistory(),
    ]
  );
  void exportPdfDocument();
  window.print();
});
shutdownButton.addEventListener("click", async () => {
  shutdownButton.disabled = true;
  shutdownButton.textContent = "Encerrando...";

  await AppApi.shutdownApp();

  if (!AppApi.isTauri()) {
    document.body.innerHTML = "<main class=\"shutdown-message\"><h1>Auto Orçamento encerrado</h1><p>Você já pode fechar esta aba.</p></main>";
  }
});

async function initializeApp() {
  try {
    await AppApi.waitForBackend();
  } catch (error) {
    console.error(error);
  }

  await Promise.all([
    loadPatientHistory(),
    loadSurgeryHistory(),
    loadPaymentHistory(),
    loadExtrasHistory(),
    loadGuidanceHistory(),
    loadHospitalHistory(),
    loadTechnologyHistory(),
    loadHospitalTables(),
    loadImplantTable(),
  ]);

  updatePatientHistoryDropdown();
  updateSurgeryHistoryDropdown();
  renderPaymentQuickList();
  updatePaymentHistoryDropdown();
  renderExtrasQuickList();
  updateExtrasHistoryDropdown();
  renderGuidanceQuickList();
  updateGuidanceHistoryDropdown();
  updateTechnologyHistoryDropdown();
  hideHospitalHistoryDropdown();
  hidePatientHistoryDropdown();
  hidePaymentHistoryDropdown();
  hideExtrasHistoryDropdown();
  hideGuidanceHistoryDropdown();
  hideTechnologyHistoryDropdown();
  updateSurgeryButtons();
  updateExtrasButtons();
  updatePaymentButtons();
  updateGuidanceButtons();
  updateHospitalButtons();
  updatePreview();
}

void initializeApp();
