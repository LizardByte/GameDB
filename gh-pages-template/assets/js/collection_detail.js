/**
 * collection_detail.js
 * Renders a single collection (series) detail page.
 * Depends on item_detail.js being loaded first.
 */

function renderCollection(data) {
    document.title = (data.name || "Series") + " – GameDB";
    document.getElementById("collection-name").textContent = data.name || "Unknown Series";

    // IGDB link
    if (data.url) {
        const igdbLink = document.getElementById("collection-igdb-link");
        igdbLink.href = data.url;
        igdbLink.classList.remove("d-none");
    }

    // Games
    if (data.games && data.games.length > 0) {
        const section = document.getElementById("collection-games-section");
        section.classList.remove("d-none");
        renderGameList(document.getElementById("collection-games"), data.games);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadItemDetail("collections", renderCollection);
});

/* istanbul ignore next */
if (typeof module !== "undefined") {
    module.exports = {
        renderCollection,
    };
}
