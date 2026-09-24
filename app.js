(() => {
  "use strict";
  const records = window.CORPUS_CELI.records || [];
  const state = { query: "", year: "", language: "", sort: "year-desc", page: 1, perPage: 10 };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value = "") => String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const normalize = (value = "") => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const plural = (n, singular, pluralForm) => `${n.toLocaleString("pt-BR")} ${n === 1 ? singular : pluralForm}`;

  function setupTabs() {
    const tabs = $$("[data-tab]");
    const activate = (name, changeHash = true) => {
      tabs.forEach(tab => {
        const selected = tab.dataset.tab === name;
        tab.classList.toggle("active", selected);
        tab.setAttribute("aria-selected", selected);
        $(`#panel-${tab.dataset.tab}`).hidden = !selected;
      });
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
    if (["#celi", "#batanero"].includes(location.hash)) activate(location.hash.slice(1), false);
  }

  function setupFilters() {
    const years = [...new Set(records.map(r => r.year))].sort((a, b) => b - a);
    const languages = [...new Set(records.map(r => r.language).filter(Boolean))].sort();
    $("#year-filter").insertAdjacentHTML("beforeend", years.map(y => `<option>${y}</option>`).join(""));
    $("#language-filter").insertAdjacentHTML("beforeend", languages.map(language => `<option value="${esc(language)}">${language === "Portuguese" ? "Português" : language === "English" ? "Inglês" : esc(language)}</option>`).join(""));
    let timer;
    $("#search").addEventListener("input", event => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.query = event.target.value.trim(); state.page = 1; render(); }, 120);
    });
    $("#year-filter").addEventListener("change", event => { state.year = event.target.value; state.page = 1; render(); });
    $("#language-filter").addEventListener("change", event => { state.language = event.target.value; state.page = 1; render(); });
    $("#sort-filter").addEventListener("change", event => { state.sort = event.target.value; state.page = 1; render(); });
    $("#clear-filters").addEventListener("click", () => {
      Object.assign(state, { query: "", year: "", language: "", sort: "year-desc", page: 1 });
      $("#search").value = "";
      $("#year-filter").value = "";
      $("#language-filter").value = "";
      $("#sort-filter").value = "year-desc";
      render();
    });
    $("#download-csv").addEventListener("click", downloadCSV);
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

  function filtered() {
    const needle = normalize(state.query);
    const result = records.filter(record =>
      (!needle || searchable(record).includes(needle)) &&
      (!state.year || String(record.year) === state.year) &&
      (!state.language || record.language === state.language)
    );
    const sorts = {
      "year-desc": (a, b) => b.year - a.year || a.title.localeCompare(b.title),
      "year-asc": (a, b) => a.year - b.year || a.title.localeCompare(b.title),
      "citations-desc": (a, b) => b.citations - a.citations || b.year - a.year,
      "title": (a, b) => a.title.localeCompare(b.title)
    };
    return result.sort(sorts[state.sort]);
  }

  function detailHTML(record) {
    const translated = record.titlePortuguese && normalize(record.titlePortuguese) !== normalize(record.title)
      ? `<h4>Título em português</h4><p>${esc(record.titlePortuguese)}</p>` : "";
    const references = record.references.length
      ? `<h4>Referências (${record.references.length})</h4><ol class="references-list">${record.references.map(ref => `<li>${esc(ref)}</li>`).join("")}</ol>` : "";
    return `${translated}<h4>Resumo</h4><p>${esc(record.abstract || "Não informado.")}</p>
      <h4>Metadados</h4><div class="details-grid">
        <p><span class="detail-label">Afiliação / IES</span>${esc(record.affiliations.join("; ") || "Não informada")}</p>
        <p><span class="detail-label">País(es)</span>${esc(record.countries.join("; ") || record.countryFirstAuthor || "Não informado")}</p>
        <p><span class="detail-label">Idioma</span>${esc(record.language || "Não informado")}</p>
        <p><span class="detail-label">Tipo</span>${esc(record.documentType || "Não informado")}</p>
        <p><span class="detail-label">DOI</span>${esc(record.doi || "Não informado")}</p>
        <p><span class="detail-label">Acesso</span>${esc(record.openAccess || "Não informado")}</p>
      </div>${record.dataQualityNote ? `<h4>Nota de qualidade</h4><p>${esc(record.dataQualityNote)}</p>` : ""}${references}`;
  }

  function recordNode(record) {
    const node = $("#record-template").content.cloneNode(true);
    $(".record-year", node).textContent = record.year;
    $(".record-source", node).textContent = record.sourceTitle;
    $(".record-citations", node).textContent = plural(record.citations, "citação", "citações");
    $(".record-title", node).textContent = record.title;
    $(".record-authors", node).textContent = record.authorFullNames.join("; ") || record.authors.join("; ");
    $(".record-tags", node).innerHTML = (record.authorKeywords || []).slice(0, 3).map(tag => `<span class="tag">${esc(tag)}</span>`).join("");
    const links = $(".record-links", node);
    if (record.doi) links.insertAdjacentHTML("beforeend", `<a href="https://doi.org/${esc(record.doi)}" target="_blank" rel="noopener">DOI ↗</a>`);
    if (record.link) links.insertAdjacentHTML("beforeend", `<a href="${esc(record.link)}" target="_blank" rel="noopener">Fonte ↗</a>`);
    if (record.drive?.url) links.insertAdjacentHTML("beforeend", `<a href="${esc(record.drive.url)}" target="_blank" rel="noopener">PDF ↗</a>`);
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

  function render() {
    const results = filtered();
    const pages = Math.max(1, Math.ceil(results.length / state.perPage));
    if (state.page > pages) state.page = pages;
    const visible = results.slice((state.page - 1) * state.perPage, state.page * state.perPage);
    $("#result-count").textContent = plural(results.length, "documento", "documentos");
    const list = $("#record-list");
    list.innerHTML = "";
    if (!visible.length) list.innerHTML = '<div class="empty-message">Nenhum documento encontrado.</div>';
    else visible.forEach(record => list.append(recordNode(record)));
    const nav = $("#pagination");
    nav.innerHTML = "";
    if (pages > 1) {
      for (let i = 1; i <= pages; i++) {
        const button = document.createElement("button");
        button.className = `page-button${i === state.page ? " active" : ""}`;
        button.type = "button";
        button.textContent = i;
        button.setAttribute("aria-label", `Página ${i}`);
        button.addEventListener("click", () => { state.page = i; render(); $(".results-head").scrollIntoView({ behavior: "smooth" }); });
        nav.append(button);
      }
    }
  }

  function downloadCSV() {
    const rows = filtered();
    const header = ["Ano","Título","Título em português","Autores","IES / afiliações","Países","Palavras-chave","Resumo","Referências","DOI","Link","PDF","Citações"];
    const body = rows.map(r => [r.year,r.title,r.titlePortuguese,r.authorFullNames.join("; "),r.affiliations.join("; "),r.countries.join("; "),r.authorKeywords.join("; "),r.abstract,r.references.join("; "),r.doi,r.link,r.drive?.url || "",r.citations]);
    const quote = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const blob = new Blob(["\ufeff" + [header, ...body].map(row => row.map(quote).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "corpus-celi-resultados.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  setupTabs();
  setupFilters();
  render();
})();
