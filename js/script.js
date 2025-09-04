// -------------------- Hilfsfunktionen --------------------
const euro = (n) =>
  n == null ? "—" : n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

// Proportionale Berechnung: Monatsentgelt × (Wochenstunden / 39)
function berechneVerguetung(monatsentgelt, stunden) {
  return monatsentgelt * (stunden / 39);
}

function showAlert(msg, type = "info") {
  const el = document.getElementById("alert");
  el.textContent = msg;
  el.className = "";
  el.classList.add(type);
  el.classList.remove("hidden");
}

function hideAlert() {
  const el = document.getElementById("alert");
  el.textContent = "";
  el.className = "hidden";
}

function isMetaKey(key) {
  return key.startsWith("__");
}

// Standard-Gültigkeit, falls eine JSON kein __meta.valid_from mitliefert
const DEFAULT_VALID_FROM = {
  "2024": "2024-03-01",
  "2025": "2025-04-01"
};

// -------------------- Fallback-Daten für 2024 --------------------
const FALLBACK_TVOED_2024 = {
  "EG 15Ü": [6670.43, 7379.87, 8051.94, 8500.01, 8604.56, null],
  "EG 15":  [5504.00, 5863.92, 6265.40, 6813.49, 7377.29, 7748.20],
  "EG 14":  [5003.84, 5329.75, 5755.37, 6227.68, 6754.16, 7132.13],
  "EG 13":  [4628.76, 4985.95, 5392.57, 5834.04, 6353.53, 6635.44],
  "EG 12":  [4170.32, 4581.34, 5061.67, 5594.63, 6220.01, 6516.74],
  "EG 11":  [4032.38, 4410.41, 4765.62, 5151.01, 5678.44, 5975.19],
  "EG 10":  [3895.33, 4191.53, 4528.25, 4893.44, 5300.10, 5433.63],
  "EG 9c":  [3757.21, 4013.80, 4334.08, 4683.04, 5061.38, 5182.84],
  "EG 9b":  [3619.09, 3736.32, 4029.91, 4352.06, 4706.63, 5003.35],
  "EG 9a":  [3480.97, 3699.68, 3759.84, 3963.16, 4335.69, 4483.10],
  "EG 8":   [3281.44, 3486.59, 3628.68, 3770.54, 3922.69, 3995.85],
  "EG 7":   [3095.23, 3331.58, 3472.38, 3614.47, 3748.49, 3820.45],
  "EG 6":   [3042.04, 3236.55, 3372.94, 3507.92, 3640.49, 3708.02],
  "EG 5":   [2928.99, 3117.67, 3245.11, 3380.06, 3505.47, 3570.28],
  "EG 4":   [2802.62, 2993.55, 3153.75, 3253.48, 3353.20, 3411.60],
  "EG 3":   [2762.69, 2968.02, 3017.99, 3132.21, 3217.92, 3296.43],
  "EG 2Ü":  [2601.60, 2835.82, 2921.62, 3036.03, 3114.63, 3173.31],
  "EG 2":   [2582.16, 2784.28, 2834.67, 2906.58, 3064.63, 3229.97],
  "EG 1":   [null,     2355.52, 2388.86, 2430.55, 2469.42, 2569.47]
};

