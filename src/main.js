import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";

const storageKey = "emcomm-dashboard-v1";
let storageState = "Local Saved";

const seedData = {
  settings: {
    callsign: "9M2PJU",
    operatorName: "Net Control Operator",
    organization: "Amateur Radio EmComm",
    netName: "District EmComm",
    tacticalCall: "Net Control",
    incidentName: "Local Emergency Net",
    location: "Kuala Lumpur",
    grid: "OJ03",
    primaryFrequency: "145.500 MHz",
    messagePrefix: "MSG",
    nextMessageNumber: 4,
    timezone: "Local",
    notes: "Use plain language, acknowledge all formal traffic, and keep an accurate log."
  },
  markers: [
    { id: crypto.randomUUID(), type: "station", name: "9M2PJU Net Control", lat: 3.139, lng: 101.6869, status: "available", note: "Primary control station" },
    { id: crypto.randomUUID(), type: "station", name: "9W2FIELD Mobile", lat: 3.126, lng: 101.675, status: "assigned", note: "Field team station" },
    { id: crypto.randomUUID(), type: "station", name: "9M4DIGI Winlink", lat: 3.148, lng: 101.698, status: "available", note: "Digital gateway station" },
    { id: crypto.randomUUID(), type: "repeater", name: "VHF Repeater", lat: 3.152, lng: 101.703, status: "online", note: "145.600 MHz -600 kHz tone 103.5" },
    { id: crypto.randomUUID(), type: "facility", name: "Relief Centre", lat: 3.12, lng: 101.66, status: "open", note: "Shelter and supplies" },
    { id: crypto.randomUUID(), type: "incident", name: "Flood Report", lat: 3.105, lng: 101.72, status: "urgent", note: "Road partially closed" }
  ],
  checkins: [
    { id: crypto.randomUUID(), callsign: "9M2PJU", role: "Net Control", status: "available", lastHeard: "Now" },
    { id: crypto.randomUUID(), callsign: "9W2FIELD", role: "Mobile", status: "assigned", lastHeard: "8 min" },
    { id: crypto.randomUUID(), callsign: "9M4DIGI", role: "Winlink", status: "available", lastHeard: "14 min" }
  ],
  frequencies: [
    { id: crypto.randomUUID(), name: "Primary Net", frequency: "145.500 MHz", mode: "FM Simplex", purpose: "Voice coordination", status: "Active" },
    { id: crypto.randomUUID(), name: "Backup Net", frequency: "433.500 MHz", mode: "FM Simplex", purpose: "Fallback channel", status: "Standby" },
    { id: crypto.randomUUID(), name: "Digital", frequency: "144.390 MHz", mode: "APRS", purpose: "Position reports", status: "Standby" }
  ],
  messages: [
    { id: crypto.randomUUID(), number: "MSG-001", priority: "Emergency", from: "9W2FIELD", to: "NET CONTROL", subject: "Medical transport needed", status: "Sent", handling: "Immediate", method: "Voice", frequency: "145.500 MHz", text: "MEDICAL TRANSPORT REQUESTED FOR ONE PATIENT", timeFiled: new Date().toISOString() },
    { id: crypto.randomUUID(), number: "MSG-002", priority: "Priority", from: "9M2PJU", to: "LOGISTICS", subject: "Need drinking water", status: "Acknowledged", handling: "Priority", method: "Voice", frequency: "145.500 MHz", text: "ADDITIONAL DRINKING WATER NEEDED AT RELIEF CENTRE", timeFiled: new Date().toISOString() },
    { id: crypto.randomUUID(), number: "MSG-003", priority: "Routine", from: "9M4DIGI", to: "ALL STATIONS", subject: "Operational period update", status: "Delivered", handling: "Routine", method: "Net broadcast", frequency: "145.500 MHz", text: "OPERATIONAL PERIOD UPDATE SENT TO ALL STATIONS", timeFiled: new Date().toISOString() }
  ],
  tasks: [
    { id: crypto.randomUUID(), title: "Confirm repeater backup power", assignee: "9M4DIGI", priority: "Priority", status: "Assigned", location: "Hill site" },
    { id: crypto.randomUUID(), title: "Survey flooded road", assignee: "9W2FIELD", priority: "Emergency", status: "In Progress", location: "Jalan Ampang" },
    { id: crypto.randomUUID(), title: "Prepare situation report", assignee: "9M2PJU", priority: "Routine", status: "Waiting", location: "Net Control" }
  ],
  readiness: [
    { id: crypto.randomUUID(), item: "Net Control Battery", status: "Ready", level: 92, note: "Laptop, handheld, power bank" },
    { id: crypto.randomUUID(), item: "Repeater Power", status: "Degraded", level: 58, note: "Battery only, generator pending" },
    { id: crypto.randomUUID(), item: "Message Forms", status: "Ready", level: 100, note: "Printed and digital copies" }
  ],
  log: []
};

function createIncidentData(settings = {}) {
  const mergedSettings = {
    ...seedData.settings,
    ...settings,
    incidentName: settings.incidentName || "New Incident",
    nextMessageNumber: Math.max(1, Number(settings.nextMessageNumber) || 1)
  };
  return {
    settings: mergedSettings,
    markers: [],
    checkins: [],
    frequencies: [
      {
        id: crypto.randomUUID(),
        name: "Primary Net",
        frequency: mergedSettings.primaryFrequency,
        mode: "FM Simplex",
        purpose: "Voice coordination",
        status: "Active"
      }
    ],
    messages: [],
    tasks: [],
    readiness: [],
    log: [{ time: new Date().toISOString(), text: `Incident workspace opened: ${mergedSettings.incidentName}` }]
  };
}

function createIaruMessageRecord(item, settings, activeFrequency) {
  const timeFiled = item.timeFiled || new Date().toISOString();
  const text = String(item.text || item.subject || "").trim();
  const from = String(item.from || item.stationOrigin || settings.callsign || "").trim().toUpperCase();
  const sentAt = item.sentAt || (trafficHasBeenSent(item.status) ? timeFiled : "");
  return {
    handling: item.priority || "Routine",
    method: item.method || "Voice",
    ...item,
    frequency: item.frequency || activeFrequency,
    text,
    timeFiled,
    stationOrigin: String(item.stationOrigin || from).trim().toUpperCase(),
    placeOrigin: String(item.placeOrigin || settings.location || "").trim().toUpperCase(),
    filingTime: item.filingTime || formatFilingTime(timeFiled),
    filingDate: item.filingDate || formatFilingDate(timeFiled),
    wordCount: Math.max(0, Number(item.wordCount) || countMessageWords(text)),
    from,
    to: String(item.to || "").trim().toUpperCase(),
    subject: item.subject || messageSummary(text),
    receivedAt: item.receivedAt || timeFiled,
    sentAt
  };
}

function cloneDemoData() {
  return {
    ...seedData,
    settings: { ...seedData.settings, nextMessageNumber: 4 },
    markers: seedData.markers.map((item) => ({ ...item, id: crypto.randomUUID() })),
    checkins: seedData.checkins.map((item) => ({ ...item, id: crypto.randomUUID() })),
    frequencies: seedData.frequencies.map((item) => ({ ...item, id: crypto.randomUUID() })),
    messages: seedData.messages.map((item) => createIaruMessageRecord(
      { ...item, id: crypto.randomUUID(), timeFiled: new Date().toISOString() },
      seedData.settings,
      seedData.settings.primaryFrequency
    )),
    tasks: seedData.tasks.map((item) => ({ ...item, id: crypto.randomUUID() })),
    readiness: seedData.readiness.map((item) => ({ ...item, id: crypto.randomUUID() })),
    log: [{ time: new Date().toISOString(), text: "Demo data loaded for training." }]
  };
}

let data = loadData();
let map;
let layerGroups = {};
let markerRefs = new Map();
let installPrompt;
let pendingRelocateMarkerId = null;
let pendingAddMarkerType = null;

