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
const guidancePreview = document.querySelector("#guidancePreview");
const paymentPreview = document.querySelector("#paymentPreview");
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
let paymentHistory = [];
let activePaymentInput = null;
let isInteractingWithPaymentDropdown = false;
let deselectedPaymentQuickItems = new Set();
let hospitalHistory = [];
let activeHospitalInput = null;
let isInteractingWithHospitalDropdown = false;
let patientHistory = [];
let activePatientInput = null;
let isInteractingWithPatientDropdown = false;
let technologyHistory = [];
let isInteractingWithTechnologyDropdown = false;
let hospitalTables = null;
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

function createHospitalDatalist(id, options) {
  document.querySelector(`#${id}`)?.remove();

  const datalist = document.createElement("datalist");
  datalist.id = id;

  options.forEach((optionText) => {
    const option = document.createElement("option");
    option.value = optionText;
    datalist.append(option);
  });

  document.body.append(datalist);
}

function buildHospitalDatalists() {
  if (!hospitalTables) {
    return;
  }

  const reginaOptions = [
    ...hospitalTables.regina.pacotesCirurgiaPlastica.map((item) => formatReginaOption(item, "pacote")),
    ...hospitalTables.regina.taxasAdicionais.map((item) => formatReginaOption(item, "taxa")),
  ];

  const sapirangaOptions = [
    ...hospitalTables.sapiranga.cirurgiasPlasticasCentroCirurgico.map((item) => formatSapirangaOption(item, "centro")),
    ...hospitalTables.sapiranga.cirurgiasPlasticasAmbulatorio.map((item) => formatSapirangaOption(item, "ambulatorio")),
    ...(hospitalTables.sapiranga.excedente || []).map((item) => formatSapirangaOption(item, "excedente")),
    ...hospitalTables.sapiranga.diarias.map((item) => formatSapirangaOption(item, "diaria")),
  ];

  createHospitalDatalist("reginaHospitalOptions", reginaOptions);
  createHospitalDatalist("sapirangaHospitalOptions", sapirangaOptions);
}

