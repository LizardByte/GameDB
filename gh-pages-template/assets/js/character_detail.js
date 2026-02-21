/**
 * character_detail.js
 * Renders a single character detail page.
 * Depends on item_detail.js being loaded first.
 */

function renderCharacter(data) {
    document.title = (data.name || "Character") + " – GameDB";
    document.getElementById("character-name").textContent = data.name || "Unknown Character";

    // Mug shot
    const mugEl = document.getElementById("character-mug");
    const mugPlaceholder = document.getElementById("character-mug-placeholder");
    const mugUrl = data.mug_shot?.url
        ? igdbImageUrl(data.mug_shot.url, "t_cover_big_2x")
        : null;
    if (mugUrl) {
        mugEl.src = mugUrl;
        mugEl.alt = data.name || "";
        mugEl.style.display = "";
    } else {
        mugPlaceholder.style.display = null;
        mugPlaceholder.style.removeProperty("display");
    }

    // Badges / meta
    const badgesEl = document.getElementById("character-badges");

    if (data.character_gender?.name) {
        badgesEl.appendChild(makeBadge(data.character_gender.name, "bg-info text-dark"));
    }
    if (data.character_species?.name) {
        badgesEl.appendChild(makeBadge(data.character_species.name, "bg-secondary"));
    }

    // Games
    if (data.games && data.games.length > 0) {
        const section = document.getElementById("character-games-section");
        section.classList.remove("d-none");
        renderGameList(document.getElementById("character-games"), data.games);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadItemDetail("characters", renderCharacter);
});
