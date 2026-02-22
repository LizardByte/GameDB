/**
 * game_detail.js
 * Renders a single game detail page.
 * Depends on item_detail.js being loaded first.
 */

/**
 * Set up game banner/artworks in page header
 */
function setupGameBanner(data) {
    const pageHeading = document.querySelector("header.header-section .page-heading");

    if (data.artworks && data.artworks.length > 0) {
        const bigImgsEl = document.getElementById("header-big-imgs");
        const pageHeader = document.querySelector("header.header-section .intro-header");

        if (pageHeader) {
            // Set data attributes for each artwork
            bigImgsEl.dataset.numImg = data.artworks.length;
            data.artworks.forEach((artwork, index) => {
                const imgNum = index + 1;
                bigImgsEl.dataset[`imgSrc${imgNum}`] = igdbImageUrl(artwork.url, "t_screenshot_huge_2x");
            });

            // Add big-img class and img-desc span to existing header
            pageHeader.classList.add("big-img");

            // Add img-desc span if it doesn't exist
            if (!pageHeader.querySelector(".img-desc")) {
                const imgDesc = document.createElement("span");
                imgDesc.className = "img-desc";
                pageHeader.appendChild(imgDesc);
            }

            // Hide the .page-heading (but keep space) when there's a banner image
            if (pageHeading) {
                pageHeading.style.visibility = "hidden";
            }

            // Initialize the image display
            initGameBanner();
        }
    } else if (pageHeading) {
        // No banner image, completely hide the .page-heading
        pageHeading.style.display = "none";
    }
}

/**
 * Render game cover image or placeholder
 */
function renderGameCover(data) {
    const coverEl = document.getElementById("game-cover");
    const coverPlaceholder = document.getElementById("game-cover-placeholder");
    if (data.cover?.url) {
        coverEl.src = igdbImageUrl(data.cover.url, "t_cover_big_2x");
        coverEl.alt = data.name || "";
        coverEl.style.display = "";
    } else {
        coverPlaceholder.style.display = null;
        coverPlaceholder.style.removeProperty("display");
    }
}

/**
 * Render game badges (genres, themes, modes, perspectives)
 */
function renderGameBadges(data) {
    const badgesEl = document.getElementById("game-badges");

    const addBadgeGroup = (items, cls) => {
        if (items && items.length > 0) {
            items.forEach(item => badgesEl.appendChild(makeBadge(item.name, cls)));
        }
    };

    addBadgeGroup(data.genres, "bg-primary");
    addBadgeGroup(data.themes, "bg-info text-dark");
    addBadgeGroup(data.game_modes, "bg-success");
    addBadgeGroup(data.player_perspectives, "bg-warning text-dark");
}

/**
 * Render ratings (user and critic)
 */
function renderGameRatings(data, metaDl) {
    if (data.rating !== undefined && data.rating !== null) {
        addDlRow(metaDl, "User Rating", `${Math.round(data.rating)} / 100`);
    }
    if (data.aggregated_rating !== undefined && data.aggregated_rating !== null) {
        addDlRow(metaDl, "Critic Rating", `${Math.round(data.aggregated_rating)} / 100`);
    }

    // Age ratings
    if (data.age_ratings && data.age_ratings.length > 0) {
        const ratingsEl = document.createDocumentFragment();
        data.age_ratings.forEach(r => {
            if (r.rating_category && r.organization) {
                const badge = makeBadge(`${r.organization.name}: ${r.rating_category.rating}`, "bg-dark");
                ratingsEl.appendChild(badge);
            }
        });
        if (ratingsEl.childElementCount > 0) {
            addDlRow(metaDl, "Age Ratings", ratingsEl);
        }
    }
}

/**
 * Render platforms (async)
 */
function renderGamePlatforms(data, metaDl) {
    if (data.platforms && data.platforms.length > 0) {
        const platformsEl = document.createDocumentFragment();
        const platformUrl = `${base_url}/platforms/all.json`;
        fetch(platformUrl)
            .then(r => r.json())
            .then(allPlatforms => {
                data.platforms.forEach(platformId => {
                    const p = allPlatforms[String(platformId)];
                    const name = p ? p.name : `Platform #${platformId}`;
                    const a = document.createElement("a");
                    a.href = `${base_path}/browse/platforms/?id=${platformId}`;
                    a.className = "text-decoration-none me-1";
                    a.appendChild(makeBadge(name, "bg-secondary"));
                    platformsEl.appendChild(a);
                });
                addDlRow(metaDl, "Platforms", platformsEl);
            })
            .catch(() => {
                const el = document.createDocumentFragment();
                data.platforms.forEach(pid => {
                    const a = document.createElement("a");
                    a.href = `${base_path}/browse/platforms/?id=${pid}`;
                    a.className = "text-decoration-none me-1";
                    a.appendChild(makeBadge(`#${pid}`, "bg-secondary"));
                    el.appendChild(a);
                });
                addDlRow(metaDl, "Platforms", el);
            });
    }
}

