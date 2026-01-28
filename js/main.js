/* ScamIntel Directory (Static)
   - Loads data/companies.json
   - Renders index cards + filters
   - Renders profile by ?id=
   - Renders report by ?case=
   - EN/RU toggle (localStorage + ?lang=)
*/

const I18N = {
  en: {
    "app.title": "ScamIntel Directory",
    "app.subtitle": "Browse companies by country, city/region, and category",
    "filters.country": "Country",
    "filters.city": "City / Region",
    "filters.category": "Category",
    "filters.search": "Search (product/service/category)",
    "actions.reset": "Reset",
    "actions.viewProfile": "View Profile",
    "actions.back": "Back to Directory",
    "results.showing": "Showing",
    "results.of": "of",
    "empty.title": "No results",
    "empty.subtitle": "Try adjusting filters or search terms.",
    "profile.title": "Company Profile",
    "profile.subtitle": "Public business listing information",
    "profile.website": "Website",
    "profile.category": "Category",
    "profile.products": "Products / Services",
    "profile.notfound.title": "Company not found",
    "profile.notfound.subtitle": "The listing may have been removed or the link is incorrect.",
    "profile.verified.yes": "Verified",
    "profile.verified.no": "Not Verified",
    "profile.verified.at": "Verified on",
    "nav.brand": "ScamIntel Directory",
    "nav.tagline": "Listings • Profiles • Verification",
    "nav.directory": "Directory",
    "nav.profile": "Company Page",
    "nav.report": "Verified Report",
    "actions.print": "Print",
    "profile.openReport": "Open Verified Report",
    "report.title": "Verified Report"
  },
  ru: {
    "app.title": "ScamIntel Каталог",
    "app.subtitle": "Поиск компаний по стране, городу/региону и категории",
    "filters.country": "Страна",
    "filters.city": "Город / Регион",
    "filters.category": "Категория",
    "filters.search": "Поиск (продукт/услуга/категория)",
    "actions.reset": "Сбросить",
    "actions.viewProfile": "Профиль",
    "actions.back": "Назад к каталогу",
    "results.showing": "Показано",
    "results.of": "из",
    "empty.title": "Ничего не найдено",
    "empty.subtitle": "Измените фильтры или запрос.",
    "profile.title": "Профиль компании",
    "profile.subtitle": "Публичная информация из каталога",
    "profile.website": "Сайт",
    "profile.category": "Категория",
    "profile.products": "Продукты / Услуги",
    "profile.notfound.title": "Компания не найдена",
    "profile.notfound.subtitle": "Запись могла быть удалена или ссылка неверная.",
    "profile.verified.yes": "Проверено",
    "profile.verified.no": "Не проверено",
    "profile.verified.at": "Проверено на",
    "nav.brand": "ScamIntel Каталог",
    "nav.tagline": "Каталог • Профили • Проверка",
    "nav.directory": "Каталог",
    "nav.profile": "Профиль компании",
    "nav.report": "Отчёт проверки",
    "actions.print": "Печать",
    "profile.openReport": "Открыть отчёт проверки",
    "report.title": "Отчёт проверки"
  }
};

const STORAGE_LANG_KEY = "gbd_lang";
const DATA_URL = "./data/companies.json";

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function setQueryParam(name, value) {
  const url = new URL(window.location.href);
  if (value === null || value === undefined || value === "") url.searchParams.delete(name);
  else url.searchParams.set(name, value);
  window.history.replaceState({}, "", url.toString());
}

function getInitialLang() {
  const q = getQueryParam("lang");
  if (q === "en" || q === "ru") return q;
  const s = localStorage.getItem(STORAGE_LANG_KEY);
  if (s === "en" || s === "ru") return s;
  return "en";
}

let currentLang = getInitialLang();

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) ? I18N[currentLang][key] : key;
}

function L(fieldObj) {
  if (!fieldObj) return "";
  if (typeof fieldObj === "string") return fieldObj;
  return fieldObj[currentLang] || fieldObj.en || "";
}