function loadData() {
  const saved = readLocalData();
  if (!saved) {
    const incident = createIncidentData();
    writeLocalData(incident);
    return incident;
  }
  try {
    return migrateData(JSON.parse(saved));
  } catch (error) {
    const incident = createIncidentData({ notes: "Previous local data could not be read. Import a backup JSON if available." });
    incident.log.unshift({ time: new Date().toISOString(), text: `Local data recovery started: ${error.message}` });
    writeLocalData(incident);
    return incident;
  }
}

function migrateData(saved) {
  const frequencies = (saved.frequencies || seedData.frequencies).map((item, index) => ({
    status: index === 0 ? "Active" : "Standby",
    ...item
  }));
  const activeFrequency = frequencies.find((item) => item.status === "Active")?.frequency
    || saved.settings?.primaryFrequency
    || seedData.settings.primaryFrequency;
  const migrated = {
    ...seedData,
    ...saved,
    settings: { ...seedData.settings, ...(saved.settings || {}) },
    markers: saved.markers || seedData.markers,
    checkins: saved.checkins || seedData.checkins,
    frequencies,
    messages: (saved.messages || seedData.messages).map((item) => createIaruMessageRecord(
      item,
      { ...seedData.settings, ...(saved.settings || {}) },
      activeFrequency
    )),
    tasks: saved.tasks || seedData.tasks,
    readiness: saved.readiness || seedData.readiness,
    log: saved.log || []
  };
  writeLocalData(migrated);
  return migrated;
}

function saveData(action) {
  if (action) {
    data.log.unshift({ time: new Date().toISOString(), text: action });
    data.log = data.log.slice(0, 120);
  }
  writeLocalData(data);
  render();
}

function readLocalData() {
  try {
    storageState = "Local Saved";
    return window.localStorage.getItem(storageKey);
  } catch (error) {
    storageState = "Local Error";
    console.error("Browser local storage read failed", error);
    return null;
  }
}

function writeLocalData(value) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
    storageState = "Local Saved";
    return true;
  } catch (error) {
    storageState = "Local Error";
    console.error("Browser local storage write failed", error);
    alert("Local browser storage failed. Export your data now if possible, then check private browsing or browser storage settings.");
    return false;
  }
}

function removeLocalData() {
  try {
    window.localStorage.removeItem(storageKey);
    storageState = "Local Saved";
    return true;
  } catch (error) {
    storageState = "Local Error";
    console.error("Browser local storage delete failed", error);
    alert("Local browser storage delete failed. Check private browsing or browser storage settings.");
    return false;
  }
}

function downloadText(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function toCsv(headers, rows) {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ].join("\n");
}

function exportCsvPackage() {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const sections = [
    `# ${data.settings.incidentName} EmComm Dashboard CSV Export`,
    `# Exported ${formatUtcTime(new Date().toISOString())}`,
    "",
    "[messages]",
    toCsv(["number", "precedence", "station_of_origin", "word_count_check", "place_of_origin", "filing_time", "filing_date", "frequency", "to", "from", "message", "status", "operator", "utc_created", "local_created"], data.messages.map((item) => ({
      number: item.number,
      precedence: item.priority,
      station_of_origin: item.stationOrigin,
      word_count_check: item.wordCount,
      place_of_origin: item.placeOrigin,
      filing_time: item.filingTime,
      filing_date: item.filingDate,
      frequency: item.frequency,
      to: item.to,
      from: item.from,
      message: item.text,
      status: item.status,
      operator: item.operator,
      utc_created: formatUtcTime(item.timeFiled),
      local_created: formatLocalTime(item.timeFiled)
    }))),
    "",
    "[stations]",
    toCsv(["callsign", "role", "status", "lastHeard"], data.checkins),
    "",
    "[frequencies]",
    toCsv(["name", "frequency", "mode", "purpose", "status"], data.frequencies),
    "",
    "[tasks]",
    toCsv(["title", "assignee", "priority", "status", "location"], data.tasks),
    "",
    "[mapMarkers]",
    toCsv(["type", "name", "lat", "lng", "status", "note"], data.markers),
    "",
    "[readiness]",
    toCsv(["item", "status", "level", "note"], data.readiness),
    "",
    "[log]",
    toCsv(["utc", "local", "event"], data.log.map((item) => ({
      utc: formatUtcTime(item.time),
      local: formatLocalTime(item.time),
      event: item.text
    })))
  ];
  downloadText(`emcomm-dashboard-${stamp}.csv`, sections.join("\n"), "text/csv");
}

