import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";

const storageKey = "emcomm-dashboard-v1";

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
    timezone: "UTC",
    notes: "Use plain language, acknowledge all formal traffic, and keep an accurate log."
  },
  markers: [
    { id: crypto.randomUUID(), type: "station", name: "9M2PJU Net Control", lat: 3.139, lng: 101.6869, status: "available", note: "Primary control station" },
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
    { id: crypto.randomUUID(), number: "MSG-001", priority: "Emergency", from: "Relief Centre", to: "Net Control", subject: "Medical transport needed", status: "Sent", handling: "Immediate", method: "Voice", text: "Medical transport requested for one patient.", timeFiled: new Date().toISOString() },
    { id: crypto.randomUUID(), number: "MSG-002", priority: "Priority", from: "Mobile Team", to: "Logistics", subject: "Need drinking water", status: "Acknowledged", handling: "Priority", method: "Voice", text: "Additional drinking water needed at relief centre.", timeFiled: new Date().toISOString() },
    { id: crypto.randomUUID(), number: "MSG-003", priority: "Routine", from: "Net Control", to: "All stations", subject: "Operational period update", status: "Delivered", handling: "Routine", method: "Net broadcast", text: "Operational period update sent to all stations.", timeFiled: new Date().toISOString() }
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

let data = loadData();
let map;
let layerGroups = {};
let installPrompt;

function loadData() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    const seeded = { ...seedData, log: [{ time: new Date().toISOString(), text: "Dashboard initialized with sample EmComm data." }] };
    localStorage.setItem(storageKey, JSON.stringify(seeded));
    return seeded;
  }
  return migrateData(JSON.parse(saved));
}

function migrateData(saved) {
  const migrated = {
    ...seedData,
    ...saved,
    settings: { ...seedData.settings, ...(saved.settings || {}) },
    markers: saved.markers || seedData.markers,
    checkins: saved.checkins || seedData.checkins,
    frequencies: (saved.frequencies || seedData.frequencies).map((item, index) => ({
      status: index === 0 ? "Active" : "Standby",
      ...item
    })),
    messages: (saved.messages || seedData.messages).map((item) => ({
      handling: item.priority || "Routine",
      method: "Voice",
      text: item.subject || "",
      timeFiled: new Date().toISOString(),
      ...item
    })),
    tasks: saved.tasks || seedData.tasks,
    readiness: saved.readiness || seedData.readiness,
    log: saved.log || []
  };
  localStorage.setItem(storageKey, JSON.stringify(migrated));
  return migrated;
}

function saveData(action) {
  if (action) {
    data.log.unshift({ time: new Date().toISOString(), text: action });
    data.log = data.log.slice(0, 120);
  }
  localStorage.setItem(storageKey, JSON.stringify(data));
  render();
}

function markerColor(type) {
  return {
    station: "#30c48d",
    repeater: "#69a7ff",
    incident: "#ef6a61",
    facility: "#f0bd4f"
  }[type] || "#eef6f4";
}

