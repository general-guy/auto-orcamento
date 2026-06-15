const form = document.querySelector("#budget-form");
const printButton = document.querySelector("#printButton");
const clearButton = document.querySelector("#clearButton");
const shutdownButton = document.querySelector("#shutdownButton");
const addSurgeryButton = document.querySelector("#addSurgeryButton");
const removeSurgeryButton = document.querySelector("#removeSurgeryButton");
const addHospitalButton = document.querySelector("#addHospitalButton");
const removeHospitalButton = document.querySelector("#removeHospitalButton");
const guidancePreview = document.querySelector("#guidancePreview");
const appShell = document.querySelector(".app-shell");
const panelResizeHandle = document.querySelector("#panelResizeHandle");
const surgeryList = document.querySelector("#surgeryList");
const surgeryHistoryDropdown = document.querySelector("#surgeryHistoryDropdown");
const hospitalInput = document.querySelector("#hospital");
const hospitalList = document.querySelector("#hospitalList");
const hospitalHistoryDropdown = document.querySelector("#hospitalHistoryDropdown");
const patientInput = document.querySelector("#patientName");
const patientHistoryDropdown = document.querySelector("#patientHistoryDropdown");
let surgeryHistory = [];
let activeSurgeryInput = null;
let isInteractingWithHistoryDropdown = false;
let hospitalHistory = [];
let activeHospitalInput = null;
let isInteractingWithHospitalDropdown = false;
let patientHistory = [];
let activePatientInput = null;
let isInteractingWithPatientDropdown = false;
let hospitalTables = null;