function printOperationalLog() {
  const rows = data.log.map((item) => `
    <tr>
      <td>${escapeHtml(formatUtcTime(item.time))}</td>
      <td>${escapeHtml(formatLocalTime(item.time))}</td>
      <td>${escapeHtml(item.text)}</td>
    </tr>
  `).join("");
  const printWindow = window.open("", "emcomm-log-print");
  if (!printWindow) return;
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(data.settings.incidentName)} Operational Log</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .meta { margin-bottom: 16px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #555; padding: 6px; text-align: left; vertical-align: top; }
          th { background: #eee; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(data.settings.incidentName)} Operational Log</h1>
        <div class="meta">
          Net: ${escapeHtml(data.settings.netName)} |
          Control: ${escapeHtml(data.settings.callsign)} |
          Operator: ${escapeHtml(data.settings.operatorName)} |
          Exported: ${escapeHtml(formatUtcTime(new Date().toISOString()))}
        </div>
        <table>
          <thead><tr><th>UTC</th><th>Local</th><th>Event</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function iaruMessageHtml(message) {
  const precedence = ["Routine", "Priority", "Emergency"];
  const currentPrecedence = String(message.priority || "Routine");
  const text = String(message.text || message.subject || "").trim();
  const wordCount = message.wordCount || countMessageWords(text);
  const operatorCallsign = String(data.settings.callsign || message.operator || "").trim().toUpperCase();
  const receivedDate = formatFilingDate(message.receivedAt || message.timeFiled);
  const receivedTime = formatFilingTime(message.receivedAt || message.timeFiled);
  const sentDate = message.sentAt ? formatFilingDate(message.sentAt) : "";
  const sentTime = message.sentAt ? formatFilingTime(message.sentAt) : "";
  const sentAddress = formatTrafficAddress(message.to);
  const iaruLogoUrl = assetUrl("iaru-logo.png");
  const messageLines = Array.from({ length: 4 }, (_, index) => {
    const line = text.split(/\n/)[index] || (index === 0 ? text : "");
    return `<div>${escapeHtml(line)}</div>`;
  }).join("");
  return `
    <section class="iaru-form" aria-label="IARU message form">
      <div class="iaru-title-row">
        <h1>MESSAGE</h1>
        <img class="iaru-logo" src="${escapeHtml(iaruLogoUrl)}" alt="IARU logo">
      </div>
      <table class="iaru-header-table">
        <tr>
          <th>NUMBER</th>
          <th>PRECEDENCE</th>
          <th>STATION OF<br>ORIGIN</th>
          <th>WORD COUNT<br>(CHECK)</th>
          <th>PLACE OF ORIGIN</th>
          <th>FILING TIME</th>
          <th>FILING DATE</th>
        </tr>
        <tr>
          <td>${escapeHtml(message.number)}</td>
          <td>
            ${precedence.map((item) => `<div class="iaru-check">${item === currentPrecedence ? "[x]" : "[ ]"} ${escapeHtml(item)}</div>`).join("")}
          </td>
          <td>${escapeHtml(message.stationOrigin || message.from)}</td>
          <td>${escapeHtml(wordCount)}</td>
          <td>${escapeHtml(message.placeOrigin || data.settings.location)}</td>
          <td>${escapeHtml(message.filingTime || formatFilingTime(message.timeFiled))}</td>
          <td>${escapeHtml(message.filingDate || formatFilingDate(message.timeFiled))}</td>
        </tr>
      </table>
      <div class="iaru-line-field">
        <span><strong>To:</strong> (BLOCK LETTERS):</span>
        <div>${escapeHtml(sentAddress)}</div>
      </div>
      <div class="iaru-message-lines">${messageLines}</div>
      <div class="iaru-double-line"></div>
      <div class="iaru-line-field">
        <span><strong>From:</strong> (BLOCK LETTERS):</span>
        <div>${escapeHtml(message.from)}</div>
      </div>
      <div class="iaru-double-line"></div>
      <div class="iaru-operator-title">For radio operator use only:</div>
      <div class="iaru-operator-grid">
        <table>
          <tr>
            <th>RECEIVED FROM</th>
            <th>DATE</th>
            <th>TIME</th>
          </tr>
          <tr>
            <td>${escapeHtml(operatorCallsign)}</td>
            <td>${escapeHtml(receivedDate)}</td>
            <td>${escapeHtml(receivedTime)}</td>
          </tr>
        </table>
        <table>
          <tr>
            <th>SENT TO</th>
            <th>DATE</th>
            <th>TIME</th>
          </tr>
          <tr>
            <td>${escapeHtml(sentAddress)}</td>
            <td>${escapeHtml(sentDate)}</td>
            <td>${escapeHtml(sentTime)}</td>
          </tr>
        </table>
      </div>
    </section>
  `;
}

function iaruPrintStyles() {
  return `
    body { margin: 0; padding: 8mm 9mm; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; }
    .iaru-form { max-width: 190mm; margin: 0 auto; }
    .iaru-title-row { position: relative; min-height: 62px; margin-bottom: 4px; }
    .iaru-title-row h1 { margin: 0; padding-top: 4px; font-size: 25px; font-weight: 500; letter-spacing: 0; text-align: center; }
    .iaru-logo { position: absolute; top: 0; right: 17mm; width: 42px; height: 58px; object-fit: contain; }
    .iaru-header-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px; }
    .iaru-header-table th, .iaru-header-table td { border: 1px solid #111; padding: 4px; vertical-align: top; height: 54px; }
    .iaru-header-table th:nth-child(1) { width: 9%; }
    .iaru-header-table th:nth-child(2) { width: 16%; }
    .iaru-header-table th:nth-child(3) { width: 15%; }
    .iaru-header-table th:nth-child(4) { width: 14%; }
    .iaru-header-table th:nth-child(5) { width: 21%; }
    .iaru-header-table th:nth-child(6) { width: 12%; }
    .iaru-header-table th:nth-child(7) { width: 13%; }
    .iaru-header-table th { color: #5f7378; text-align: center; font-size: 11px; line-height: 1.08; }
    .iaru-check { white-space: nowrap; font-size: 10px; line-height: 1.35; }
    .iaru-line-field { margin-top: 6px; font-size: 13px; }
    .iaru-line-field span { font-size: 10px; }
    .iaru-line-field div { min-height: 24px; border-bottom: 1px solid #111; padding: 6px 0 3px; font-size: 14px; letter-spacing: 0; }
    .iaru-message-lines { margin-top: 4px; }
    .iaru-message-lines div { min-height: 34px; border-bottom: 1px solid #111; padding: 8px 0 3px; font-size: 14px; }
    .iaru-double-line { height: 4px; margin-top: 2px; border-top: 1px solid #111; border-bottom: 1px solid #111; }
    .iaru-operator-title { margin-top: 4px; font-size: 16px; font-weight: 400; }
    .iaru-operator-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 52px; margin-top: 4px; }
    .iaru-operator-grid table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px; }
    .iaru-operator-grid th, .iaru-operator-grid td { border: 1px solid #111; height: 20px; padding: 3px; text-align: center; font-weight: 400; }
    .iaru-operator-grid th:first-child { width: 39%; }
    @page { size: A4; margin: 10mm; }
  `;
}

function formatTrafficAddress(value) {
  const rawValue = String(value || "").trim().toUpperCase();
  const tacticalCall = String(data.settings.tacticalCall || "").trim().toUpperCase();
  const netControlNames = new Set(["NET CONTROL", "NCS", tacticalCall].filter(Boolean));
  if (netControlNames.has(rawValue)) {
    return netControlIdentity();
  }
  return rawValue;
}

function netControlIdentity() {
  return [data.settings.callsign, data.settings.tacticalCall]
    .filter(Boolean)
    .join(" ")
    .trim()
    .toUpperCase();
}

function trafficHasBeenSent(status) {
  return ["Sent", "Acknowledged", "Delivered"].includes(String(status || ""));
}

function openMessageDetail(messageId) {
  const message = data.messages.find((item) => item.id === messageId);
  if (!message) return;
  const dialog = document.getElementById("messageDialog");
  document.getElementById("messageDialogTitle").textContent = `${message.number} IARU Message`;
  document.getElementById("messageDialogBody").innerHTML = `${messageTrafficSummary(message)}${iaruMessageHtml(message)}`;
  document.getElementById("printMessageDialog").dataset.messageId = messageId;
  dialog.showModal();
}

function messageTrafficSummary(message) {
  return `
    <div class="traffic-context">
      <article>
        <span>Net Control</span>
        <strong>${escapeHtml(netControlIdentity())}</strong>
      </article>
      <article>
        <span>Origin Station</span>
        <strong>${escapeHtml(message.stationOrigin || message.from)}</strong>
      </article>
      <article>
        <span>Addressee</span>
        <strong>${escapeHtml(formatTrafficAddress(message.to))}</strong>
      </article>
      <article>
        <span>Signature</span>
        <strong>${escapeHtml(message.from)}</strong>
      </article>
      <article>
        <span>Frequency</span>
        <strong>${escapeHtml(message.frequency || activeFrequencyLabel())}</strong>
      </article>
      <article>
        <span>Status</span>
        <strong>${escapeHtml(message.status)}</strong>
      </article>
    </div>
  `;
}

function printIaruMessage(messageId) {
  const message = data.messages.find((item) => item.id === messageId);
  if (!message) return;
  const printWindow = window.open("", `iaru-message-${message.number}`);
  if (!printWindow) return;
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(message.number)} IARU Message</title>
        <style>${iaruPrintStyles()}</style>
      </head>
      <body>${iaruMessageHtml(message)}</body>
    </html>
  `);
  printWindow.document.close();
  const runPrint = () => {
    printWindow.focus();
    printWindow.print();
  };
  const logo = printWindow.document.querySelector(".iaru-logo");
  if (logo && !logo.complete) {
    logo.addEventListener("load", runPrint, { once: true });
    logo.addEventListener("error", runPrint, { once: true });
    return;
  }
  runPrint();
}

function assetUrl(path) {
  const cleanPath = String(path).replace(/^\/+/, "");
  const base = new URL(import.meta.env.BASE_URL || "./", window.location.href);
  return new URL(cleanPath, base).href;
}

function validatedImport(rawData) {
  const imported = migrateData(rawData);
  if (!Array.isArray(imported.messages) || !Array.isArray(imported.log)) {
    throw new Error("Invalid dashboard data file.");
  }
  return imported;
}

function markerColor(type, customColor) {
  return sanitizeMarkerColor(customColor) || {
    station: "#30c48d",
    repeater: "#69a7ff",
    incident: "#ef6a61",
    facility: "#f0bd4f"
  }[type] || "#eef6f4";
}

function sanitizeMarkerColor(value) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "";
}

function markerIcon(type, customColor) {
  return L.divIcon({
    className: "custom-marker",
    html: `<span style="background:${markerColor(type, customColor)}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

function markerLabel(item) {
  const name = String(item.name || "").trim();
  if (item.type !== "station") return name;
  return name.split(/\s+/)[0] || name;
}

function initMap() {
  if (!L) {
    document.getElementById("map").classList.add("map-fallback");
    return;
  }

  document.getElementById("map").classList.remove("map-fallback");
  document.getElementById("map").innerHTML = "";
  map = L.map("map", { zoomControl: false }).setView([3.139, 101.6869], 11);
  L.control.zoom({ position: "topright" }).addTo(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  ["stations", "repeaters", "incidents", "facilities"].forEach((layer) => {
    layerGroups[layer] = L.layerGroup().addTo(map);
  });

  document.querySelectorAll(".layer-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const layer = button.dataset.layer;
      button.classList.toggle("active");
      if (map.hasLayer(layerGroups[layer])) {
        map.removeLayer(layerGroups[layer]);
      } else {
        layerGroups[layer].addTo(map);
      }
    });
  });

  map.on("contextmenu", (event) => {
    if (pendingRelocateMarkerId || pendingAddMarkerType) return;
    openStationMarkerDialog(event.latlng.lat, event.latlng.lng);
  });

  map.on("click", (event) => {
    if (pendingRelocateMarkerId) {
      relocateMapMarker(pendingRelocateMarkerId, event.latlng);
      return;
    }
    if (pendingAddMarkerType) {
      addMapMarkerAt(pendingAddMarkerType, event.latlng);
      setAddMarkerMode(null);
      return;
    }
    hideStationContextMenu();
  });

  map.on("movestart zoomstart", hideStationContextMenu);
}

