const state = {
  kurals: [],
  filtered: [],
  toggles: {
    english: true,
    mk: true,
    mv: true,
    sp: true,
  },
};

const selectors = {};

function initSelectors() {
  selectors.paul = document.getElementById('paulSelect');
  selectors.iyal = document.getElementById('iyalSelect');
  selectors.adikaram = document.getElementById('adikaramSelect');
  selectors.kuralNumber = document.getElementById('kuralNumber');
  selectors.search = document.getElementById('searchBox');
  selectors.resultsSummary = document.getElementById('resultsSummary');
  selectors.resultsContainer = document.getElementById('resultsContainer');
  selectors.resultsSection = document.querySelector('.results');
  selectors.template = document.getElementById('kuralTemplate');
  selectors.reset = document.getElementById('resetFilters');
  selectors.toggleEnglish = document.getElementById('toggleEnglish');
  selectors.toggleMK = document.getElementById('toggleMK');
  selectors.toggleMV = document.getElementById('toggleMV');
  selectors.toggleSP = document.getElementById('toggleSP');
}

function normalizeText(text) {
  return (text || '').toString().trim();
}

function toLower(text) {
  return normalizeText(text).toLowerCase();
}

function formatKural(text) {
  return normalizeText(text).replace(/\s*\n\s*/g, '<br />');
}

function buildOption(value) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = value;
  return option;
}

function populateSelect(select, values, placeholder, disabled = false) {
  select.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = placeholder;
  select.appendChild(defaultOption);
  values.forEach((value) => select.appendChild(buildOption(value)));
  select.disabled = disabled;
}

function getUniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function updatePaulOptions() {
  const pauls = getUniqueSorted(state.kurals.map((item) => item.paul_name));
  populateSelect(selectors.paul, pauls, 'All Paul');
}

function updateIyalOptions(selectedPaul) {
  const iyals = getUniqueSorted(
    state.kurals
      .filter((item) => !selectedPaul || item.paul_name === selectedPaul)
      .map((item) => item.iyal_name)
  );
  populateSelect(selectors.iyal, iyals, selectedPaul ? 'All Iyal' : 'Select Paul first', !selectedPaul);
}

function updateAdikaramOptions(selectedPaul, selectedIyal) {
  const adikarams = getUniqueSorted(
    state.kurals
      .filter((item) => {
        if (selectedPaul && item.paul_name !== selectedPaul) return false;
        if (selectedIyal && item.iyal_name !== selectedIyal) return false;
        return true;
      })
      .map((item) => item.adikaram_name)
  );
  populateSelect(
    selectors.adikaram,
    adikarams,
    selectedIyal ? 'All Adikaram' : 'Select Iyal first',
    !selectedIyal
  );
}

function setBusy(isBusy) {
  if (isBusy) {
    selectors.resultsSummary.setAttribute('aria-busy', 'true');
    selectors.resultsSection?.setAttribute('aria-busy', 'true');
  } else {
    selectors.resultsSummary.removeAttribute('aria-busy');
    selectors.resultsSection?.setAttribute('aria-busy', 'false');
  }
}

function validateNumberInput() {
  const value = selectors.kuralNumber.value.trim();
  if (!value) {
    selectors.kuralNumber.setCustomValidity('');
    return true;
  }
  const numberValue = Number.parseInt(value, 10);
  if (Number.isNaN(numberValue) || numberValue < 1 || numberValue > 1330) {
    selectors.kuralNumber.setCustomValidity('Please enter a number between 1 and 1330.');
    return false;
  }
  selectors.kuralNumber.setCustomValidity('');
  return true;
}

function debounced(fn, delay = 250) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function filterKurals() {
  if (!validateNumberInput()) {
    selectors.resultsSummary.textContent = 'Please enter a valid Kural number between 1 and 1330.';
    selectors.resultsSummary.classList.add('error-message');
    selectors.resultsContainer.innerHTML = '';
    return;
  }
  selectors.resultsSummary.classList.remove('error-message');

  const numberValue = Number.parseInt(selectors.kuralNumber.value, 10);
  let results = [...state.kurals];

  if (!Number.isNaN(numberValue)) {
    const exactMatch = state.kurals.find((item) => item.Number === numberValue);
    results = exactMatch ? [exactMatch] : [];
  } else {
    const selectedPaul = selectors.paul.value;
    const selectedIyal = selectors.iyal.value;
    const selectedAdikaram = selectors.adikaram.value;

    if (selectedPaul) {
      results = results.filter((item) => item.paul_name === selectedPaul);
    }
    if (selectedIyal) {
      results = results.filter((item) => item.iyal_name === selectedIyal);
    }
    if (selectedAdikaram) {
      results = results.filter((item) => item.adikaram_name === selectedAdikaram);
    }
  }

  const query = selectors.search.value.trim().toLowerCase();
  if (query) {
    const kuralMatches = results.filter((item) => item.kural_lower.includes(query));
    if (kuralMatches.length > 0) {
      results = kuralMatches;
    } else {
      results = results.filter((item) =>
        item.explanation_lower.includes(query) ||
        item.mk_lower.includes(query) ||
        item.mv_lower.includes(query) ||
        item.sp_lower.includes(query)
      );
    }
  }

  state.filtered = results;
  renderKurals(results);
}

function updateSummary(count) {
  const base = count === 1 ? 'Showing 1 kural' : `Showing ${count} kurals`;
  const extraFilters = [];

  if (selectors.paul.value) extraFilters.push(`Paul: ${selectors.paul.value}`);
  if (selectors.iyal.value) extraFilters.push(`Iyal: ${selectors.iyal.value}`);
  if (selectors.adikaram.value) extraFilters.push(`Adikaram: ${selectors.adikaram.value}`);
  if (selectors.kuralNumber.value) extraFilters.push(`Kural #${selectors.kuralNumber.value}`);
  if (selectors.search.value.trim()) extraFilters.push(`Search: "${selectors.search.value.trim()}"`);

  selectors.resultsSummary.textContent = extraFilters.length ? `${base} • ${extraFilters.join(' • ')}` : base;
}

