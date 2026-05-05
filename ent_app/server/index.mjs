import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getAmapConfig,
  reverseGeocodeWithAmap,
  fetchWeatherWithAmap,
  searchPlacesWithAmap,
} from "./amap.mjs";
import { generatePlans } from "./planner.mjs";
import {
  createPublicError,
  deleteSession,
  getUserBySessionToken,
  getUserStoreMode,
  loginUser,
  registerUser,
  resetUserPassword,
  toPublicUser,
  updateUserProfileBySession,
} from "./user-store.mjs";

const currentDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(currentDir, "..");
const distRoot = resolve(workspaceRoot, "dist");
const indexHtmlPath = resolve(distRoot, "index.html");

loadEnvFile(resolve(workspaceRoot, ".env.server"));
loadEnvFile(resolve(workspaceRoot, ".env.server.local"));

const port = Number(process.env.WANDER_API_PORT || process.env.PORT || 8788);
const dashScopeApiKey = process.env.DASHSCOPE_API_KEY || "";
const dashScopeBaseUrl =
  (process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(
    /\/+$/,
    ""
  );
const qwenIntentModel = process.env.QWEN_INTENT_MODEL || "qwen-plus";
const basicAuthUser = process.env.WANDER_BASIC_AUTH_USER || "";
const basicAuthPassword = process.env.WANDER_BASIC_AUTH_PASSWORD || "";
const basicAuthEnabled = Boolean(basicAuthUser && basicAuthPassword);
const sessionCookieName = "wander_session";

const server = createServer(async (request, response) => {
  try {
    if (!request.url) {
      respondJson(response, 404, { ok: false, note: "Missing request URL." });
      return;
    }

    const method = request.method || "GET";
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (method === "OPTIONS") {
      respondEmpty(response, 204);
      return;
    }

    if (method === "GET" && (url.pathname === "/api/health" || url.pathname === "/health")) {
      const amapConfig = getAmapConfig();
      respondJson(response, 200, {
        ok: true,
        provider: "wander",
        model: qwenIntentModel,
        qwenConfigured: Boolean(dashScopeApiKey),
        amapConfigured: Boolean(amapConfig.key),
        frontendBuilt: existsSync(indexHtmlPath),
        authApi: true,
        userStore: getUserStoreMode(),
      });
      return;
    }

    if (!isInternalRequestAuthorized(request)) {
      respondBasicAuthRequired(response);
      return;
    }

    if (url.pathname.startsWith("/api/auth/")) {
      await handleAuthRequest({ request, response, method, pathname: url.pathname });
      return;
    }

    if (method === "POST" && url.pathname === "/api/location/reverse") {
      const amapConfig = getAmapConfig();
      if (!amapConfig.key) {
        respondJson(response, 503, {
          ok: false,
          note: "AMAP_WEB_SERVICE_KEY is not configured.",
        });
        return;
      }

      const body = await readJsonBody(request);
      const coordinates = parseCoordinates(body);
      if (!coordinates) {
        respondJson(response, 400, { ok: false, note: "Valid latitude and longitude are required." });
        return;
      }

      const location = await reverseGeocodeWithAmap(coordinates, amapConfig);
      const weather = await fetchWeatherWithAmap(location.adcode, amapConfig).catch(() => null);

      respondJson(response, 200, {
        ok: true,
        location: {
          ...location,
          weatherMode: weather?.weatherMode || null,
          weatherText: weather?.weatherText || null,
          weatherReportTime: weather?.reportTime || null,
        },
      });
      return;
    }

    if (method === "POST" && url.pathname === "/api/location/search") {
      const amapConfig = getAmapConfig();
      if (!amapConfig.key) {
        respondJson(response, 503, {
          ok: false,
          note: "AMAP_WEB_SERVICE_KEY is not configured.",
        });
        return;
      }

      const body = await readJsonBody(request);
      const keywords = typeof body.query === "string" ? body.query.trim() : "";
      const coordinates = parseCoordinates(body) || {
        latitude: 31.45229,
        longitude: 121.10562,
      };
      const city =
        typeof body.city === "string" && body.city.trim()
          ? body.city.trim()
          : typeof body.adcode === "string" && body.adcode.trim()
            ? body.adcode.trim()
            : "";

      if (!keywords) {
        respondJson(response, 400, { ok: false, note: "Search query is required." });
        return;
      }

      const places = await searchPlacesWithAmap(
        {
          keywords,
          coordinates,
          radiusMeters: 20000,
          city,
          pageSize: 8,
        },
        amapConfig
      ).catch(() => []);

      respondJson(response, 200, {
        ok: true,
        places,
      });
      return;
    }

    if (method === "POST" && url.pathname === "/api/plans/generate") {
      const amapConfig = getAmapConfig();
      if (!dashScopeApiKey) {
        respondJson(response, 503, {
          ok: false,
          note: "DASHSCOPE_API_KEY is not configured.",
        });
        return;
      }

      if (!amapConfig.key) {
        respondJson(response, 503, {
          ok: false,
          note: "AMAP_WEB_SERVICE_KEY is not configured.",
        });
        return;
      }

      const body = await readJsonBody(request);
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      const language = body.language === "en" ? "en" : "zh";
      const coordinates = parseCoordinates(body);
      const timeBudgetMinutes = clampNumber(body.timeBudgetMinutes, 30, 12 * 60, 120);
      const routeMode = normalizeRouteMode(body.routeMode);
      const weather = body.weather === "rain" ? "rain" : "clear";
      const venueStatus = body.venueStatus === "closed" ? "closed" : "live";
      const locationLabel =
        typeof body.locationLabel === "string" && body.locationLabel.trim()
          ? body.locationLabel.trim()
          : language === "zh"
            ? "当前位置附近"
            : "near the current location";

      if (!prompt) {
        respondJson(response, 400, { ok: false, note: "Prompt is required." });
        return;
      }

      if (!coordinates) {
        respondJson(response, 400, { ok: false, note: "Valid latitude and longitude are required." });
        return;
      }

      const result = await generatePlans({
        prompt,
        language,
        coordinates,
        locationLabel,
        timeBudgetMinutes,
        routeMode,
        weather,
        venueStatus,
        qwenConfig: {
          apiKey: dashScopeApiKey,
          baseUrl: dashScopeBaseUrl,
          model: qwenIntentModel,
        },
      });

      respondJson(response, 200, {
        ok: true,
        ...result,
      });
      return;
    }

    if (!url.pathname.startsWith("/api/") && (method === "GET" || method === "HEAD")) {
      serveFrontendAsset(response, url.pathname, method === "HEAD");
      return;
    }

    respondJson(response, 404, { ok: false, note: "Endpoint not found." });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    const note =
      error?.publicMessage ||
      (error instanceof Error ? error.message : "Unexpected server error.");
    console.error("[wander] request failed", {
      url: request.url,
      method: request.method,
      message: note,
      stack: error instanceof Error ? error.stack : undefined,
    });
    respondJson(response, statusCode, {
      ok: false,
      note,
    });
  }
});

server.listen(port, () => {
  console.log(`[wander] listening on http://localhost:${port}`);

  if (!existsSync(indexHtmlPath)) {
    console.log("[wander] frontend build missing. Run `npm run build` before `npm start`.");
  }
});

async function handleAuthRequest({ request, response, method, pathname }) {
  if (method === "GET" && pathname === "/api/auth/session") {
    const user = await getUserBySessionToken(readSessionToken(request));
    respondJson(response, 200, {
      ok: true,
      user: toPublicUser(user),
    });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/register") {
    const body = await readJsonBody(request);
    const session = await registerUser({
      email: body.email,
      password: body.password,
      name: body.name,
    });
    setSessionCookie(response, request, session.token);
    respondJson(response, 200, {
      ok: true,
      user: toPublicUser(session.user),
    });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    const body = await readJsonBody(request);
    const session = await loginUser({
      email: body.email,
      password: body.password,
    });
    setSessionCookie(response, request, session.token);
    respondJson(response, 200, {
      ok: true,
      user: toPublicUser(session.user),
    });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/reset-password") {
    const body = await readJsonBody(request);
    const session = await resetUserPassword({
      email: body.email,
      password: body.password,
    });
    setSessionCookie(response, request, session.token);
    respondJson(response, 200, {
      ok: true,
      user: toPublicUser(session.user),
    });
    return;
  }

  if (method === "PATCH" && pathname === "/api/auth/profile") {
    const token = readSessionToken(request);
    if (!token) {
      throw createPublicError("You need to sign in again.", 401);
    }

    const body = await readJsonBody(request);
    const user = await updateUserProfileBySession(token, body);
    respondJson(response, 200, {
      ok: true,
      user: toPublicUser(user),
    });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/logout") {
    await deleteSession(readSessionToken(request));
    clearSessionCookie(response, request);
    respondJson(response, 200, { ok: true });
    return;
  }

  respondJson(response, 404, { ok: false, note: "Auth endpoint not found." });
}

function parseCoordinates(body) {
  const latitude = toNumber(body.latitude);
  const longitude = toNumber(body.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function clampNumber(value, minimum, maximum, fallback) {
  const parsed = toNumber(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}

function normalizeRouteMode(value) {
  return value === "riding" || value === "driving" || value === "walking" ? value : "walking";
}

function toNumber(value) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return Number(value);
  }

  return NaN;
}

function serveFrontendAsset(response, pathname, headOnly) {
  if (!existsSync(indexHtmlPath)) {
    respondText(
      response,
      503,
      "Frontend build not found. Run `npm run build` before starting the single-service server."
    );
    return;
  }

  const decodedPath = safeDecodePathname(pathname);
  const candidatePath = resolveDistPath(decodedPath);

  if (candidatePath && existsSync(candidatePath) && statSync(candidatePath).isFile()) {
    serveFile(
      response,
      candidatePath,
      headOnly,
      inferContentType(candidatePath),
      isImmutableAsset(decodedPath)
    );
    return;
  }

  if (decodedPath !== "/" && extname(decodedPath)) {
    respondText(response, 404, "Static asset not found.");
    return;
  }

  serveFile(response, indexHtmlPath, headOnly, "text/html; charset=utf-8", false);
}

function resolveDistPath(pathname) {
  const trimmedPath = pathname.replace(/^\/+/, "");
  if (!trimmedPath) {
    return null;
  }

  const candidatePath = resolve(distRoot, trimmedPath);
  return isPathInsideRoot(candidatePath, distRoot) ? candidatePath : null;
}

function isPathInsideRoot(targetPath, rootPath) {
  const normalizedTarget = normalize(targetPath).toLowerCase();
  const normalizedRoot = normalize(rootPath).toLowerCase();
  return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(`${normalizedRoot}${sep}`);
}

function serveFile(response, filePath, headOnly, contentType, immutable) {
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
  });

  if (headOnly) {
    response.end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on("error", () => {
    if (!response.headersSent) {
      respondText(response, 500, "Failed to read the requested file.");
      return;
    }

    response.destroy();
  });
  stream.pipe(response);
}

function inferContentType(filePath) {
  switch (extname(filePath).toLowerCase()) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".ico":
      return "image/x-icon";
    case ".jpeg":
    case ".jpg":
      return "image/jpeg";
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".map":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".webp":
      return "image/webp";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}

function isImmutableAsset(pathname) {
  return pathname.startsWith("/assets/") || (pathname.includes(".") && pathname !== "/index.html");
}

function safeDecodePathname(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  return rawBody ? JSON.parse(rawBody) : {};
}

function respondJson(response, statusCode, payload) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
  response.writeHead(statusCode, mergePendingHeaders(response, headers));
  response.end(JSON.stringify(payload));
}

