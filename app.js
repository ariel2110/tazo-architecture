const CATEGORY_KEYS = ["all", "identity", "mobility", "commerce", "wallet", "messaging", "infra"];

function applyLanguage(lang) {
  document.documentElement.lang = lang === "he" ? "he" : "en";
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";

  document.querySelectorAll("[data-he][data-en]").forEach((node) => {
    node.textContent = lang === "he" ? node.dataset.he : node.dataset.en;
  });

  document.querySelectorAll("[data-he-placeholder][data-en-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", lang === "he" ? node.dataset.hePlaceholder : node.dataset.enPlaceholder);
  });

  const langBtn = document.getElementById("langToggle");
  if (langBtn) {
    langBtn.textContent = lang === "he" ? "EN" : "עב";
  }

  localStorage.setItem("tazo_arch_lang", lang);
}

function initLanguageToggle() {
  const saved = localStorage.getItem("tazo_arch_lang") || "he";
  applyLanguage(saved);

  const btn = document.getElementById("langToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const next = document.documentElement.lang === "he" ? "en" : "he";
    applyLanguage(next);
  });
}

function hasCategory(el, category) {
  const raw = (el.dataset.categories || "").trim();
  if (!raw) return category === "all";
  const cats = raw.split(",").map((v) => v.trim());
  return cats.includes(category);
}

function initCategoryFilter() {
  const catButtons = document.querySelectorAll(".cat-btn");
  const categorizedItems = document.querySelectorAll("[data-categories]");
  if (!catButtons.length || !categorizedItems.length) return { getCategory: () => "all" };

  const state = { category: "all" };

  function updateCategoryCounts() {
    CATEGORY_KEYS.forEach((category) => {
      const countEl = document.querySelector(`[data-count-for="${category}"]`);
      if (!countEl) return;
      if (category === "all") {
        countEl.textContent = `(${categorizedItems.length})`;
        return;
      }
      const count = Array.from(categorizedItems).filter((el) => hasCategory(el, category)).length;
      countEl.textContent = `(${count})`;
    });
  }

  function setCategory(category) {
    state.category = category;
    catButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.category === category);
    });

    document.dispatchEvent(new CustomEvent("category:changed", { detail: { category } }));
  }

  catButtons.forEach((btn) => {
    btn.addEventListener("click", () => setCategory(btn.dataset.category || "all"));
  });

  updateCategoryCounts();
  setCategory("all");
  return { getCategory: () => state.category };
}

function initSearch(filterState) {
  const input = document.getElementById("freeSearch");
  const clearBtn = document.getElementById("clearSearch");
  const items = document.querySelectorAll("[data-search-item]");
  if (!input || !items.length) return;

  function matchesSearch(item, query) {
    if (!query) return true;
    const source = (item.dataset.searchText || item.textContent || "").toLowerCase();
    return source.includes(query);
  }

  function refresh() {
    const query = input.value.trim().toLowerCase();
    const activeCategory = filterState?.getCategory ? filterState.getCategory() : "all";

    items.forEach((item) => {
      const catOk = activeCategory === "all" || hasCategory(item, activeCategory);
      const searchOk = matchesSearch(item, query);
      item.classList.toggle("is-hidden", !(catOk && searchOk));
    });
  }

  input.addEventListener("input", refresh);
  clearBtn?.addEventListener("click", () => {
    input.value = "";
    refresh();
    input.focus();
  });

  document.addEventListener("category:changed", refresh);
  refresh();
}

function initDiagramControls() {
  const inner = document.getElementById("diagramInner");
  const outer = document.getElementById("diagramOuter");
  const lbl = document.getElementById("zoom-label");
  if (!inner || !outer || !lbl) return;

  let scale = 1.0;

  function applyZoom() {
    inner.style.transform = `scale(${scale})`;
    lbl.textContent = `${Math.round(scale * 100)}%`;
  }

  window.zoom = (d) => {
    scale = Math.min(3, Math.max(0.2, scale + d));
    applyZoom();
  };

  window.resetZoom = () => {
    scale = 1.0;
    applyZoom();
  };

  window.fitToScreen = () => {
    const svg = document.querySelector("#theMermaid svg");
    if (!svg) return;
    const svgW = svg.getBoundingClientRect().width || 2200;
    const outerW = outer.clientWidth - 80;
    scale = Math.min(1.0, outerW / svgW);
    applyZoom();
  };

  window.printDiagram = () => {
    const savedScale = scale;
    inner.style.transform = "none";
    inner.style.padding = "0";
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        inner.style.transform = `scale(${savedScale})`;
        inner.style.padding = "36px 44px";
      }, 500);
    }, 100);
  };

  let drag = false;
  let sx = 0;
  let sy = 0;
  let sl = 0;
  let st = 0;

  outer.addEventListener("mousedown", (e) => {
    drag = true;
    sx = e.pageX - outer.offsetLeft;
    sy = e.pageY - outer.offsetTop;
    sl = outer.scrollLeft;
    st = outer.scrollTop;
  });
  outer.addEventListener("mouseleave", () => { drag = false; });
  outer.addEventListener("mouseup", () => { drag = false; });
  outer.addEventListener("mousemove", (e) => {
    if (!drag) return;
    e.preventDefault();
    outer.scrollLeft = sl - (e.pageX - outer.offsetLeft - sx);
    outer.scrollTop = st - (e.pageY - outer.offsetTop - sy);
  });
  outer.addEventListener("wheel", (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      window.zoom(e.deltaY < 0 ? 0.1 : -0.1);
    }
  }, { passive: false });

  setTimeout(() => {
    const svg = document.querySelector("#theMermaid svg");
    if (svg) {
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.style.minWidth = "2200px";
      svg.style.fontSize = "22px";
    }
    window.fitToScreen();
  }, 1800);
}

document.addEventListener("DOMContentLoaded", () => {
  const filterState = initCategoryFilter();
  initSearch(filterState);
  initLanguageToggle();
  initDiagramControls();
});