/**
 * Render release dates
 */
function renderReleaseDates(data, metaDl) {
    if (data.release_dates && data.release_dates.length > 0) {
        const releasesEl = document.createDocumentFragment();
        data.release_dates.forEach(rd => {
            if (rd.date || rd.y) {
                const div = document.createElement("div");
                const regionName = rd.release_region?.region || null;
                const flag = regionName ? getRegionFlag(regionName) : "";
                div.textContent = `${flag} ${rd.human || rd.y || ""}`.trim();
                releasesEl.appendChild(div);
            }
        });
        if (releasesEl.childElementCount > 0) {
            addDlRow(metaDl, "Release Dates", releasesEl);
        }
    }
}

/**
 * Render developers and publishers
 */
function renderCompanies(data, metaDl) {
    if (data.involved_companies && data.involved_companies.length > 0) {
        const devs = data.involved_companies.filter(c => c.developer).map(c => c.company?.name).filter(Boolean);
        const pubs = data.involved_companies.filter(c => !c.developer).map(c => c.company?.name).filter(Boolean);
        /* istanbul ignore else */
        if (devs.length > 0) {
            addDlRow(metaDl, "Developer(s)", devs.join(", "));
        }
        if (pubs.length > 0) {
            addDlRow(metaDl, "Publisher(s)", pubs.join(", "));
        }
    }
}

/**
 * Render collections and franchises
 */
function renderCollectionsAndFranchises(data, metaDl) {
    // Collections / series
    if (data.collections && data.collections.length > 0) {
        const el = document.createDocumentFragment();
        data.collections.forEach(c => {
            const a = document.createElement("a");
            a.href = `${base_path}/browse/collections/?id=${c.id || c}`;
            a.className = "text-decoration-none me-1";
            a.appendChild(makeBadge(c.name || `#${c}`, "bg-primary"));
            el.appendChild(a);
        });
        addDlRow(metaDl, "Series", el);
    }

    // Franchises
    if (data.franchises && data.franchises.length > 0) {
        const el = document.createDocumentFragment();
        data.franchises.forEach(f => {
            const a = document.createElement("a");
            a.href = `${base_path}/browse/franchises/?id=${f.id || f}`;
            a.className = "text-decoration-none me-1";
            a.appendChild(makeBadge(f.name || `#${f}`, "bg-info text-dark"));
            el.appendChild(a);
        });
        addDlRow(metaDl, "Franchise(s)", el);
    } else if (data.franchise?.name) {
        const el = document.createDocumentFragment();
        const a = document.createElement("a");
        a.href = `${base_path}/browse/franchises/?id=${data.franchise.id || ""}`;
        a.className = "text-decoration-none me-1";
        a.appendChild(makeBadge(data.franchise.name, "bg-info text-dark"));
        el.appendChild(a);
        addDlRow(metaDl, "Franchise", el);
    }
}

/**
 * Render multiplayer information
 */
function renderMultiplayer(data, metaDl) {
    if (data.multiplayer_modes && data.multiplayer_modes.length > 0) {
        const mm = data.multiplayer_modes[0];
        const parts = [];
        if (mm.offlinecoopmax) parts.push(`Co-op (offline): ${mm.offlinecoopmax} players`);
        if (mm.onlinecoopmax) parts.push(`Co-op (online): ${mm.onlinecoopmax} players`);
        if (mm.offlinemax) parts.push(`Versus (offline): ${mm.offlinemax} players`);
        if (mm.onlinemax) parts.push(`Versus (online): ${mm.onlinemax} players`);
        if (parts.length > 0) {
            addDlRow(metaDl, "Multiplayer", parts.join(" · "));
        }
    }
}

