const MS_DAY = 24 * 60 * 60 * 1000;
const today = new Date();

const elements = {
  rosterFile: document.getElementById("rosterFile"),
  demandFile: document.getElementById("demandFile"),
  loadSample: document.getElementById("loadSample"),
  downloadSample: document.getElementById("downloadSample"),
  exportCoverage: document.getElementById("exportCoverage"),
  exportRisk: document.getElementById("exportRisk"),
  copyActions: document.getElementById("copyActions"),
  exportBrief: document.getElementById("exportBrief"),
  statProviders: document.getElementById("statProviders"),
  statStates: document.getElementById("statStates"),
  statCritical: document.getElementById("statCritical"),
  statIssues: document.getElementById("statIssues"),
  rosterPreview: document.getElementById("rosterPreview"),
  coverageGrid: document.getElementById("coverageGrid"),
  coverageAlerts: document.getElementById("coverageAlerts"),
  coverageEmpty: document.getElementById("coverageEmpty"),
  coverageSort: document.getElementById("coverageSort"),
  coverageFilter: document.getElementById("coverageFilter"),
  radarChart: document.getElementById("radarChart"),
  radarTotal: document.getElementById("radarTotal"),
  radarLicenses: document.getElementById("radarLicenses"),
  radarDea: document.getElementById("radarDea"),
  radarCerts: document.getElementById("radarCerts"),
  riskLoading: document.getElementById("riskLoading"),
  riskEmpty: document.getElementById("riskEmpty"),
  riskSplit: document.getElementById("riskSplit"),
  urgentBlock: document.getElementById("urgentBlock"),
  urgentList: document.getElementById("urgentList"),
  riskTimeline: document.getElementById("riskTimeline"),
  issueList: document.getElementById("issueList"),
  actionList: document.getElementById("actionList"),
  evidenceDrawer: document.getElementById("evidenceDrawer"),
  evidenceBreadcrumb: document.getElementById("evidenceBreadcrumb"),
  evidenceSub: document.getElementById("evidenceSub"),
  evidenceAction: document.getElementById("evidenceAction"),
  evidenceActionText: document.getElementById("evidenceActionText"),
  evidenceActionBtn: document.getElementById("evidenceActionBtn"),
  evidenceLinks: document.getElementById("evidenceLinks"),
  evidenceAnchor: document.getElementById("evidenceAnchor"),
  anchorSelected: document.getElementById("anchorSelected"),
  anchorWhy: document.getElementById("anchorWhy"),
  anchorTime: document.getElementById("anchorTime"),
  anchorTimeLabel: document.getElementById("anchorTimeLabel"),
  evidenceBody: document.getElementById("evidenceBody"),
  evidenceClose: document.getElementById("evidenceClose"),
  firstTimeBanner: document.getElementById("firstTimeBanner"),
  verifierStatus: document.getElementById("verifierStatus"),
  verifierLastChecked: document.getElementById("verifierLastChecked"),
  helpButton: document.getElementById("helpButton"),
  helpModal: document.getElementById("helpModal"),
  helpClose: document.getElementById("helpClose"),
  toast: document.getElementById("toast"),
};

const evidenceStore = {};
let evidenceCounter = 0;
let isLoading = false;
const npiCache = new Map();
let selectedIssueKey = null;

const state = {
  roster: [],
  demand: [],
  coverageSort: "gap",
  coverageFilter: "all",
};

const computed = {
  coverage: null,
  risk: null,
  actions: null,
  urgent: null,
};

function formatDate(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value) {
  if (!value) return null;
  const cleaned = value.trim();
  const noBom = cleaned.replace(/^\uFEFF/, "");
  const date = new Date(noBom);
  if (!Number.isNaN(date.getTime())) return date;
  const isoMatch = noBom.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (isoMatch) {
    const year = Number.parseInt(isoMatch[1], 10);
    const month = Number.parseInt(isoMatch[2], 10);
    const day = Number.parseInt(isoMatch[3], 10);
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const slashMatch = noBom.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (slashMatch) {
    const month = Number.parseInt(slashMatch[1], 10);
    const day = Number.parseInt(slashMatch[2], 10);
    const year = Number.parseInt(slashMatch[3], 10);
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const shortMatch = noBom.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2})$/);
  if (shortMatch) {
    const month = Number.parseInt(shortMatch[1], 10);
    const day = Number.parseInt(shortMatch[2], 10);
    const year = 2000 + Number.parseInt(shortMatch[3], 10);
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * MS_DAY);
}

function startOfWeek(date) {
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), diff);
}

function diffDays(from, to) {
  return Math.ceil((to.getTime() - from.getTime()) / MS_DAY);
}

