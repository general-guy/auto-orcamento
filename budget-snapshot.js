(function () {
  const SCHEMA_VERSION = 1;

  function readTrimmedValue(selector) {
    const element = document.querySelector(selector);
    return element?.value.trim() || "";
  }

  function readCheckbox(selector) {
    return Boolean(document.querySelector(selector)?.checked);
  }

  function collectTextInputs(selector) {
    return [...document.querySelectorAll(selector)]
      .map((input) => input.value.trim())
      .filter(Boolean);
  }

  function collectQuickListItems(quickListSelector, inputName) {
    const quickList = document.querySelector(quickListSelector);
    if (!quickList) {
      return [];
    }

    return [...quickList.querySelectorAll(`input[name="${inputName}"]`)].map((input) => ({
      value: input.value.trim(),
      checked: input.checked,
    }));
  }

  function collectHospitalBlock() {
    const hospitals = [...document.querySelectorAll("#hospitalList .hospital-input")].map((input) => {
      const label = input.closest("label");
      const detailList = label?.querySelector(".hospital-detail-list");
      const details = detailList
        ? [...detailList.querySelectorAll(".hospital-detail-field")].map((field) => ({
            procedure: field.querySelector(".hospital-detail-input")?.value.trim() || "",
            multiplier: field.querySelector(".hospital-detail-multiplier")?.value.trim() || "",
          }))
        : [];

      const detailMeta = detailList
        ? {
            detailName: detailList.dataset.detailName || "",
            autofillSource: detailList.dataset.autofillSource || "",
            labelPrefix: detailList.dataset.labelPrefix || "",
          }
        : null;

      return {
        name: input.value.trim(),
        details,
        detailMeta,
      };
    });

    return {
      enabled: readCheckbox("#hospitalEnabled"),
      stay: readTrimmedValue("#hospitalStay"),
      hospitals,
    };
  }

  function collectImplantBlock(getImplantItem) {
    const enabled = readCheckbox("#implantsEnabled");
    const selectionIndex = readTrimmedValue("#implantSelect");
    const select = document.querySelector("#implantSelect");
    const selectedOption = select?.selectedOptions?.[0];
    const item = typeof getImplantItem === "function" ? getImplantItem() : null;

    return {
      enabled,
      selectionIndex,
      selectedLabel: selectedOption && selectedOption.value ? selectedOption.textContent.trim() : "",
      item: item ? { ...item } : null,
    };
  }

  function collectBudgetSnapshot(options = {}) {
    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      form: {
        patientName: readTrimmedValue("#patientName"),
        budgetDate: readTrimmedValue("#budgetDate"),
        surgeries: collectTextInputs("#surgeryList .surgery-input"),
        hospital: collectHospitalBlock(),
        implants: collectImplantBlock(options.getImplantItem),
        technologies: {
          enabled: readCheckbox("#technologiesEnabled"),
          name: readTrimmedValue("#technologyName"),
          value: readTrimmedValue("#technologyValue"),
        },
        team: {
          items: [...document.querySelectorAll('input[name="teamItems"]')].map((input) => ({
            value: input.value,
            checked: input.checked,
          })),
          value: readTrimmedValue("#teamValue"),
        },
        extras: {
          enabled: readCheckbox("#extrasEnabled"),
          quickItems: collectQuickListItems("#extrasQuickList", "extrasQuickItems"),
          additional: collectTextInputs("#extrasList .extras-input"),
        },
        payment: {
          quickItems: collectQuickListItems("#paymentQuickList", "paymentQuickItems"),
          additional: collectTextInputs("#paymentList .payment-input"),
        },
        guidance: {
          quickItems: collectQuickListItems("#guidanceQuickList", "guidanceQuickItems"),
          additional: collectTextInputs("#guidanceList .guidance-input"),
        },
      },
    };
  }

  window.BudgetSnapshot = {
    SCHEMA_VERSION,
    collect: collectBudgetSnapshot,
  };
})();