async function loadHospitalTables() {
  try {
    const response = await fetch("data/tabelas-hospitalares.json");
    hospitalTables = await response.json();
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
    const response = await fetch("data/tabela-implantes.json");
    implantTable = await response.json();
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
  detailInput.setAttribute("list", detailConfig.datalistId);
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
  let totalPackageHours = 0;

  rows.forEach((row) => {
    if (row.input.value === halfHourOption?.optionText) {
      return;
    }

    const packageOption = reginaOptions.pacote.get(row.input.value);
    if (packageOption) {
      totalPackageHours += packageOption.hours || 0;
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

  const expectedHours = parseHourValue(getFieldValue("hospitalStay"));
  const missingHours = expectedHours === null ? 0 : Math.max(0, expectedHours - totalPackageHours);
  const halfHourMultiplier = Number((missingHours / 0.5).toFixed(2));
  const excessEntries = missingHours > 0 && halfHourOption
    ? [{ ...halfHourOption, multiplierValue: String(halfHourMultiplier) }]
    : [];
  const orderedTaxEntries = [...taxEntries, ...excessEntries].sort((left, right) => left.order - right.order);
  const orderedEntries = [
    ...packageEntries.sort((left, right) => left.order - right.order),
    ...orderedTaxEntries,
    ...otherEntries,
  ];

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
    const response = await fetch("/api/cirurgias");
    surgeryHistory = await response.json();
  } catch {
    surgeryHistory = [];
  }
}

async function loadPaymentHistory() {
  try {
    const response = await fetch("/api/pagamentos");
    paymentHistory = await response.json();
  } catch {
    paymentHistory = [];
  }
}

async function loadHospitalHistory() {
  try {
    const response = await fetch("/api/hospitais");
    hospitalHistory = await response.json();
  } catch {
    hospitalHistory = [];
  }
}

async function loadPatientHistory() {
  try {
    const response = await fetch("/api/pacientes");
    patientHistory = await response.json();
  } catch {
    patientHistory = [];
  }
}

async function loadTechnologyHistory() {
  try {
    const response = await fetch("/api/tecnologias");
    const items = await response.json();
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
    const response = await fetch("/api/cirurgias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: surgery }),
    });

    surgeryHistory = await response.json();
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
    const response = await fetch("/api/cirurgias", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });

    if (!response.ok) {
      throw new Error("Falha ao remover no servidor.");
    }

    const nextHistory = await response.json();
    surgeryHistory = Array.isArray(nextHistory) ? nextHistory : surgeryHistory;
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
    const response = await fetch("/api/pagamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: payment }),
    });

    paymentHistory = await response.json();
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
    const response = await fetch("/api/pagamentos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });

    if (!response.ok) {
      throw new Error("Falha ao remover no servidor.");
    }

    const nextHistory = await response.json();
    paymentHistory = Array.isArray(nextHistory) ? nextHistory : paymentHistory;
    renderPaymentQuickList();
    updatePaymentHistoryDropdown(activePaymentInput?.value || "");
  } catch {
    console.warn("Não foi possível remover a forma de pagamento do histórico local.");
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
    const response = await fetch("/api/hospitais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: hospital }),
    });

    hospitalHistory = await response.json();
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
    const response = await fetch("/api/hospitais", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });

    if (!response.ok) {
      throw new Error("Falha ao remover no servidor.");
    }

    const nextHistory = await response.json();
    hospitalHistory = Array.isArray(nextHistory) ? nextHistory : hospitalHistory;
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
    const response = await fetch("/api/pacientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: patient }),
    });

    patientHistory = await response.json();
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
    const response = await fetch("/api/pacientes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });

    if (!response.ok) {
      throw new Error("Falha ao remover no servidor.");
    }

    const nextHistory = await response.json();
    patientHistory = Array.isArray(nextHistory) ? nextHistory : patientHistory;
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
    const response = await fetch("/api/tecnologias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: technology,
        valor: technologyValueInput.value.trim(),
      }),
    });

    technologyHistory = await response.json();
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
    const response = await fetch("/api/tecnologias", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: value }),
    });

    if (!response.ok) {
      throw new Error("Falha ao remover no servidor.");
    }

    const nextHistory = await response.json();
    technologyHistory = Array.isArray(nextHistory) ? nextHistory : technologyHistory;
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
    deleteButton.textContent = "x";
    deleteButton.setAttribute("aria-label", `Remover ${optionText} do histórico de pagamentos`);
    deleteButton.dataset.value = optionText;

    row.append(checkbox, optionLabel, deleteButton);
    paymentQuickList.append(row);
  });
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
  label.className = "unlabeled-field";

  const input = document.createElement("input");
  input.name = "surgery";
  input.type = "text";
  input.className = "surgery-input";
  input.setAttribute("aria-label", `Cirurgia proposta ${fieldNumber}`);
  input.setAttribute("autocomplete", "off");

  label.append(input);
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
}

function updatePaymentButtons() {
  removePaymentButton.disabled = getPaymentInputs().length <= 1;
}

function updateHospitalButtons() {
  removeHospitalButton.disabled = getHospitalInputs().length <= 1;
}

function isTextField(element) {
  return element.matches('input[type="date"], input[type="text"], textarea');
}