function applyI18n() {
  document.documentElement.lang = currentLang;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });

  const search = document.getElementById("filterSearch");
  if (search) {
    search.placeholder = currentLang === "ru"
      ? "например: логистика, экспорт, безопасность"
      : "e.g., logistics, export, security";
  }
}

function setLang(lang) {
  if (lang !== "en" && lang !== "ru") return;
  currentLang = lang;
  localStorage.setItem(STORAGE_LANG_KEY, lang);
  setQueryParam("lang", lang);
  applyI18n();
  if (document.getElementById("cards")) renderIndex();
  if (document.getElementById("profileCard")) renderProfile();
  if (document.getElementById("reportCard")) renderReport();
  updateLangButtons();
  wireNavLinks();
}

function updateLangButtons() {
  const btnEn = document.getElementById("btnEn");
  const btnRu = document.getElementById("btnRu");
  if (!btnEn || !btnRu) return;

  const active = "bg-black text-white border-black";
  const inactive = "bg-white text-gray-900 border-gray-200 hover:bg-gray-50";

  btnEn.className = `px-3 py-2 rounded-xl border text-sm ${currentLang === "en" ? active : inactive}`;
  btnRu.className = `px-3 py-2 rounded-xl border text-sm ${currentLang === "ru" ? active : inactive}`;
}

async function loadCompanies() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load companies.json");
  return await res.json();
}

let COMPANIES = null;

async function ensureData() {
  if (COMPANIES) return COMPANIES;
  COMPANIES = await loadCompanies();
  return COMPANIES;
}

function productsText(company) {
  const arr = (company.products && (company.products[currentLang] || company.products.en)) || [];
  return arr.join(" ").toLowerCase();
}

