const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");
const searchButton = document.querySelector("#search-button");
const quickButtons = document.querySelectorAll("[data-query]");
const resultCount = document.querySelector("#result-count");
const resultsList = document.querySelector("#results-list");
const emptyState = document.querySelector("#empty-state");
const loadingState = document.querySelector("#loading-state");
const errorState = document.querySelector("#error-state");
const errorMessage = document.querySelector("#error-message");
const lyricsEmpty = document.querySelector("#lyrics-empty");
const lyricsContent = document.querySelector("#lyrics-content");
const lyricsArtist = document.querySelector("#lyrics-artist");
const lyricsTitle = document.querySelector("#lyrics-title");
const lyricsMeta = document.querySelector("#lyrics-meta");
const lyricsText = document.querySelector("#lyrics-text");
const lyricsMode = document.querySelector("#lyrics-mode");
const copyButton = document.querySelector("#copy-button");
const copyFeedback = document.querySelector("#copy-feedback");
const sourceLink = document.querySelector("#source-link");

const state = {
  selectedId: null,
  selectedLyrics: null,
  mode: "plain"
};

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "";
  }

  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripSyncedLyrics(syncedLyrics) {
  if (!syncedLyrics) {
    return "";
  }

  return syncedLyrics
    .split("\n")
    .map((line) => line.replace(/^(\[\d{2}:\d{2}(?:\.\d{2,3})?\])+/, "").trim())
    .filter(Boolean)
    .join("\n");
}

function displayLyricsForMode() {
  const lyrics = state.selectedLyrics;

  if (!lyrics) {
    return;
  }

  const syncedButton = lyricsMode.querySelector('[data-mode="synced"]');
  syncedButton.disabled = !lyrics.syncedLyrics;

  if (state.mode === "synced" && lyrics.syncedLyrics) {
    lyricsText.textContent = lyrics.syncedLyrics;
    return;
  }

  state.mode = "plain";
  updateModeButtons();

  if (lyrics.instrumental) {
    lyricsText.textContent = "Faixa instrumental.";
    return;
  }

  lyricsText.textContent = lyrics.plainLyrics || stripSyncedLyrics(lyrics.syncedLyrics) || "Letra indisponível para esta versão.";
}

function updateModeButtons() {
  lyricsMode.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.mode);
  });
}

function setSearchStatus(status, message = "") {
  emptyState.classList.toggle("hidden", status !== "empty");
  loadingState.classList.toggle("hidden", status !== "loading");
  errorState.classList.toggle("hidden", status !== "error");
  resultsList.classList.toggle("hidden", status === "loading" || status === "error");

  if (message) {
    errorMessage.textContent = message;
  }
}

function setBusy(isBusy) {
  searchButton.disabled = isBusy;
  searchButton.querySelector("span").textContent = isBusy ? "Buscando..." : "Buscar";
}

function renderResults(results) {
  resultCount.textContent = results.length;
  resultsList.innerHTML = "";

  if (!results.length) {
    setSearchStatus("error", "Nenhuma letra encontrada para essa busca.");
    return;
  }

  setSearchStatus("results");

  const fragment = document.createDocumentFragment();

  results.forEach((item) => {
    const button = document.createElement("button");
    const duration = formatDuration(item.duration);

    button.type = "button";
    button.className = "result-card";
    button.dataset.id = item.id;
    button.innerHTML = `
      <span class="result-title">${escapeHtml(item.trackName || item.name || "Sem título")}</span>
      <span class="result-subtitle">${escapeHtml(item.artistName || "Artista desconhecido")}</span>
      <span class="result-meta">
        ${item.albumName ? `<span class="tag">${escapeHtml(item.albumName)}</span>` : ""}
        ${duration ? `<span class="tag">${duration}</span>` : ""}
        ${item.plainLyrics ? '<span class="tag good">letra</span>' : ""}
        ${item.syncedLyrics ? '<span class="tag good">sincronizada</span>' : ""}
        ${item.instrumental ? '<span class="tag warn">instrumental</span>' : ""}
      </span>
    `;

    button.addEventListener("click", () => loadLyrics(item.id, button));
    fragment.appendChild(button);
  });

  resultsList.appendChild(fragment);
}

async function searchLyrics(query) {
  const cleanQuery = query.trim();

  if (!cleanQuery) {
    input.focus();
    return;
  }

  setBusy(true);
  resultCount.textContent = "0";
  resultsList.innerHTML = "";
  setSearchStatus("loading");

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(cleanQuery)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Não foi possível buscar agora.");
    }

    renderResults(data);
  } catch (error) {
    resultCount.textContent = "0";
    setSearchStatus("error", error.message || "Não foi possível buscar agora.");
  } finally {
    setBusy(false);
  }
}

async function loadLyrics(id, card) {
  state.selectedId = id;
  state.selectedLyrics = null;
  state.mode = "plain";
  updateModeButtons();

  document.querySelectorAll(".result-card").forEach((item) => {
    item.classList.toggle("active", item === card);
  });

  lyricsEmpty.classList.add("hidden");
  lyricsContent.classList.remove("hidden");
  lyricsArtist.textContent = "Carregando";
  lyricsTitle.textContent = "Abrindo letra...";
  lyricsMeta.textContent = "";
  lyricsText.textContent = "Buscando a letra completa...";
  copyFeedback.textContent = "";

  try {
    const response = await fetch(`/api/lyrics/${id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Letra não encontrada.");
    }

    state.selectedLyrics = data;
    const duration = formatDuration(data.duration);

    lyricsArtist.textContent = data.artistName || "Artista desconhecido";
    lyricsTitle.textContent = data.trackName || data.name || "Sem título";
    lyricsMeta.textContent = [data.albumName, duration].filter(Boolean).join(" • ");
    sourceLink.href = `https://lrclib.net/api/get/${data.id}`;
    displayLyricsForMode();
  } catch (error) {
    lyricsArtist.textContent = "Não encontrado";
    lyricsTitle.textContent = "Letra indisponível";
    lyricsMeta.textContent = "";
    lyricsText.textContent = error.message || "Não foi possível abrir a letra.";
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  searchLyrics(input.value);
});

quickButtons.forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.dataset.query;
    searchLyrics(button.dataset.query);
  });
});

lyricsMode.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-mode]");

  if (!button || button.disabled) {
    return;
  }

  state.mode = button.dataset.mode;
  updateModeButtons();
  displayLyricsForMode();
});

copyButton.addEventListener("click", async () => {
  const text = lyricsText.textContent.trim();

  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    copyFeedback.textContent = "Copiado";
    setTimeout(() => {
      copyFeedback.textContent = "";
    }, 1600);
  } catch {
    copyFeedback.textContent = "Não foi possível copiar";
  }
});
