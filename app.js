const form = document.querySelector("#budget-form");
const printButton = document.querySelector("#printButton");
const clearButton = document.querySelector("#clearButton");
const addSurgeryButton = document.querySelector("#addSurgeryButton");
const removeSurgeryButton = document.querySelector("#removeSurgeryButton");
const guidancePreview = document.querySelector("#guidancePreview");
const surgeryList = document.querySelector("#surgeryList");
const surgeryHistoryOptions = document.querySelector("#surgeryHistoryOptions");
let surgeryHistory = [];

const previewFields = {
  patientName: "Nome da paciente",
  hospital: "Hospital",
  hospitalStay: "Tempo previsto de hospital",
  hospitalValue: "R$",
  teamValue: "R$",
  technologyValue: "R$",
  totalValue: "R$",
  paymentTerms: "Preencha as formas de pagamento.",
  includedItems: "Preencha os itens incluídos no valor.",
};

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

async function loadSurgeryHistory() {
  try {
    const response = await fetch("/api/cirurgias");
    surgeryHistory = await response.json();
  } catch {
    surgeryHistory = [];
  }
}

async function saveSurgeryToHistory(value) {
  const surgery = value.trim();
  if (!surgery) {
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
    updateSurgeryHistoryOptions();
  } catch {
    console.warn("Não foi possível salvar a cirurgia no histórico local.");
  }
}

function updateSurgeryHistoryOptions(query = "") {
  const normalizedQuery = normalizeText(query);
  const options = surgeryHistory
    .filter((item) => !normalizedQuery || normalizeText(item).includes(normalizedQuery))
    .slice(0, 12);

  surgeryHistoryOptions.innerHTML = "";
  options.forEach((optionText) => {
    const option = document.createElement("option");
    option.value = optionText;
    surgeryHistoryOptions.append(option);
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
  input.setAttribute("list", "surgeryHistoryOptions");
  input.setAttribute("autocomplete", "off");

  label.append(input);
  surgeryList.append(label);
  updateSurgeryButtons();
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
  getSurgeryInputs().at(-1).focus();
  updateSurgeryButtons();
  updatePreview();
}

function updateSurgeryButtons() {
  removeSurgeryButton.disabled = getSurgeryInputs().length <= 1;
}

function isTextField(element) {
  return element.matches('input[type="date"], input[type="text"], textarea');
}

function focusNextTextField(currentField) {
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

  const surgeryPreview = document.querySelector('[data-preview="surgery"]');
  surgeryPreview.textContent = getSurgeryValues().join("\n") || "Cirurgia proposta";
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
  form.elements.budgetDate.value = formatDateForInput(new Date());
  updateSurgeryButtons();
  updatePreview();
}

form.elements.budgetDate.value = formatDateForInput(new Date());
form.addEventListener("input", updatePreview);
form.addEventListener("change", updatePreview);
form.addEventListener("input", (event) => {
  if (event.target.matches(".surgery-input")) {
    updateSurgeryHistoryOptions(event.target.value);
  }
});
form.addEventListener("focusin", (event) => {
  if (event.target.matches(".surgery-input")) {
    updateSurgeryHistoryOptions(event.target.value);
  }
});
form.addEventListener("focusout", (event) => {
  if (event.target.matches(".surgery-input")) {
    saveSurgeryToHistory(event.target.value);
    updateSurgeryHistoryOptions();
  }
});
form.addEventListener("keydown", (event) => {
  if (event.target.matches(".surgery-input") && event.shiftKey && event.key === "Enter") {
    event.preventDefault();
    createSurgeryField();
    return;
  }

  if (isTextField(event.target) && event.key === "Enter") {
    event.preventDefault();
    focusNextTextField(event.target);
  }
});
clearButton.addEventListener("click", clearForm);
addSurgeryButton.addEventListener("click", createSurgeryField);
removeSurgeryButton.addEventListener("click", removeLastSurgeryField);
printButton.addEventListener("click", async () => {
  await Promise.all(getSurgeryValues().map(saveSurgeryToHistory));
  window.print();
});

loadSurgeryHistory().then(() => {
  updateSurgeryHistoryOptions();
  updateSurgeryButtons();
  updatePreview();
});
