let deferredPrompt = null;
let installCardElement = null;
let orientationOverlayElement = null;

const portraitMediaQuery = window.matchMedia('(orientation: portrait)');
const displayModeMediaQuery = window.matchMedia('(display-mode: standalone)');

function requestLandscapeLock() {
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
        screen.orientation.lock('landscape').catch((err) => {
            console.debug('Orientation lock not supported or denied:', err);
        });
    }
}

function updateOrientationUI() {
    if (!document.body) {
        return;
    }

    const isPortrait = portraitMediaQuery.matches;
    document.body.classList.toggle('portrait-mode', isPortrait);

    if (orientationOverlayElement) {
        orientationOverlayElement.classList.toggle('hidden', !isPortrait);
    }

    if (!isPortrait) {
        requestLandscapeLock();
    }
}

function showInstallCard() {
    if (installCardElement) {
        installCardElement.classList.remove('hidden');
    }
}

function hideInstallCard() {
    if (installCardElement) {
        installCardElement.classList.add('hidden');
    }
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallCard();
});

window.addEventListener('appinstalled', () => {
    hideInstallCard();
    deferredPrompt = null;
    console.log('PWA was installed');
    requestLandscapeLock();
    updateOrientationUI();
});

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const paulSelect = document.getElementById('paul-select');
    const iyalSelect = document.getElementById('iyal-select');
    const adikaramSelect = document.getElementById('adikaram-select');
    const kuralNumberInput = document.getElementById('kural-number');
    const searchBox = document.getElementById('search-box');
    const searchButton = document.getElementById('search-button');
    const searchInExplanationsCheckbox = document.getElementById('search-in-explanations');
    const kuralsPerPageSelect = document.getElementById('kurals-per-page');
    const resultsContainer = document.getElementById('results-container');
    const paginationContainer = document.getElementById('pagination-container');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const pageInfoSpan = document.getElementById('page-info');
    installCardElement = document.getElementById('install-card');
    const installButton = document.getElementById('install-button');
    orientationOverlayElement = document.getElementById('orientation-lock');

    const checkboxes = {
        english: document.getElementById('show-english'),
        mk: document.getElementById('show-mk'),
        mv: document.getElementById('show-mv'),
        sp: document.getElementById('show-sp')
    };

    let kuralData = [];
    let currentFilteredResults = [];
    let currentPage = 1;

    if (deferredPrompt) {
        showInstallCard();
    }

    requestLandscapeLock();
    updateOrientationUI();

    if (typeof portraitMediaQuery.addEventListener === 'function') {
        portraitMediaQuery.addEventListener('change', updateOrientationUI);
    } else if (typeof portraitMediaQuery.addListener === 'function') {
        portraitMediaQuery.addListener(updateOrientationUI);
    }

    window.addEventListener('orientationchange', updateOrientationUI);

    if (displayModeMediaQuery && typeof displayModeMediaQuery.addEventListener === 'function') {
        displayModeMediaQuery.addEventListener('change', () => {
            requestLandscapeLock();
            updateOrientationUI();
        });
    } else if (displayModeMediaQuery && typeof displayModeMediaQuery.addListener === 'function') {
        displayModeMediaQuery.addListener(() => {
            requestLandscapeLock();
            updateOrientationUI();
        });
    }

    installButton.addEventListener('click', async () => {
        hideInstallCard();
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
        }
    });

    // --- Data Loading ---
    function loadData() {
        Papa.parse('thirukkural.csv', {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                results.data.sort((a, b) => parseInt(a.Number) - parseInt(b.Number));
                kuralData = results.data;
                currentFilteredResults = kuralData;
                populateAllDropdowns();
                renderCurrentPage();
            },
            error: (err) => {
                console.error("Error loading CSV:", err);
                resultsContainer.innerHTML = `<p>தகவலை ஏற்றுவதில் பிழை.</p>`;
            }
        });
    }

    // --- Dropdown Population ---
    function populateAllDropdowns() {
        const pauls = [...new Set(kuralData.map(k => k.paul_name.trim()))];
        const iyals = [...new Set(kuralData.map(k => k.iyal_name.trim()))];
        const adikarams = [...new Set(kuralData.map(k => k.adikaram_name.trim()))];
        pauls.forEach(val => addOption(paulSelect, val));
        iyals.forEach(val => addOption(iyalSelect, val));
        adikarams.forEach(val => addOption(adikaramSelect, val));
    }

    function addOption(selectElement, value) {
        if (value) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            selectElement.appendChild(option);
        }
    }

    // --- Display & Pagination Logic ---
    function renderCurrentPage() {
        const kuralsPerPage = parseInt(kuralsPerPageSelect.value);
        const totalPages = Math.ceil(currentFilteredResults.length / kuralsPerPage);
        currentPage = Math.min(currentPage, totalPages) || 1;

        const startIndex = (currentPage - 1) * kuralsPerPage;
        const endIndex = startIndex + kuralsPerPage;
        const kuralsForPage = currentFilteredResults.slice(startIndex, endIndex);

        displayKuralCards(kuralsForPage);
        updatePaginationUI(totalPages);
    }

    function displayKuralCards(kurals) {
        resultsContainer.innerHTML = '';
        if (kurals.length === 0 && currentFilteredResults.length === 0) {
            resultsContainer.innerHTML = '<div class="card"><p>உங்கள் தேடலுக்கு எந்த குறளும் கிடைக்கவில்லை.</p></div>';
        }
        kurals.forEach(kural => {
            const kuralCard = document.createElement('div');
            kuralCard.className = 'kural-card';
            const words = (kural.kural || "").trim().split(/\s+/);
            const line1 = words.slice(0, 4).join(' ');
            const line2 = words.slice(4).join(' ');
            kuralCard.innerHTML = `
                <div class="kural-header"><strong>குறள் ${kural.Number}</strong> | ${kural.paul_name} > ${kural.iyal_name} > ${kural.adikaram_name}</div>
                <div class="kural-text-container"><div class="kural-text"><div>${line1}</div><div>${line2}</div></div></div>
                <div class="explanation-section ${checkboxes.english.checked ? '' : 'hidden'}" data-expl="english"><h4>ஆங்கில விளக்கம்</h4><p>${kural.explanation || 'கிடைக்கவில்லை.'}</p></div>
                <div class="explanation-section ${checkboxes.mk.checked ? '' : 'hidden'}" data-expl="mk"><h4>மு. கருணாநிதி</h4><p>${kural.mk || 'கிடைக்கவில்லை.'}</p></div>
                <div class="explanation-section ${checkboxes.mv.checked ? '' : 'hidden'}" data-expl="mv"><h4>மு. வரதராசன்</h4><p>${kural.mv || 'கிடைக்கவில்லை.'}</p></div>
                <div class="explanation-section ${checkboxes.sp.checked ? '' : 'hidden'}" data-expl="sp"><h4>சாலமன் பாப்பையா</h4><p>${kural.sp || 'கிடைக்கவில்லை.'}</p></div>
            `;
            resultsContainer.appendChild(kuralCard);
        });
    }

    function updatePaginationUI(totalPages) {
        if (totalPages > 1) {
            paginationContainer.classList.remove('hidden');
            pageInfoSpan.textContent = `பக்கம் ${currentPage} / ${totalPages}`;
            prevButton.disabled = currentPage === 1;
            nextButton.disabled = currentPage === totalPages;
        } else {
            paginationContainer.classList.add('hidden');
        }
    }

    // --- Filtering ---
    function filterAndDisplay() {
        const selectedPaul = paulSelect.value;
        const selectedIyal = iyalSelect.value;
        const selectedAdikaram = adikaramSelect.value;
        const kuralNum = kuralNumberInput.value;
        const searchTerm = searchBox.value.trim().toLowerCase();
        const searchInExplanations = searchInExplanationsCheckbox.checked;

        let filtered = kuralData;

        if (kuralNum) {
            filtered = kuralData.filter(k => k.Number === kuralNum);
        } else if (searchTerm) {
            filtered = kuralData.filter(k => {
                const kuralMatch = k.kural && k.kural.toLowerCase().includes(searchTerm);
                if (!searchInExplanations) return kuralMatch;
                const explanationMatch = (k.explanation && k.explanation.toLowerCase().includes(searchTerm)) ||
                                       (k.mk && k.mk.toLowerCase().includes(searchTerm)) ||
                                       (k.mv && k.mv.toLowerCase().includes(searchTerm)) ||
                                       (k.sp && k.sp.toLowerCase().includes(searchTerm));
                return kuralMatch || explanationMatch;
            });
        } else {
            if (selectedPaul) {
                filtered = filtered.filter(k => k.paul_name.trim() === selectedPaul);
            }
            if (selectedIyal) {
                filtered = filtered.filter(k => k.iyal_name.trim() === selectedIyal);
            }
            if (selectedAdikaram) {
                filtered = filtered.filter(k => k.adikaram_name.trim() === selectedAdikaram);
            }
        }

        currentFilteredResults = filtered;
        currentPage = 1;
        renderCurrentPage();
    }

    // --- Event Listeners ---
    function handleDropdownChange() {
        kuralNumberInput.value = '';
        searchBox.value = '';
        filterAndDisplay();
    }

    paulSelect.addEventListener('change', handleDropdownChange);
    iyalSelect.addEventListener('change', handleDropdownChange);
    adikaramSelect.addEventListener('change', handleDropdownChange);

    kuralsPerPageSelect.addEventListener('change', () => {
        currentPage = 1;
        renderCurrentPage();
    });

    searchButton.addEventListener('click', () => {
        paulSelect.value = '';
        iyalSelect.value = '';
        adikaramSelect.value = '';
        filterAndDisplay();
    });

    kuralNumberInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            searchBox.value = '';
            searchButton.click();
        }
    });

    searchBox.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            kuralNumberInput.value = '';
            searchButton.click();
        }
    });

    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderCurrentPage();
        }
    });

    nextButton.addEventListener('click', () => {
        const kuralsPerPage = parseInt(kuralsPerPageSelect.value);
        const totalPages = Math.ceil(currentFilteredResults.length / kuralsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderCurrentPage();
        }
    });

    Object.keys(checkboxes).forEach(key => {
        checkboxes[key].addEventListener('change', () => {
            renderCurrentPage();
        });
    });

    // --- Initial Load ---
    loadData();

    // --- Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('Service Worker registered.'))
                .catch(err => console.log('Service Worker registration failed: ', err));
        });
    }
});