function renderGame(data) {
    // Title
    document.title = (data.name || "Game") + " – GameDB";

    // Set game name in both the page header and the content section
    const gameName = data.name || "Unknown Game";
    document.getElementById("game-name").textContent = gameName;

    // Also set in page header if it exists
    const pageHeaderH1 = document.querySelector("header.header-section .page-heading h1");
    if (pageHeaderH1) {
        pageHeaderH1.textContent = gameName;
    }

    setupGameBanner(data);
    renderGameCover(data);
    renderGameBadges(data);

    // Metadata dl
    const metaDl = document.getElementById("game-meta");

    renderGameRatings(data, metaDl);
    renderGamePlatforms(data, metaDl);
    renderReleaseDates(data, metaDl);
    renderCompanies(data, metaDl);
    renderCollectionsAndFranchises(data, metaDl);
    renderMultiplayer(data, metaDl);

    // Summary
    if (data.summary) {
        const summarySection = document.getElementById("game-summary-section");
        summarySection.classList.remove("d-none");
        document.getElementById("game-summary").textContent = data.summary;
    }

    // Storyline
    if (data.storyline) {
        const storylineSection = document.getElementById("game-storyline-section");
        storylineSection.classList.remove("d-none");
        document.getElementById("game-storyline").textContent = data.storyline;
    }

    renderScreenshots(data);
    renderVideos(data);
    renderExternalLinks(data);
    renderCharacters(data);

    // IGDB link
    if (data.url) {
        const igdbLink = document.getElementById("game-igdb-link");
        igdbLink.href = data.url;
        igdbLink.classList.remove("d-none");
    }
}

/**
 * Render screenshots section
 */
function renderScreenshots(data) {
    if (data.screenshots && data.screenshots.length > 0) {
        const section = document.getElementById("game-screenshots-section");
        section.classList.remove("d-none");
        const container = document.getElementById("game-screenshots");

        // Prepare full-size image URLs for modal
        const fullSizeUrls = data.screenshots.map(ss => igdbImageUrl(ss.url, "t_screenshot_huge_2x"));

        data.screenshots.forEach((ss, index) => {
            const col = document.createElement("div");
            col.className = "col";
            const btn = document.createElement("button");
            btn.className = "btn p-0 border-0 w-100";
            btn.onclick = () => globalThis.openImageModal(fullSizeUrls, index);
            const img = document.createElement("img");
            img.className = "img-fluid rounded shadow-sm w-100";
            img.src = igdbImageUrl(ss.url, "t_screenshot_med_2x");
            img.alt = "";
            img.loading = "lazy";
            img.style.cursor = "pointer";
            btn.appendChild(img);
            col.appendChild(btn);
            container.appendChild(col);
        });
    }
}

/**
 * Render videos section
 */
function renderVideos(data) {
    if (data.videos && data.videos.length > 0) {
        const section = document.getElementById("game-videos-section");
        section.classList.remove("d-none");
        const container = document.getElementById("game-videos");
        data.videos.forEach(video => {
            if (!video.video_id) return;
            const col = document.createElement("div");
            col.className = "col";
            const card = document.createElement("div");
            card.className = "card h-100 border-0 shadow-sm rounded-0";
            col.appendChild(card);
            container.appendChild(col);

            // Embed YouTube video
            const embedContainer = document.createElement("div");
            embedContainer.className = "ratio ratio-16x9 rounded-0";
            const iframe = document.createElement("iframe");
            iframe.src = `https://www.youtube.com/embed/${video.video_id}`;
            iframe.title = video.name || video.title || "Video";
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
            iframe.allowFullscreen = true;
            iframe.loading = "lazy";
            embedContainer.appendChild(iframe);
            card.appendChild(embedContainer);

            if (video.name || video.title) {
                const cardBody = document.createElement("div");
                cardBody.className = "card-body p-2";
                const title = document.createElement("p");
                title.className = "card-text small mb-0 fw-semibold";
                title.textContent = video.name || video.title;
                cardBody.appendChild(title);
                card.appendChild(cardBody);
            }
        });
    }
}

/**
 * Render external links section
 */
function renderExternalLinks(data) {
    if (data.external_games && data.external_games.length > 0) {
        const section = document.getElementById("game-external-section");
        section.classList.remove("d-none");
        const container = document.getElementById("game-external");
        data.external_games.forEach(ext => {
            if (!ext.url && !ext.uid) return;
            const sourceName = ext.external_game_source?.name || "External";
            const a = document.createElement("a");
            a.href = ext.url || "#";
            a.target = "_blank";
            a.rel = "noopener";
            a.className = "btn btn-outline-secondary btn-sm";
            a.textContent = sourceName;
            container.appendChild(a);
        });
    }
}