function renderKurals(kurals) {
  setBusy(true);
  selectors.resultsContainer.innerHTML = '';

  if (!kurals.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No kurals matched your filters. Try adjusting your selections or search term.';
    selectors.resultsContainer.appendChild(empty);
    updateSummary(0);
    setBusy(false);
    return;
  }

  const fragment = document.createDocumentFragment();

  kurals.forEach((item) => {
    const clone = selectors.template.content.cloneNode(true);
    clone.querySelector('[data-field="number"]').textContent = item.Number;
    clone.querySelector('[data-field="paul"]').textContent = item.paul_name;
    clone.querySelector('[data-field="iyal"]').textContent = item.iyal_name;
    clone.querySelector('[data-field="adikaram"]').textContent = item.adikaram_name;
    clone.querySelector('[data-field="kural"]').innerHTML = formatKural(item.kural);
    const paulTranslation = clone.querySelector('[data-field="paulTranslation"]');
    paulTranslation.textContent = item.paul_translation
      ? `Paul Translation: ${item.paul_translation}`
      : '';

    clone.querySelector('[data-field="english"]').textContent = item.explanation;
    clone.querySelector('[data-field="mk"]').textContent = item.mk;
    clone.querySelector('[data-field="mv"]').textContent = item.mv;
    clone.querySelector('[data-field="sp"]').textContent = item.sp;

    fragment.appendChild(clone);
  });

  selectors.resultsContainer.appendChild(fragment);
  updateSummary(kurals.length);
  applyToggleVisibility();
  setBusy(false);
}

function applyToggleVisibility() {
  const sections = selectors.resultsContainer.querySelectorAll('.explanation');
  sections.forEach((section) => {
    const key = section.dataset.section;
    section.style.display = state.toggles[key] ? '' : 'none';
  });
}

function resetFilters() {
  selectors.paul.value = '';
  selectors.iyal.value = '';
  selectors.adikaram.value = '';
  selectors.iyal.disabled = true;
  selectors.adikaram.disabled = true;
  selectors.kuralNumber.value = '';
  selectors.search.value = '';
  state.toggles = { english: true, mk: true, mv: true, sp: true };
  selectors.toggleEnglish.checked = true;
  selectors.toggleMK.checked = true;
  selectors.toggleMV.checked = true;
  selectors.toggleSP.checked = true;
  updateIyalOptions('');
  updateAdikaramOptions('', '');
  filterKurals();
}

function registerEventListeners() {
  selectors.paul.addEventListener('change', () => {
    updateIyalOptions(selectors.paul.value);
    selectors.iyal.value = '';
    selectors.adikaram.value = '';
    updateAdikaramOptions(selectors.paul.value, '');
    filterKurals();
  });

  selectors.iyal.addEventListener('change', () => {
    updateAdikaramOptions(selectors.paul.value, selectors.iyal.value);
    selectors.adikaram.value = '';
    filterKurals();
  });

  selectors.adikaram.addEventListener('change', filterKurals);

  selectors.kuralNumber.addEventListener('input', debounced(filterKurals, 200));
  selectors.search.addEventListener('input', debounced(filterKurals, 200));

  selectors.reset.addEventListener('click', resetFilters);

  selectors.toggleEnglish.addEventListener('change', (event) => {
    state.toggles.english = event.target.checked;
    applyToggleVisibility();
  });
  selectors.toggleMK.addEventListener('change', (event) => {
    state.toggles.mk = event.target.checked;
    applyToggleVisibility();
  });
  selectors.toggleMV.addEventListener('change', (event) => {
    state.toggles.mv = event.target.checked;
    applyToggleVisibility();
  });
  selectors.toggleSP.addEventListener('change', (event) => {
    state.toggles.sp = event.target.checked;
    applyToggleVisibility();
  });
}

async function loadKurals() {
  try {
    const response = await fetch('thirukkural.csv');
    if (!response.ok) {
      throw new Error('Unable to load data.');
    }
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    state.kurals = parsed.data
      .map((item) => ({
        Number: Number.parseInt(item.Number, 10),
        kural: normalizeText(item.kural),
        explanation: normalizeText(item.explanation),
        adikaram_name: normalizeText(item.adikaram_name),
        iyal_name: normalizeText(item.iyal_name),
        paul_name: normalizeText(item.paul_name),
        paul_translation: normalizeText(item.paul_translation),
        mk: normalizeText(item.mk),
        mv: normalizeText(item.mv),
        sp: normalizeText(item.sp),
        kural_lower: toLower(item.kural),
        explanation_lower: toLower(item.explanation),
        mk_lower: toLower(item.mk),
        mv_lower: toLower(item.mv),
        sp_lower: toLower(item.sp),
      }))
      .filter((item) => Number.isInteger(item.Number));

    state.kurals.sort((a, b) => a.Number - b.Number);

    updatePaulOptions();
    updateIyalOptions('');
    updateAdikaramOptions('', '');
    filterKurals();
  } catch (error) {
    selectors.resultsSummary.textContent = 'Failed to load the Thirukkural collection. Please try again later.';
    selectors.resultsSummary.classList.add('error-message');
    selectors.resultsContainer.innerHTML = '';
    console.error(error);
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('service-worker.js')
        .catch((error) => console.error('Service worker registration failed:', error));
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initSelectors();
  registerEventListeners();
  loadKurals();
  registerServiceWorker();
});