// -------------------- App-Logik --------------------
document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("gehaltsForm");
  const jahrSelect = document.getElementById("jahr");
  const gueltigkeit = document.getElementById("gueltigkeit");
  const egSelect = document.getElementById("eg");
  const stufeSelect = document.getElementById("stufe");
  const tabellenentgelt = document.getElementById("tabellenentgelt");
  const ergebnisFeld = document.getElementById("ergebnis");
  const hinweisFeld = document.getElementById("hinweis");
  const stundenInput = document.getElementById("stunden");

  let dataCache = {}; // Cache pro Jahr
  await loadYear(jahrSelect.value); // initial

  // Events
  jahrSelect.addEventListener("change", async () => {
    await loadYear(jahrSelect.value, true);
  });
  egSelect.addEventListener("change", updateAnzeigen);
  stufeSelect.addEventListener("change", updateAnzeigen);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const dataset = dataCache[jahrSelect.value];
    const eg = egSelect.value;
    const stufeIdx = Math.max(0, (parseInt(stufeSelect.value, 10) || 1) - 1);
    const monatsentgelt = getMonatsentgelt(dataset, eg, stufeIdx);
    const stunden = parseFloat(stundenInput.value);

    if (monatsentgelt == null) {
      ergebnisFeld.textContent = "Bitte wähle eine gültige Kombination aus Entgeltgruppe und Stufe.";
      return;
    }
    if (isNaN(stunden) || stunden < 0) {
      ergebnisFeld.textContent = "Bitte gib eine gültige Stundenzahl ein.";
      return;
    }

    const betrag = berechneVerguetung(monatsentgelt, stunden);
    ergebnisFeld.textContent = `Deine anteilige Grundvergütung (Monat) beträgt: ${euro(betrag)}.`;
    hinweisFeld.textContent = "Berechnung: Tabellenentgelt × (Wochenstunden ÷ 39)";
  });

  // --- Funktionen ---
  async function loadYear(year, resetSelection = false) {
    hideAlert();
    ergebnisFeld.textContent = "";
    hinweisFeld.textContent = "";

    if (!dataCache[year]) {
      try {
        const res = await fetch(`data/tvoed_${year}.json`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${res.statusText}`);
        dataCache[year] = await res.json();
        console.info(`tvoed_${year}.json geladen.`);
      } catch (err) {
        console.error(`Fehler beim Laden von data/tvoed_${year}.json:`, err);
        if (year === "2024") {
          dataCache[year] = FALLBACK_TVOED_2024;
          showAlert("Hinweis: 2024-Tabelle konnte nicht geladen werden. Es werden Fallback-Daten verwendet.", "info");
        } else {
          showAlert(`Hinweis: ${year}-Tabelle konnte nicht geladen werden.`, "warning");
          return; // ohne Daten kein Befüllen
        }
      }
    }

    // Gültigkeit anzeigen
    const meta = dataCache[year]?.__meta;
    const validFrom = meta?.valid_from || DEFAULT_VALID_FROM[year] || "";
    gueltigkeit.textContent = validFrom
      ? `Gültig ab: ${new Date(validFrom).toLocaleDateString("de-DE")}`
      : "";

    // Vorläufige Daten markieren (falls in JSON gesetzt)
    if (meta?.provisional) {
      showAlert(meta.note || "Vorläufige Daten für dieses Tarifjahr.", "warning");
    } else {
      hideAlert();
    }

    // Dropdowns befüllen
    fuelleEGs(dataCache[year]);
    fuelleStufen();

    if (resetSelection) {
      egSelect.selectedIndex = 0;
      stufeSelect.selectedIndex = 0;
    }

    updateAnzeigen();
  }

  function fuelleEGs(dataset) {
    egSelect.innerHTML = "";
    Object.keys(dataset)
      .filter((k) => !isMetaKey(k))
      .forEach((eg) => {
        const opt = document.createElement("option");
        opt.value = eg;
        opt.textContent = eg;
        egSelect.appendChild(opt);
      });
  }

  function fuelleStufen() {
    stufeSelect.innerHTML = "";
    for (let i = 1; i <= 6; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `Stufe ${i}`;
      stufeSelect.appendChild(opt);
    }
  }

  function getMonatsentgelt(dataset, eg, stufeIndex) {
    if (!dataset || !dataset[eg]) return null;
    return dataset[eg][stufeIndex] ?? null;
  }

  function updateAnzeigen() {
    ergebnisFeld.textContent = "";
    hinweisFeld.textContent = "";

    const dataset = dataCache[jahrSelect.value];
    const eg = egSelect.value;
    const stufeIdx = Math.max(0, (parseInt(stufeSelect.value, 10) || 1) - 1);
    const monatsentgelt = getMonatsentgelt(dataset, eg, stufeIdx);

    const tabellenentgelt = document.getElementById("tabellenentgelt");
    tabellenentgelt.textContent =
      monatsentgelt == null
        ? "Für die gewählte Kombination ist in der Tabelle kein Betrag ausgewiesen."
        : `${euro(monatsentgelt)} (Monat bei 39h/Woche)`;

    if (monatsentgelt == null) {
      hinweisFeld.textContent = "Bitte wähle eine gültige Kombination aus Entgeltgruppe und Stufe.";
    }
  }
});
