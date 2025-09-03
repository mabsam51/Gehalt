// Hilfsfunktionen
const euro = (n) =>
  n == null ? "—" : n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

function berechneVerguetung(monatsentgelt, stunden) {
  return (monatsentgelt * (stunden / 39));
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("gehaltsForm");
  const egSelect = document.getElementById("eg");
  const stufeSelect = document.getElementById("stufe");
  const tabellenentgelt = document.getElementById("tabellenentgelt");
  const ergebnisFeld = document.getElementById("ergebnis");
  const hinweisFeld = document.getElementById("hinweis");
  const stundenInput = document.getElementById("stunden");

  let tvoedData = {};

  // JSON laden
  fetch("data/tvoed_2024.json")
    .then((response) => response.json())
    .then((data) => {
      tvoedData = data;

      // EGs befüllen
      Object.keys(tvoedData).forEach((eg) => {
        const opt = document.createElement("option");
        opt.value = eg;
        opt.textContent = eg;
        egSelect.appendChild(opt);
      });

      // Stufen 1–6 befüllen
      for (let i = 1; i <= 6; i++) {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = `Stufe ${i}`;
        stufeSelect.appendChild(opt);
      }

      updateAnzeigen();
    });

  function getMonatsentgelt(eg, stufeIndex) {
    if (!tvoedData[eg]) return null;
    return tvoedData[eg][stufeIndex] ?? null;
  }

  function updateAnzeigen() {
    ergebnisFeld.textContent = "";
    hinweisFeld.textContent = "";

    const eg = egSelect.value;
    const stufeIdx = Math.max(0, (parseInt(stufeSelect.value, 10) || 1) - 1);
    const monatsentgelt = getMonatsentgelt(eg, stufeIdx);

    tabellenentgelt.textContent = monatsentgelt == null
      ? "Für die gewählte Kombination ist in der Tabelle kein Betrag ausgewiesen."
      : `${euro(monatsentgelt)} (Monat bei 39h/Woche)`;

    if (monatsentgelt == null) {
      hinweisFeld.textContent = "Bitte wähle eine gültige Kombination aus Entgeltgruppe und Stufe.";
    }
  }

  egSelect.addEventListener("change", updateAnzeigen);
  stufeSelect.addEventListener("change", updateAnzeigen);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const eg = egSelect.value;
    const stufeIdx = Math.max(0, (parseInt(stufeSelect.value, 10) || 1) - 1);
    const monatsentgelt = getMonatsentgelt(eg, stufeIdx);
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
});
