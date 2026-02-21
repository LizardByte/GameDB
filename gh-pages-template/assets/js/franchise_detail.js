/**
 * franchise_detail.js
 * Renders a single franchise detail page.
 * Depends on item_detail.js being loaded first.
 */

function renderFranchise(data) {
    document.title = (data.name || "Franchise") + " – GameDB";
    document.getElementById("franchise-name").textContent = data.name || "Unknown Franchise";

    // IGDB link
    if (data.url) {
        const igdbLink = document.getElementById("franchise-igdb-link");
        igdbLink.href = data.url;
        igdbLink.classList.remove("d-none");
    }

    // Games
    if (data.games && data.games.length > 0) {
        const section = document.getElementById("franchise-games-section");
        section.classList.remove("d-none");
        renderGameList(document.getElementById("franchise-games"), data.games);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadItemDetail("franchises", renderFranchise);
});

/* istanbul ignore next */
if (typeof module !== "undefined") {
    module.exports = {
        renderFranchise,
    };
}