const previewFields = {
  patientName: "Nome da paciente",
  hospitalValue: "R$",
  teamValue: "R$",
  technologyValue: "R$",
  totalValue: "R$",
  paymentTerms: "Preencha as formas de pagamento.",
  includedItems: "Preencha os itens incluídos no valor.",
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

function getSapirangaCentroOptionMap() {
  if (!hospitalTables?.sapiranga?.cirurgiasPlasticasCentroCirurgico) {
    return new Map();
  }

  return new Map(
    hospitalTables.sapiranga.cirurgiasPlasticasCentroCirurgico.map((item) => [
      formatSapirangaOption(item, "centro"),
      {
        optionText: formatSapirangaOption(item, "centro"),
        value: parseCurrencyValue(item.valor),
        hours: item.tempoSalaHoras,
      },
    ])
  );
}

function getReginaPackageOptionMap() {
  if (!hospitalTables?.regina?.pacotesCirurgiaPlastica) {
    return new Map();
  }

  return new Map(
    hospitalTables.regina.pacotesCirurgiaPlastica.map((item) => [
      formatReginaOption(item, "pacote"),
      {
        optionText: formatReginaOption(item, "pacote"),
        hours: item.tempoSalaHoras,
      },
    ])
  );
}

function getReginaHalfHourOption() {
  const halfHourTax = hospitalTables?.regina?.taxasAdicionais?.find(
    (item) => item.descricao === "SALA CIRÚRGICA - MEIA HORA SUBSEQUENTE"
  );
  if (!halfHourTax) {
    return null;
  }

  return {
    optionText: formatReginaOption(halfHourTax, "taxa"),
    value: parseCurrencyValue(halfHourTax.valor),
  };
}

function getSapirangaExcedenteOption() {
  const excedente = hospitalTables?.sapiranga?.excedente?.[0];
  if (!excedente) {
    return null;
  }

  return {
    optionText: formatSapirangaOption(excedente, "excedente"),
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
    ...hospitalTables.sapiranga.diarias.map((item) => formatSapirangaOption(item, "diaria")),
    ...(hospitalTables.sapiranga.excedente || []).map((item) => formatSapirangaOption(item, "excedente")),
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

  const centroOptions = getSapirangaCentroOptionMap();
  const excedenteOption = getSapirangaExcedenteOption();
  const rows = getHospitalDetailRows(detailList);
  const centroEntries = [];
  const otherEntries = [];

  rows.forEach((row) => {
    if (row.input.value === excedenteOption?.optionText) {
      return;
    }

    const option = centroOptions.get(row.input.value);
    if (option) {
      centroEntries.push(option);
      return;
    }

    otherEntries.push({
      optionText: row.input.value,
      multiplierValue: row.multiplier.value,
    });
  });

  centroEntries.sort((left, right) => right.value - left.value);

  const totalCentroHours = centroEntries.reduce((total, entry) => total + (entry.hours || 0), 0);
  const expectedHours = parseHourValue(getFieldValue("hospitalStay"));
  const missingHours = expectedHours === null ? 0 : Math.max(0, expectedHours - totalCentroHours);
  const excessEntries = missingHours > 0 && excedenteOption
    ? [{ ...excedenteOption, multiplierValue: String(Number(missingHours.toFixed(2))) }]
    : [];
  const orderedEntries = [...centroEntries, ...excessEntries, ...otherEntries];
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

  const packageOptions = getReginaPackageOptionMap();
  const halfHourOption = getReginaHalfHourOption();
  const rows = getHospitalDetailRows(detailList);
  const detailEntries = [];
  let totalPackageHours = 0;

  rows.forEach((row) => {
    if (row.input.value === halfHourOption?.optionText) {
      return;
    }

    const option = packageOptions.get(row.input.value);
    if (option) {
      totalPackageHours += option.hours || 0;
    }

    detailEntries.push({
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
  const orderedEntries = [...detailEntries, ...excessEntries];

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

function hideSurgeryHistoryDropdown() {
  if (isInteractingWithHistoryDropdown) {
    return;
  }

  surgeryHistoryDropdown.hidden = true;
  activeSurgeryInput = null;
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

function showSurgeryHistoryDropdown(input) {
  activeSurgeryInput = input;
  input.closest("label").append(surgeryHistoryDropdown);
  updateSurgeryHistoryDropdown(input.value);
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

function updateHospitalButtons() {
  removeHospitalButton.disabled = getHospitalInputs().length <= 1;
}

function isTextField(element) {
  return element.matches('input[type="date"], input[type="text"], textarea');
}

function focusNextTextField(currentField) {
  isInteractingWithHistoryDropdown = false;
  isInteractingWithHospitalDropdown = false;
  isInteractingWithPatientDropdown = false;
  hideSurgeryHistoryDropdown();
  hideHospitalHistoryDropdown();
  hidePatientHistoryDropdown();

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

      const valueLine = document.createElement("span");
      valueLine.textContent = formatCurrency(row.totalValue);
      values.append(valueLine);
    });
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

function updateSimpleFields() {
  Object.entries(previewFields).forEach(([fieldName, fallback]) => {
    const preview = document.querySelector(`[data-preview="${fieldName}"]`);
    if (!preview) {
      return;
    }

    preview.textContent = getFieldValue(fieldName) || fallback;
  });

  const datePreview = document.querySelector('[data-preview="budgetDate"]');
  datePreview.textContent = formatDateForDocument(getFieldValue("budgetDate"));

  const hospitalStayPreview = document.querySelector('[data-preview="hospitalStay"]');
  hospitalStayPreview.textContent = formatHospitalStay(getFieldValue("hospitalStay"));

  const surgeryPreview = document.querySelector('[data-preview="surgery"]');
  surgeryPreview.textContent = getSurgeryValues().join("\n") || "Cirurgia proposta";

  updateHospitalPreview();
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

function updatePreview() {
  updateSimpleFields();
  updateGuidance();
}

function clearForm() {
  form.reset();
  getSurgeryInputs().slice(1).forEach((input) => input.closest("label").remove());
  getHospitalInputs().slice(1).forEach((input) => input.closest("label").remove());
  syncAllHospitalDetailFields();
  form.elements.budgetDate.value = formatDateForInput(new Date());
  updateSurgeryButtons();
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

  if (event.target.matches(".hospital-input")) {
    if (event.target.dataset.skipHistoryValue !== normalizeText(event.target.value)) {
      delete event.target.dataset.skipHistoryValue;
    }

    syncHospitalDetailField(event.target);
    showHospitalHistoryDropdown(event.target);
  }
});
form.addEventListener("focusin", (event) => {
  if (event.target.matches(".patient-input")) {
    showPatientHistoryDropdown();
  }

  if (event.target.matches(".surgery-input")) {
    showSurgeryHistoryDropdown(event.target);
  }

  if (event.target.matches(".hospital-input")) {
    if (event.target.dataset.skipNextHistoryFocus === "true") {
      delete event.target.dataset.skipNextHistoryFocus;
      return;
    }

    showHospitalHistoryDropdown(event.target);
  }
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

  if (event.target.matches(".hospital-input")) {
    if (hospitalHistoryDropdown.contains(event.relatedTarget)) {
      return;
    }

    if (!isInteractingWithHospitalDropdown) {
      saveHospitalToHistory(event.target.value, event.target);
      hideHospitalHistoryDropdown();
    }
  }
});
form.addEventListener("keydown", (event) => {
  if (event.target.matches(".surgery-input") && event.shiftKey && event.key === "Enter") {
    event.preventDefault();
    createSurgeryField();
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
document.addEventListener("pointerdown", (event) => {
  if (
    event.target.closest(".patient-input") ||
    event.target.closest("#patientHistoryDropdown") ||
    event.target.closest(".surgery-input") ||
    event.target.closest("#surgeryHistoryDropdown") ||
    event.target.closest(".hospital-input") ||
    event.target.closest("#hospitalHistoryDropdown")
  ) {
    return;
  }

  hidePatientHistoryDropdown();
  hideSurgeryHistoryDropdown();
  hideHospitalHistoryDropdown();
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
addHospitalButton.addEventListener("click", createHospitalField);
removeHospitalButton.addEventListener("click", removeLastHospitalField);
printButton.addEventListener("click", async () => {
  await Promise.all(
    [
      savePatientToHistory(patientInput.value, patientInput),
      ...getSurgeryInputs().map((input) => saveSurgeryToHistory(input.value, input)),
      ...getHospitalInputs().map((input) => saveHospitalToHistory(input.value, input)),
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

Promise.all([loadPatientHistory(), loadSurgeryHistory(), loadHospitalHistory(), loadHospitalTables()]).then(() => {
  updatePatientHistoryDropdown();
  updateSurgeryHistoryDropdown();
  hideHospitalHistoryDropdown();
  hidePatientHistoryDropdown();
  updateSurgeryButtons();
  updateHospitalButtons();
  updatePreview();
});