function humanizeTime(days) {
  if (days <= 0) return "now";
  if (days >= 14) {
    const weeks = Math.ceil(days / 7);
    return `in ${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  }
  return `in ${days} ${days === 1 ? "day" : "days"}`;
}

function humanizeWeeks(days) {
  if (days <= 0) return "now";
  const weeks = Math.max(1, Math.ceil(days / 7));
  return `in ${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

function formatImpactDate(date) {
  if (!date) return "Immediate";
  const days = diffDays(today, date);
  if (days <= 0) return `${formatDate(date)} (past due)`;
  return `${formatDate(date)} (${days} ${days === 1 ? "day" : "days"})`;
}

function formatDateTimeStamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year} ${month} ${day} ${hour} ${minute}`;
}

function detectDelimiter(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return ",";
  const sample = lines.slice(0, 3).join("\n");
  const countDelim = (delimiter) => {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < sample.length; i += 1) {
      const char = sample[i];
      if (char === "\"") {
        if (sample[i + 1] === "\"") {
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (!inQuotes && char === delimiter) {
        count += 1;
      }
    }
    return count;
  };
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  candidates.forEach((delimiter) => {
    const count = countDelim(delimiter);
    if (count > bestCount) {
      bestCount = count;
      best = delimiter;
    }
  });
  return bestCount > 0 ? best : ",";
}

function expiryLabel(days) {
  if (days === null || days === undefined) return "expiry missing";
  if (days <= 30) return "expiring soon";
  return "upcoming expiry";
}

function parseCSV(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;
  const delimiter = detectDelimiter(text);
  const pushCell = () => {
    row.push(current);
    current = "";
  };
  const pushRow = () => {
    if (row.length || current) {
      pushCell();
      rows.push(row);
      row = [];
    }
  };
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === "\"") {
        if (text[i + 1] === "\"") {
          current += "\"";
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === "\"") {
      inQuotes = true;
    } else if (char === delimiter) {
      pushCell();
    } else if (char === "\n") {
      pushRow();
    } else if (char !== "\r") {
      current += char;
    }
  }
  pushRow();
  if (!rows.length) return [];
  const headers = rows
    .shift()
    .map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase())
    .filter(Boolean);
  return rows
    .filter((values) => values.some((value) => value && value.trim()))
    .map((values) => {
      const rowObject = {};
      headers.forEach((header, index) => {
        rowObject[header] = (values[index] || "").trim();
      });
      return rowObject;
    });
}

function splitMulti(value) {
  if (!value) return [];
  return value
    .split(/\||;|\/|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAvailability(value) {
  if (!value) return 1;
  const cleaned = value.replace("%", "").trim();
  const numeric = Number.parseFloat(cleaned);
  if (!Number.isNaN(numeric)) {
    const normalized = numeric > 1.5 ? numeric / 100 : numeric;
    return Math.min(Math.max(normalized, 0), 1.5);
  }
  return 1;
}

function parseCertifications(value) {
  if (!value) return [];
  return splitMulti(value).map((item) => {
    const match = item.match(/(.+?)[(:](\d{4}-\d{2}-\d{2})/);
    return {
      name: match ? match[1].trim() : item,
      expiry: match ? parseDate(match[2]) : null,
    };
  });
}

function normalizeRoster(rows) {
  return rows.map((row, index) => {
    const pick = (keys) => {
      for (const key of keys) {
        if (row[key]) return row[key];
      }
      return "";
    };
    const statesRaw = pick([
      "states licensed",
      "states",
      "state",
      "licensed states",
      "states_licensed",
      "licensed_states",
    ]);
    const npi = pick(["npi"]);
    const verification = npi ? (isValidNpi(npi) ? "pending" : "invalid") : "missing";
    return {
      id: index + 1,
      name: pick(["provider name", "provider", "name"]),
      role: pick(["role", "title"]),
      states: splitMulti(statesRaw).map((stateCode) => stateCode.toUpperCase()),
      licenseExpiry: parseDate(
        pick([
          "license expiry date",
          "license expiry",
          "license_expiry",
          "license expiration date",
          "license expiration",
          "license_expiration",
        ])
      ),
      deaExpiry: parseDate(
        pick([
          "dea expiry date",
          "dea expiry",
          "dea_expiry",
          "dea expiration date",
          "dea expiration",
          "dea_expiration",
        ])
      ),
      npi: pick(["npi", "npi number", "npi_number"]),
      specialty: pick(["specialty", "speciality"]),
      certifications: parseCertifications(pick(["certifications", "certs"])),
      availability: parseAvailability(pick(["availability", "fte"])),
      verification,
      registryName: "",
    };
  });
}

function normalizeDemand(rows) {
  return rows
    .map((row) => {
      const pick = (keys) => {
        for (const key of keys) {
          if (row[key]) return row[key];
        }
        return "";
      };
      return {
        state: pick([
          "state",
          "clinic state",
          "clinic_state",
          "state code",
          "state_code",
          "state abbreviation",
          "state_abbrev",
        ]).toUpperCase(),
        date: parseDate(pick(["date", "week", "week_start", "week of", "week_of"])),
        demand: Number.parseFloat(pick(["demand", "count", "patients", "visits"])) || 0,
      };
    })
    .filter((row) => row.state && row.date);
}

function buildSampleRoster() {
  const base = today;
  const roster = [
    {
      name: "Dr. Maya Patel",
      role: "NP",
      states: "CA|NV",
      licenseExpiry: formatDate(addDays(base, 24)),
      deaExpiry: formatDate(addDays(base, 52)),
      npi: "1234567893",
      specialty: "Primary Care",
      certifications: `BLS(${formatDate(addDays(base, 320))})|ACLS(${formatDate(addDays(base, 54))})`,
      availability: "0.8",
    },
    {
      name: "James Lee",
      role: "MD",
      states: "TX|NM",
      licenseExpiry: formatDate(addDays(base, 110)),
      deaExpiry: formatDate(addDays(base, 18)),
      npi: "9876543210",
      specialty: "Behavioral Health",
      certifications: `DEA(${formatDate(addDays(base, 18))})`,
      availability: "1.0",
    },
    {
      name: "Ana Gomez",
      role: "PA",
      states: "FL",
      licenseExpiry: formatDate(addDays(base, 42)),
      deaExpiry: "",
      npi: "123456789",
      specialty: "Pediatrics",
      certifications: `PALS(${formatDate(addDays(base, 70))})`,
      availability: "0.7",
    },
    {
      name: "Chen Wu",
      role: "RN",
      states: "NY|NJ|PA",
      licenseExpiry: formatDate(addDays(base, 200)),
      deaExpiry: "",
      npi: "1122334455",
      specialty: "Oncology",
      certifications: `BLS(${formatDate(addDays(base, 210))})`,
      availability: "1.0",
    },
    {
      name: "Sara Khan",
      role: "NP",
      states: "CA|AZ",
      licenseExpiry: formatDate(addDays(base, 5)),
      deaExpiry: formatDate(addDays(base, 90)),
      npi: "1357913579",
      specialty: "Family Medicine",
      certifications: `ACLS(${formatDate(addDays(base, 26))})`,
      availability: "0.9",
    },
    {
      name: "Priya Singh",
      role: "MD",
      states: "WA|OR",
      licenseExpiry: formatDate(addDays(base, 150)),
      deaExpiry: formatDate(addDays(base, 30)),
      npi: "2468024680",
      specialty: "Urgent Care",
      certifications: `DEA(${formatDate(addDays(base, 30))})`,
      availability: "0.8",
    },
    {
      name: "Marcus Brown",
      role: "NP",
      states: "TX",
      licenseExpiry: formatDate(addDays(base, 28)),
      deaExpiry: formatDate(addDays(base, 70)),
      npi: "4445556667",
      specialty: "Telehealth",
      certifications: `BLS(${formatDate(addDays(base, 200))})`,
      availability: "0.6",
    },
    {
      name: "Elise Howard",
      role: "MD",
      states: "CA|TX",
      licenseExpiry: formatDate(addDays(base, 120)),
      deaExpiry: formatDate(addDays(base, 65)),
      npi: "9988776655",
      specialty: "Cardiology",
      certifications: `Board(${formatDate(addDays(base, 260))})`,
      availability: "1.0",
    },
  ];
  return roster.map((item, index) => {
    const verification = item.npi ? (isValidNpi(item.npi) ? "pending" : "invalid") : "missing";
    return {
      id: index + 1,
      name: item.name,
      role: item.role,
      states: splitMulti(item.states).map((stateCode) => stateCode.toUpperCase()),
      licenseExpiry: parseDate(item.licenseExpiry),
      deaExpiry: parseDate(item.deaExpiry),
      npi: item.npi,
      specialty: item.specialty,
      certifications: parseCertifications(item.certifications),
      availability: parseAvailability(item.availability),
      verification,
      registryName: "",
      raw: item,
    };
  });
}

function buildSampleDemand() {
  const base = startOfWeek(today);
  const states = ["CA", "TX", "FL", "NY", "WA", "AZ"];
  const baseDemand = {
    CA: 3,
    TX: 3,
    FL: 2,
    NY: 2,
    WA: 1,
    AZ: 1,
  };
  const demand = [];
  for (let week = 0; week < 13; week += 1) {
    const date = addDays(base, week * 7);
    states.forEach((stateCode) => {
      const spike = week % 4 === 0 ? 1 : 0;
      const growth = stateCode === "CA" && week > 6 ? 1 : 0;
      const demandCount = baseDemand[stateCode] + spike + growth;
      demand.push({
        state: stateCode,
        date,
        demand: demandCount,
      });
    });
  }
  return demand;
}

function buildSampleCSVs() {
  const roster = buildSampleRoster();
  const rosterHeader = [
    "provider name",
    "role",
    "states licensed",
    "license expiry date",
    "DEA expiry date",
    "NPI",
    "specialty",
    "certifications",
    "availability",
  ];
  const rosterLines = roster.map((item) => {
    const raw = item.raw || {
      name: item.name,
      role: item.role,
      states: item.states.join("|"),
      licenseExpiry: formatDate(item.licenseExpiry),
      deaExpiry: formatDate(item.deaExpiry),
      npi: item.npi,
      specialty: item.specialty,
      certifications: item.certifications
        .map((cert) => `${cert.name}(${formatDate(cert.expiry)})`)
        .join("|"),
      availability: item.availability,
    };
    return [
      raw.name,
      raw.role,
      raw.states,
      raw.licenseExpiry,
      raw.deaExpiry,
      raw.npi,
      raw.specialty,
      raw.certifications,
      raw.availability,
    ].join(",");
  });
  const demand = buildSampleDemand();
  const demandHeader = ["state", "date", "demand"];
  const demandLines = demand.map((item) =>
    [item.state, formatDate(item.date), item.demand].join(",")
  );
  return {
    roster: [rosterHeader.join(","), ...rosterLines].join("\n"),
    demand: [demandHeader.join(","), ...demandLines].join("\n"),
  };
}

function isValidNpi(npi) {
  return /^\d{10}$/.test((npi || "").trim());
}

function normalizeName(value) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function isNameMatch(providerName, registryName) {
  if (!registryName) return false;
  const providerTokens = normalizeName(providerName);
  const registryTokens = normalizeName(registryName);
  if (!providerTokens.length || !registryTokens.length) return false;
  const lastProvider = providerTokens[providerTokens.length - 1];
  const lastRegistry = registryTokens[registryTokens.length - 1];
  return lastProvider === lastRegistry;
}

function issueKey(issue) {
  return `${issue.title}-${issue.provider.id}`;
}

function issueWhy(issue) {
  const title = (issue.title || "").toLowerCase();
  if (title.includes("license expiring") || title.includes("license upcoming")) {
    const days = issue.provider.licenseExpiry ? diffDays(today, issue.provider.licenseExpiry) : null;
    return days
      ? `License expiry blocks scheduling in ${days} days`
      : "License expiry blocks scheduling";
  }
  if (title.includes("dea expiring") || title.includes("dea upcoming")) {
    const days = issue.provider.deaExpiry ? diffDays(today, issue.provider.deaExpiry) : null;
    return days ? `DEA expiry blocks prescribing in ${days} days` : "DEA expiry blocks prescribing";
  }
  if (title.includes("npi")) {
    return "NPI issues delay payer enrollment and claims";
  }
  if (title.includes("verification")) {
    return "Verification delays scheduling and onboarding approvals";
  }
  if (title.includes("missing license")) {
    return "Missing license data blocks scheduling in licensed states";
  }
  return "Compliance risk may block scheduling";
}

function verificationStatusAction(provider) {
  switch (provider.verification) {
    case "verified":
      return { status: "Verified", action: "No action required" };
    case "mismatch":
      return { status: "Name mismatch", action: "Ping registry" };
    case "not_found":
      return { status: "Not found", action: "Ping registry" };
    case "invalid":
      return { status: "Invalid NPI", action: "Upload correct NPI" };
    case "missing":
      return { status: "Missing NPI", action: "Upload missing document" };
    case "pending":
      return { status: "Pending", action: "Ping registry" };
    default:
      return { status: "Unavailable", action: "Ping registry" };
  }
}

function issueActionLabel(issue) {
  const title = (issue.title || "").toLowerCase();
  if (title.includes("cannot verify") || title.includes("missing npi") || title.includes("invalid")) {
    return "Upload missing document";
  }
  if (title.includes("npi") || title.includes("verification")) {
    return "Ping registry";
  }
  if (title.includes("missing license")) {
    return "Upload license document";
  }
  if (title.includes("license") || title.includes("dea")) {
    return "Trigger renewal";
  }
  return "Assign owner";
}

function actionSubtext(label) {
  if (label === "Trigger renewal") {
    return "Creates renewal task and emails credentialing owner.";
  }
  if (label === "Propose plan") {
    return "Generates 3 options with cost, time, risk.";
  }
  if (label === "Start verification" || label === "Ping registry") {
    return "Pings the NPI Registry and logs the result.";
  }
  if (label === "Assign owner") {
    return "Assigns an owner and sets a follow-up reminder.";
  }
  return "";
}

async function fetchNpiRecord(npi) {
  if (npiCache.has(npi)) return npiCache.get(npi);
  const url = `https://npiregistry.cms.hhs.gov/api/?number=${npi}&version=2.1`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`NPI lookup failed: ${response.status}`);
  }
  const data = await response.json();
  npiCache.set(npi, data);
  return data;
}

