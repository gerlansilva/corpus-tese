(() => {
  "use strict";

  const datasets = {
    celi: window.CORPUS_CELI || { meta: {}, records: [] },
    batanero: window.CORPUS_BATANERO || { meta: {}, records: [] }
  };
  const states = Object.fromEntries(Object.keys(datasets).map(name => [name, {
    query: "", year: "", language: "", sort: "year-desc", page: 1, perPage: 10
  }]));
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value = "") => String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);
  const normalize = (value = "") => String(value).normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const plural = (n, singular, pluralForm) => `${n.toLocaleString("pt-BR")} ${n === 1 ? singular : pluralForm}`;

  function setupTabs() {
    const tabs = $$('[data-tab]');
    const activate = (name, changeHash = true) => {
      tabs.forEach(tab => {
        const selected = tab.dataset.tab === name;
        tab.classList.toggle("active", selected);
        tab.setAttribute("aria-selected", String(selected));
        $(`#panel-${tab.dataset.tab}`).hidden = !selected;
      });
      const driveLink = $("#header-drive-link");
      if (driveLink && datasets[name]?.meta?.driveFolder) driveLink.href = datasets[name].meta.driveFolder;
      if (changeHash) history.replaceState(null, "", `#${name}`);
    };
    tabs.forEach(tab => {
      tab.addEventListener("click", () => activate(tab.dataset.tab));
      tab.addEventListener("keydown", event => {
        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const next = tabs[(tabs.indexOf(tab) + direction + tabs.length) % tabs.length];
        next.focus();
        activate(next.dataset.tab);
      });
    });
    const initial = ["#celi", "#batanero"].includes(location.hash) ? location.hash.slice(1) : "celi";
    activate(initial, false);
  }

  function elements(name) {
    const root = $(`[data-collection="${name}"]`);
    return {
      root,
      search: $('[data-role="search"]', root),
      year: $('[data-role="year"]', root),
      language: $('[data-role="language"]', root),
      languageWrap: $('[data-role="language-wrap"]', root),
      sort: $('[data-role="sort"]', root),
      clear: $('[data-role="clear"]', root),
      download: $('[data-role="download"]', root),
      count: $('[data-role="result-count"]', root),
      list: $('[data-role="record-list"]', root),
      pagination: $('[data-role="pagination"]', root)
    };
  }

  function setupCollection(name) {
    const data = datasets[name];
    const ui = elements(name);
    const state = states[name];
    const years = [...new Set(data.records.map(record => record.year).filter(Boolean))].sort((a, b) => b - a);
    const languages = [...new Set(data.records.map(record => record.language).filter(Boolean))].sort();
    ui.year.insertAdjacentHTML("beforeend", years.map(year => `<option>${year}</option>`).join(""));
    ui.language.insertAdjacentHTML("beforeend", languages.map(language =>
      `<option value="${esc(language)}">${language === "Portuguese" ? "Português" : language === "English" ? "Inglês" : esc(language)}</option>`
    ).join(""));
    if (!languages.length) {
      ui.languageWrap.hidden = true;
      $(".filters", ui.root).classList.add("filters-two");
    }

    let timer;
    ui.search.addEventListener("input", event => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.query = event.target.value.trim();
        state.page = 1;
        render(name);
      }, 120);
    });
    ui.year.addEventListener("change", event => { state.year = event.target.value; state.page = 1; render(name); });
    ui.language.addEventListener("change", event => { state.language = event.target.value; state.page = 1; render(name); });
    ui.sort.addEventListener("change", event => { state.sort = event.target.value; state.page = 1; render(name); });
    ui.clear.addEventListener("click", () => {
      Object.assign(state, { query: "", year: "", language: "", sort: "year-desc", page: 1 });
      ui.search.value = "";
      ui.year.value = "";
      ui.language.value = "";
      ui.sort.value = "year-desc";
      render(name);
    });
    ui.download.addEventListener("click", () => downloadCSV(name));
    render(name);
  }

  function searchable(record) {
    return normalize([
      record.title, record.titlePortuguese, record.abstract,
      ...(record.authors || []), ...(record.authorFullNames || []),
      ...(record.affiliations || []), ...(record.authorKeywords || []),
      ...(record.indexKeywords || []), ...(record.countries || []),
      ...(record.references || [])
    ].join(" "));
  }

  function filtered(name) {
    const state = states[name];
    const needle = normalize(state.query);
    const result = datasets[name].records.filter(record =>
      (!needle || searchable(record).includes(needle)) &&
      (!state.year || String(record.year) === state.year) &&
      (!state.language || record.language === state.language)
    );
    const citationValue = record => Number.isFinite(record.citations) ? record.citations : -1;
    const sorts = {
      "year-desc": (a, b) => b.year - a.year || a.title.localeCompare(b.title),
      "year-asc": (a, b) => a.year - b.year || a.title.localeCompare(b.title),
      "citations-desc": (a, b) => citationValue(b) - citationValue(a) || b.year - a.year,
      "title": (a, b) => a.title.localeCompare(b.title)
    };
    return result.sort(sorts[state.sort]);
  }

  function detailHTML(record) {
    const translated = record.titlePortuguese && normalize(record.titlePortuguese) !== normalize(record.title)
      ? `<h4>Título em português</h4><p>${esc(record.titlePortuguese)}</p>` : "";
    const metadata = [
      ["Afiliação / IES", (record.affiliations || []).join("; ")],
      ["País(es)", (record.countries || []).join("; ") || record.countryFirstAuthor],
      ["Idioma", record.language],
      ["Tipo", record.documentType],
      ["DOI", record.doi],
      ["Acesso", record.openAccess]
    ].filter(([, value]) => value);
    const metadataHTML = metadata.length
      ? `<h4>Metadados</h4><div class="details-grid">${metadata.map(([label, value]) =>
          `<p><span class="detail-label">${esc(label)}</span>${esc(value)}</p>`
        ).join("")}</div>` : "";
    const references = (record.references || []).length
      ? `<h4>Referências (${record.references.length})</h4><ol class="references-list">${record.references.map(ref => `<li>${esc(ref)}</li>`).join("")}</ol>` : "";
    return `${translated}<h4>Resumo</h4><p>${esc(record.abstract || "Não informado.")}</p>${metadataHTML}` +
      `${record.dataQualityNote ? `<h4>Nota de qualidade</h4><p>${esc(record.dataQualityNote)}</p>` : ""}${references}`;
  }

  function recordNode(record) {
    const node = $("#record-template").content.cloneNode(true);
    $(".record-year", node).textContent = record.year;
    $(".record-source", node).textContent = record.sourceTitle;
    $(".record-citations", node).textContent = Number.isFinite(record.citations)
      ? plural(record.citations, "citação", "citações") : "Citações não informadas";
    $(".record-title", node).textContent = record.title;
    $(".record-authors", node).textContent = (record.authorFullNames || []).join("; ") || (record.authors || []).join("; ");
    $(".record-tags", node).innerHTML = (record.authorKeywords || []).slice(0, 3)
      .map(tag => `<span class="tag">${esc(tag)}</span>`).join("");
    const links = $(".record-links", node);
    const doiUrl = record.doi ? `https://doi.org/${record.doi}` : "";
    if (doiUrl) links.insertAdjacentHTML("beforeend", `<a href="${esc(doiUrl)}" target="_blank" rel="noopener">DOI ↗</a>`);
    if (record.link && normalize(record.link) !== normalize(doiUrl)) {
      links.insertAdjacentHTML("beforeend", `<a href="${esc(record.link)}" target="_blank" rel="noopener">Fonte ↗</a>`);
    }
    if (record.drive?.url) {
      links.insertAdjacentHTML("beforeend", `<a href="${esc(record.drive.url)}" target="_blank" rel="noopener">${esc(record.drive.label || "PDF")} ↗</a>`);
    }
    const toggle = $(".details-toggle", node);
    const details = $(".record-details", node);
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      details.hidden = open;
      toggle.textContent = open ? "Ver resumo e metadados" : "Ocultar detalhes";
      if (!open && !details.dataset.loaded) {
        details.innerHTML = detailHTML(record);
        details.dataset.loaded = "true";
      }
    });
    return node;
  }

  function render(name) {
    const state = states[name];
    const ui = elements(name);
    const results = filtered(name);
    const pages = Math.max(1, Math.ceil(results.length / state.perPage));
    if (state.page > pages) state.page = pages;
    const visible = results.slice((state.page - 1) * state.perPage, state.page * state.perPage);
    ui.count.textContent = plural(results.length, "artigo", "artigos");
    ui.list.innerHTML = "";
    if (!visible.length) ui.list.innerHTML = '<div class="empty-message">Nenhum artigo encontrado.</div>';
    else visible.forEach(record => ui.list.append(recordNode(record)));
    ui.pagination.innerHTML = "";
    if (pages > 1) {
      for (let page = 1; page <= pages; page++) {
        const button = document.createElement("button");
        button.className = `page-button${page === state.page ? " active" : ""}`;
        button.type = "button";
        button.textContent = page;
        button.setAttribute("aria-label", `Página ${page}`);
        button.addEventListener("click", () => {
          state.page = page;
          render(name);
          $(".results-head", ui.root).scrollIntoView({ behavior: "smooth", block: "start" });
        });
        ui.pagination.append(button);
      }
    }
  }

  function downloadCSV(name) {
    const rows = filtered(name);
    const header = ["Ano", "Título", "Título em português", "Autores", "IES / afiliações", "Países", "Palavras-chave", "Resumo", "Referências", "DOI", "Link", "Drive", "Citações"];
    const body = rows.map(record => [
      record.year, record.title, record.titlePortuguese,
      (record.authorFullNames || []).join("; "), (record.affiliations || []).join("; "),
      (record.countries || []).join("; "), (record.authorKeywords || []).join("; "),
      record.abstract, (record.references || []).join("; "), record.doi, record.link,
      record.drive?.url || "", Number.isFinite(record.citations) ? record.citations : ""
    ]);
    const quote = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const blob = new Blob(["\ufeff" + [header, ...body].map(row => row.map(quote).join(";")).join("\n")], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `corpus-${name}-resultados.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  Object.keys(datasets).forEach(setupCollection);
  setupTabs();
})();