/**
 * Render characters section
 */
function renderCharacters(data) {
    if (data.characters && data.characters.length > 0) {
        const section = document.getElementById("game-characters-section");
        section.classList.remove("d-none");
        const container = document.getElementById("game-characters");

        data.characters.forEach(char => {
            const col = document.createElement("div");
            col.className = "col";
            const card = document.createElement("a");
            card.href = `${base_path}/browse/characters/?id=${char.id || char}`;
            card.className = "card h-100 text-decoration-none border-0 shadow-sm";
            col.appendChild(card);
            container.appendChild(col);

            if (char.mug_shot?.url) {
                const img = document.createElement("img");
                img.className = "card-img-top rounded-top";
                img.src = igdbImageUrl(char.mug_shot.url, "t_cover_small_2x");
                img.alt = char.name || "";
                img.loading = "lazy";
                card.appendChild(img);
            } else {
                const placeholder = document.createElement("div");
                placeholder.className = "card-img-top bg-secondary d-flex align-items-center justify-content-center";
                placeholder.style.height = "120px";
                const icon = document.createElement("span");
                icon.className = "material-symbols-outlined text-white";
                icon.textContent = "person";
                placeholder.appendChild(icon);
                card.appendChild(placeholder);
            }

            if (char.name) {
                const cardBody = document.createElement("div");
                cardBody.className = "card-body p-2";
                const name = document.createElement("p");
                name.className = "card-text small mb-0 text-center";
                name.textContent = char.name;
                cardBody.appendChild(name);
                card.appendChild(cardBody);
            }
        });
    }
}

/**
 * Initialize game banner with cycling images (mimics beautiful-jekyll-next behavior)
 */
function initGameBanner() {
    const bigImgsEl = document.getElementById("header-big-imgs");
    const numImgs = Number.parseInt(bigImgsEl.dataset.numImg, 10);

    if (!numImgs || numImgs === 0) return;

    // Target the existing page header
    const introHeader = document.querySelector("header.header-section .intro-header.big-img");
    if (!introHeader) return;

    // Set initial image
    const getImgInfo = function(imgNum) {
        const src = bigImgsEl.dataset[`imgSrc${imgNum}`];
        const desc = bigImgsEl.dataset[`imgDesc${imgNum}`];
        return { src, desc };
    };

    const setImg = function(src, desc) {
        introHeader.style.backgroundImage = `url(${src})`;

        const imgDesc = introHeader.querySelector(".img-desc");
        if (imgDesc) {
            if (desc && desc !== "null") {
                imgDesc.textContent = desc;
                imgDesc.style.display = "block";
            } else {
                imgDesc.style.display = "none";
            }
        }
    };

    // Set first image
    const firstImg = getImgInfo(1);
    setImg(firstImg.src, firstImg.desc);

    // Cycle through images if multiple
    if (numImgs > 1) {
        let currentImgNum = 1;

        const getNextImg = function() {
            currentImgNum = (currentImgNum % numImgs) + 1;
            const imgInfo = getImgInfo(currentImgNum);
            const src = imgInfo.src;
            const desc = imgInfo.desc;

            // Prefetch next image
            const prefetchImg = new Image();
            prefetchImg.src = src;

            setTimeout(function() {
                const img = document.createElement("div");
                img.className = "big-img-transition";
                img.style.backgroundImage = `url(${src})`;
                introHeader.prepend(img);

                setTimeout(function() {
                    img.style.opacity = "1";
                }, 50);

                // After fade-in completes, update main image and remove transition element
                setTimeout(function() {
                    setImg(src, desc);
                    img.remove();
                    getNextImg();
                }, 1000);
            }, 6000);
        };

        getNextImg();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadItemDetail("games", renderGame);
});

/* istanbul ignore next */
if (typeof module !== "undefined") {
    module.exports = {
        setupGameBanner,
        renderGameCover,
        renderGameBadges,
        renderGameRatings,
        renderGamePlatforms,
        renderReleaseDates,
        renderCompanies,
        renderCollectionsAndFranchises,
        renderMultiplayer,
        renderGame,
        renderScreenshots,
        renderVideos,
        renderExternalLinks,
        renderCharacters,
        initGameBanner,
    };
}