function respondText(response, statusCode, message) {
  const headers = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  };
  response.writeHead(statusCode, mergePendingHeaders(response, headers));
  response.end(message);
}

function respondEmpty(response, statusCode) {
  response.writeHead(statusCode);
  response.end();
}

function respondBasicAuthRequired(response) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "WWW-Authenticate": 'Basic realm="Wander Internal Test", charset="UTF-8"',
  };
  response.writeHead(401, mergePendingHeaders(response, headers));
  response.end(
    JSON.stringify({
      ok: false,
      note: "Internal test access is protected.",
    })
  );
}

function setSessionCookie(response, request, token) {
  const secure = isSecureRequest(request);
  setPendingHeader(
    response,
    "Set-Cookie",
    `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 14}${secure ? "; Secure" : ""}`
  );
}

function clearSessionCookie(response, request) {
  const secure = isSecureRequest(request);
  setPendingHeader(
    response,
    "Set-Cookie",
    `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`
  );
}

function readSessionToken(request) {
  const cookies = parseCookies(request.headers.cookie || "");
  return cookies[sessionCookieName] || "";
}

function parseCookies(header) {
  const result = {};
  header.split(";").forEach((part) => {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex < 0) {
      return;
    }

    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (key) {
      result[key] = decodeURIComponent(value);
    }
  });
  return result;
}

function setPendingHeader(response, key, value) {
  response.__wanderHeaders = {
    ...(response.__wanderHeaders || {}),
    [key]: value,
  };
}

function mergePendingHeaders(response, headers) {
  return {
    ...(response.__wanderHeaders || {}),
    ...headers,
  };
}

function isSecureRequest(request) {
  return request.headers["x-forwarded-proto"] === "https" || request.socket?.encrypted;
}

function isInternalRequestAuthorized(request) {
  if (!basicAuthEnabled) {
    return true;
  }

  const header = request.headers.authorization || "";
  const prefix = "Basic ";
  if (!header.startsWith(prefix)) {
    return false;
  }

  try {
    const decoded = Buffer.from(header.slice(prefix.length).trim(), "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex < 0) {
      return false;
    }

    const user = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);
    return safeTextEqual(user, basicAuthUser) && safeTextEqual(password, basicAuthPassword);
  } catch {
    return false;
  }
}

function safeTextEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  });
}
