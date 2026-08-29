/**
 * group_detail.js
 * Renders a single collection (series) or franchise detail page.
 * Depends on item_detail.js being loaded first.
 *
 * The page must define a `GAMEDB_GROUP_TYPE` global before loading this script:
 *   <script>globalThis.GAMEDB_GROUP_TYPE = "collection";</script>  (for collections)
 *   <script>globalThis.GAMEDB_GROUP_TYPE = "franchise";</script>   (for franchises)
 *
 * Expected DOM element IDs follow the pattern `<type>-*`, e.g.:
 *   collection-name, collection-igdb-link, collection-games-section, collection-games
 *   franchise-name,  franchise-igdb-link,  franchise-games-section,  franchise-games
 */

const GROUP_CONFIG = {
    collection: {
        endpoint: "collections",
        defaultTitle: "Series",
        defaultName: "Unknown Series",
    },
    franchise: {
        endpoint: "franchises",
        defaultTitle: "Franchise",
        defaultName: "Unknown Franchise",
    },
};

function renderGroup(data) {
    const type = globalThis.GAMEDB_GROUP_TYPE || "collection";
    const config = GROUP_CONFIG[type];

    document.title = (data.name || config.defaultTitle) + " – GameDB";
    document.getElementById(`${type}-name`).textContent = data.name || config.defaultName;

    // IGDB link
    if (data.url) {
        const igdbLink = document.getElementById(`${type}-igdb-link`);
        igdbLink.href = data.url;
        igdbLink.classList.remove("d-none");
    }

    // Games
    if (data.games && data.games.length > 0) {
        const section = document.getElementById(`${type}-games-section`);
        section.classList.remove("d-none");
        renderGameList(document.getElementById(`${type}-games`), data.games);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const type = globalThis.GAMEDB_GROUP_TYPE || "collection";
    const config = GROUP_CONFIG[type];
    loadItemDetail(config.endpoint, renderGroup);
});

/* istanbul ignore next */
if (typeof module !== "undefined") {
    module.exports = {
        GROUP_CONFIG,
        renderGroup,
    };
}
