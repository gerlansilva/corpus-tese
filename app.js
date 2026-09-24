(() => {
  "use strict";

  const data = window.CORPUS_CELI;
  const records = data.records || [];
  const state = { query: "", year: "", language: "", sort: "year-desc", page: 1, perPage: 8, metaFilter: "present" };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value = "") => String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const strip = (value = "") => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const plural = (n, one, many) => `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;

  function initTabs() {
    const tabs = $$("[data-tab]");
    const activate = (name, updateHash = true) => {
      tabs.forEach(tab => {
        const selected = tab.dataset.tab === name;
        tab.classList.toggle("active", selected);
        tab.setAttribute("aria-selected", selected);
        $(`#panel-${tab.dataset.tab}`).hidden = !selected;
      });
      if (updateHash) history.replaceState(null, "", `#${name}`);
    };
    tabs.forEach(tab => tab.addEventListener("click", () => activate(tab.dataset.tab)));
    tabs.forEach(tab => tab.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const index = tabs.indexOf(tab);
      const next = tabs[(index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      next.focus(); activate(next.dataset.tab);
    }));
    if (["#celi", "#batanero"].includes(location.hash)) activate(location.hash.slice(1), false);
  }

  function renderStats() {
    const countries = new Set(records.flatMap(r => r.countries).filter(Boolean));
    const citations = records.reduce((sum, r) => sum + Number(r.citations || 0), 0);
    const present = data.meta.fields.filter(f => f.populated > 0).length;
    const stats = [
      [records.length, "documentos no corpus"],
      [`${data.meta.yearRange[0]}–${data.meta.yearRange[1]}`, "período coberto"],
      [present, "campos com dados"],
      [citations.toLocaleString("pt-BR"), "citações registradas"]
    ];
    $("#stats").innerHTML = stats.map(([value, label]) => `<div class="stat"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join("");
    $("#hero-scope").textContent = `${records.length} documentos · ${data.meta.yearRange[0]}–${data.meta.yearRange[1]}`;
    $("#present-fields").textContent = present;
  }

  function renderTimeline() {
    const start = Number(data.meta.yearRange[0]);
    const end = Number(data.meta.yearRange[1]);
    const years = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    const count = Object.fromEntries(years.map(y => [y, 0]));
    records.forEach(r => count[r.year] = (count[r.year] || 0) + 1);
    const max = Math.max(...Object.values(count), 1);
    const W = 760, H = 220, left = 30, bottom = 32, top = 12, plotH = H - bottom - top;
    const gap = 6, barW = (W - left - 10 - gap * (years.length - 1)) / years.length;
    const bars = years.map((year, index) => {
      const h = count[year] / max * plotH;
      const x = left + index * (barW + gap), y = top + plotH - h;
      const label = (index % 2 === 0 || years.length < 12) ? `<text x="${x + barW / 2}" y="${H - 8}" text-anchor="middle">${String(year).slice(2)}</text>` : "";
      return `<g><title>${year}: ${plural(count[year], "documento", "documentos")}</title><rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3"></rect>${count[year] ? `<text class="value" x="${x + barW / 2}" y="${Math.max(y - 6, 10)}" text-anchor="middle">${count[year]}</text>` : ""}${label}</g>`;
    }).join("");
    $("#timeline").innerHTML = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><style>rect{fill:#4e8375}.value{font:600 10px DM Sans;fill:#173f3a}text:not(.value){font:10px DM Sans;fill:#71807b}</style><line x1="${left}" y1="${top + plotH}" x2="${W - 10}" y2="${top + plotH}" stroke="#d9ded9"/>${bars}</svg>`;
  }

  function renderKeywords() {
    const counts = new Map();
    records.flatMap(r => r.authorKeywords || []).forEach(keyword => {
      const key = strip(keyword).trim();
      if (!key) return;
      const item = counts.get(key) || { label: keyword, count: 0 };
      item.count += 1; counts.set(key, item);
    });
    const top = [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 12);
    const box = $("#top-keywords");
    box.innerHTML = "";
    top.forEach(item => {
      const button = document.createElement("button");
      button.className = "keyword-button";
      button.type = "button";
      button.innerHTML = `${esc(item.label)} <small>${item.count}</small>`;
      button.addEventListener("click", () => { $("#search").value = item.label; state.query = item.label; state.page = 1; renderRecords(); $("#collection-heading").scrollIntoView({behavior:"smooth"}); });
      box.append(button);
    });
  }

  function renderMetadata() {
    const list = data.meta.fields.filter(field => state.metaFilter === "all" || (state.metaFilter === "present" ? field.populated > 0 : field.populated === 0));
    $("#metadata-grid").innerHTML = list.map(field => `<article class="metadata-card ${field.populated ? "" : "empty"}"><div class="metadata-card-top"><div><strong>${esc(field.label)}</strong><br><small>${esc(field.category)}</small></div><small>${field.populated}/${field.total}</small></div><div class="coverage" aria-label="${field.coverage}% preenchido"><span style="width:${field.coverage}%"></span></div></article>`).join("");
  }

  function setupMetadataFilters() {
    $$("[data-meta-filter]").forEach(button => button.addEventListener("click", () => {
      state.metaFilter = button.dataset.metaFilter;
      $$("[data-meta-filter]").forEach(b => b.classList.toggle("active", b === button));
      renderMetadata();
    }));
  }

  function setupFilters() {
    const years = [...new Set(records.map(r => r.year))].sort((a, b) => b - a);
    const languages = [...new Set(records.map(r => r.language).filter(Boolean))].sort();
    $("#year-filter").insertAdjacentHTML("beforeend", years.map(y => `<option>${y}</option>`).join(""));
    $("#language-filter").insertAdjacentHTML("beforeend", languages.map(x => `<option value="${esc(x)}">${x === "Portuguese" ? "Português" : x === "English" ? "Inglês" : esc(x)}</option>`).join(""));
    let timer;
    $("#search").addEventListener("input", event => { clearTimeout(timer); timer = setTimeout(() => { state.query = event.target.value.trim(); state.page = 1; renderRecords(); }, 120); });
    $("#year-filter").addEventListener("change", event => { state.year = event.target.value; state.page = 1; renderRecords(); });
    $("#language-filter").addEventListener("change", event => { state.language = event.target.value; state.page = 1; renderRecords(); });
    $("#sort-filter").addEventListener("change", event => { state.sort = event.target.value; state.page = 1; renderRecords(); });
    $("#clear-filters").addEventListener("click", () => {
      Object.assign(state, {query:"", year:"", language:"", sort:"year-desc", page:1});
      $("#search").value = ""; $("#year-filter").value = ""; $("#language-filter").value = ""; $("#sort-filter").value = "year-desc"; renderRecords();
    });
    $("#download-csv").addEventListener("click", downloadCSV);
  }

  function searchable(record) {
    return strip([record.title, record.titlePortuguese, record.abstract, ...(record.authors || []), ...(record.authorFullNames || []), ...(record.affiliations || []), ...(record.authorKeywords || []), ...(record.indexKeywords || []), ...(record.countries || []), ...(record.references || [])].join(" "));
  }

  function filteredRecords() {
    const needle = strip(state.query);
    const filtered = records.filter(record => (!needle || searchable(record).includes(needle)) && (!state.year || String(record.year) === state.year) && (!state.language || record.language === state.language));
    const sorts = {
      "year-desc": (a, b) => b.year - a.year || a.title.localeCompare(b.title),
      "year-asc": (a, b) => a.year - b.year || a.title.localeCompare(b.title),
      "citations-desc": (a, b) => b.citations - a.citations || b.year - a.year,
      "title": (a, b) => a.title.localeCompare(b.title)
    };
    return filtered.sort(sorts[state.sort]);
  }

  function makeDetail(record) {
    const translated = record.titlePortuguese && strip(record.titlePortuguese) !== strip(record.title) ? `<h4>Título em português</h4><p>${esc(record.titlePortuguese)}</p>` : "";
    const refs = record.references.length ? `<h4>Referências (${record.references.length})</h4><ol class="references-list">${record.references.map(ref => `<li>${esc(ref)}</li>`).join("")}</ol>` : "";
    return `${translated}<h4>Resumo</h4><p>${esc(record.abstract || "Não informado.")}</p><h4>Metadados do registro</h4><div class="details-grid"><p><span class="detail-label">Afiliação / IES</span>${esc(record.affiliations.join("; ") || "Não informada")}</p><p><span class="detail-label">País(es)</span>${esc(record.countries.join("; ") || record.countryFirstAuthor || "Não informado")}</p><p><span class="detail-label">Idioma</span>${esc(record.language || "Não informado")}</p><p><span class="detail-label">Tipo</span>${esc(record.documentType || "Não informado")}</p><p><span class="detail-label">DOI</span>${esc(record.doi || "Não informado")}</p><p><span class="detail-label">Acesso</span>${esc(record.openAccess || "Não informado")}</p></div>${record.dataQualityNote ? `<h4>Nota de qualidade</h4><p>${esc(record.dataQualityNote)}</p>` : ""}${refs}`;
  }

  function createRecord(record) {
    const node = $("#record-template").content.cloneNode(true);
    $(".record-year", node).textContent = record.year;
    $(".record-source", node).textContent = record.sourceTitle;
    $(".record-citations", node).textContent = plural(record.citations, "citação", "citações");
    $(".record-title", node).textContent = record.title;
    $(".record-authors", node).textContent = record.authorFullNames.join("; ") || record.authors.join("; ");
    $(".record-tags", node).innerHTML = (record.authorKeywords || []).slice(0, 5).map(tag => `<span class="tag">${esc(tag)}</span>`).join("");
    const links = $(".record-links", node);
    if (record.doi) links.insertAdjacentHTML("beforeend", `<a href="https://doi.org/${encodeURIComponent(record.doi)}" target="_blank" rel="noopener">DOI ↗</a>`);
    if (record.link) links.insertAdjacentHTML("beforeend", `<a href="${esc(record.link)}" target="_blank" rel="noopener">Fonte ↗</a>`);
    if (record.drive?.url) links.insertAdjacentHTML("beforeend", `<a href="${esc(record.drive.url)}" target="_blank" rel="noopener">PDF ↗</a>`);
    const toggle = $(".details-toggle", node), details = $(".record-details", node);
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open)); details.hidden = open;
      toggle.textContent = open ? "Ver resumo e metadados" : "Ocultar detalhes";
      if (!open && !details.dataset.loaded) { details.innerHTML = makeDetail(record); details.dataset.loaded = "true"; }
    });
    return node;
  }

  function renderRecords() {
    const results = filteredRecords();
    const pages = Math.max(1, Math.ceil(results.length / state.perPage));
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * state.perPage;
    const visible = results.slice(start, start + state.perPage);
    $("#result-count").textContent = plural(results.length, "documento", "documentos");
    const list = $("#record-list"); list.innerHTML = "";
    if (!visible.length) list.innerHTML = `<div class="empty-message"><strong>Nenhum documento encontrado.</strong><br>Tente remover um filtro ou usar outro termo.</div>`;
    else visible.forEach(record => list.append(createRecord(record)));
    const nav = $("#pagination"); nav.innerHTML = "";
    if (pages > 1) {
      for (let i = 1; i <= pages; i++) {
        const button = document.createElement("button"); button.className = `page-button${i === state.page ? " active" : ""}`; button.textContent = i; button.type = "button"; button.setAttribute("aria-label", `Página ${i}`);
        button.addEventListener("click", () => { state.page = i; renderRecords(); $("#collection-heading").scrollIntoView({behavior:"smooth"}); }); nav.append(button);
      }
    }
  }

  function downloadCSV() {
    const results = filteredRecords();
    const fields = ["Ano","Título","Título em português","Autores","IES / afiliações","Países","Palavras-chave","Resumo","Referências","DOI","Link","PDF no acervo","Citações"];
    const rows = results.map(r => [r.year,r.title,r.titlePortuguese,r.authorFullNames.join("; "),r.affiliations.join("; "),r.countries.join("; "),r.authorKeywords.join("; "),r.abstract,r.references.join("; "),r.doi,r.link,r.drive?.url || "",r.citations]);
    const quote = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const blob = new Blob(["\ufeff" + [fields, ...rows].map(row => row.map(quote).join(";")).join("\n")], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = "corpus-celi-resultados.csv"; link.click(); URL.revokeObjectURL(url);
  }

  initTabs(); renderStats(); renderTimeline(); renderKeywords(); renderMetadata(); setupMetadataFilters(); setupFilters(); renderRecords();
})();