function renderMap() {
  document.getElementById("mapSummary").innerHTML = data.markers.length ? data.markers.slice(0, 4).map((item) => `
    <article>
      <span class="fallback-dot" style="background:${markerColor(item.type, item.color)}"></span>
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.type)} · ${escapeHtml(item.status || "")}</span>
      </div>
    </article>
  `).join("") : `<article><div><strong>No markers</strong><span>Add stations, incidents, facilities, or repeaters.</span></div></article>`;

  if (!map) {
    document.getElementById("map").innerHTML = `
      <div class="fallback-map-grid">
        ${data.markers.map((item) => `
          <article>
            <span class="fallback-dot" style="background:${markerColor(item.type, item.color)}"></span>
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <span class="meta">${escapeHtml(item.type)} · ${escapeHtml(item.status || "")}</span>
              <span class="muted">${Number(item.lat).toFixed(5)}, ${Number(item.lng).toFixed(5)}</span>
            </div>
          </article>
        `).join("")}
      </div>
    `;
    return;
  }

  Object.values(layerGroups).forEach((group) => group.clearLayers());
  markerRefs = new Map();
  data.markers.forEach((item) => {
    const groupName = `${item.type}s`;
    const group = layerGroups[groupName] || layerGroups.incidents;
    const marker = L.marker([item.lat, item.lng], { icon: markerIcon(item.type, item.color) })
      .bindPopup(`<strong>${escapeHtml(item.name)}</strong><br>${escapeHtml(item.status || item.type)}<br>${escapeHtml(item.note || "")}<br><span>${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}</span>`)
      .bindTooltip(escapeHtml(markerLabel(item)), {
        permanent: true,
        direction: "right",
        offset: [12, 0],
        opacity: 1,
        className: `marker-label ${item.type === "station" ? "station-label" : ""}`
      })
      .addTo(group);

    marker.on("contextmenu", (event) => {
      L.DomEvent.stop(event);
      showMapMarkerContextMenu(item, event.latlng);
    });

    markerRefs.set(item.id, marker);
  });
}

