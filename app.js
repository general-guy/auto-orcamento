const form = document.querySelector("#budget-form");
const printButton = document.querySelector("#printButton");
const clearButton = document.querySelector("#clearButton");
const guidancePreview = document.querySelector("#guidancePreview");

const previewFields = {
  patientName: "Nome da paciente",
  surgery: "Cirurgia proposta",
  hospital: "Hospital",
  hospitalStay: "Tempo previsto de hospital",
  hospitalValue: "R$",
  teamValue: "R$",
  technologyValue: "R$",
  totalValue: "R$",
  paymentTerms: "Preencha as formas de pagamento.",
  includedItems: "Preencha os itens incluidos no valor.",
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
    emptyItem.textContent = "Selecione as orientacoes desejadas.";
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
  form.elements.budgetDate.value = formatDateForInput(new Date());
  updatePreview();
}

form.elements.budgetDate.value = formatDateForInput(new Date());
form.addEventListener("input", updatePreview);
form.addEventListener("change", updatePreview);
clearButton.addEventListener("click", clearForm);
printButton.addEventListener("click", () => window.print());

updatePreview();