function focusNextTextField(currentField) {
  isInteractingWithHistoryDropdown = false;
  isInteractingWithPaymentDropdown = false;
  isInteractingWithHospitalDropdown = false;
  isInteractingWithPatientDropdown = false;
  isInteractingWithTechnologyDropdown = false;
  hideSurgeryHistoryDropdown();
  hidePaymentHistoryDropdown();
  hideHospitalHistoryDropdown();
  hidePatientHistoryDropdown();
  hideTechnologyHistoryDropdown();

  const textFields = [...form.querySelectorAll('input[type="date"], input[type="text"], textarea')]
    .filter((field) => !field.disabled && !field.readOnly);
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

function updateGuidance() {
  const selectedGuidance = [...form.querySelectorAll('input[name="guidance"]:checked')]
    .map((input) => input.value);

  const customGuidance = getFieldValue("customGuidance");
  if (customGuidance) {
    selectedGuidance.push(customGuidance);
  }

  guidancePreview.innerHTML = "";

  if (selectedGuidance.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "Selecione as orientações desejadas.";
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

  const date = document.createElement("p");
  date.className = "document-date";
  date.dataset.preview = "budgetDate";
  date.textContent = formatDateForDocument(getFieldValue("budgetDate"));

  content.append(flow, date);
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
}

function restorePreviewScroll(scrollTop, scrollLeft) {
  const maxScrollTop = Math.max(0, previewPanel.scrollHeight - previewPanel.clientHeight);
  const maxScrollLeft = Math.max(0, previewPanel.scrollWidth - previewPanel.clientWidth);
  previewPanel.scrollTop = Math.min(scrollTop, maxScrollTop);
  previewPanel.scrollLeft = Math.min(scrollLeft, maxScrollLeft);
}

function updatePreview() {
  const previewScrollTop = previewPanel.scrollTop;
  const previewScrollLeft = previewPanel.scrollLeft;

  updateSimpleFields();
  updatePaymentPreview();
  updateGuidance();
  paginateDocument();
  restorePreviewScroll(previewScrollTop, previewScrollLeft);
  requestAnimationFrame(() => restorePreviewScroll(previewScrollTop, previewScrollLeft));
}

function clearForm() {
  form.reset();
  deselectedPaymentQuickItems = new Set();
  renderPaymentQuickList();
  getSurgeryInputs().slice(1).forEach((input) => input.closest("label").remove());
  getPaymentInputs().slice(1).forEach((input) => input.closest("label").remove());
  getHospitalInputs().slice(1).forEach((input) => input.closest("label").remove());
  syncAllHospitalDetailFields();
  form.elements.budgetDate.value = formatDateForInput(new Date());
  updateSurgeryButtons();
  updatePaymentButtons();
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

  if (event.target.matches(".hospital-input")) {
    if (event.target.dataset.skipHistoryValue !== normalizeText(event.target.value)) {
      delete event.target.dataset.skipHistoryValue;
    }

    syncHospitalDetailField(event.target);
    showHospitalHistoryDropdown(event.target);
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

  if (event.target.matches(".hospital-input")) {
    if (event.target.dataset.skipNextHistoryFocus === "true") {
      delete event.target.dataset.skipNextHistoryFocus;
      return;
    }

    showHospitalHistoryDropdown(event.target);
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

  if (event.target.matches(".hospital-input")) {
    if (hospitalHistoryDropdown.contains(event.relatedTarget)) {
      return;
    }

    if (!isInteractingWithHospitalDropdown) {
      saveHospitalToHistory(event.target.value, event.target);
      hideHospitalHistoryDropdown();
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
    event.target.closest(".hospital-input") ||
    event.target.closest("#hospitalHistoryDropdown") ||
    event.target.closest(".technology-input") ||
    event.target.closest("#technologyHistoryDropdown")
  ) {
    return;
  }

  hidePatientHistoryDropdown();
  hideSurgeryHistoryDropdown();
  hidePaymentHistoryDropdown();
  hideHospitalHistoryDropdown();
  hideTechnologyHistoryDropdown();
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
addHospitalButton.addEventListener("click", createHospitalField);
removeHospitalButton.addEventListener("click", removeLastHospitalField);
printButton.addEventListener("click", async () => {
  await Promise.all(
    [
      savePatientToHistory(patientInput.value, patientInput),
      ...getSurgeryInputs().map((input) => saveSurgeryToHistory(input.value, input)),
      ...getManualPaymentValues().map((payment) => savePaymentToHistory(payment)),
      ...getHospitalInputs().map((input) => saveHospitalToHistory(input.value, input)),
      saveTechnologyToHistory(),
    ]
  );
  window.print();
});
shutdownButton.addEventListener("click", async () => {
  shutdownButton.disabled = true;
  shutdownButton.textContent = "Encerrando...";

  try {
    await fetch("/api/shutdown", { method: "POST" });
  } catch {
    // O servidor pode encerrar antes de responder completamente.
  }

  window.close();
  document.body.innerHTML = "<main class=\"shutdown-message\"><h1>Auto Orçamento encerrado</h1><p>Você já pode fechar esta aba.</p></main>";
});

Promise.all([
  loadPatientHistory(),
  loadSurgeryHistory(),
  loadPaymentHistory(),
  loadHospitalHistory(),
  loadTechnologyHistory(),
  loadHospitalTables(),
  loadImplantTable(),
]).then(() => {
  updatePatientHistoryDropdown();
  updateSurgeryHistoryDropdown();
  renderPaymentQuickList();
  updatePaymentHistoryDropdown();
  updateTechnologyHistoryDropdown();
  hideHospitalHistoryDropdown();
  hidePatientHistoryDropdown();
  hidePaymentHistoryDropdown();
  hideTechnologyHistoryDropdown();
  updateSurgeryButtons();
  updatePaymentButtons();
  updateHospitalButtons();
  updatePreview();
});