function normalizeStationKey(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function findMarkerForMessage(message) {
  if (!message) return null;
  const fromKey = normalizeStationKey(message.from);
  if (!fromKey) return null;
  const stationMarkers = data.markers.filter((item) => item.type === "station");
  return findMarkerByName(stationMarkers, fromKey) || findMarkerByName(data.markers, fromKey);
}

function findMarkerByName(markers, fromKey) {
  return markers.find((item) => {
    const nameKey = normalizeStationKey(item.name);
    const firstToken = nameKey.split(" ")[0];
    return nameKey === fromKey || firstToken === fromKey || nameKey.includes(fromKey) || fromKey.includes(nameKey);
  });
}

function focusMessageStation(messageId) {
  const message = data.messages.find((item) => item.id === messageId);
  const markerData = findMarkerForMessage(message);
  if (!markerData || !map) return;
  const groupName = `${markerData.type}s`;
  const group = layerGroups[groupName] || layerGroups.incidents;
  if (!map.hasLayer(group)) {
    group.addTo(map);
    document.querySelector(`.layer-toggle[data-layer="${groupName}"]`)?.classList.add("active");
  }
  hideStationContextMenu();
  pendingRelocateMarkerId = null;
  clearRelocateBanner();
  map.flyTo([markerData.lat, markerData.lng], Math.max(map.getZoom(), 15), { duration: 0.5 });
  markerRefs.get(markerData.id)?.openPopup();
}

function showMapMarkerContextMenu(marker, latlng) {
  hideStationContextMenu();
  const point = map.latLngToContainerPoint(latlng);
  const menu = document.createElement("div");
  menu.className = "station-context-menu";
  menu.id = "stationContextMenu";
  menu.style.left = `${Math.max(8, point.x)}px`;
  menu.style.top = `${Math.max(8, point.y)}px`;
  menu.innerHTML = `
    <strong>${escapeHtml(marker.name)}</strong>
    <span>${escapeHtml(marker.type)} marker</span>
    <button data-action="start-relocate-marker" data-id="${escapeHtml(marker.id)}">Relocate</button>
    <button data-action="edit-map-marker" data-id="${escapeHtml(marker.id)}">Edit</button>
    <button data-delete="map-marker" data-id="${escapeHtml(marker.id)}">Trash</button>
    <button data-action="close-station-menu">Cancel</button>
  `;
  document.querySelector(".map-panel").appendChild(menu);
}

function hideStationContextMenu() {
  document.getElementById("stationContextMenu")?.remove();
}

function setRelocateBanner(marker) {
  clearRelocateBanner();
  const banner = document.createElement("div");
  banner.className = "relocate-banner";
  banner.id = "relocateBanner";
  banner.innerHTML = `
    <strong>Relocating ${escapeHtml(marker.name)}</strong>
    <span>Click the new map position.</span>
    <button data-action="cancel-relocate-marker">Cancel</button>
  `;
  document.querySelector(".map-panel").appendChild(banner);
}

function clearRelocateBanner() {
  document.getElementById("relocateBanner")?.remove();
}

function relocateMapMarker(id, latlng) {
  const marker = data.markers.find((item) => item.id === id);
  if (!marker) return;
  marker.lat = Number(latlng.lat);
  marker.lng = Number(latlng.lng);
  marker.note = marker.note ? `${marker.note} | Relocated ${formatUtcTime(new Date().toISOString())}` : `Relocated ${formatUtcTime(new Date().toISOString())}`;
  pendingRelocateMarkerId = null;
  clearRelocateBanner();
  saveData(`Map marker relocated: ${marker.name}`);
}

function setAddMarkerMode(type) {
  pendingAddMarkerType = type;
  document.getElementById("addEventOnMap")?.classList.toggle("active", type === "incident");
}

function addMapMarkerAt(type, latlng) {
  const timeLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const marker = {
    id: crypto.randomUUID(),
    type,
    name: `${type === "incident" ? "EVENT" : type.toUpperCase()} ${timeLabel}`,
    lat: Number(latlng.lat),
    lng: Number(latlng.lng),
    status: defaultMarkerStatus(type),
    color: markerColor(type),
    note: "Added by map click"
  };
  data.markers.push(marker);
  saveData(`Map ${type} added: ${marker.name}`);
}

function render() {
  renderMap();
  renderSettings();
  document.getElementById("stationCount").textContent = stationMarkerCount();
  document.getElementById("urgentCount").textContent = data.messages.filter((m) => m.priority === "Emergency").length;
  document.getElementById("openTaskCount").textContent = data.tasks.filter((t) => t.status !== "Done").length;
  document.getElementById("onlineState").textContent = storageState;
  renderCheckins();
  renderFrequencies();
  renderMessages();
  renderTasks();
  renderStations();
  renderReadiness();
  renderLog();
}

function stationMarkerCount() {
  return data.markers.filter((item) => item.type === "station").length;
}

function renderSettings() {
  const settings = data.settings;
  document.getElementById("appTitle").textContent = `${settings.callsign} EmComm Dashboard`;
  document.getElementById("netName").textContent = settings.netName;
  document.getElementById("netControl").textContent = settings.callsign;
  document.getElementById("settingsGrid").innerHTML = [
    ["Callsign", settings.callsign],
    ["Operator", settings.operatorName],
    ["Organization", settings.organization],
    ["Tactical Call", settings.tacticalCall],
    ["Incident", settings.incidentName],
    ["Location", settings.location],
    ["Grid", settings.grid],
    ["Primary Frequency", settings.primaryFrequency],
    ["Message Prefix", settings.messagePrefix],
    ["Next Message", String(settings.nextMessageNumber).padStart(3, "0")],
    ["Clock", settings.timezone],
    ["Notes", settings.notes]
  ].map(([label, value]) => `
    <article>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join("");
}

function renderCheckins() {
  document.getElementById("checkinList").innerHTML = data.checkins.length ? data.checkins.map((item) => `
    <li>
      <strong>${escapeHtml(item.callsign)}</strong>
      <div class="record-fields">
        <span><b>Role</b>${escapeHtml(item.role)}</span>
        <span><b>Last heard</b>${escapeHtml(item.lastHeard)}</span>
        <span><b>Status</b><span class="badge ${item.status}">${escapeHtml(item.status)}</span></span>
      </div>
    </li>
  `).join("") : `<li><strong>No stations checked in</strong><span class="meta">Use Check In when stations join the net.</span></li>`;
}

function renderFrequencies() {
  document.getElementById("frequencyList").innerHTML = data.frequencies.length ? data.frequencies.map((item) => `
    <article class="frequency-card">
      <div>
        <strong>${escapeHtml(item.frequency)}</strong>
        <span class="meta">${escapeHtml(item.name)} · ${escapeHtml(item.mode)} · <span class="badge ${item.status.toLowerCase()}">${escapeHtml(item.status)}</span></span>
        <span class="muted">${escapeHtml(item.purpose)}</span>
      </div>
      <div class="card-actions">
        <button data-action="activate-frequency" data-id="${item.id}" title="Set active">Set</button>
        <button data-action="edit-frequency" data-id="${item.id}" title="Edit frequency">Edit</button>
        <button data-action="cancel-frequency" data-id="${item.id}" title="Cancel frequency">Cancel</button>
        <button data-delete="frequency" data-id="${item.id}" title="Delete frequency">×</button>
      </div>
    </article>
  `).join("") : `<article class="frequency-card"><strong>No frequencies</strong><span class="muted">Add the active net frequency before logging traffic.</span></article>`;
}

function renderMessages() {
  document.getElementById("messageWorkflowSummary").innerHTML = `
    <article>
      <span>Net Control</span>
      <strong>${escapeHtml(netControlIdentity())}</strong>
    </article>
    <article>
      <span>Operator</span>
      <strong>${escapeHtml(data.settings.operatorName)}</strong>
    </article>
    <article>
      <span>Active Frequency</span>
      <strong>${escapeHtml(activeFrequencyLabel())}</strong>
    </article>
    <article>
      <span>Next Message</span>
      <strong>${escapeHtml(nextMessageNumber())}</strong>
    </article>
  `;
  document.getElementById("messageTable").innerHTML = data.messages.length ? data.messages.map((item) => `
    <tr class="message-row ${findMarkerForMessage(item) ? "has-map-target" : ""}" data-message-id="${escapeHtml(item.id)}">
      <td>${escapeHtml(item.number)}</td>
      <td>${escapeHtml(item.filingDate || formatFilingDate(item.timeFiled))}</td>
      <td>${escapeHtml(item.filingTime || formatFilingTime(item.timeFiled))}</td>
      <td><span class="badge ${item.priority.toLowerCase()}">${escapeHtml(item.priority)}</span></td>
      <td>${escapeHtml(item.stationOrigin || item.from)}</td>
      <td>${escapeHtml(item.wordCount || countMessageWords(item.text))}</td>
      <td>${escapeHtml(item.frequency || activeFrequencyLabel())}</td>
      <td>${escapeHtml(formatTrafficAddress(item.to))}</td>
      <td>${escapeHtml(item.from)}</td>
      <td>${escapeHtml(messageSummary(item.text || item.subject))}</td>
      <td>${escapeHtml(item.status)}</td>
      <td>
        <div class="table-actions">
          <button data-action="edit-message" data-id="${item.id}">Edit</button>
          <button data-action="open-message" data-id="${item.id}">IARU</button>
          <button data-action="advance-message" data-id="${item.id}">Next</button>
          <button data-action="cancel-message" data-id="${item.id}">Cancel</button>
          <button data-delete="message" data-id="${item.id}">Trash</button>
        </div>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="12" class="empty-cell">No formal traffic logged.</td></tr>`;
}

function renderTasks() {
  const statuses = ["Assigned", "In Progress", "Waiting", "Done"];
  document.getElementById("taskBoard").innerHTML = statuses.map((status) => `
    <section class="task-column">
      <h3>${status}</h3>
      <div class="task-list">
        ${data.tasks.filter((task) => task.status === status).length ? data.tasks.filter((task) => task.status === status).map((task) => `
          <article class="task-card">
            <strong>${escapeHtml(task.title)}</strong>
            <span class="badge ${task.priority.toLowerCase()}">${escapeHtml(task.priority)}</span>
            <span class="meta">${escapeHtml(task.assignee)} · ${escapeHtml(task.location)}</span>
            <div class="card-actions">
              <button data-action="edit-task" data-id="${task.id}">Edit</button>
              <button data-delete="task" data-id="${task.id}">Trash</button>
            </div>
          </article>
        `).join("") : `<article class="task-card empty-card"><span class="meta">No ${escapeHtml(status.toLowerCase())} tasks.</span></article>`}
      </div>
    </section>
  `).join("");
}

function renderStations() {
  document.getElementById("stationDirectory").innerHTML = data.checkins.length ? data.checkins.map((item) => `
    <article class="station-card">
      <strong>${escapeHtml(item.callsign)}</strong>
      <div class="record-fields">
        <span><b>Role</b>${escapeHtml(item.role)}</span>
        <span><b>Last heard</b>${escapeHtml(item.lastHeard)}</span>
        <span><b>Status</b><span class="badge ${item.status}">${escapeHtml(item.status)}</span></span>
      </div>
      <div class="card-actions">
        <button data-action="edit-station" data-id="${item.id}">Edit</button>
        <button data-delete="station" data-id="${item.id}">Trash</button>
      </div>
    </article>
  `).join("") : `<article class="station-card empty-card"><strong>No station records</strong><span class="meta">Add stations as they check in.</span></article>`;
}

function renderReadiness() {
  document.getElementById("readinessGrid").innerHTML = data.readiness.length ? data.readiness.map((item) => `
    <article class="readiness-card">
      <strong>${escapeHtml(item.item)}</strong>
      <span class="badge ${item.status.toLowerCase()}">${escapeHtml(item.status)}</span>
      <span class="meta">${escapeHtml(item.note)}</span>
      <div class="readiness-meter"><span style="width:${Number(item.level) || 0}%"></span></div>
      <div class="card-actions">
        <button data-action="edit-readiness" data-id="${item.id}">Edit</button>
        <button data-delete="readiness" data-id="${item.id}">Trash</button>
      </div>
    </article>
  `).join("") : `<article class="readiness-card empty-card"><strong>No readiness items</strong><span class="meta">Track power, antennas, forms, gateways, and backups.</span></article>`;
}

function renderLog() {
  document.getElementById("eventLog").innerHTML = data.log.length ? data.log.map((item) => `
    <li>
      <strong>${new Date(item.time).toLocaleString()}</strong>
      <span class="meta">${escapeHtml(item.text)}</span>
    </li>
  `).join("") : `<li><strong>No log entries</strong><span class="meta">Operational events appear here as work is recorded.</span></li>`;
}

function fieldsToHtml(fields) {
  return fields.map((field) => {
    const value = field.value == null ? "" : String(field.value);
    const required = field.required === false ? "" : "required";
    const help = field.help ? `<span class="field-help">${escapeHtml(field.help)}</span>` : "";
    if (field.type === "select") {
      return `<label>${field.label}${help}<select name="${field.name}" ${required}>${field.options.map((option) => `<option ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></label>`;
    }
    if (field.type === "textarea") {
      return `<label>${field.label}${help}<textarea name="${field.name}" ${required}>${escapeHtml(value)}</textarea></label>`;
    }
    const step = field.type === "number" ? `step="${field.step || "any"}"` : "";
    return `<label>${field.label}${help}<input name="${field.name}" type="${field.type || "text"}" value="${escapeAttribute(value)}" ${step} ${required}></label>`;
  }).join("");
}

function openEntry(title, fields, onSave, saveLabel = "Save") {
  const dialog = document.getElementById("entryDialog");
  const form = document.getElementById("entryForm");
  document.getElementById("dialogTitle").textContent = title;
  document.getElementById("dialogFields").innerHTML = fieldsToHtml(fields);
  bindMessageWordCount(form);
  document.getElementById("saveDialog").textContent = saveLabel;
  document.getElementById("cancelDialog").onclick = () => dialog.close();
  form.onsubmit = (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());
    onSave(formData);
    dialog.close();
  };
  dialog.showModal();
}