async function verifyNpis(roster) {
  const targets = roster.filter((provider) => isValidNpi(provider.npi));
  if (!targets.length) return;

  setLoading(true);

  const limit = 4;
  let index = 0;

  async function worker() {
    while (index < targets.length) {
      const current = targets[index];
      index += 1;
      current.verification = "pending";
      current.registryName = "";
      try {
        const data = await fetchNpiRecord(current.npi);
        const result = data && data.results && data.results[0];
        if (!result) {
          current.verification = "not_found";
          continue;
        }
        const basic = result.basic || {};
        const registryName =
          basic.organization_name ||
          [basic.first_name, basic.last_name].filter(Boolean).join(" ");
        current.registryName = registryName || "";
        current.verification = isNameMatch(current.name, registryName)
          ? "verified"
          : "mismatch";
      } catch (error) {
        current.verification = "unverified";
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  setLoading(false);
  refresh();
}

async function verifySingleNpi(provider) {
  if (!provider.npi) {
  const evidenceId = registerEvidence({
    title: "Verification unavailable",
    breadcrumb: "Verification unavailable",
    kind: "verification",
    subtitle: provider.name,
    rows: [
      { label: "Provider", value: `${provider.name} (${provider.role})` },
      { label: "Status", value: "Cannot verify (missing NPI)" },
    ],
    action: { label: "Upload missing document", text: "Recommended next action: upload NPI." },
  });
    openEvidence(evidenceId);
    return;
  }
  if (!isValidNpi(provider.npi)) {
  const evidenceId = registerEvidence({
    title: "Verification unavailable",
    breadcrumb: "Verification unavailable",
    kind: "verification",
    subtitle: provider.name,
    rows: [
      { label: "Provider", value: `${provider.name} (${provider.role})` },
      { label: "Status", value: "Cannot verify (invalid NPI)" },
    ],
    action: { label: "Upload correct NPI", text: "Recommended next action: correct NPI." },
  });
    openEvidence(evidenceId);
    return;
  }

  setLoading(true);
  provider.verification = "pending";
  refresh();

  try {
    const data = await fetchNpiRecord(provider.npi);
    const result = data && data.results && data.results[0];
    if (!result) {
      provider.verification = "not_found";
      provider.registryName = "";
    } else {
      const basic = result.basic || {};
      const registryName =
        basic.organization_name ||
        [basic.first_name, basic.last_name].filter(Boolean).join(" ");
      provider.registryName = registryName || "";
      provider.verification = isNameMatch(provider.name, registryName)
        ? "verified"
        : "mismatch";
    }
  } catch (error) {
    provider.verification = "unverified";
  }

  setLoading(false);
  refresh();
  elements.verifierLastChecked.textContent = "Updated moments ago";

  const evidenceId = registerEvidence({
    title: "NPI verification result",
    breadcrumb: "NPI verification",
    kind: "verification",
    subtitle: provider.name,
    anchor: {
      selected: `Verification • ${provider.name}`,
      why: "Registry validation confirms provider identity",
      timeLabel: "Time to impact",
      time: "Immediate",
    },
    rows: [
      { label: "Provider", value: `${provider.name} (${provider.role})` },
      { label: "NPI", value: provider.npi },
      {
        label: "Registry name",
        value: provider.registryName || "Not found",
      },
      { label: "Status", value: verificationLabel(provider) },
    ],
    action: {
      label: provider.verification === "verified" ? "Close" : "Ping registry",
      text:
        provider.verification === "verified"
          ? "Verification complete."
          : "Recommended next action: retry or contact registry.",
      handler:
        provider.verification === "verified" ? null : () => verifySingleNpi(provider),
      secondary: [{ label: "Upload missing document" }],
      subtext: actionSubtext("Ping registry"),
    },
  });
  openEvidence(evidenceId);
}

function issueImpactDate(issue) {
  const title = (issue.title || "").toLowerCase();
  if (title.includes("license")) return issue.provider.licenseExpiry;
  if (title.includes("dea")) return issue.provider.deaExpiry;
  return null;
}

function providerAvailable(provider, stateCode, date) {
  if (!provider.states.includes(stateCode)) return 0;
  if (!provider.licenseExpiry) return 0;
  if (provider.licenseExpiry < date) return 0;
  return provider.availability || 1;
}

function buildCoverage(roster, demand) {
  const horizonEnd = addDays(today, 90);
  const horizonStart = startOfWeek(today);
  const horizonWeeks = 13;
  const demandInRange = demand.filter(
    (row) => row.date >= horizonStart && row.date <= horizonEnd
  );
  const demandByDate = new Map();
  demandInRange.forEach((row) => {
    const key = `${row.state}|${formatDate(row.date)}`;
    if (!demandByDate.has(key)) {
      demandByDate.set(key, { state: row.state, date: row.date, demand: 0 });
    }
    demandByDate.get(key).demand += row.demand;
  });
  const demandRows = Array.from(demandByDate.values());
  const states = [...new Set(demandRows.map((row) => row.state))];
  const coverage = [];
  const gapEvents = [];

  states.forEach((stateCode) => {
    const weekGaps = Array.from({ length: horizonWeeks }, () => 0);
    let maxGap = 0;
    let nextGapDate = null;
    let peakEvent = null;

    demandRows
      .filter((row) => row.state === stateCode)
      .forEach((row) => {
        const supply = roster.reduce(
          (sum, provider) => sum + providerAvailable(provider, stateCode, row.date),
          0
        );
        const gap = Math.max(0, row.demand - supply);
        if (gap > 0) {
          if (!nextGapDate || row.date < nextGapDate) {
            nextGapDate = row.date;
          }
          maxGap = Math.max(maxGap, gap);
          if (
            !peakEvent ||
            gap > peakEvent.gap ||
            (gap === peakEvent.gap && row.date < peakEvent.date)
          ) {
            peakEvent = {
              state: stateCode,
              date: row.date,
              demand: row.demand,
              supply,
              gap,
            };
          }
          gapEvents.push({
            state: stateCode,
            date: row.date,
            demand: row.demand,
            supply: supply,
            gap,
          });
        }
        const weekIndex = Math.floor((row.date - horizonStart) / MS_DAY / 7);
        if (weekIndex >= 0 && weekIndex < horizonWeeks) {
          weekGaps[weekIndex] = Math.max(weekGaps[weekIndex], gap);
        }
      });

    coverage.push({
      state: stateCode,
      gapWeeks: weekGaps.filter((gap) => gap > 0).length,
      maxGap,
      nextGapDate,
      weekGaps,
      peakEvent,
    });
  });

  return {
    coverage,
    gapEvents: gapEvents.sort((a, b) => b.gap - a.gap).slice(0, 6),
  };
}

function buildRisk(roster) {
  const events = [];
  const issues = [];

  roster.forEach((provider) => {
    if (!provider.states.length) {
      issues.push({
        title: "Missing license",
        severity: "critical",
        provider,
        reason: "No licensed states on record",
      });
    }

    const licenseIssue = expiryEvent(provider, "License", provider.licenseExpiry);
    if (licenseIssue) {
      events.push(licenseIssue);
      issues.push({
        title: licenseIssue.summary,
        severity: licenseIssue.severity,
        provider,
        reason: licenseIssue.summary,
      });
    }

    const deaIssue = expiryEvent(provider, "DEA", provider.deaExpiry, "DEA");
    if (deaIssue) {
      events.push(deaIssue);
      issues.push({
        title: deaIssue.summary,
        severity: deaIssue.severity,
        provider,
        reason: deaIssue.summary,
      });
    }

    provider.certifications.forEach((cert) => {
      const certIssue = expiryEvent(provider, cert.name, cert.expiry, "Certification");
      if (certIssue) {
        events.push(certIssue);
      }
    });

    if (!provider.npi) {
      issues.push({
        title: "Cannot verify NPI",
        severity: "warning",
        provider,
        reason: "NPI missing from roster",
      });
    } else if (!isValidNpi(provider.npi)) {
      events.push({
        type: "NPI",
        provider,
        severity: "critical",
        date: null,
        summary: "NPI invalid format",
      });
      issues.push({
        title: "NPI mismatch",
        severity: "critical",
        provider,
        reason: "NPI missing or invalid",
      });
    } else if (provider.verification === "mismatch") {
      events.push({
        type: "NPI",
        provider,
        severity: "critical",
        date: null,
        summary: "NPI registry name mismatch",
      });
      issues.push({
        title: "NPI name mismatch",
        severity: "critical",
        provider,
        reason: `Registry name ${provider.registryName || "not found"} does not match`,
      });
    } else if (provider.verification === "not_found") {
      issues.push({
        title: "NPI not found",
        severity: "warning",
        provider,
        reason: "Registry lookup returned no results",
      });
    } else if (provider.verification === "unverified") {
      issues.push({
        title: "Verification unavailable",
        severity: "warning",
        provider,
        reason: "Registry lookup failed",
      });
    } else if (provider.verification === "pending") {
      issues.push({
        title: "Verification pending",
        severity: "warning",
        provider,
        reason: "Registry check in progress",
      });
    }
  });

  return {
    events,
    issues,
  };
}

function expiryEvent(provider, type, date, group = "License") {
  if (!date) {
    return {
      type,
      provider,
      group,
      severity: "critical",
      date: null,
      summary: `${type} expiry missing`,
    };
  }
  const days = diffDays(today, date);
  if (days <= 60) {
    const severity = days <= 30 ? "critical" : "warning";
    return {
      type,
      provider,
      group,
      severity,
      date,
      summary: `${type} ${expiryLabel(days)}`,
    };
  }
  return null;
}

function buildActions(coverageData, issues, roster) {
  const actions = [];

  coverageData.coverage
    .filter((item) => item.maxGap > 0)
    .slice(0, 3)
    .forEach((item) => {
      const providers = roster.filter(
        (provider) => provider.states.includes(item.state) && provider.licenseExpiry
      );
      const pick = providers.find((provider) => provider.availability >= 0.8);
      actions.push({
        title: pick
          ? `Reassign ${pick.name} to cover ${item.state} demand`
          : `Start onboarding for ${item.state} coverage gap`,
        severity: item.maxGap >= 2 ? "critical" : "warning",
        detail: pick
          ? `Next gap on ${formatDate(item.nextGapDate)} with max gap ${item.maxGap}`
          : "No licensed providers with sufficient availability",
        evidence: {
          label: "Coverage gap",
          value: `${item.state} max gap ${item.maxGap}`,
        },
      });
    });

  issues
    .filter((issue) => issue.severity === "critical")
    .slice(0, 3)
    .forEach((issue) => {
      actions.push({
        title: `Resolve ${issue.title.toLowerCase()} for ${issue.provider.name}`,
        severity: issue.severity,
        detail: issue.reason,
        evidence: {
          label: "Provider",
          value: `${issue.provider.name} (${issue.provider.role})`,
        },
      });
    });

  return actions.slice(0, 6);
}

function suggestCoverageAction(stateCode, roster) {
  const licensed = roster.filter(
    (provider) => provider.states.includes(stateCode) && provider.licenseExpiry
  );
  const available = licensed.find((provider) => provider.availability >= 0.8);
  if (available) {
    return `Next action: reassign ${available.name} to ${stateCode} coverage`;
  }
  const multiState = roster.find(
    (provider) => provider.states.length > 1 && !provider.states.includes(stateCode)
  );
  if (multiState) {
    return `Next action: fast-track ${stateCode} license for ${multiState.name}`;
  }
  return `Next action: onboard 1 NP in ${stateCode}`;
}

function buildPlanOptions(stateCode, roster) {
  const options = [];
  const multiState = roster.find(
    (provider) => provider.states.length > 1 && provider.states.includes(stateCode)
  );
  if (multiState) {
    options.push({
      label: `Reassign ${multiState.name} for ${stateCode} gap coverage`,
      cost: "Low",
      time: "Immediate",
      risk: "Moderate",
    });
  } else {
    const crossState = roster.find((provider) => provider.states.length > 1);
    if (crossState) {
      options.push({
        label: `Shift ${crossState.name} if ${stateCode} telehealth is allowed`,
        cost: "Low",
        time: "Immediate",
        risk: "Policy dependent",
      });
    }
  }
  const candidate = roster.find((provider) => !provider.states.includes(stateCode));
  if (candidate) {
    options.push({
      label: `Fast-track ${stateCode} licensing for ${candidate.name}`,
      cost: "Moderate",
      time: "2–6 weeks",
      risk: "Low",
    });
  }
  options.push({
    label: `Launch onboarding for 1 NP in ${stateCode}`,
    cost: "High",
    time: "4–8 weeks",
    risk: "Medium",
  });
  return options.slice(0, 3);
}

function verificationLabel(provider) {
  switch (provider.verification) {
    case "verified":
      return "Verified match";
    case "mismatch":
      return "Name mismatch";
    case "not_found":
      return "Not found";
    case "invalid":
      return "Invalid NPI";
    case "missing":
      return "Cannot verify";
    case "pending":
      return "Pending";
    default:
      return "Unavailable";
  }
}

function buildUrgentQueue(coverageData, riskData) {
  const items = [];
  coverageData.coverage
    .filter((item) => item.maxGap > 0)
    .forEach((item) => {
      const severity = item.maxGap >= 2 ? "critical" : "warning";
      const detail = item.peakEvent
        ? `Gap ${item.maxGap} on ${formatDate(item.peakEvent.date)}`
        : `Gap ${item.maxGap} within horizon`;
      items.push({
        title: `${item.state} coverage gap`,
        severity,
        detail,
        type: "coverage",
        state: item.state,
        meta: item,
      });
    });

  riskData.issues.forEach((issue) => {
    items.push({
      title: issue.title,
      severity: issue.severity,
      detail: issue.reason,
      type: "risk",
      provider: issue.provider,
      meta: issue,
    });
  });

  const severityRank = { critical: 0, warning: 1, ok: 2 };
  return items
    .sort((a, b) => {
      const rankDiff = (severityRank[a.severity] || 3) - (severityRank[b.severity] || 3);
      if (rankDiff !== 0) return rankDiff;
      const aScore = a.type === "coverage" ? a.meta.maxGap : 1;
      const bScore = b.type === "coverage" ? b.meta.maxGap : 1;
      return bScore - aScore;
    })
    .slice(0, 4);
}

function urgentActionLabels(item) {
  if (item.type === "coverage") {
    return ["Propose plan", "Export gap", "Notify ops"];
  }
  const title = (item.title || "").toLowerCase();
  if (title.includes("verification")) {
    return ["Ping registry", "Upload missing document", "Generate outreach email"];
  }
  if (title.includes("npi")) {
    return ["Ping registry", "Upload missing document", "Generate outreach email"];
  }
  if (title.includes("license") || title.includes("dea")) {
    return ["Trigger renewal", "Upload missing document", "Generate outreach email"];
  }
  return ["Upload missing document", "Generate outreach email", "Assign owner"];
}

function renderRosterPreview(roster) {
  elements.rosterPreview.innerHTML = "";
  roster.slice(0, 3).forEach((provider) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${provider.name}</td>
      <td>${provider.role}</td>
      <td>${provider.states.join(" | ")}</td>
      <td>${formatDate(provider.licenseExpiry) || "Missing"}</td>
      <td>${provider.npi || "Missing"}</td>
      <td>${verificationLabel(provider)}</td>
    `;
    elements.rosterPreview.appendChild(row);
  });
}

function renderStats(roster, issues) {
  const states = new Set();
  roster.forEach((provider) => provider.states.forEach((stateCode) => states.add(stateCode)));
  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  elements.statProviders.textContent = roster.length;
  elements.statStates.textContent = states.size;
  elements.statCritical.textContent = criticalCount;
  elements.statIssues.textContent = issues.length;
}

function renderCoverage(coverageData, roster) {
  elements.coverageGrid.innerHTML = "";
  elements.coverageAlerts.innerHTML = "";

  let displayStates = coverageData.coverage.slice();
  if (state.coverageFilter === "critical") {
    displayStates = displayStates.filter((item) => item.maxGap >= 2);
  } else if (state.coverageFilter === "at-risk") {
    displayStates = displayStates.filter((item) => item.maxGap > 0);
  } else if (state.coverageFilter === "no-gap") {
    displayStates = displayStates.filter((item) => item.maxGap === 0);
  }

  if (state.coverageSort === "soonest") {
    displayStates.sort((a, b) => {
      const aDate = a.nextGapDate ? a.nextGapDate.getTime() : Number.POSITIVE_INFINITY;
      const bDate = b.nextGapDate ? b.nextGapDate.getTime() : Number.POSITIVE_INFINITY;
      if (aDate !== bDate) return aDate - bDate;
      return b.maxGap - a.maxGap;
    });
  } else if (state.coverageSort === "state") {
    displayStates.sort((a, b) => a.state.localeCompare(b.state));
  } else {
    displayStates.sort((a, b) => {
      if (b.maxGap !== a.maxGap) return b.maxGap - a.maxGap;
      return b.gapWeeks - a.gapWeeks;
    });
  }

  displayStates = displayStates.slice(0, 6);

  if (!displayStates.length) {
    elements.coverageEmpty.style.display = "block";
    elements.coverageEmpty.textContent =
      state.coverageFilter === "all"
        ? "No demand rows within the next 90 days. Adjust demand dates or upload a fresh forecast."
        : "No states match the current coverage filter.";
  } else {
    elements.coverageEmpty.style.display = "none";
  }

  displayStates.forEach((item) => {
    const severity = item.maxGap >= 2 ? "critical" : item.maxGap > 0 ? "warning" : "ok";
    const card = document.createElement("div");
    card.className = "state-card";
    card.dataset.severity = severity;
    const peak = item.peakEvent;
    const gapDays = item.nextGapDate ? diffDays(today, item.nextGapDate) : null;
    const gapTime = gapDays ? humanizeWeeks(gapDays) : "no gap";
    const gapLine = peak
      ? `Gap: demand ${peak.demand} vs supply ${peak.supply.toFixed(1)} ${gapTime}`
      : "Gap: no coverage gap in horizon";
    const actionLine =
      item.maxGap > 0
        ? suggestCoverageAction(item.state, roster)
        : "Next action: monitor demand weekly";

    const weekBars = item.weekGaps
      .map((gap) => {
        if (gap >= 2) return '<span class="critical"></span>';
        if (gap > 0) return '<span class="warning"></span>';
        return "<span></span>";
      })
      .join("");

    const providerNames = roster
      .filter((provider) => provider.states.includes(item.state))
      .map((provider) => provider.name);
    const providerLabel =
      providerNames.length > 3
        ? `${providerNames.slice(0, 3).join(", ")} +${providerNames.length - 3} more`
        : providerNames.join(", ") || "None";

    let planEvidenceId = null;
    if (severity === "critical") {
      const planOptions = buildPlanOptions(item.state, roster);
      planEvidenceId = registerEvidence({
        title: `${item.state} proposed fix plan`,
        subtitle: `Max gap ${item.maxGap} with next gap ${formatDate(item.nextGapDate)}`,
        breadcrumb: `${item.state} proposed fix plan`,
        rows: planOptions.map((option, index) => ({
          label: `Option ${index + 1}`,
          value: `${option.label} • Cost: ${option.cost} • Time: ${option.time} • Risk: ${option.risk}`,
        })),
        action: {
          label: "Assign owner",
          text: "Recommended next action: assign an owner to execute a plan.",
        },
      });
    }

    const anchor = {
      selected: `${item.state} coverage gap`,
      why: "Demand exceeds licensed supply",
      timeLabel: "Time to impact",
      time: item.nextGapDate ? formatImpactDate(item.nextGapDate) : "No gap",
    };

    const evidenceId = registerEvidence({
      title: `${item.state} coverage evidence`,
      breadcrumb: `${item.state} coverage gap`,
      kind: "coverage",
      subtitle:
        item.maxGap > 0 && peak
          ? `Gap of ${peak.gap} in week of ${formatDate(peak.date)}`
          : "Coverage meets demand",
      anchor,
      rows: [
        { label: "State", value: item.state },
        {
          label: "Next gap",
          value: item.nextGapDate ? formatDate(item.nextGapDate) : "No gap in horizon",
        },
        { label: "Max gap", value: item.maxGap || "0" },
        {
          label: "Peak demand",
          value: peak ? `${peak.demand} vs ${peak.supply.toFixed(1)} clinicians` : "Covered",
        },
        {
          label: "Licensed providers",
          value: providerLabel,
        },
        {
          label: "Exact date",
          value: item.nextGapDate ? formatImpactDate(item.nextGapDate) : "—",
        },
      ],
      action: planEvidenceId
        ? {
            label: "Propose plan",
            text: "Recommended next action: generate fix plan options.",
            handler: () => openEvidence(planEvidenceId),
            secondary: [
              { label: "Export gap" },
              { label: "Notify ops" },
            ],
            subtext: actionSubtext("Propose plan"),
          }
        : {
            label: "Monitor coverage",
            text: "Recommended next action: keep weekly coverage monitoring.",
            secondary: [{ label: "Notify ops" }],
            subtext: actionSubtext("Monitor coverage"),
          },
    });

    card.innerHTML = `
      <div class="state-code">${item.state}</div>
      <div class="state-meta">${item.gapWeeks} gap weeks</div>
      <div class="state-why">${gapLine}</div>
      <div class="state-extra">
        <div class="state-action">${actionLine}</div>
        <div class="state-meta">Next gap: ${item.nextGapDate ? formatDate(item.nextGapDate) : "None"}</div>
      </div>
      <div class="week-bars">${weekBars}</div>
      <div class="state-footer">
        <div class="state-meta">Next gap: ${item.nextGapDate ? formatDate(item.nextGapDate) : "None"}</div>
        ${
          planEvidenceId
            ? '<button class="ghost plan-btn" type="button">Propose plan</button>'
            : ""
        }
      </div>
    `;
    bindEvidence(card, evidenceId);
    const planButton = card.querySelector(".plan-btn");
    if (planButton && planEvidenceId) {
      planButton.addEventListener("click", (event) => {
        event.stopPropagation();
        openEvidence(planEvidenceId);
      });
    }
    card.addEventListener("click", () => {
      card.classList.toggle("expanded");
    });
    elements.coverageGrid.appendChild(card);
  });

  coverageData.gapEvents.slice(0, 2).forEach((event) => {
    const alert = document.createElement("div");
    alert.className = "alert-item";
    const gapDays = diffDays(today, event.date);
    const gapTime = humanizeWeeks(gapDays);
    const evidenceId = registerEvidence({
      title: `${event.state} demand shortfall`,
      breadcrumb: `${event.state} coverage gap`,
      kind: "coverage",
      subtitle: `Gap of ${event.gap} in week of ${formatDate(event.date)}`,
      rows: [
        { label: "State", value: event.state },
        { label: "Date", value: formatDate(event.date) },
        { label: "Demand", value: event.demand },
        { label: "Licensed supply", value: event.supply.toFixed(1) },
      ],
      anchor: {
        selected: `${event.state} coverage gap`,
        why: "Demand exceeds licensed supply",
        timeLabel: "Time to impact",
        time: formatImpactDate(event.date),
      },
      action: {
        label: "Propose plan",
        text: "Recommended next action: propose a coverage fix plan.",
        secondary: [
          { label: "Export gap" },
          { label: "Notify ops" },
        ],
        subtext: actionSubtext("Propose plan"),
      },
    });
    alert.innerHTML = `
      <div class="alert-title">${event.state}: ${event.gap} clinician gap</div>
      <div class="alert-sub">${formatDate(event.date)} • demand ${event.demand} vs supply ${event.supply.toFixed(1)}</div>
    `;
    bindEvidence(alert, evidenceId);
    elements.coverageAlerts.appendChild(alert);
  });

  if (!coverageData.coverage.length) {
    elements.coverageEmpty.style.display = "block";
    elements.coverageEmpty.textContent =
      "No demand rows within the next 90 days. Adjust demand dates or upload a fresh forecast.";
  }
}

function renderUrgentList(items) {
  elements.urgentList.innerHTML = "";
  items.forEach((item) => {
    const entry = document.createElement("div");
    entry.className = "urgent-item";
    const evidenceId = registerEvidence({
      title: item.title,
      breadcrumb: item.type === "coverage" ? `${item.state} coverage gap` : item.title,
      kind: item.type,
      subtitle: item.type === "coverage" ? item.state : item.provider.name,
      anchor: {
        selected: item.type === "coverage" ? `${item.state} coverage gap` : `${item.title}`,
        why: item.type === "coverage" ? "Demand exceeds licensed supply" : issueWhy(item.meta),
        timeLabel: "Time to impact",
        time:
          item.type === "coverage" && item.meta.nextGapDate
            ? formatImpactDate(item.meta.nextGapDate)
            : item.meta
            ? formatImpactDate(issueImpactDate(item.meta))
            : "Immediate",
      },
      rows:
        item.type === "coverage"
          ? [
              { label: "State", value: item.state },
              {
                label: "Gap detail",
                value: item.detail,
              },
            ]
          : [
              { label: "Provider", value: `${item.provider.name} (${item.provider.role})` },
              { label: "Reason", value: item.detail },
            ],
      action: {
        label:
          item.type === "coverage"
            ? "Propose plan"
            : item.meta
            ? issueActionLabel(item.meta)
            : "Assign owner",
        text: "Recommended next action: resolve the highest urgency item.",
        handler:
          item.type === "coverage"
            ? null
            : item.title.toLowerCase().includes("verification") || item.title.toLowerCase().includes("npi")
            ? () => verifySingleNpi(item.provider)
            : null,
        secondary: item.type === "coverage" ? [{ label: "Notify ops" }] : [{ label: "Generate outreach email" }],
        subtext: actionSubtext(
          item.type === "coverage"
            ? "Propose plan"
            : item.meta
            ? issueActionLabel(item.meta)
            : "Assign owner"
        ),
      },
    });
    const actions = urgentActionLabels(item);
    entry.innerHTML = `
      <div>
        <span class="severity ${item.severity}">${item.severity}</span>
        ${item.title}
      </div>
      <div class="alert-sub">${item.detail}</div>
      <div class="urgent-actions"></div>
    `;

    const actionsWrap = entry.querySelector(".urgent-actions");
  actions.forEach((label, index) => {
      const button = document.createElement("button");
      button.className = `action-btn ${index === 0 ? "primary" : ""}`;
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        if ((label === "Start verification" || label === "Ping registry") && item.provider) {
          await verifySingleNpi(item.provider);
          return;
        }
        openEvidence(evidenceId);
      });
      actionsWrap.appendChild(button);
    });

    entry.addEventListener("click", () => openEvidence(evidenceId));
    elements.urgentList.appendChild(entry);
  });
}

function renderRiskRadar(events) {
  const licenseCount = events.filter((event) => event.group === "License").length;
  const deaCount = events.filter((event) => event.type === "DEA" || event.type === "NPI").length;
  const certCount = events.filter((event) => event.group === "Certification").length;
  const total = licenseCount + deaCount + certCount;

  elements.radarTotal.textContent = total;
  elements.radarLicenses.textContent = licenseCount;
  elements.radarDea.textContent = deaCount;
  elements.radarCerts.textContent = certCount;

  const critical = events.filter((event) => event.severity === "critical").length;
  const warning = events.filter((event) => event.severity === "warning").length;
  const sum = critical + warning + (total - critical - warning);
  const criticalPct = sum ? (critical / sum) * 100 : 0;
  const warningPct = sum ? (warning / sum) * 100 : 0;

  elements.radarChart.style.setProperty("--c1", `${criticalPct}%`);
  elements.radarChart.style.setProperty("--c2", `${criticalPct + warningPct}%`);
}

function renderTimeline(events) {
  elements.riskTimeline.innerHTML = "";
  const sorted = events
    .slice()
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return -1;
      if (!b.date) return 1;
      return a.date - b.date;
    })
    .slice(0, 4);

  sorted.forEach((event) => {
    const item = document.createElement("div");
    item.className = "timeline-item";
    const evidenceId = registerEvidence({
      title: `${event.type} risk`,
      breadcrumb: `${event.provider.name} ${event.type} risk`,
      kind: "risk",
      subtitle: event.provider.name,
      anchor: {
        selected: `${event.type} risk • ${event.provider.name}`,
        why: event.summary,
        timeLabel: "Time to impact",
        time: formatImpactDate(event.date),
      },
      rows: [
        { label: "Provider", value: `${event.provider.name} (${event.provider.role})` },
        { label: "Type", value: event.type },
        { label: "Severity", value: event.severity },
        { label: "Due", value: event.date ? formatImpactDate(event.date) : "Missing" },
        { label: "Reason", value: event.summary },
      ],
      action: {
        label: event.type === "NPI" ? "Ping registry" : "Trigger renewal",
        text: "Recommended next action: resolve before scheduling impact.",
        secondary: [{ label: "Assign owner" }],
        subtext: actionSubtext(event.type === "NPI" ? "Ping registry" : "Trigger renewal"),
      },
    });
    item.innerHTML = `
      <span class="severity ${event.severity}">${event.severity}</span>
      ${event.provider.name} • ${event.summary}
    `;
    bindEvidence(item, evidenceId);
    elements.riskTimeline.appendChild(item);
  });
}

function renderIssues(issues) {
  elements.issueList.innerHTML = "";
  const severityRank = { critical: 0, warning: 1, ok: 2 };
  issues
    .slice()
    .sort((a, b) => (severityRank[a.severity] || 3) - (severityRank[b.severity] || 3))
    .slice(0, 4)
    .forEach((issue) => {
      const item = document.createElement("div");
      item.className = "issue-item";
    const verificationInfo = verificationStatusAction(issue.provider);
    const recommendedAction = issueActionLabel(issue);
    const evidenceId = registerEvidence({
      title: issue.title,
      breadcrumb: `${issue.title}`,
      kind: "issue",
      subtitle: issue.provider.name,
      anchor: {
        selected: `${issue.title} • ${issue.provider.name}`,
        why: issueWhy(issue),
        timeLabel: "Time to impact",
        time:
          issueImpactDate(issue)
            ? formatImpactDate(issueImpactDate(issue))
            : "Immediate",
      },
      rows: [
        { label: "Provider", value: `${issue.provider.name} (${issue.provider.role})` },
        {
          label: "License expiry",
          value: issue.provider.licenseExpiry
            ? formatImpactDate(issue.provider.licenseExpiry)
            : "Missing",
        },
        {
          label: "DEA expiry",
          value: issue.provider.deaExpiry ? formatImpactDate(issue.provider.deaExpiry) : "Missing",
        },
        { label: "NPI", value: issue.provider.npi || "Missing" },
        {
          label: "Verification status",
          value: `${verificationInfo.status}`,
        },
        {
          label: "Action",
          value: recommendedAction || verificationInfo.action,
        },
      ],
      action: {
        label: recommendedAction,
        text: `Recommended next action: ${recommendedAction}.`,
        handler:
          issue.title.toLowerCase().includes("npi") || issue.title.toLowerCase().includes("verification")
            ? () => verifySingleNpi(issue.provider)
            : null,
        secondary: [{ label: "Generate outreach email" }],
        subtext: actionSubtext(recommendedAction),
      },
    });
    item.innerHTML = `
      <span class="severity ${issue.severity}">${issue.severity}</span>
      ${issue.title} • ${issue.provider.name}
      <div class="issue-why">Why it matters: ${issueWhy(issue)}</div>
    `;
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-selected", issueKey(issue) === selectedIssueKey ? "true" : "false");
    if (issueKey(issue) === selectedIssueKey) {
      item.classList.add("selected");
    }
    item.addEventListener("click", () => {
      selectedIssueKey = issueKey(issue);
      document
        .querySelectorAll(".issue-item.selected")
        .forEach((node) => node.classList.remove("selected"));
      document
        .querySelectorAll(".issue-item[aria-selected='true']")
        .forEach((node) => node.setAttribute("aria-selected", "false"));
      item.classList.add("selected");
      item.setAttribute("aria-selected", "true");
      openEvidence(evidenceId);
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        item.click();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const items = Array.from(elements.issueList.querySelectorAll(".issue-item"));
        const index = items.indexOf(item);
        const nextIndex = event.key === "ArrowDown" ? index + 1 : index - 1;
        if (items[nextIndex]) {
          items[nextIndex].focus();
        }
      }
    });
    elements.issueList.appendChild(item);
  });
}

function renderActions(actions) {
  elements.actionList.innerHTML = "";
  actions.slice(0, 3).forEach((action) => {
    const item = document.createElement("div");
    item.className = "action-item";
    const evidenceId = registerEvidence({
      title: "Recommended action",
      breadcrumb: action.title,
      kind: "action",
      subtitle: action.title,
      anchor: {
        selected: action.title,
        why: action.detail,
        timeLabel: "Time to impact",
        time: "Immediate",
      },
      rows: [
        { label: "Action", value: action.title },
        { label: "Impact", value: action.detail },
        { label: action.evidence.label, value: action.evidence.value },
      ],
      action: {
        label: "Assign owner",
        text: "Recommended next action: assign an owner and deadline.",
        secondary: [{ label: "Generate outreach email" }],
        subtext: actionSubtext("Assign owner"),
      },
    });
    item.innerHTML = `
      <span class="severity ${action.severity}">${action.severity}</span>
      ${action.title}
      <div class="alert-sub">${action.detail}</div>
    `;
    bindEvidence(item, evidenceId);
    elements.actionList.appendChild(item);
  });
}

function registerEvidence(payload) {
  evidenceCounter += 1;
  const id = `ev-${evidenceCounter}`;
  evidenceStore[id] = payload;
  return id;
}

function bindEvidence(element, id) {
  element.addEventListener("click", () => openEvidence(id));
}

function openEvidence(id) {
  const payload = evidenceStore[id];
  if (!payload) return;
  const crumb = payload.breadcrumb || payload.title;
  elements.evidenceBreadcrumb.textContent = crumb ? `→ ${crumb}` : "";
  elements.evidenceSub.textContent = payload.subtitle || "";
  if (payload.anchor) {
    elements.evidenceAnchor.style.display = "grid";
    elements.anchorSelected.textContent = payload.anchor.selected || "—";
    elements.anchorWhy.textContent = payload.anchor.why || "—";
    elements.anchorTimeLabel.textContent = payload.anchor.timeLabel || "Time to impact";
    elements.anchorTime.textContent = payload.anchor.time || "—";
  } else {
    elements.evidenceAnchor.style.display = "none";
  }
  elements.evidenceBody.innerHTML = "";
  elements.evidenceLinks.innerHTML = "";
  elements.evidenceDrawer.classList.remove("collapse-secondary", "expanded");
  payload.rows.forEach((row) => {
    const entry = document.createElement("div");
    entry.className = "evidence-row";
    entry.innerHTML = `<div class="label">${row.label}</div><div>${row.value}</div>`;
    elements.evidenceBody.appendChild(entry);
  });
  if (payload.action && payload.action.label) {
    elements.evidenceAction.style.display = "flex";
    elements.evidenceActionText.textContent = payload.action.text || "Recommended next action";
    elements.evidenceActionBtn.textContent = payload.action.label;
    const existing = elements.evidenceAction.querySelector(".evidence-action-subtext");
    if (existing) existing.remove();
    elements.evidenceActionBtn.onclick = () => {
      if (payload.action.handler) {
        payload.action.handler();
      } else if (payload.action.label.toLowerCase().includes("download sample")) {
        downloadSampleData();
      } else {
        closeEvidence();
      }
    };
    if (payload.action.subtext) {
      const subtext = document.createElement("div");
      subtext.className = "evidence-action-subtext";
      subtext.textContent = payload.action.subtext;
      elements.evidenceAction.appendChild(subtext);
    }
    elements.evidenceLinks.innerHTML = "";
    const secondary = payload.action.secondary || [];
    const collapseSecondary =
      payload.action.collapseSecondary || payload.action.label === "Propose plan";
    if (secondary.length) {
      if (collapseSecondary) {
        elements.evidenceDrawer.classList.add("collapse-secondary");
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "evidence-toggle";
        toggle.textContent = "More actions";
        toggle.addEventListener("click", () => {
          const expanded = elements.evidenceDrawer.classList.toggle("expanded");
          toggle.textContent = expanded ? "Hide actions" : "More actions";
        });
        elements.evidenceLinks.appendChild(toggle);
        const list = document.createElement("div");
        list.className = "evidence-secondary";
        secondary.forEach((item) => {
          const link = document.createElement("button");
          link.className = "evidence-link";
          link.type = "button";
          link.textContent = item.label;
          link.addEventListener("click", () => {
            if (item.handler) {
              item.handler();
            }
          });
          list.appendChild(link);
        });
        elements.evidenceLinks.appendChild(list);
      } else {
        secondary.forEach((item) => {
          const link = document.createElement("button");
          link.className = "evidence-link";
          link.type = "button";
          link.textContent = item.label;
          link.addEventListener("click", () => {
            if (item.handler) {
              item.handler();
            }
          });
          elements.evidenceLinks.appendChild(link);
        });
      }
    }
  } else {
    elements.evidenceAction.style.display = "none";
    elements.evidenceLinks.innerHTML = "";
  }
  elements.evidenceDrawer.classList.add("open");
  elements.evidenceDrawer.setAttribute("aria-hidden", "false");
}

function closeEvidence() {
  elements.evidenceDrawer.classList.remove("open");
  elements.evidenceDrawer.setAttribute("aria-hidden", "true");
  elements.evidenceBreadcrumb.textContent = "";
  elements.evidenceSub.textContent = "Select an issue to see evidence and recommended actions.";
  elements.evidenceAnchor.style.display = "none";
  elements.evidenceBody.innerHTML = "";
  elements.evidenceAction.style.display = "none";
  elements.evidenceLinks.innerHTML = "";
  elements.evidenceDrawer.classList.remove("collapse-secondary", "expanded");
  const subtext = elements.evidenceAction.querySelector(".evidence-action-subtext");
  if (subtext) subtext.remove();
}

function openHelp() {
  if (!elements.helpModal) return;
  elements.helpModal.classList.add("open");
  elements.helpModal.setAttribute("aria-hidden", "false");
}

function closeHelp() {
  if (!elements.helpModal) return;
  elements.helpModal.classList.remove("open");
  elements.helpModal.setAttribute("aria-hidden", "true");
}

let toastTimer = null;
function showToast(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  elements.toast.setAttribute("aria-hidden", "false");
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    elements.toast.classList.remove("show");
    elements.toast.setAttribute("aria-hidden", "true");
  }, 1800);
}

function refresh() {
  evidenceCounter = 0;
  Object.keys(evidenceStore).forEach((key) => delete evidenceStore[key]);
  updateVerifierStatus();

  const hasData = state.roster.length > 0 && state.demand.length > 0;
  elements.coverageEmpty.style.display = hasData ? "none" : "block";
  elements.riskEmpty.style.display = hasData ? "none" : "block";
  elements.riskSplit.style.display = hasData ? "grid" : "none";
  elements.urgentBlock.style.display = hasData ? "block" : "none";
  elements.coverageGrid.style.display = hasData ? "grid" : "none";
  elements.coverageAlerts.style.display = hasData ? "block" : "none";
  elements.firstTimeBanner.style.display = hasData ? "none" : "block";
  setExportsEnabled(hasData);

  if (!hasData) {
    elements.statProviders.textContent = "0";
    elements.statStates.textContent = "0";
    elements.statCritical.textContent = "0";
    elements.statIssues.textContent = "0";
    elements.rosterPreview.innerHTML = "";
    elements.coverageGrid.innerHTML = "";
    elements.coverageAlerts.innerHTML = "";
    elements.urgentList.innerHTML = "";
    elements.riskTimeline.innerHTML = "";
    elements.issueList.innerHTML = "";
    elements.actionList.innerHTML = "";
    elements.radarTotal.textContent = "0";
    elements.radarLicenses.textContent = "0";
    elements.radarDea.textContent = "0";
    elements.radarCerts.textContent = "0";
    elements.radarChart.style.setProperty("--c1", "0%");
    elements.radarChart.style.setProperty("--c2", "0%");
    closeEvidence();
    elements.evidenceAction.style.display = "none";
    computed.coverage = null;
    computed.risk = null;
    computed.actions = null;
    computed.urgent = null;
    return;
  }

  const coverageData = buildCoverage(state.roster, state.demand);
  const riskData = buildRisk(state.roster);
  const actions = buildActions(coverageData, riskData.issues, state.roster);
  const urgent = buildUrgentQueue(coverageData, riskData);

  computed.coverage = coverageData;
  computed.risk = riskData;
  computed.actions = actions;
  computed.urgent = urgent;

  renderStats(state.roster, riskData.issues);
  renderRosterPreview(state.roster);
  renderCoverage(coverageData, state.roster);
  renderUrgentList(urgent);
  renderRiskRadar(riskData.events);
  renderTimeline(riskData.events);
  renderIssues(riskData.issues);
  renderActions(actions);
}

function handleRosterUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);
    if (!rows.length) {
      setLoading(false);
      showUploadError("Roster upload failed", "No rows could be parsed from the roster CSV.");
      return;
    }
    state.roster = normalizeRoster(rows).filter((provider) => provider.name);
    if (!state.roster.length) {
      setLoading(false);
      showUploadError(
        "Roster upload failed",
        "No provider names found. Check that the roster contains a provider name column."
      );
      return;
    }
    setLoading(false);
    refresh();
  };
  setLoading(true);
  reader.readAsText(file);
}

function handleDemandUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);
    if (!rows.length) {
      setLoading(false);
      showUploadError("Demand upload failed", "No rows could be parsed from the demand CSV.");
      return;
    }
    state.demand = normalizeDemand(rows);
    if (!state.demand.length) {
      setLoading(false);
      showUploadError(
        "Demand upload failed",
        "No demand rows found. Check that the demand file has state and date columns."
      );
      return;
    }
    setLoading(false);
    refresh();
  };
  setLoading(true);
  reader.readAsText(file);
}

function loadSampleData() {
  setLoading(true);
  state.roster = buildSampleRoster();
  state.demand = buildSampleDemand();
  setLoading(false);
  refresh();
}

function downloadSampleData() {
  const samples = buildSampleCSVs();
  downloadFile("sample_roster.csv", samples.roster);
  downloadFile("sample_demand.csv", samples.demand);
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function showUploadError(title, detail) {
  const evidenceId = registerEvidence({
    title,
    breadcrumb: "Upload error",
    kind: "upload",
    subtitle: "CSV import failed",
    rows: [
      { label: "Detail", value: detail },
      { label: "Tip", value: "Check headers and ensure CSV uses commas and quotes." },
    ],
    action: { label: "Download sample CSVs", text: "Recommended next action: use sample formats." },
  });
  openEvidence(evidenceId);
}

function exportCoverageCSV() {
  if (!computed.coverage) return;
  const lines = [
    [
      "state",
      "next_gap_date",
      "max_gap",
      "gap_weeks",
      "peak_demand",
      "peak_supply",
    ].join(","),
  ];
  computed.coverage.coverage.filter((item) => item.maxGap > 0).forEach((item) => {
    lines.push(
      [
        item.state,
        item.nextGapDate ? formatDate(item.nextGapDate) : "",
        item.maxGap,
        item.gapWeeks,
        item.peakEvent ? item.peakEvent.demand : "",
        item.peakEvent ? item.peakEvent.supply.toFixed(1) : "",
      ].join(",")
    );
  });
  downloadFile("coverage_gaps.csv", lines.join("\n"));
}

function exportRiskCSV() {
  if (!computed.risk) return;
  const lines = [
    ["provider", "role", "issue", "severity", "reason", "verification"].join(","),
  ];
  computed.risk.issues.forEach((issue) => {
    lines.push(
      [
        issue.provider.name,
        issue.provider.role,
        issue.title,
        issue.severity,
        `"${issue.reason}"`,
        issue.provider.verification,
      ].join(",")
    );
  });
  downloadFile("risk_report.csv", lines.join("\n"));
}

function exportRiskBriefPDF() {
  if (!computed.coverage || !computed.risk) return;
  const topGaps = computed.coverage.coverage
    .filter((item) => item.maxGap > 0)
    .sort((a, b) => b.maxGap - a.maxGap || b.gapWeeks - a.gapWeeks)
    .slice(0, 5);
  const topExpiries = computed.risk.events
    .slice()
    .sort((a, b) => {
      const severityRank = { critical: 0, warning: 1, ok: 2 };
      const rankDiff = (severityRank[a.severity] || 3) - (severityRank[b.severity] || 3);
      if (rankDiff !== 0) return rankDiff;
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date - b.date;
    })
    .slice(0, 5);

  const gapRows = topGaps
    .map(
      (gap) =>
        `<tr><td>${gap.state}</td><td>${gap.maxGap}</td><td>${
          gap.nextGapDate ? formatDate(gap.nextGapDate) : "—"
        }</td><td>${gap.peakEvent ? gap.peakEvent.demand : "—"}</td></tr>`
    )
    .join("");
  const expiryRows = topExpiries
    .map(
      (event) =>
        `<tr><td>${event.provider.name}</td><td>${event.type}</td><td>${
          event.date ? formatDate(event.date) : "Missing"
        }</td><td>${event.severity}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Staffing Risk Brief</title>
    <style>
      body { font-family: "IBM Plex Sans", Arial, sans-serif; margin: 32px; color: #231a14; }
      h1 { font-family: "Bricolage Grotesque", Arial, sans-serif; font-size: 24px; margin: 0 0 8px; }
      h2 { font-size: 14px; letter-spacing: 0.12em; text-transform: uppercase; color: #6f5a4f; margin: 22px 0 8px; }
      .meta { font-size: 12px; color: #6f5a4f; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #f1d9c9; }
      th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6f5a4f; }
      .summary { margin-top: 16px; padding: 12px; background: #fff4ec; border-radius: 12px; }
      .footer { margin-top: 20px; font-size: 11px; color: #6f5a4f; }
    </style>
  </head>
  <body>
    <h1>StateScope Staffing Risk Brief — Next 90 Days</h1>
    <div class="meta">Generated ${formatDate(new Date())}</div>
    <div class="summary">
      Providers: ${state.roster.length} • Licensed states: ${
        new Set(state.roster.flatMap((p) => p.states)).size
      } • Open issues: ${computed.risk.issues.length}
    </div>
    <h2>Top Coverage Gaps</h2>
    <table>
      <thead>
        <tr><th>State</th><th>Max Gap</th><th>Next Gap</th><th>Peak Demand</th></tr>
      </thead>
      <tbody>${gapRows || "<tr><td colspan='4'>No gaps detected.</td></tr>"}</tbody>
    </table>
    <h2>Top Expiries & Risks</h2>
    <table>
      <thead>
        <tr><th>Provider</th><th>Type</th><th>Due</th><th>Severity</th></tr>
      </thead>
      <tbody>${expiryRows || "<tr><td colspan='4'>No expiries detected.</td></tr>"}</tbody>
    </table>
    <div class="footer">Generated by StateScope on ${formatDateTimeStamp(new Date())} • Data source: NPI Registry</div>
    <script>window.print();</script>
  </body>
  </html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

async function copyActionPlan() {
  if (!computed.actions) return;
  const lines = computed.actions.map(
    (action, index) => `${index + 1}. ${action.title} — ${action.detail}`
  );
  const content = lines.join("\n");
  try {
    await navigator.clipboard.writeText(content);
  } catch (error) {
    window.prompt("Copy action plan:", content);
  }
}

function setExportsEnabled(enabled) {
  [elements.exportCoverage, elements.exportRisk, elements.copyActions, elements.exportBrief].forEach((button) => {
    if (!button) return;
    button.disabled = !enabled;
  });
}

function updateVerifierStatus() {
  if (!elements.verifierLastChecked || !elements.verifierStatus) return;
  elements.verifierStatus.textContent = "Live lookup";
  if (!elements.verifierLastChecked.textContent) {
    elements.verifierLastChecked.textContent = "Updated moments ago";
  }
}

function setLoading(value) {
  isLoading = value;
  elements.riskLoading.setAttribute("aria-hidden", value ? "false" : "true");
}

elements.rosterFile.addEventListener("change", handleRosterUpload);
elements.demandFile.addEventListener("change", handleDemandUpload);
elements.loadSample.addEventListener("click", loadSampleData);
elements.downloadSample.addEventListener("click", downloadSampleData);
elements.exportCoverage.addEventListener("click", exportCoverageCSV);
elements.exportRisk.addEventListener("click", exportRiskCSV);
elements.copyActions.addEventListener("click", copyActionPlan);
elements.exportBrief.addEventListener("click", exportRiskBriefPDF);
elements.evidenceClose.addEventListener("click", closeEvidence);
if (elements.coverageSort) {
  elements.coverageSort.addEventListener("change", (event) => {
    state.coverageSort = event.target.value;
    refresh();
  });
}
if (elements.coverageFilter) {
  elements.coverageFilter.addEventListener("change", (event) => {
    state.coverageFilter = event.target.value;
    refresh();
    const label =
      event.target.options && event.target.selectedIndex >= 0
        ? event.target.options[event.target.selectedIndex].text
        : event.target.value;
    showToast(`Filter: ${label}`);
  });
}
if (elements.helpButton) {
  elements.helpButton.addEventListener("click", openHelp);
}
if (elements.helpClose) {
  elements.helpClose.addEventListener("click", closeHelp);
}
if (elements.helpModal) {
  elements.helpModal.addEventListener("click", (event) => {
    if (event.target === elements.helpModal) closeHelp();
  });
}

document.addEventListener("keydown", (event) => {
  const tag = event.target && event.target.tagName;
  if (tag && ["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
  if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
    event.preventDefault();
    openHelp();
    return;
  }
  if (event.key === "Escape") {
    if (elements.helpModal && elements.helpModal.classList.contains("open")) {
      closeHelp();
      return;
    }
    if (elements.evidenceDrawer && elements.evidenceDrawer.classList.contains("open")) {
      closeEvidence();
    }
  }
});

refresh();