function uniqSorted(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function option(label, value) {
  const o = document.createElement("option");
  o.value = value;
  o.textContent = label;
  return o;
}

/* === Normalize bilingual fields === */
function getFieldENRU(obj) {
  if (!obj) return { en: "", ru: "" };
  if (typeof obj === "string") return { en: obj, ru: obj };
  return { en: obj.en || "", ru: obj.ru || "" };
}

/* === Category helpers (robust) === */
function getCategoryEN(company) {
  return getFieldENRU(company.category).en.trim();
}
function getCategoryLabel(company) {
  if (!company.category) return "";
  if (typeof company.category === "string") return company.category;
  return L(company.category);
}
function getCategorySearchText(company) {
  const f = getFieldENRU(company.category);
  return `${f.en} ${f.ru}`.toLowerCase();
}

async function renderIndex() {
  const cards = document.getElementById("cards");
  if (!cards) return;

  const statusText = document.getElementById("statusText");
  const emptyState = document.getElementById("emptyState");

  const filterCountry = document.getElementById("filterCountry");
  const filterCity = document.getElementById("filterCity");
  const filterCategory = document.getElementById("filterCategory");
  const filterSearch = document.getElementById("filterSearch");
  const btnReset = document.getElementById("btnReset");

  const countShown = document.getElementById("countShown");
  const countAll = document.getElementById("countAll");

  if (statusText) statusText.textContent = currentLang === "ru" ? "Загрузка…" : "Loading…";

  const data = await ensureData();
  if (countAll) countAll.textContent = String(data.length);

  const countriesEN = uniqSorted(data.map(c => getFieldENRU(c.country).en));
  const categoriesEN = uniqSorted(data.map(c => getCategoryEN(c)));

  function fillSelect(selectEl, labelKey, valuesEN, labelForEN) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    selectEl.appendChild(option(t(labelKey), ""));
    valuesEN.forEach(vEN => selectEl.appendChild(option(labelForEN(vEN), vEN)));
  }

  const labelCountryByEN = (vEN) => {
    const found = data.find(c => getFieldENRU(c.country).en === vEN);
    return found ? L(found.country) : vEN;
  };

  const labelCityByEN = (vEN) => {
    const found = data.find(c => getFieldENRU(c.city).en === vEN);
    return found ? L(found.city) : vEN;
  };

  const labelCategoryByEN = (vEN) => {
    const found = data.find(c => getCategoryEN(c) === vEN);
    return found ? getCategoryLabel(found) : vEN;
  };

  // Fill Country + Category first
  fillSelect(filterCountry, "filters.country", countriesEN, labelCountryByEN);
  fillSelect(filterCategory, "filters.category", categoriesEN, labelCategoryByEN);

  // Restore filters from URL (read first)
  const qCountry = getQueryParam("country") || "";
  const qCity = getQueryParam("city") || "";
  const qCategory = getQueryParam("cat") || "";
  const qSearch = getQueryParam("q") || "";

  if (filterCountry) filterCountry.value = qCountry;
  if (filterCategory) filterCategory.value = qCategory;
  if (filterSearch) filterSearch.value = qSearch;

  // ✅ Dependent City dropdown: only cities from selected country
  function updateCityOptions(keepValue) {
    if (!filterCity) return;

    const selectedCountryEN = filterCountry ? filterCountry.value : "";
    const pool = selectedCountryEN
      ? data.filter(c => getFieldENRU(c.country).en === selectedCountryEN)
      : data;

    const citiesEN = uniqSorted(pool.map(c => getFieldENRU(c.city).en));

    fillSelect(filterCity, "filters.city", citiesEN, labelCityByEN);

    // restore/keep chosen city only if it exists in the new list
    const desired = (keepValue !== undefined ? keepValue : filterCity.value) || "";
    if (desired && citiesEN.includes(desired)) filterCity.value = desired;
    else filterCity.value = "";
  }

  // Build city list AFTER we apply country from URL
  updateCityOptions(qCity);

  function updateURLFromFilters() {
    setQueryParam("country", filterCountry ? filterCountry.value : "");
    setQueryParam("city", filterCity ? filterCity.value : "");
    setQueryParam("cat", filterCategory ? filterCategory.value : "");
    setQueryParam("q", filterSearch ? filterSearch.value.trim() : "");
  }

  function matches(company) {
    const countryEN = getFieldENRU(company.country).en;
    const cityEN = getFieldENRU(company.city).en;
    const categoryEN = getCategoryEN(company);

    if (filterCountry && filterCountry.value && countryEN !== filterCountry.value) return false;
    if (filterCity && filterCity.value && cityEN !== filterCity.value) return false;
    if (filterCategory && filterCategory.value && categoryEN !== filterCategory.value) return false;

    const q = (filterSearch ? filterSearch.value.trim().toLowerCase() : "");
    if (!q) return true;

    const nameBoth = `${getFieldENRU(company.name).en} ${getFieldENRU(company.name).ru}`.toLowerCase();
    const prod = productsText(company);

    // ✅ category included in search (both languages)
    const catBoth = getCategorySearchText(company);

    return (nameBoth.includes(q) || prod.includes(q) || catBoth.includes(q));
  }

  function renderCards(list) {
    cards.innerHTML = "";

    list.forEach(c => {
      const card = document.createElement("div");
      card.className = "bg-white rounded-2xl shadow p-6 flex flex-col";

      const title = document.createElement("h3");
      title.className = "text-xl font-semibold";
      title.textContent = L(c.name);

      const loc = document.createElement("p");
      loc.className = "text-sm text-gray-600 mt-1";
      loc.textContent = `📍 ${L(c.city)}, ${L(c.country)}`;

      const info = document.createElement("div");
      info.className = "mt-4 space-y-1 text-sm";

      const categoryText = getCategoryLabel(c) || "—";

      info.innerHTML = `
        <div><b>${t("profile.category")}:</b> ${categoryText}</div>
        <div><b>Email:</b> ${c.email || "—"}</div>
      `;

      const btn = document.createElement("a");
      btn.className = "mt-5 w-full text-center bg-black text-white py-2 rounded-xl hover:opacity-90 text-sm";
      btn.textContent = t("actions.viewProfile");
      btn.href = `./profile.html?id=${encodeURIComponent(c.id)}&lang=${encodeURIComponent(currentLang)}`;

      card.appendChild(title);
      card.appendChild(loc);
      card.appendChild(info);
      card.appendChild(btn);

      cards.appendChild(card);
    });
  }

  function run() {
    const filtered = data.filter(matches);

    if (countShown) countShown.textContent = String(filtered.length);
    if (statusText) statusText.textContent = "";

    if (emptyState) {
      if (filtered.length === 0) emptyState.classList.remove("hidden");
      else emptyState.classList.add("hidden");
    }

    renderCards(filtered);
    updateURLFromFilters();
  }

  // ✅ Wire filter events (Country triggers city rebuild)
  if (filterCountry) {
    filterCountry.addEventListener("change", () => {
      updateCityOptions(""); // reset city when country changes
      run();
    });
  }
  if (filterCity) filterCity.addEventListener("change", run);
  if (filterCategory) filterCategory.addEventListener("change", run);

  if (filterSearch) {
    filterSearch.addEventListener("input", () => {
      window.clearTimeout(window.__gbdTimer);
      window.__gbdTimer = window.setTimeout(run, 120);
    });
  }

  if (btnReset) {
    btnReset.addEventListener("click", () => {
      if (filterCountry) filterCountry.value = "";
      if (filterCategory) filterCategory.value = "";
      if (filterSearch) filterSearch.value = "";

      // reset city list to ALL cities
      updateCityOptions("");

      run();
    });
  }

  run();
}