function bindMessageWordCount(form) {
  const text = form.querySelector('[name="text"]');
  const wordCount = form.querySelector('[name="wordCount"]');
  if (!text || !wordCount) return;
  const sync = () => {
    wordCount.value = countMessageWords(text.value);
  };
  text.addEventListener("input", sync);
  sync();
}

function frequencyFields(item = {}) {
  return [
    { label: "Name", name: "name", value: item.name },
    { label: "Frequency", name: "frequency", value: item.frequency },
    { label: "Mode", name: "mode", value: item.mode },
    { label: "Purpose", name: "purpose", value: item.purpose },
    { label: "Status", name: "status", type: "select", value: item.status || "Standby", options: ["Active", "Standby", "Canceled"] }
  ];
}

function stationCheckinFields(item = {}) {
  return [
    { label: "Callsign", name: "callsign", value: item.callsign },
    { label: "Role", name: "role", value: item.role },
    { label: "Status", name: "status", type: "select", value: item.status || "available", options: ["available", "assigned", "mobile", "offline"] },
    { label: "Last heard", name: "lastHeard", value: item.lastHeard || "Now" }
  ];
}

function taskFields(item = {}) {
  return [
    { label: "Task", name: "title", value: item.title },
    { label: "Assignee", name: "assignee", value: item.assignee },
    { label: "Priority", name: "priority", type: "select", value: item.priority || "Routine", options: ["Routine", "Priority", "Emergency"] },
    { label: "Status", name: "status", type: "select", value: item.status || "Assigned", options: ["Assigned", "In Progress", "Waiting", "Done"] },
    { label: "Location", name: "location", value: item.location }
  ];
}

function readinessFields(item = {}) {
  return [
    { label: "Item", name: "item", value: item.item },
    { label: "Status", name: "status", type: "select", value: item.status || "Ready", options: ["Ready", "Degraded", "Unavailable"] },
    { label: "Level 0-100", name: "level", type: "number", value: item.level ?? 100 },
    { label: "Note", name: "note", type: "textarea", value: item.note }
  ];
}

function messageFields(item = {}) {
  const stationOptions = stationCallsignOptions();
  const selectedFrom = stationOptions.includes(String(item.from || "").toUpperCase()) ? String(item.from).toUpperCase() : stationOptions[0];
  const selectedOrigin = stationOptions.includes(String(item.stationOrigin || "").toUpperCase())
    ? String(item.stationOrigin).toUpperCase()
    : selectedFrom;
  const filingSource = item.timeFiled || new Date();
  return [
    { label: "Message number", name: "number", value: item.number || nextMessageNumber(), help: "Unique local traffic number printed in the IARU NUMBER box." },
    { label: "Precedence", name: "priority", type: "select", value: item.priority || "Routine", options: ["Routine", "Priority", "Emergency"], help: "Use Emergency only for immediate life or safety traffic." },
    { label: "Origin station callsign", name: "stationOrigin", type: "select", value: selectedOrigin, options: stationOptions, help: "Radio station where this formal message entered the net." },
    { label: "Word count check", name: "wordCount", type: "number", value: item.wordCount || countMessageWords(item.text || item.subject || ""), help: "Auto-counted from message text; used to verify copied traffic." },
    { label: "Place of origin", name: "placeOrigin", value: item.placeOrigin || data.settings.location, help: "Location where the message was filed." },
    { label: "Filing time", name: "filingTime", type: "time", value: item.filingTime || formatFilingTime(filingSource), help: "Local time the message was filed." },
    { label: "Filing date", name: "filingDate", type: "date", value: item.filingDate || formatFilingDate(filingSource), help: "Local date the message was filed." },
    { label: "Traffic frequency", name: "frequency", type: "select", value: item.frequency || activeFrequencyLabel(), options: frequencyOptions(), help: "Frequency used to pass or log this message." },
    { label: "Addressee / To", name: "to", value: item.to || netControlIdentity(), help: "Recipient written in block letters. NET CONTROL resolves to the current station identity." },
    { label: "Message text", name: "text", type: "textarea", value: item.text || item.subject || "", help: "Formal message body only. Keep it plain and easy to copy." },
    { label: "Signature / From", name: "from", type: "select", value: selectedFrom, options: stationOptions, help: "Station or person responsible for the message content." },
    { label: "Status", name: "status", type: "select", value: item.status || "Drafted", options: ["Drafted", "Sent", "Acknowledged", "Delivered", "Canceled"] },
  ];
}

function activeFrequencyLabel() {
  return data.frequencies.find((item) => item.status === "Active")?.frequency
    || data.settings.primaryFrequency
    || "Not assigned";
}

function frequencyOptions() {
  return [...new Set([
    activeFrequencyLabel(),
    data.settings.primaryFrequency,
    ...data.frequencies.map((item) => item.frequency),
    "Not assigned"
  ].map((value) => String(value || "").trim()).filter(Boolean))];
}

function stationCallsignOptions() {
  return [...new Set([
    data.settings.callsign,
    ...data.checkins.map((item) => item.callsign),
    ...data.markers
      .filter((item) => item.type === "station")
      .map((item) => markerCallsign(item))
  ].map((value) => String(value || "").trim().toUpperCase()).filter(Boolean))].sort();
}

function markerCallsign(marker) {
  return normalizeStationKey(marker?.name).split(" ")[0] || "";
}

function settingsFields() {
  const settings = data.settings;
  return [
    { label: "Callsign", name: "callsign", value: settings.callsign },
    { label: "Operator name", name: "operatorName", value: settings.operatorName },
    { label: "Organization", name: "organization", value: settings.organization },
    { label: "Net name", name: "netName", value: settings.netName },
    { label: "Tactical call", name: "tacticalCall", value: settings.tacticalCall },
    { label: "Incident name", name: "incidentName", value: settings.incidentName },
    { label: "Location", name: "location", value: settings.location },
    { label: "Grid locator", name: "grid", value: settings.grid },
    { label: "Primary frequency", name: "primaryFrequency", value: settings.primaryFrequency },
    { label: "Message prefix", name: "messagePrefix", value: settings.messagePrefix },
    { label: "Next message number", name: "nextMessageNumber", type: "number", value: settings.nextMessageNumber },
    { label: "Clock", name: "timezone", type: "select", value: settings.timezone, options: ["UTC", "Local"] },
    { label: "Operating notes", name: "notes", type: "textarea", value: settings.notes }
  ];
}

function mapMarkerFields(lat, lng, item = {}) {
  const type = item.type || "station";
  return [
    { label: "Type", name: "type", type: "select", value: type, options: ["station", "incident", "facility", "repeater"] },
    { label: "Name or callsign", name: "name", value: item.name || "" },
    { label: "Status", name: "status", value: item.status || defaultMarkerStatus(type) },
    { label: "Marker color", name: "color", type: "color", value: markerColor(type, item.color) },
    { label: "Latitude", name: "lat", type: "number", value: lat.toFixed(6) },
    { label: "Longitude", name: "lng", type: "number", value: lng.toFixed(6) },
    { label: "Notes", name: "note", type: "textarea", value: item.note || "Added by right-click on map" }
  ];
}

