/**
 * item_detail.js
 *
 * Shared utility for GameDB item detail pages.
 * Each page calls `loadItemDetail(endpoint, renderFn)` on DOMContentLoaded.
 *
 * The page URL is expected to contain `?id=<item_id>`.
 *
 * Requires window.GAMEDB_CONFIG to be set by an inline <script> in the page:
 *   window.GAMEDB_CONFIG = { base_path: "{{ site.baseurl }}", base_url: "{{ site.url }}{{ site.baseurl }}" };
 */

const base_path = (globalThis.GAMEDB_CONFIG?.base_path
    ? ("/" + globalThis.GAMEDB_CONFIG.base_path).replaceAll(/\/+/g, "/").replace(/\/$/, "")
    : "/GameDB");
const base_url = globalThis.location.origin + base_path;

/**
 * Read a query-string parameter from the current URL.
 * @param {string} name
 * @returns {string|null}
 */
function getQueryParam(name) {
    const params = new URLSearchParams(globalThis.location.search);
    return params.get(name);
}

/**
 * Build an IGDB image URL at a given size.
 * @param {string} url - raw URL from IGDB (may start with //)
 * @param {string} [size="t_cover_big"]
 * @returns {string}
 */
function igdbImageUrl(url, size = "t_cover_big") {
    if (!url) return null;
    return url.replace("t_thumb", size).replace(/^\/\//, "https://");
}

/**
 * Create a Bootstrap badge element.
 * @param {string} text
 * @param {string} [cls="bg-secondary"]
 * @returns {HTMLElement}
 */
function makeBadge(text, cls = "bg-secondary") {
    const b = document.createElement("span");
    b.className = `badge ${cls} me-1 mb-1`;
    b.style.whiteSpace = "nowrap";
    b.textContent = text;
    return b;
}

/**
 * Render a key-value row inside a <dl>.
 * @param {HTMLElement} dl
 * @param {string} label
 * @param {string|HTMLElement} value
 */
function addDlRow(dl, label, value) {
    const dt = document.createElement("dt");
    dt.className = "col-sm-4 col-md-3 fw-semibold";
    dt.textContent = label;
    dl.appendChild(dt);

    const dd = document.createElement("dd");
    dd.className = "col-sm-8 col-md-9";
    if (value instanceof HTMLElement || value instanceof DocumentFragment) {
        dd.appendChild(value);
    } else {
        dd.textContent = value;
    }
    dl.appendChild(dd);
}

/**
 * Show an error message in #item-error and hide #item-content.
 * @param {string} message
 */
function showError(message) {
    const errEl = document.getElementById("item-error");
    const contentEl = document.getElementById("item-content");
    if (errEl) {
        errEl.textContent = message;
        errEl.classList.remove("d-none");
    }
    if (contentEl) {
        contentEl.classList.add("d-none");
    }
    const loadingEl = document.getElementById("item-loading");
    if (loadingEl) loadingEl.classList.add("d-none");
}

/**
 * Load an item from the API and call the render function.
 * @param {string} endpoint - e.g. "games", "platforms"
 * @param {function} renderFn - called with the item data object
 */
function loadItemDetail(endpoint, renderFn) {
    const id = getQueryParam("id");
    if (!id) {
        showError("No item ID specified. Please go back and select an item.");
        return;
    }

    const url = `${base_url}/${endpoint}/${encodeURIComponent(id)}.json`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Item not found (HTTP ${response.status})`);
            }
            return response.json();
        })
        .then(data => {
            const loadingEl = document.getElementById("item-loading");
            if (loadingEl) loadingEl.classList.add("d-none");
            const contentEl = document.getElementById("item-content");
            if (contentEl) contentEl.classList.remove("d-none");
            renderFn(data);
        })
        .catch(err => {
            showError(`Failed to load item: ${err.message}`);
        });
}

/**
 * Render a list of game cards (compact) into a container element.
 * Games are fetched from individual game files when needed to get cover art.
 * @param {HTMLElement} container
 * @param {Array<number|object>} games - array of game IDs or game objects with {id, name, cover}
 */
function renderGameList(container, games) {
    if (!games || games.length === 0) {
        container.textContent = "No games listed.";
        return;
    }

    const row = document.createElement("div");
    row.className = "row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-2";
    container.appendChild(row);

    // Separate games into those with full data and those that need fetching
    const gamesToFetch = [];
    const gamesWithData = [];

    games.forEach(game => {
        const gameId = typeof game === "object" ? game.id : game;
        const hasFullData = typeof game === "object" && game.name && game.cover;

        if (hasFullData) {
            gamesWithData.push(game);
        } else {
            gamesToFetch.push(gameId);
        }
    });

    // Render games that already have full data
    gamesWithData.forEach(game => {
        /* istanbul ignore next */
        renderGameCard(row, game.id, game.name, game.cover ? igdbImageUrl(game.cover.url, "t_cover_small_2x") : null);
    });

    // Fetch and render games that only have IDs
    if (gamesToFetch.length > 0) {
        // Fetch each game's data
        const fetchPromises = gamesToFetch.map(gameId => {
            return fetch(`${base_path}/games/${gameId}.json`)
                .then(r => r.ok ? r.json() : null)
                .then(gameData => ({ id: gameId, data: gameData }))
                .catch(() => ({ id: gameId, data: null }));
        });

        Promise.all(fetchPromises).then(results => {
            results.forEach(({ id, data }) => {
                const name = data ? data.name : null;
                const coverUrl = data?.cover ? igdbImageUrl(data.cover.url, "t_cover_small_2x") : null;
                renderGameCard(row, id, name, coverUrl);
            });
        });
    }
}

/**
 * Helper function to render a single game card
 */
function renderGameCard(row, gameId, gameName, coverUrl) {
    const col = document.createElement("div");
    col.className = "col";
    row.appendChild(col);

    const card = document.createElement("a");
    card.className = "card h-100 text-decoration-none shadow-sm border-0 rounded-0 game-card";
    card.href = `${base_path}/browse/games/?id=${gameId}`;
    col.appendChild(card);

    if (coverUrl) {
        const img = document.createElement("img");
        img.className = "card-img-top rounded-0";
        img.src = coverUrl;
        img.alt = gameName || "";
        img.loading = "lazy";
        card.appendChild(img);
    } else {
        const placeholder = document.createElement("div");
        placeholder.className = "card-img-top bg-secondary d-flex align-items-center justify-content-center";
        placeholder.style.height = "120px";
        const icon = document.createElement("span");
        icon.className = "material-symbols-outlined text-white";
        icon.textContent = "sports_esports";
        placeholder.appendChild(icon);
        card.appendChild(placeholder);
    }

    const cardBody = document.createElement("div");
    cardBody.className = "card-body p-1";
    card.appendChild(cardBody);

    if (gameName) {
        const nameEl = document.createElement("p");
        nameEl.className = "card-text small mb-0 text-truncate";
        nameEl.textContent = gameName;
        nameEl.title = gameName;
        cardBody.appendChild(nameEl);
    } else {
        // Show game ID as fallback
        const nameEl = document.createElement("p");
        nameEl.className = "card-text small mb-0 text-muted";
        nameEl.textContent = `Game #${gameId}`;
        cardBody.appendChild(nameEl);
    }
}

/* istanbul ignore next */
if (typeof module !== "undefined") {
    module.exports = {
        getQueryParam,
        igdbImageUrl,
        makeBadge,
        addDlRow,
        showError,
        loadItemDetail,
        renderGameList,
        renderGameCard,
    };
}