function markerIcon(type) {
  return L.divIcon({
    className: "custom-marker",
    html: `<span style="background:${markerColor(type)}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
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
}

function renderMap() {
  document.getElementById("mapSummary").innerHTML = data.markers.slice(0, 4).map((item) => `
    <article>
      <span class="fallback-dot" style="background:${markerColor(item.type)}"></span>
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.type)} · ${escapeHtml(item.status || "")}</span>
      </div>
    </article>
  `).join("");

  if (!map) {
    document.getElementById("map").innerHTML = `
      <div class="fallback-map-grid">
        ${data.markers.map((item) => `
          <article>
            <span class="fallback-dot" style="background:${markerColor(item.type)}"></span>
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
  data.markers.forEach((item) => {
    const groupName = `${item.type}s`;
    const group = layerGroups[groupName] || layerGroups.incidents;
    L.marker([item.lat, item.lng], { icon: markerIcon(item.type) })
      .bindPopup(`<strong>${escapeHtml(item.name)}</strong><br>${escapeHtml(item.status || item.type)}<br>${escapeHtml(item.note || "")}<br><span>${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}</span>`)
      .addTo(group);
  });
}

function render() {
  renderMap();
  renderSettings();
  document.getElementById("stationCount").textContent = data.checkins.length;
  document.getElementById("urgentCount").textContent = data.messages.filter((m) => m.priority === "Emergency").length;
  document.getElementById("openTaskCount").textContent = data.tasks.filter((t) => t.status !== "Done").length;
  document.getElementById("onlineState").textContent = navigator.onLine ? "Online" : "Offline";
  renderCheckins();
  renderFrequencies();
  renderMessages();
  renderTasks();
  renderStations();
  renderReadiness();
  renderLog();
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
  document.getElementById("checkinList").innerHTML = data.checkins.map((item) => `
    <li>
      <strong>${escapeHtml(item.callsign)}</strong>
      <span class="meta">${escapeHtml(item.role)} · ${escapeHtml(item.lastHeard)} · <span class="badge ${item.status}">${escapeHtml(item.status)}</span></span>
    </li>
  `).join("");
}

function renderFrequencies() {
  document.getElementById("frequencyList").innerHTML = data.frequencies.map((item) => `
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
  `).join("");
}

function renderMessages() {
  document.getElementById("messageTable").innerHTML = data.messages.map((item) => `
    <tr>
      <td>${escapeHtml(item.number)}</td>
      <td><span class="badge ${item.priority.toLowerCase()}">${escapeHtml(item.priority)}</span></td>
      <td>${escapeHtml(item.from)}</td>
      <td>${escapeHtml(item.to)}</td>
      <td>${escapeHtml(item.subject)}</td>
      <td>${escapeHtml(item.status)}</td>
      <td>
        <div class="table-actions">
          <button data-action="edit-message" data-id="${item.id}">Edit</button>
          <button data-action="advance-message" data-id="${item.id}">Next</button>
          <button data-action="cancel-message" data-id="${item.id}">Cancel</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderTasks() {
  const statuses = ["Assigned", "In Progress", "Waiting", "Done"];
  document.getElementById("taskBoard").innerHTML = statuses.map((status) => `
    <section class="task-column">
      <h3>${status}</h3>
      <div class="task-list">
        ${data.tasks.filter((task) => task.status === status).map((task) => `
          <article class="task-card">
            <strong>${escapeHtml(task.title)}</strong>
            <span class="badge ${task.priority.toLowerCase()}">${escapeHtml(task.priority)}</span>
            <span class="meta">${escapeHtml(task.assignee)} · ${escapeHtml(task.location)}</span>
          </article>
        `).join("")}
      </div>
    </section>
  `).join("");
}

function renderStations() {
  document.getElementById("stationDirectory").innerHTML = data.checkins.map((item) => `
    <article class="station-card">
      <strong>${escapeHtml(item.callsign)}</strong>
      <span class="badge ${item.status}">${escapeHtml(item.status)}</span>
      <span class="meta">${escapeHtml(item.role)} · Last heard ${escapeHtml(item.lastHeard)}</span>
    </article>
  `).join("");
}

function renderReadiness() {
  document.getElementById("readinessGrid").innerHTML = data.readiness.map((item) => `
    <article class="readiness-card">
      <strong>${escapeHtml(item.item)}</strong>
      <span class="badge ${item.status.toLowerCase()}">${escapeHtml(item.status)}</span>
      <span class="meta">${escapeHtml(item.note)}</span>
      <div class="readiness-meter"><span style="width:${Number(item.level) || 0}%"></span></div>
    </article>
  `).join("");
}

function renderLog() {
  document.getElementById("eventLog").innerHTML = data.log.map((item) => `
    <li>
      <strong>${new Date(item.time).toLocaleString()}</strong>
      <span class="meta">${escapeHtml(item.text)}</span>
    </li>
  `).join("");
}

function fieldsToHtml(fields) {
  return fields.map((field) => {
    const value = field.value == null ? "" : String(field.value);
    const required = field.required === false ? "" : "required";
    if (field.type === "select") {
      return `<label>${field.label}<select name="${field.name}" ${required}>${field.options.map((option) => `<option ${option === value ? "selected" : ""}>${option}</option>`).join("")}</select></label>`;
    }
    if (field.type === "textarea") {
      return `<label>${field.label}<textarea name="${field.name}" ${required}>${escapeHtml(value)}</textarea></label>`;
    }
    return `<label>${field.label}<input name="${field.name}" type="${field.type || "text"}" value="${escapeAttribute(value)}" ${required}></label>`;
  }).join("");
}

function openEntry(title, fields, onSave, saveLabel = "Save") {
  const dialog = document.getElementById("entryDialog");
  const form = document.getElementById("entryForm");
  document.getElementById("dialogTitle").textContent = title;
  document.getElementById("dialogFields").innerHTML = fieldsToHtml(fields);
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

function frequencyFields(item = {}) {
  return [
    { label: "Name", name: "name", value: item.name },
    { label: "Frequency", name: "frequency", value: item.frequency },
    { label: "Mode", name: "mode", value: item.mode },
    { label: "Purpose", name: "purpose", value: item.purpose },
    { label: "Status", name: "status", type: "select", value: item.status || "Standby", options: ["Active", "Standby", "Canceled"] }
  ];
}

function messageFields(item = {}) {
  return [
    { label: "Message number", name: "number", value: item.number || nextMessageNumber() },
    { label: "Precedence", name: "priority", type: "select", value: item.priority || "Routine", options: ["Routine", "Priority", "Emergency", "Welfare"] },
    { label: "Handling", name: "handling", type: "select", value: item.handling || "Routine", options: ["Routine", "Priority", "Immediate", "Health and welfare"] },
    { label: "From", name: "from", value: item.from || data.settings.tacticalCall },
    { label: "To", name: "to", value: item.to },
    { label: "Subject", name: "subject", value: item.subject },
    { label: "Method", name: "method", type: "select", value: item.method || "Voice", options: ["Voice", "Winlink", "Packet", "APRS", "Messenger", "Phone relay"] },
    { label: "Status", name: "status", type: "select", value: item.status || "Drafted", options: ["Drafted", "Sent", "Acknowledged", "Delivered", "Canceled"] },
    { label: "Message text", name: "text", type: "textarea", value: item.text || item.subject || "" }
  ];
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

function nextMessageNumber() {
  return `${data.settings.messagePrefix}-${String(data.settings.nextMessageNumber).padStart(3, "0")}`;
}

function normalizeMessage(entry, existing = {}) {
  return {
    ...existing,
    ...entry,
    number: entry.number.trim().toUpperCase(),
    from: entry.from.trim(),
    to: entry.to.trim(),
    subject: entry.subject.trim(),
    text: entry.text.trim(),
    timeFiled: existing.timeFiled || new Date().toISOString(),
    operator: data.settings.callsign
  };
}

function bindActions() {
  document.getElementById("markerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const marker = {
      id: crypto.randomUUID(),
      type: document.getElementById("markerType").value,
      name: document.getElementById("markerName").value,
      lat: Number(document.getElementById("markerLat").value),
      lng: Number(document.getElementById("markerLng").value),
      status: "new",
      note: "Added by operator"
    };
    if (!Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) return;
    data.markers.push(marker);
    event.target.reset();
    saveData(`Map marker added: ${marker.name}`);
  });

  document.getElementById("addCheckin").addEventListener("click", () => openEntry("Station Check In", [
    { label: "Callsign", name: "callsign" },
    { label: "Role", name: "role" },
    { label: "Status", name: "status", type: "select", options: ["available", "assigned", "mobile", "offline"] },
    { label: "Last heard", name: "lastHeard" }
  ], (entry) => {
    data.checkins.push({ id: crypto.randomUUID(), ...entry });
    saveData(`Station checked in: ${entry.callsign}`);
  }));

  document.getElementById("addFrequency").addEventListener("click", () => openEntry("Add Frequency", frequencyFields(), (entry) => {
    data.frequencies.push({ id: crypto.randomUUID(), ...entry });
    saveData(`Frequency added: ${entry.frequency}`);
  }));

  document.getElementById("addMessage").addEventListener("click", () => openEntry("New Message", messageFields(), (entry) => {
    data.messages.unshift({ id: crypto.randomUUID(), ...normalizeMessage(entry) });
    data.settings.nextMessageNumber = Number(data.settings.nextMessageNumber) + 1;
    saveData(`Message logged: ${entry.number}`);
  }));

  document.getElementById("openSettings").addEventListener("click", () => document.getElementById("editSettings").click());

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

  document.getElementById("addTask").addEventListener("click", () => openEntry("Add Task", [
    { label: "Task", name: "title" },
    { label: "Assignee", name: "assignee" },
    { label: "Priority", name: "priority", type: "select", options: ["Routine", "Priority", "Emergency"] },
    { label: "Status", name: "status", type: "select", options: ["Assigned", "In Progress", "Waiting", "Done"] },
    { label: "Location", name: "location" }
  ], (entry) => {
    data.tasks.unshift({ id: crypto.randomUUID(), ...entry });
    saveData(`Task added: ${entry.title}`);
  }));

  document.getElementById("addStation").addEventListener("click", () => document.getElementById("addCheckin").click());

  document.getElementById("addReadiness").addEventListener("click", () => openEntry("Add Readiness Item", [
    { label: "Item", name: "item" },
    { label: "Status", name: "status", type: "select", options: ["Ready", "Degraded", "Unavailable"] },
    { label: "Level 0-100", name: "level", type: "number" },
    { label: "Note", name: "note", type: "textarea" }
  ], (entry) => {
    data.readiness.push({ id: crypto.randomUUID(), ...entry, level: Math.max(0, Math.min(100, Number(entry.level))) });
    saveData(`Readiness updated: ${entry.item}`);
  }));

  document.getElementById("clearLog").addEventListener("click", () => {
    if (!confirm("Clear the operational log on this device?")) return;
    data.log = [];
    saveData("Operational log cleared.");
  });

  document.getElementById("exportData").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `emcomm-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("importData").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    data = JSON.parse(await file.text());
    saveData(`Imported data file: ${file.name}`);
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

  if (action === "advance-message") {
    const item = data.messages.find((message) => message.id === id);
    if (!item) return;
    const flow = ["Drafted", "Sent", "Acknowledged", "Delivered"];
    const next = flow[Math.min(flow.indexOf(item.status) + 1, flow.length - 1)] || "Sent";
    item.status = next;
    saveData(`Message ${item.number} marked ${next}`);
    return;
  }

  if (action === "cancel-message") {
    const item = data.messages.find((message) => message.id === id);
    if (!item) return;
    item.status = item.status === "Canceled" ? "Drafted" : "Canceled";
    saveData(`Message ${item.number} marked ${item.status}`);
  }
}

function tickClock() {
  const now = new Date();
  document.getElementById("clock").textContent = data.settings.timezone === "UTC"
    ? `${now.toISOString().slice(11, 16)}Z`
    : now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