function defaultMarkerStatus(type) {
  return {
    station: "available",
    incident: "reported",
    facility: "open",
    repeater: "online"
  }[type] || "new";
}

function openStationMarkerDialog(lat, lng) {
  openEntry("Add Marker on Map", mapMarkerFields(lat, lng), (entry) => {
    const marker = {
      id: crypto.randomUUID(),
      type: entry.type,
      name: entry.name.trim().toUpperCase(),
      lat: Number(entry.lat),
      lng: Number(entry.lng),
      status: entry.status,
      color: sanitizeMarkerColor(entry.color) || markerColor(entry.type),
      note: entry.note.trim()
    };
    if (!marker.name || !Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) return;
    data.markers.push(marker);
    saveData(`Map marker added: ${marker.name}`);
  }, "Add Marker");
}

function nextMessageNumber() {
  return `${data.settings.messagePrefix}-${String(data.settings.nextMessageNumber).padStart(3, "0")}`;
}

function syncMessageNumberCounter() {
  const prefix = String(data.settings.messagePrefix || "MSG").toUpperCase();
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const highest = data.messages.reduce((max, message) => {
    const match = String(message.number || "").toUpperCase().match(new RegExp(`^${escapedPrefix}-(\\d+)$`));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  data.settings.nextMessageNumber = highest + 1;
}

function normalizeMessage(entry, existing = {}) {
  const cleanFrom = String(entry.from || stationCallsignOptions()[0] || "").trim().toUpperCase();
  const text = String(entry.text || "").trim();
  const filedAt = existing.timeFiled || new Date().toISOString();
  const filingDate = entry.filingDate || formatFilingDate(filedAt);
  const filingTime = entry.filingTime || formatFilingTime(filedAt);
  const status = entry.status || existing.status || "Drafted";
  const sentAt = trafficHasBeenSent(status) ? existing.sentAt || new Date().toISOString() : "";
  return {
    ...existing,
    ...entry,
    number: entry.number.trim().toUpperCase(),
    stationOrigin: String(entry.stationOrigin || cleanFrom).trim().toUpperCase(),
    wordCount: Math.max(0, Number(entry.wordCount) || countMessageWords(text)),
    placeOrigin: String(entry.placeOrigin || data.settings.location).trim().toUpperCase(),
    filingTime,
    filingDate,
    from: cleanFrom,
    to: entry.to.trim().toUpperCase(),
    subject: messageSummary(text),
    frequency: String(entry.frequency || activeFrequencyLabel()).trim(),
    text: text.toUpperCase(),
    timeFiled: filedAt,
    receivedAt: existing.receivedAt || filedAt,
    sentAt,
    status,
    operator: data.settings.callsign
  };
}

function normalizeStationCheckin(entry) {
  return {
    callsign: entry.callsign.trim().toUpperCase(),
    role: entry.role.trim(),
    status: entry.status,
    lastHeard: entry.lastHeard.trim()
  };
}

function normalizeTask(entry) {
  return {
    title: entry.title.trim(),
    assignee: entry.assignee.trim(),
    priority: entry.priority,
    status: entry.status,
    location: entry.location.trim()
  };
}

function normalizeReadiness(entry) {
  return {
    item: entry.item.trim(),
    status: entry.status,
    level: Math.max(0, Math.min(100, Number(entry.level) || 0)),
    note: entry.note.trim()
  };
}

function bindActions() {
  document.getElementById("addCheckin").addEventListener("click", () => openEntry("Station Check In", stationCheckinFields(), (entry) => {
    const station = normalizeStationCheckin(entry);
    if (!station.callsign) return;
    data.checkins.push({ id: crypto.randomUUID(), ...station });
    saveData(`Station checked in: ${station.callsign}`);
  }));

  document.getElementById("addFrequency").addEventListener("click", () => openEntry("Add Frequency", frequencyFields(), (entry) => {
    data.frequencies.push({ id: crypto.randomUUID(), ...entry });
    saveData(`Frequency added: ${entry.frequency}`);
  }));

  document.getElementById("addMessage").addEventListener("click", () => {
    syncMessageNumberCounter();
    openEntry("New Message", messageFields(), (entry) => {
      data.messages.unshift({ id: crypto.randomUUID(), ...normalizeMessage(entry) });
      syncMessageNumberCounter();
      saveData(`Message logged: ${entry.number}`);
    });
  });

  document.getElementById("messageTable").addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    const row = event.target.closest("[data-message-id]");
    if (!row) return;
    focusMessageStation(row.dataset.messageId);
    openMessageDetail(row.dataset.messageId);
  });

  document.getElementById("closeMessageDialog").addEventListener("click", () => {
    document.getElementById("messageDialog").close();
  });

  document.getElementById("printMessageDialog").addEventListener("click", (event) => {
    printIaruMessage(event.currentTarget.dataset.messageId);
  });

  document.getElementById("addEventOnMap").addEventListener("click", () => {
    setAddMarkerMode(pendingAddMarkerType === "incident" ? null : "incident");
  });

  document.getElementById("openSettings").addEventListener("click", () => document.getElementById("editSettings").click());

  document.getElementById("newIncident").addEventListener("click", () => {
    if (!confirm("Start a new incident workspace? All current incident data stored in this browser will be deleted and replaced. Export the current incident first if you need a record.")) return;
    data = createIncidentData({ ...data.settings, nextMessageNumber: 1 });
    saveData("New incident workspace created.");
  });

  document.getElementById("loadDemo").addEventListener("click", () => {
    if (!confirm("Load demo training data on this device? Export the current incident first if you need a record.")) return;
    data = cloneDemoData();
    saveData("Demo training data loaded.");
  });

  document.getElementById("editSettings").addEventListener("click", () => openEntry("Station Settings", settingsFields(), (entry) => {
    data.settings = {
      ...data.settings,
      ...entry,
      callsign: entry.callsign.trim().toUpperCase(),
      nextMessageNumber: Math.max(1, Number(entry.nextMessageNumber) || 1)
    };
    const control = data.checkins.find((item) => item.role === "Net Control");
    if (control) control.callsign = data.settings.callsign;
    saveData(`Settings updated for ${data.settings.callsign}`);
  }));

  document.getElementById("deleteAllData").addEventListener("click", () => {
    if (!confirm("Delete all dashboard data stored in this browser? This cannot be undone.")) return;
    if (!confirm("Final warning: this will remove messages, markers, stations, tasks, readiness, frequencies, settings, and log data from this browser.")) return;
    if (!removeLocalData()) return;
    data = createIncidentData({ ...seedData.settings, nextMessageNumber: 1 });
    writeLocalData(data);
    render();
    alert("All dashboard data in this browser has been deleted.");
  });

  document.getElementById("addTask").addEventListener("click", () => openEntry("Add Task", taskFields(), (entry) => {
    const task = normalizeTask(entry);
    if (!task.title) return;
    data.tasks.unshift({ id: crypto.randomUUID(), ...task });
    saveData(`Task added: ${task.title}`);
  }));

  document.getElementById("addStation").addEventListener("click", () => document.getElementById("addCheckin").click());

  document.getElementById("addReadiness").addEventListener("click", () => openEntry("Add Readiness Item", readinessFields(), (entry) => {
    const readiness = normalizeReadiness(entry);
    if (!readiness.item) return;
    data.readiness.push({ id: crypto.randomUUID(), ...readiness });
    saveData(`Readiness updated: ${readiness.item}`);
  }));

  document.getElementById("clearLog").addEventListener("click", () => {
    if (!confirm("Clear the operational log on this device?")) return;
    data.log = [];
    saveData("Operational log cleared.");
  });

  document.getElementById("exportData").addEventListener("click", () => {
    downloadText(`emcomm-dashboard-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), "application/json");
  });

  document.getElementById("exportCsv").addEventListener("click", exportCsvPackage);
  document.getElementById("printLog").addEventListener("click", printOperationalLog);

  document.getElementById("importData").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      data = validatedImport(JSON.parse(await file.text()));
      saveData(`Imported data file: ${file.name}`);
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  });

  document.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      handleAction(actionButton.dataset.action, actionButton.dataset.id);
      return;
    }

    const deleteButton = event.target.closest("[data-delete]");
    if (!deleteButton) return;
    if (deleteButton.dataset.delete === "frequency") {
      if (!confirm("Delete this frequency from this device?")) return;
      data.frequencies = data.frequencies.filter((item) => item.id !== deleteButton.dataset.id);
      saveData("Frequency removed.");
      return;
    }
    if (deleteButton.dataset.delete === "message") {
      const item = data.messages.find((message) => message.id === deleteButton.dataset.id);
      if (!item || !confirm(`Trash message ${item.number}?`)) return;
      data.messages = data.messages.filter((message) => message.id !== item.id);
      syncMessageNumberCounter();
      saveData(`Message trashed: ${item.number}`);
      return;
    }
    if (deleteButton.dataset.delete === "task") {
      const item = data.tasks.find((task) => task.id === deleteButton.dataset.id);
      if (!item || !confirm(`Trash task "${item.title}"?`)) return;
      data.tasks = data.tasks.filter((task) => task.id !== item.id);
      saveData(`Task trashed: ${item.title}`);
      return;
    }
    if (deleteButton.dataset.delete === "station") {
      const item = data.checkins.find((station) => station.id === deleteButton.dataset.id);
      if (!item || !confirm(`Trash station ${item.callsign}?`)) return;
      data.checkins = data.checkins.filter((station) => station.id !== item.id);
      saveData(`Station trashed: ${item.callsign}`);
      return;
    }
    if (deleteButton.dataset.delete === "map-marker") {
      const item = data.markers.find((marker) => marker.id === deleteButton.dataset.id);
      if (!item || !confirm(`Trash map marker ${item.name}?`)) return;
      hideStationContextMenu();
      data.markers = data.markers.filter((marker) => marker.id !== item.id);
      saveData(`Map marker trashed: ${item.name}`);
      return;
    }
    if (deleteButton.dataset.delete === "readiness") {
      const item = data.readiness.find((readiness) => readiness.id === deleteButton.dataset.id);
      if (!item || !confirm(`Trash readiness item "${item.item}"?`)) return;
      data.readiness = data.readiness.filter((readiness) => readiness.id !== item.id);
      saveData(`Readiness item trashed: ${item.item}`);
    }
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab, .tab-panel").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });

  window.addEventListener("online", render);
  window.addEventListener("offline", render);
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    document.getElementById("installApp").hidden = false;
  });
  document.getElementById("installApp").addEventListener("click", async () => {
    if (installPrompt) await installPrompt.prompt();
  });
}

function handleAction(action, id) {
  if (action === "start-relocate-marker") {
    const marker = data.markers.find((item) => item.id === id);
    if (!marker) return;
    pendingRelocateMarkerId = id;
    hideStationContextMenu();
    setRelocateBanner(marker);
    map?.closePopup();
    return;
  }

  if (action === "cancel-relocate-marker") {
    pendingRelocateMarkerId = null;
    clearRelocateBanner();
    return;
  }

  if (action === "close-station-menu") {
    hideStationContextMenu();
    return;
  }

  if (action === "edit-map-marker") {
    const item = data.markers.find((marker) => marker.id === id);
    if (!item) return;
    hideStationContextMenu();
    openEntry("Edit Map Marker", mapMarkerFields(item.lat, item.lng, item).map((field) => ({
      ...field,
      value: item[field.name] ?? field.value
    })), (entry) => {
      const marker = {
        type: entry.type,
        name: entry.name.trim().toUpperCase(),
        status: entry.status,
        lat: Number(entry.lat),
        lng: Number(entry.lng),
        color: sanitizeMarkerColor(entry.color) || markerColor(entry.type),
        note: entry.note.trim()
      };
      if (!marker.name || !Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) return;
      Object.assign(item, marker);
      saveData(`Map marker updated: ${marker.name}`);
    }, "Save Marker");
    return;
  }

  if (action === "activate-frequency") {
    data.frequencies = data.frequencies.map((item) => ({
      ...item,
      status: item.id === id ? "Active" : item.status === "Active" ? "Standby" : item.status
    }));
    const active = data.frequencies.find((item) => item.id === id);
    saveData(`Active frequency set: ${active?.frequency || "unknown"}`);
    return;
  }

  if (action === "cancel-frequency") {
    const item = data.frequencies.find((frequency) => frequency.id === id);
    if (!item) return;
    item.status = item.status === "Canceled" ? "Standby" : "Canceled";
    saveData(`Frequency ${item.status.toLowerCase()}: ${item.frequency}`);
    return;
  }

  if (action === "edit-frequency") {
    const item = data.frequencies.find((frequency) => frequency.id === id);
    if (!item) return;
    openEntry("Edit Frequency", frequencyFields(item), (entry) => {
      Object.assign(item, entry);
      saveData(`Frequency updated: ${entry.frequency}`);
    });
    return;
  }

  if (action === "edit-message") {
    const item = data.messages.find((message) => message.id === id);
    if (!item) return;
    openEntry("Edit Message", messageFields(item), (entry) => {
      Object.assign(item, normalizeMessage(entry, item));
      saveData(`Message updated: ${item.number}`);
    });
    return;
  }

  if (action === "open-message") {
    focusMessageStation(id);
    openMessageDetail(id);
    return;
  }

  if (action === "advance-message") {
    const item = data.messages.find((message) => message.id === id);
    if (!item) return;
    const flow = ["Drafted", "Sent", "Acknowledged", "Delivered"];
    const next = flow[Math.min(flow.indexOf(item.status) + 1, flow.length - 1)] || "Sent";
    item.status = next;
    if (trafficHasBeenSent(next) && !item.sentAt) item.sentAt = new Date().toISOString();
    saveData(`Message ${item.number} marked ${next}`);
    return;
  }

  if (action === "cancel-message") {
    const item = data.messages.find((message) => message.id === id);
    if (!item) return;
    item.status = item.status === "Canceled" ? "Drafted" : "Canceled";
    item.sentAt = "";
    saveData(`Message ${item.number} marked ${item.status}`);
    return;
  }

  if (action === "edit-task") {
    const item = data.tasks.find((task) => task.id === id);
    if (!item) return;
    openEntry("Edit Task", taskFields(item), (entry) => {
      const task = normalizeTask(entry);
      if (!task.title) return;
      Object.assign(item, task);
      saveData(`Task updated: ${task.title}`);
    });
    return;
  }

  if (action === "edit-station") {
    const item = data.checkins.find((station) => station.id === id);
    if (!item) return;
    openEntry("Edit Station", stationCheckinFields(item), (entry) => {
      const station = normalizeStationCheckin(entry);
      if (!station.callsign) return;
      Object.assign(item, station);
      saveData(`Station updated: ${station.callsign}`);
    });
    return;
  }

  if (action === "edit-readiness") {
    const item = data.readiness.find((readiness) => readiness.id === id);
    if (!item) return;
    openEntry("Edit Readiness Item", readinessFields(item), (entry) => {
      const readiness = normalizeReadiness(entry);
      if (!readiness.item) return;
      Object.assign(item, readiness);
      saveData(`Readiness updated: ${readiness.item}`);
    });
  }
}

function tickClock() {
  const now = new Date();
  document.getElementById("utcClock").textContent = `${now.toISOString().slice(11, 16)}Z`;
  document.getElementById("localClock").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  document.getElementById("clock").textContent = data.settings.timezone === "UTC"
    ? `${now.toISOString().slice(11, 16)}Z`
    : now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatUtcTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)}Z`;
}

function formatLocalTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatFilingDate(value = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatFilingTime(value = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function countMessageWords(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function messageSummary(value) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 10).join(" ");
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[character]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  bindActions();
  tickClock();
  setInterval(tickClock, 1000);
  render();
});