async function renderProfile() {
  const card = document.getElementById("profileCard");
  if (!card) return;

  const notFound = document.getElementById("notFound");
  const backLink = document.getElementById("backLink");
  const backLinkNF = document.getElementById("backLinkNF");

  const id = getQueryParam("id");
  const data = await ensureData();

  if (backLink) backLink.href = `./index.html?lang=${encodeURIComponent(currentLang)}`;
  if (backLinkNF) backLinkNF.href = `./index.html?lang=${encodeURIComponent(currentLang)}`;

  const c = data.find(x => x.id === id);
  if (!c) {
    if (notFound) notFound.classList.remove("hidden");
    card.classList.add("hidden");
    return;
  }

  const elName = document.getElementById("companyName");
  const elLoc = document.getElementById("companyLocation");
  const elCat = document.getElementById("companyCategory");

  if (elName) elName.textContent = L(c.name);
  if (elLoc) elLoc.textContent = `📍 ${L(c.city)}, ${L(c.country)}`;
  if (elCat) elCat.textContent = getCategoryLabel(c);

  const ul = document.getElementById("companyProducts");
  if (ul) {
    ul.innerHTML = "";
    const prodArr = (c.products && (c.products[currentLang] || c.products.en)) || [];
    prodArr.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p;
      ul.appendChild(li);
    });
  }

  const websiteBtn = document.getElementById("companyWebsite");
  if (websiteBtn) {
    if (c.website && String(c.website).trim()) {
      websiteBtn.classList.remove("hidden");
      websiteBtn.href = c.website;
    } else {
      websiteBtn.classList.add("hidden");
    }
  }

  const emailBtn = document.getElementById("companyEmail");
  if (emailBtn) {
    if (c.email && String(c.email).trim()) {
      emailBtn.classList.remove("hidden");
      emailBtn.href = `mailto:${c.email}`;
      emailBtn.textContent = c.email;
    } else {
      emailBtn.classList.add("hidden");
    }
  }

  const badgeEl = document.getElementById("companyVerifiedBadge");
  const atWrap = document.getElementById("companyVerifiedAtWrap");
  const atEl = document.getElementById("companyVerifiedAt");
  const reportLink = document.getElementById("companyReportLink");

  if (badgeEl) {
    const isVerified = !!c.verified;
    badgeEl.textContent = isVerified ? `✅ ${t("profile.verified.yes")}` : `⚠️ ${t("profile.verified.no")}`;
    badgeEl.className =
      "inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border " +
      (isVerified ? "bg-green-50 text-green-800 border-green-200" : "bg-amber-50 text-amber-800 border-amber-200");
  }

  if (atWrap && atEl) {
    if (c.verified_at) {
      atWrap.classList.remove("hidden");
      atEl.textContent = c.verified_at;
    } else {
      atWrap.classList.add("hidden");
    }
  }

  if (reportLink) {
    const caseId = c.report && c.report.case_id ? c.report.case_id : "";
    if (c.verified && caseId) {
      reportLink.classList.remove("hidden");
      reportLink.href = `./report.html?case=${encodeURIComponent(caseId)}&lang=${encodeURIComponent(currentLang)}&id=${encodeURIComponent(c.id)}`;
    } else {
      reportLink.classList.add("hidden");
    }
  }

  if (notFound) notFound.classList.add("hidden");
  card.classList.remove("hidden");
}

