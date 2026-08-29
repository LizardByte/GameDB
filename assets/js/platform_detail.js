/**
 * platform_detail.js
 * Renders a single platform detail page.
 * Depends on item_detail.js being loaded first.
 */

const SPEC_LABELS = {
    cpu: "CPU",
    graphics: "Graphics",
    memory: "Memory",
    storage: "Storage",
    media: "Media",
    connectivity: "Connectivity",
    output: "Output",
    resolutions: "Resolutions",
    sound: "Sound",
    os: "OS",
};

const CATEGORY_NAMES = {
    1: "Console",
    2: "Arcade",
    3: "Platform",
    4: "Operating System",
    5: "Portable Console",
    6: "Computer",
};

/**
 * Render platform logo or placeholder
 */
function renderPlatformLogo(data) {
    const logoEl = document.getElementById("platform-logo");
    const logoPlaceholder = document.getElementById("platform-logo-placeholder");
    const logoUrl = data.platform_logo?.url
        ? igdbImageUrl(data.platform_logo.url, "t_logo_med_2x")
        : null;
    if (logoUrl) {
        logoEl.src = logoUrl;
        logoEl.alt = data.name || "";
        logoEl.style.display = "";
    } else {
        logoPlaceholder.style.display = null;
        logoPlaceholder.style.removeProperty("display");
    }
}

/**
 * Render platform badges (category, generation)
 */
function renderPlatformBadges(data) {
    const badgesEl = document.getElementById("platform-badges");
    if (data.category !== undefined) {
        badgesEl.appendChild(makeBadge(CATEGORY_NAMES[data.category] || `Category ${data.category}`, "bg-primary"));
    }
    if (data.generation !== undefined) {
        badgesEl.appendChild(makeBadge(`Gen ${data.generation}`, "bg-secondary"));
    }
}

/**
 * Render platform metadata (games count, abbreviation, etc.)
 */
function renderPlatformMetadata(data) {
    const metaDl = document.getElementById("platform-meta");

    if (data.games && data.games.length > 0) {
        addDlRow(metaDl, "Games", `${data.games.length} game${data.games.length === 1 ? '' : 's'}`);
    }

    if (data.abbreviation) {
        addDlRow(metaDl, "Abbreviation", data.abbreviation);
    }
    if (data.alternative_name) {
        addDlRow(metaDl, "Also Known As", data.alternative_name);
    }
    if (data.platform_type?.name) {
        addDlRow(metaDl, "Type", data.platform_type.name);
    }
}

/**
 * Create accordion item for a platform version
 */
function createVersionAccordionItem(version, index) {
    const itemId = `version-accordion-${index}`;
    const headingId = `version-heading-${index}`;

    const item = document.createElement("div");
    item.className = "accordion-item rounded-0";

    // Header
    const header = document.createElement("h2");
    header.className = "accordion-header";
    header.id = headingId;
    item.appendChild(header);

    const button = document.createElement("button");
    button.className = "accordion-button" + (index > 0 ? " collapsed" : "");
    button.type = "button";
    button.dataset.bsToggle = "collapse";
    button.dataset.bsTarget = `#${itemId}`;
    button.setAttribute("aria-expanded", index === 0 ? "true" : "false");
    button.setAttribute("aria-controls", itemId);
    button.textContent = version.name || `Version ${index + 1}`;

    // Add logo next to version name if available
    if (version.platform_logo?.url) {
        const vLogo = document.createElement("img");
        vLogo.src = igdbImageUrl(version.platform_logo.url, "t_thumb");
        vLogo.alt = "";
        vLogo.className = "me-2";
        vLogo.style.height = "35px";
        vLogo.style.objectFit = "contain";
        button.prepend(vLogo);
    }

    header.appendChild(button);

    // Collapse body
    const collapseDiv = document.createElement("div");
    collapseDiv.id = itemId;
    collapseDiv.className = "accordion-collapse collapse" + (index === 0 ? " show" : "");
    collapseDiv.setAttribute("aria-labelledby", headingId);
    item.appendChild(collapseDiv);

    const body = document.createElement("div");
    body.className = "accordion-body";
    collapseDiv.appendChild(body);

    populateVersionBody(body, version);

    return item;
}

/**
 * Populate version accordion body with content
 */
function populateVersionBody(body, version) {
    // Summary
    if (version.summary) {
        const p = document.createElement("p");
        p.textContent = version.summary;
        body.appendChild(p);
    }

    // Release dates
    if (version.platform_version_release_dates && version.platform_version_release_dates.length > 0) {
        const rdHeading = document.createElement("h6");
        rdHeading.textContent = "Release Dates";
        body.appendChild(rdHeading);

        const rdList = document.createElement("ul");
        rdList.className = "list-unstyled ms-2 mb-3";
        version.platform_version_release_dates.forEach(rd => {
            const li = document.createElement("li");
            const regionName = rd.release_region?.region;
            const flag = regionName ? getRegionFlag(regionName) : "🌐";
            li.textContent = `${flag} ${rd.human || rd.y || ""}`;
            rdList.appendChild(li);
        });
        body.appendChild(rdList);
    }

    // Specs
    const specDl = document.createElement("dl");
    specDl.className = "row mb-0";
    let hasSpecs = false;

    Object.entries(SPEC_LABELS).forEach(([key, label]) => {
        if (version[key]) {
            hasSpecs = true;
            addDlRow(specDl, label, version[key]);
        }
    });

    if (hasSpecs) {
        const specHeading = document.createElement("h6");
        specHeading.textContent = "Specifications";
        body.appendChild(specHeading);
        body.appendChild(specDl);
    }

    // IGDB link
    if (version.url) {
        const a = document.createElement("a");
        a.href = version.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.className = "btn btn-outline-secondary btn-sm mt-2";
        a.textContent = "View version on IGDB";
        body.appendChild(a);
    }
}

function renderPlatform(data) {
    document.title = (data.name || "Platform") + " – GameDB";
    document.getElementById("platform-name").textContent = data.name || "Unknown Platform";

    renderPlatformLogo(data);
    renderPlatformBadges(data);
    renderPlatformMetadata(data);

    // Summary
    if (data.summary) {
        const summarySection = document.getElementById("platform-summary-section");
        summarySection.classList.remove("d-none");
        document.getElementById("platform-summary").textContent = data.summary;
    }

    // Hardware Versions
    if (data.versions && data.versions.length > 0) {
        const section = document.getElementById("platform-versions-section");
        section.classList.remove("d-none");
        const accordion = document.getElementById("platform-versions");
        data.versions.forEach((version, index) => {
            accordion.appendChild(createVersionAccordionItem(version, index));
        });
    }

    // Games on this platform
    if (data.games && data.games.length > 0) {
        const section = document.getElementById("platform-games-section");
        section.classList.remove("d-none");
        const container = document.getElementById("platform-games");
        renderGameList(container, data.games);
    }

    // IGDB link
    if (data.url) {
        const igdbLink = document.getElementById("platform-igdb-link");
        igdbLink.href = data.url;
        igdbLink.classList.remove("d-none");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadItemDetail("platforms", renderPlatform);
});

/* istanbul ignore next */
if (typeof module !== "undefined") {
    module.exports = {
        renderPlatformLogo,
        renderPlatformBadges,
        renderPlatformMetadata,
        createVersionAccordionItem,
        populateVersionBody,
        renderPlatform,
    };
}
