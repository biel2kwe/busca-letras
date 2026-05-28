const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = path.join(__dirname, "public");
const LRCLIB_API = "https://lrclib.net/api";
const USER_AGENT = "BuscadorDeLetras/1.0 (local app)";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function sendError(response, statusCode, message) {
  sendJson(response, statusCode, { error: message });
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const apiResponse = await fetch(url, {
      headers: {
        "accept": "application/json",
        "user-agent": USER_AGENT
      },
      signal: controller.signal
    });

    const body = await apiResponse.text();
    let data = null;

    try {
      data = body ? JSON.parse(body) : null;
    } catch {
      throw new Error("A fonte de letras retornou uma resposta inesperada.");
    }

    if (!apiResponse.ok) {
      const message = data?.message || "Nao foi possivel consultar a fonte de letras.";
      const error = new Error(message);
      error.statusCode = apiResponse.status;
      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function publicFilePath(requestPath) {
  const cleanPath = decodeURIComponent(requestPath.split("?")[0]);
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  const resolvedPath = path.normalize(path.join(PUBLIC_DIR, relativePath));
  const relativeToPublic = path.relative(PUBLIC_DIR, resolvedPath);

  if (relativeToPublic.startsWith("..") || path.isAbsolute(relativeToPublic)) {
    return null;
  }

  return resolvedPath;
}

async function serveStatic(request, response) {
  const filePath = publicFilePath(request.url);

  if (!filePath) {
    response.writeHead(403);
    response.end("Acesso negado.");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();

    response.writeHead(200, {
      "content-type": mimeTypes[extension] || "application/octet-stream",
      "cache-control": "no-cache"
    });
    response.end(file);
  } catch (error) {
    if (error.code === "ENOENT") {
      response.writeHead(404);
      response.end("Pagina nao encontrada.");
      return;
    }

    response.writeHead(500);
    response.end("Erro ao carregar arquivo.");
  }
}

async function handleApi(request, response, url) {
  if (request.method !== "GET") {
    sendError(response, 405, "Metodo nao permitido.");
    return;
  }

  if (url.pathname === "/api/search") {
    const query = (url.searchParams.get("q") || "").trim();

    if (!query) {
      sendError(response, 400, "Digite o nome da musica ou do cantor.");
      return;
    }

    if (query.length > 120) {
      sendError(response, 400, "Use uma busca menor.");
      return;
    }

    try {
      const data = await fetchJson(`${LRCLIB_API}/search?q=${encodeURIComponent(query)}`);
      sendJson(response, 200, Array.isArray(data) ? data.slice(0, 20) : []);
    } catch (error) {
      sendError(response, error.statusCode || 502, error.message || "Erro na busca.");
    }

    return;
  }

  const lyricsMatch = url.pathname.match(/^\/api\/lyrics\/(\d+)$/);

  if (lyricsMatch) {
    try {
      const data = await fetchJson(`${LRCLIB_API}/get/${lyricsMatch[1]}`);
      sendJson(response, 200, data);
    } catch (error) {
      sendError(response, error.statusCode || 502, error.message || "Letra nao encontrada.");
    }

    return;
  }

  sendError(response, 404, "Endpoint nao encontrado.");
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    await serveStatic(request, response);
  } catch {
    sendError(response, 500, "Erro interno do app.");
  }
});

if (require.main === module) {
  server.listen(PORT);
}

module.exports = { server };
