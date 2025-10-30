
            (function () {
              'use strict';

              const columnDefinitions = [
                { key: 'isoform', label: 'Isoform' },
                { key: 'associated_gene', label: 'Gene' },
                { key: 'associated_transcript', label: 'Reference transcript' },
                { key: 'exons', label: 'Exons' },
                { key: 'length', label: 'Length (bp)' },
                { key: 'diff_to_TSS', label: 'Δ to TSS' },
                { key: 'min_cov', label: 'Min coverage' },
                { key: 'iso_exp', label: 'Isoform expression' },
                { key: 'coding', label: 'Coding' },
                { key: 'FSM_class', label: 'FSM' },
                { key: 'all_canonical', label: 'Canonical' },
                { key: 'FL', label: 'Full length' }
              ];

              const defaultExportColumns = [
                'isoform',
                'associated_gene',
                'associated_transcript',
                'structural_category',
                'subcategory',
                'coding',
                'FSM_class',
                'exons',
                'length',
                'min_cov',
                'iso_exp',
                'diff_to_TSS',
                'diff_to_TTS',
                'diff_to_gene_TSS',
                'diff_to_gene_TTS',
                'all_canonical',
                'FL',
                'RTS_stage',
                'predicted_NMD',
                'dist_to_CAGE_peak',
                'dist_to_polyA_site',
                'polyA_motif'
              ];

              function initFilterUI(root) {
                if (!root) {
                  return;
                }

                const dataUrl = root.getAttribute('data-sqanti3-json');
                if (!dataUrl) {
                  console.warn('SQANTI3 filter UI: missing data URL');
                  return;
                }

                const state = {
                  data: [],
                  filtered: [],
                  stats: {},
                  facets: {},
                  category: root.getAttribute('data-sqanti3-category') || 'category',
                  columns: []
                };

                const elements = {
                  root,
                  thead: root.querySelector('[data-role="results-head"]'),
                  tbody: root.querySelector('[data-role="results-body"]'),
                  status: root.querySelector('[data-role="status"]'),
                  minExons: root.querySelector('[data-role="min-exons"]'),
                  maxExons: root.querySelector('[data-role="max-exons"]'),
                  minLength: root.querySelector('[data-role="min-length"]'),
                  maxLength: root.querySelector('[data-role="max-length"]'),
                  minTss: root.querySelector('[data-role="min-tss"]'),
                  maxTss: root.querySelector('[data-role="max-tss"]'),
                  search: root.querySelector('[data-role="search"]'),
                  reset: root.querySelector('[data-role="reset"]'),
                  download: root.querySelector('[data-role="download"]'),
                  facets: {
                    coding: root.querySelector('[data-role="facet-coding"]'),
                    FSM_class: root.querySelector('[data-role="facet-fsm"]'),
                    FL: root.querySelector('[data-role="facet-fl"]'),
                    all_canonical: root.querySelector('[data-role="facet-canonical"]')
                  }
                };

                renderTableHead();

                fetch(dataUrl, { cache: 'no-store' })
                  .then(response => {
                    if (!response.ok) {
                      throw new Error('HTTP ' + response.status);
                    }
                    return response.json();
                  })
                  .then(payload => initializeFromPayload(payload))
                  .catch(error => {
                    if (elements.status) {
                      elements.status.textContent = 'Failed to load transcript metadata: ' + error.message;
                    }
                    console.error('SQANTI3 filter UI', error);
                  });

                function initializeFromPayload(payload) {
                  state.data = Array.isArray(payload.records) ? payload.records : [];
                  state.filtered = state.data.slice();
                  state.stats = payload.stats || {};
                  state.facets = payload.facets || {};
                  state.category = payload.category || state.category;
                  state.columns = Array.isArray(payload.columns) && payload.columns.length ? payload.columns : defaultExportColumns;

                  populateFacetOptions();
                  setDefaults();
                  bindEvents();
                  applyFilters();
                }

                function renderTableHead() {
                  if (!elements.thead) {
                    return;
                  }
                  elements.thead.innerHTML = '';
                  const row = document.createElement('tr');
                  columnDefinitions.forEach(col => {
                    const th = document.createElement('th');
                    th.textContent = col.label;
                    row.appendChild(th);
                  });
                  elements.thead.appendChild(row);
                }

                function populateFacetOptions() {
                  Object.entries(elements.facets).forEach(([facetName, container]) => {
                    if (!container) {
                      return;
                    }
                    const optionsWrapper = container.querySelector('.facet-options');
                    if (!optionsWrapper) {
                      return;
                    }
                    optionsWrapper.innerHTML = '';
                    const values = (state.facets && state.facets[facetName]) ? state.facets[facetName] : [];
                    if (!values.length) {
                      container.style.display = 'none';
                      return;
                    }
                    container.style.display = '';
                    values.forEach((value, idx) => {
                      const label = document.createElement('label');
                      const checkbox = document.createElement('input');
                      checkbox.type = 'checkbox';
                      checkbox.checked = true;
                      checkbox.value = value;
                      checkbox.dataset.facet = facetName;
                      checkbox.id = facetName + '_' + idx;
                      const span = document.createElement('span');
                      span.textContent = formatFacetLabel(facetName, value);
                      label.appendChild(checkbox);
                      label.appendChild(span);
                      optionsWrapper.appendChild(label);
                    });
                  });
                }

                function setDefaults() {
                  applyDefaultRange(elements.minExons, elements.maxExons, state.stats.exons);
                  applyDefaultRange(elements.minLength, elements.maxLength, state.stats.length);
                  applyDefaultRange(elements.minTss, elements.maxTss, state.stats.diff_to_TSS);
                  if (elements.search) {
                    elements.search.value = '';
                  }
                }

                function applyDefaultRange(minInput, maxInput, stats) {
                  if (!minInput || !maxInput) {
                    return;
                  }
                  if (stats && stats.min !== undefined && stats.min !== null) {
                    minInput.value = stats.min;
                  } else {
                    minInput.value = '';
                  }
                  if (stats && stats.max !== undefined && stats.max !== null) {
                    maxInput.value = stats.max;
                  } else {
                    maxInput.value = '';
                  }
                }

                function bindEvents() {
                  [elements.minExons, elements.maxExons, elements.minLength, elements.maxLength, elements.minTss, elements.maxTss].forEach(input => {
                    if (!input) {
                      return;
                    }
                    input.addEventListener('input', debounce(applyFilters, 150));
                  });
                  if (elements.search) {
                    elements.search.addEventListener('input', debounce(applyFilters, 200));
                  }
                  if (elements.reset) {
                    elements.reset.addEventListener('click', () => {
                      setDefaults();
                      resetFacetSelections();
                      applyFilters();
                    });
                  }
                  if (elements.download) {
                    elements.download.addEventListener('click', downloadTsv);
                  }
                  elements.root.addEventListener('change', event => {
                    const target = event.target;
                    if (target && target.matches('input[type="checkbox"][data-facet]')) {
                      applyFilters();
                    }
                  });
                }

                function resetFacetSelections() {
                  elements.root.querySelectorAll('input[type="checkbox"][data-facet]').forEach(box => {
                    box.checked = true;
                  });
                }

                function applyFilters() {
                  const minExons = valueAsNumber(elements.minExons);
                  const maxExons = valueAsNumber(elements.maxExons);
                  const minLength = valueAsNumber(elements.minLength);
                  const maxLength = valueAsNumber(elements.maxLength);
                  const minTss = valueAsNumber(elements.minTss);
                  const maxTss = valueAsNumber(elements.maxTss);
                  const searchTerm = elements.search && elements.search.value ? elements.search.value.trim().toLowerCase() : '';
                  const facetFilters = collectFacetSelections();

                  state.filtered = state.data.filter(record => {
                    if (!passesNumericFilter(record.exons, minExons, maxExons)) {
                      return false;
                    }
                    if (!passesNumericFilter(record.length, minLength, maxLength)) {
                      return false;
                    }
                    if (!passesNumericFilter(record.diff_to_TSS, minTss, maxTss)) {
                      return false;
                    }
                    if (!passesFacetFilter(facetFilters.coding, normalizeFacetValue('coding', record.coding))) {
                      return false;
                    }
                    if (!passesFacetFilter(facetFilters.FSM_class, normalizeFacetValue('FSM_class', record.FSM_class))) {
                      return false;
                    }
                    if (!passesFacetFilter(facetFilters.FL, normalizeFacetValue('FL', record.FL))) {
                      return false;
                    }
                    if (!passesFacetFilter(facetFilters.all_canonical, normalizeFacetValue('all_canonical', record.all_canonical))) {
                      return false;
                    }
                    if (searchTerm) {
                      const haystack = [
                        record.isoform,
                        record.associated_gene,
                        record.associated_transcript,
                        record.structural_category,
                        record.subcategory
                      ].filter(Boolean).join(' ').toLowerCase();
                      if (!haystack.includes(searchTerm)) {
                        return false;
                      }
                    }
                    return true;
                  });
                  renderTable();
                  updateStatus();
                }

                function renderTable() {
                  if (!elements.tbody) {
                    return;
                  }
                  elements.tbody.innerHTML = '';
                  if (!state.filtered.length) {
                    const row = document.createElement('tr');
                    const cell = document.createElement('td');
                    cell.colSpan = columnDefinitions.length;
                    cell.className = 'muted';
                    cell.textContent = 'No transcripts match the current filters.';
                    row.appendChild(cell);
                    elements.tbody.appendChild(row);
                    return;
                  }
                  state.filtered.slice(0, 5000).forEach(record => {
                    const row = document.createElement('tr');
                    columnDefinitions.forEach(col => {
                      const cell = document.createElement('td');
                      cell.textContent = formatCellValue(col.key, record[col.key]);
                      row.appendChild(cell);
                    });
                    elements.tbody.appendChild(row);
                  });
                  if (state.filtered.length > 5000) {
                    const row = document.createElement('tr');
                    const cell = document.createElement('td');
                    cell.colSpan = columnDefinitions.length;
                    cell.className = 'muted';
                    cell.textContent = 'Showing first 5000 transcripts (of ' + state.filtered.length + '). Download TSV for the full selection.';
                    row.appendChild(cell);
                    elements.tbody.appendChild(row);
                  }
                }

                function updateStatus() {
                  if (!elements.status) {
                    return;
                  }
                  const total = state.data.length;
                  const shown = state.filtered.length;
                  elements.status.textContent = shown.toLocaleString() + ' of ' + total.toLocaleString() + ' transcripts displayed';
                }

                function collectFacetSelections() {
                  const selections = { coding: [], FSM_class: [], FL: [], all_canonical: [] };
                  elements.root.querySelectorAll('input[type="checkbox"][data-facet]').forEach(box => {
                    if (box.checked) {
                      selections[box.dataset.facet].push(box.value);
                    }
                  });
                  Object.keys(selections).forEach(key => {
                    const totalBoxes = elements.root.querySelectorAll('input[type="checkbox"][data-facet="' + key + '"]').length;
                    if (!selections[key].length || selections[key].length === totalBoxes) {
                      selections[key] = [];
                    }
                  });
                  return selections;
                }

                function passesFacetFilter(filterValues, candidate) {
                  if (!filterValues || !filterValues.length) {
                    return true;
                  }
                  return filterValues.includes(candidate);
                }

                function normalizeFacetValue(facetName, value) {
                  if (facetName === 'coding') {
                    return value ? value.toString() : 'unknown';
                  }
                  if (facetName === 'FSM_class') {
                    return value ? value.toString() : 'NA';
                  }
                  if (facetName === 'FL' || facetName === 'all_canonical') {
                    if (!value) {
                      return 'UNKNOWN';
                    }
                    return value.toString().toUpperCase();
                  }
                  return value || '';
                }

                function passesNumericFilter(value, minValue, maxValue) {
                  if (value === null || value === undefined || value === '') {
                    if (minValue !== null || maxValue !== null) {
                      return false;
                    }
                    return true;
                  }
                  if (minValue !== null && value < minValue) {
                    return false;
                  }
                  if (maxValue !== null && value > maxValue) {
                    return false;
                  }
                  return true;
                }

                function formatCellValue(key, value) {
                  if (value === null || value === undefined || value === '') {
                    return '—';
                  }
                  if (key === 'min_cov' || key === 'iso_exp') {
                    const num = Number(value);
                    if (!Number.isFinite(num)) {
                      return '—';
                    }
                    return num.toFixed(2);
                  }
                  if (key === 'all_canonical' || key === 'FL') {
                    const normalized = normalizeFacetValue(key, value);
                    if (['TRUE', 'YES', '1'].includes(normalized)) {
                      return 'Yes';
                    }
                    if (['FALSE', 'NO', '0'].includes(normalized)) {
                      return 'No';
                    }
                    if (normalized === 'UNKNOWN' || normalized === '') {
                      return '—';
                    }
                    return normalized;
                  }
                  return value;
                }

                function formatFacetLabel(facetName, value) {
                  if (!value || value === 'UNKNOWN') {
                    return 'Unknown';
                  }
                  if (facetName === 'FL') {
                    if (value.toUpperCase() === 'TRUE') {
                      return 'Full-length';
                    }
                    if (value.toUpperCase() === 'FALSE') {
                      return 'Not full-length';
                    }
                  }
                  if (facetName === 'all_canonical') {
                    if (value.toUpperCase() === 'TRUE') {
                      return 'All canonical';
                    }
                    if (value.toUpperCase() === 'FALSE') {
                      return 'Non-canonical';
                    }
                  }
                  if (facetName === 'FSM_class' && value === 'NA') {
                    return 'Not assigned';
                  }
                  return value;
                }

                function valueAsNumber(input) {
                  if (!input || input.value === '') {
                    return null;
                  }
                  const num = Number(input.value);
                  return Number.isFinite(num) ? num : null;
                }

                function debounce(fn, delay) {
                  let timeout;
                  return (...args) => {
                    window.clearTimeout(timeout);
                    timeout = window.setTimeout(() => fn.apply(null, args), delay);
                  };
                }

                function downloadTsv() {
                  if (!state.filtered.length) {
                    window.alert('No transcripts to export.');
                    return;
                  }
                  const headers = state.columns;
                  const lines = [headers.join('	')];
                  state.filtered.forEach(record => {
                    const row = headers.map(key => {
                      const value = record[key];
                      if (value === null || value === undefined) {
                        return '';
                      }
                      if (Array.isArray(value)) {
                        return value.join(',');
                      }
                      return value;
                    });
                    lines.push(row.join('	'));
                  });
                  const blob = new Blob([lines.join('
')], { type: 'text/tab-separated-values' });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement('a');
                  anchor.href = url;
                  anchor.download = state.category + '_filtered.tsv';
                  document.body.appendChild(anchor);
                  anchor.click();
                  document.body.removeChild(anchor);
                  URL.revokeObjectURL(url);
                }
              }

              function bootstrap() {
                document.querySelectorAll('[data-sqanti3-json]').forEach(root => {
                  if (!root.__sqanti3FilterInitialized) {
                    root.__sqanti3FilterInitialized = true;
                    initFilterUI(root);
                  }
                });
              }

              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', bootstrap);
              } else {
                bootstrap();
              }
            })();