async function renderReport() {
  const reportCard = document.getElementById("reportCard");
  if (!reportCard) return;

  const notFound = document.getElementById("reportNotFound");
  const backToProfile = document.getElementById("backToProfile");
  const btnPrint = document.getElementById("btnPrint");

  const caseId = getQueryParam("case");
  const id = getQueryParam("id");
  const data = await ensureData();

  if (backToProfile) {
    backToProfile.href = id
      ? `./profile.html?id=${encodeURIComponent(id)}&lang=${encodeURIComponent(currentLang)}`
      : `./index.html?lang=${encodeURIComponent(currentLang)}`;
  }

  const c = data.find(x => x.report && x.report.case_id === caseId);
  if (!c || !c.report) {
    if (notFound) notFound.classList.remove("hidden");
    reportCard.classList.add("hidden");
    return;
  }

  const r = c.report;

  const elCase = document.getElementById("reportCase");
  const elRisk = document.getElementById("reportRisk");
  const elConf = document.getElementById("reportConfidence");
  const elSum = document.getElementById("reportSummary");
  const elCon = document.getElementById("reportConclusion");
  const elHash = document.getElementById("reportHash");
  const elDis = document.getElementById("reportDisclaimer");

  if (elCase) elCase.textContent = `${r.case_id} • ${L(c.name)} • ${L(c.country)}`;
  if (elRisk) elRisk.textContent = r.risk_level || "—";
  if (elConf) elConf.textContent = r.confidence || "—";
  if (elSum) elSum.textContent = r.summary || "—";
  if (elCon) elCon.textContent = r.conclusion || "—";
  if (elHash) elHash.textContent = r.hash_sha256 || "—";
  if (elDis) elDis.textContent = r.disclaimer || "—";

  if (btnPrint) btnPrint.addEventListener("click", () => window.print());

  if (notFound) notFound.classList.add("hidden");
  reportCard.classList.remove("hidden");
}

function wireLangButtons() {
  const btnEn = document.getElementById("btnEn");
  const btnRu = document.getElementById("btnRu");
  if (btnEn) btnEn.addEventListener("click", () => setLang("en"));
  if (btnRu) btnRu.addEventListener("click", () => setLang("ru"));
}

function setYear() {
  const y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
}

function wireNavLinks() {
  const navDirectory = document.getElementById("navDirectory");
  const navProfile = document.getElementById("navProfile");
  const navReport = document.getElementById("navReport");
  if (!navDirectory && !navProfile && !navReport) return;

  const id = getQueryParam("id");
  const caseId = getQueryParam("case");

  if (navDirectory) navDirectory.href = `./index.html?lang=${encodeURIComponent(currentLang)}`;
  if (navProfile) {
    navProfile.href = id
      ? `./profile.html?id=${encodeURIComponent(id)}&lang=${encodeURIComponent(currentLang)}`
      : `./profile.html?lang=${encodeURIComponent(currentLang)}`;
  }
  if (navReport) {
    navReport.href = caseId
      ? `./report.html?case=${encodeURIComponent(caseId)}&lang=${encodeURIComponent(currentLang)}${id ? `&id=${encodeURIComponent(id)}` : ""}`
      : `./report.html?lang=${encodeURIComponent(currentLang)}`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  setYear();
  wireLangButtons();
  wireNavLinks();
  applyI18n();
  updateLangButtons();

  const qLang = getQueryParam("lang");
  if (qLang === "en" || qLang === "ru") {
    localStorage.setItem(STORAGE_LANG_KEY, qLang);
    currentLang = qLang;
    applyI18n();
    updateLangButtons();
    wireNavLinks();
  }

  if (document.getElementById("cards")) await renderIndex();
  if (document.getElementById("profileCard")) await renderProfile();
  if (document.getElementById("reportCard")) await renderReport();
});
