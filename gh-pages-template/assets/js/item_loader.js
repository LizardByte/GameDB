// setup defaults — base_path is injected by Jekyll via globalThis.GAMEDB_CONFIG
const _cfg = globalThis.GAMEDB_CONFIG || {};
let base_path = _cfg.base_path
    ? ("/" + _cfg.base_path).replaceAll(/\/+/g, "/").replace(/\/$/, "")
    : "/GameDB";
let base_url = globalThis.location.origin + base_path;


// get platforms container
let platforms_container = document.getElementById("platforms-container")

/**
 * Split string for card display
 */
function splitString(string) {
    if (string === undefined) {
        return [undefined];
    }

    // Ensure the string is longer than 200 characters for more consistent card heights
    if (string.length > 200) {
        // Find the last full word prior to the 200th character using regex
        const regex = /(.{0,200})\b/;
        const match = regex.exec(string);

        if (match) {
            // Split the string at the end of the last full word
            const splitIndex = match[1].length;
            const firstPart = string.slice(0, splitIndex);

            return [firstPart, string];
        }
  }

  // Return the string as is if it's shorter than 200 characters
  return [string];
}

/**
 * Fetch game data for search results
 */
function fetchGameData(id, gameName) {
    return fetch(`${base_url}/games/${id}.json`)
        .then(r => r.ok ? r.json() : null)
        .then(fullGame => ({ id, game: fullGame || { name: gameName } }))
        .catch(() => ({ id, game: { name: gameName } }));
}

/**
 * Create game card element for search results
 */
function createGameCard(id, game, allPlatforms = null) {
    const col = document.createElement("div")
    col.className = "col"
    col.style.maxWidth = "180px"

    const card = document.createElement("a")
    card.className = "card h-100 text-decoration-none shadow-sm border-0 rounded-0"
    card.href = `${base_path}/browse/games/?id=${id}`
    col.appendChild(card)

    // Cover image or placeholder
    if (game.cover?.url) {
        const coverImg = document.createElement("img")
        coverImg.className = "card-img-top rounded-top-0"
        let coverUrl = game.cover.url
        coverUrl = 'https:' + coverUrl.replace('t_thumb', 't_cover_big_2x')
        coverImg.src = coverUrl
        coverImg.alt = game.name
        coverImg.loading = "lazy"
        coverImg.style.width = "100%"
        coverImg.style.aspectRatio = "3 / 4"
        coverImg.style.objectFit = "cover"
        card.appendChild(coverImg)
    } else {
        const placeholder = document.createElement("div")
        placeholder.className = "card-img-top bg-secondary d-flex align-items-center justify-content-center"
        placeholder.style.width = "100%"
        placeholder.style.aspectRatio = "3 / 4"
        const icon = document.createElement("span")
        icon.className = "material-symbols-outlined text-white"
        icon.style.fontSize = "3rem"
        icon.textContent = "sports_esports"
        placeholder.appendChild(icon)
        card.appendChild(placeholder)
    }

    const cardBody = document.createElement("div")
    cardBody.className = "card-body p-2"
    card.appendChild(cardBody)

    // Game name
    const nameEl = document.createElement("h6")
    nameEl.className = "card-title small mb-2 fw-bold"
    nameEl.textContent = game.name
    nameEl.title = game.name
    nameEl.style.overflow = "hidden"
    nameEl.style.display = "-webkit-box"
    nameEl.style.webkitLineClamp = "2"
    nameEl.style.setProperty("-webkit-box-orient", "vertical")
    cardBody.appendChild(nameEl)

    // Platforms with release years
    if (allPlatforms && game.platforms && game.platforms.length > 0) {
        const platformsDiv = document.createElement("div")
        platformsDiv.className = "mb-2"
        platformsDiv.style.wordBreak = "break-word"
        platformsDiv.style.overflow = "hidden"

        // Group release dates by platform
        const platformYears = {}
        if (game.release_dates && game.release_dates.length > 0) {
            game.release_dates.forEach(rd => {
                if (rd.platform && rd.y) {
                    if (!platformYears[rd.platform] || rd.y < platformYears[rd.platform]) {
                        platformYears[rd.platform] = rd.y
                    }
                }
            })
        }

        // Show first 3 platforms
        game.platforms.slice(0, 3).forEach(platformId => {
            const platform = allPlatforms[String(platformId)]
            const platformName = platform ? platform.name : `Platform ${platformId}`
            const year = platformYears[platformId] ? ` (${platformYears[platformId]})` : ""

            const badge = document.createElement("span")
            badge.className = "badge bg-secondary me-1 mb-1 small"
            badge.style.fontSize = "0.7rem"
            badge.style.whiteSpace = "normal"
            badge.style.wordBreak = "break-word"
            badge.textContent = platformName + year
            platformsDiv.appendChild(badge)
        })

        if (game.platforms.length > 3) {
            const moreBadge = document.createElement("span")
            moreBadge.className = "badge bg-secondary me-1 mb-1 small"
            moreBadge.style.fontSize = "0.7rem"
            moreBadge.textContent = `+${game.platforms.length - 3} more`
            platformsDiv.appendChild(moreBadge)
        }

        cardBody.appendChild(platformsDiv)
    }

    return col
}

/**
 * Render search results into the row container
 */
function renderSearchResults(results, row, allPlatforms) {
    results.forEach(({ id, game }) => {
        row.appendChild(createGameCard(id, game, allPlatforms))
    })
}

/**
 * Add "showing X of Y" note if there are more results
 */
function addMoreResultsNote(container, totalCount, shownCount) {
    if (totalCount > shownCount) {
        const moreNote = document.createElement("p")
        moreNote.className = "text-muted mt-3 small"
        moreNote.textContent = `Showing first ${shownCount} of ${totalCount} results. Try a more specific search term.`
        container.appendChild(moreNote)
    }
}

/**
 * Create banner image element for platform card
 */
function createPlatformBanner(platform, basePath) {
    const banner = document.createElement("img");
    banner.className = "card-img-top rounded-0";
    banner.alt = "";

    if (platform.screenscraper_id !== null && platform.screenscraper_region !== null) {
        banner.src = `https://screenscraper.fr/image.php?plateformid=${platform.screenscraper_id}&media=wheel&region=${platform.screenscraper_region}&num=&version=&maxwidth=600&maxheight=600`;
        banner.classList.add("bg-dark", "bg-gradient", "p-4");
    } else {
        const logoUrl = platform.platform_logo?.url;
        if (logoUrl) {
            banner.src = logoUrl.replace("t_thumb", "t_720p");
        } else {
            banner.src = `${basePath}/assets/img/no-logo.png`;
            banner.classList.add("bg-dark", "bg-gradient", "p-4");
        }
    }

    return banner;
}

/**
 * Create card body content for platform card
 */
function createPlatformCardBody(platform, basePath) {
    const card_body = document.createElement("div");
    card_body.className = "card-body p-4 rounded-0";

    const card_title_link = document.createElement("a");
    card_title_link.className = "text-decoration-none project-card-link";
    card_title_link.href = `${basePath}/browse/platforms/?id=${platform.id}`;
    card_body.appendChild(card_title_link);

    const card_title_text = document.createElement("h5");
    card_title_text.className = "card-title mb-1 fw-bolder";
    card_title_text.textContent = platform.name;
    card_title_link.appendChild(card_title_text);

    const igdb_link = document.createElement("a");
    igdb_link.href = platform.url;
    igdb_link.target = "_blank";
    igdb_link.rel = "noopener";
    igdb_link.className = "small text-muted text-decoration-none mb-2 d-inline-block";
    igdb_link.textContent = "View on IGDB ↗";
    card_body.appendChild(igdb_link);

    if (platform.game_count !== undefined && platform.game_count > 0) {
        const game_count = document.createElement("div");
        game_count.className = "small text-muted mb-2";
        game_count.textContent = `${platform.game_count} game${platform.game_count === 1 ? '' : 's'}`;
        card_body.appendChild(game_count);
    }

    return card_body;
}

/**
 * Get appropriate version based on platform category
 */
function getPlatformVersion(platform) {
    if (!platform.versions || platform.versions.length === 0) {
        return null;
    }

    if (platform.category === 4) {
        // Operating system - get last version (newest)
        return platform.versions[platform.versions.length - 1];
    } else {
        // Console/PC/etc - get first version (initial)
        return platform.versions[0];
    }
}

/**
 * Add metadata from version to card footer
 */
function addVersionMetadataToFooter(version, card_paragraph, card_footer, platform, platform_region_flag_map, metadata_key_icon_map) {
    for (let key in metadata_key_icon_map) {
        if (version[key] === undefined) continue;

        if (key === 'summary') {
            if (platform.summary === undefined) {
                const summary = splitString(version[key]);
                card_paragraph.textContent = summary[0];
            }
        } else if (key === 'platform_version_release_dates') {
            addReleaseDatesToFooter(version[key], card_footer, platform_region_flag_map);
        } else if (metadata_key_icon_map[key]) {
            addMetadataItemToFooter(key, version[key], card_footer, metadata_key_icon_map[key]);
        }
    }
}

/**
 * Add release dates to card footer
 */
function addReleaseDatesToFooter(releaseDates, card_footer, platform_region_flag_map) {
    const metadata_div = document.createElement("div");
    metadata_div.className = "ms-4 mb-2";

    for (let release_date of releaseDates) {
        const release_date_div = document.createElement("div");
        release_date_div.className = "d-flex align-items-center";
        metadata_div.appendChild(release_date_div);

        const regionName = release_date.release_region?.region;
        if (regionName && platform_region_flag_map[regionName]) {
            const flag_prefix = document.createElement("span");
            flag_prefix.className = `${platform_region_flag_map[regionName].size} me-3 text-center`;
            flag_prefix.style.width = "2rem";
            flag_prefix.textContent = platform_region_flag_map[regionName].code;
            release_date_div.appendChild(flag_prefix);
        }

        const release_text = document.createElement("small");
        release_text.className = "text-muted";
        release_text.textContent = release_date.human || release_date.y || "";
        release_date_div.appendChild(release_text);
    }

    card_footer.appendChild(metadata_div);
}

/**
 * Add single metadata item to card footer
 */
function addMetadataItemToFooter(key, value, card_footer, iconName) {
    const metadata_div = document.createElement("div");
    metadata_div.className = "ms-4 mb-2 d-flex align-items-start";

    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined me-3 text-muted";
    icon.style.fontSize = "1.25rem";
    icon.textContent = iconName;
    metadata_div.appendChild(icon);

    const text = document.createElement("small");
    text.className = "text-muted flex-grow-1";
    text.textContent = value;
    metadata_div.appendChild(text);

    card_footer.appendChild(metadata_div);
}

/**
 * Process platforms data and add screenscraper IDs
 */
function processPlatformsData(result, platform_xref) {
    const platforms = [];
    for (let platform in result) {
        result[platform].screenscraper_id = null;
        result[platform].screenscraper_region = null;

        for (let xref in platform_xref) {
            if (platform_xref[xref].ids?.igdb === result[platform].id) {
                result[platform].screenscraper_id = platform_xref[xref].ids?.screenscraper;
                result[platform].screenscraper_region = platform_xref[xref].variables?.screenscraper?.region;
                break;
            }
        }

        platforms.push(result[platform]);
    }
    return platforms;
}

/**
 * Create complete platform card element
 */
function createPlatformCardElement(platform, platform_region_flag_map, metadata_key_icon_map, basePath) {
    const column = document.createElement("div");
    column.className = "col-lg-4 mb-5";

    const card = document.createElement("div");
    card.className = "card h-100 shadow border-0 rounded-0";
    column.appendChild(card);

    // Banner
    const banner_div = document.createElement("div");
    banner_div.className = "hover-zoom";
    card.append(banner_div);

    const banner_link = document.createElement("a");
    banner_link.href = `${basePath}/browse/platforms/?id=${platform.id}`;
    banner_div.append(banner_link);

    const banner = createPlatformBanner(platform, basePath);

    // Remove hover effect if using placeholder image
    if (platform.screenscraper_id === null && !platform.platform_logo?.url) {
        banner_div.classList.remove("hover-zoom");
    }

    banner_link.append(banner);

    // Card body
    const card_body = createPlatformCardBody(platform, basePath);
    card.appendChild(card_body);

    // Summary
    const summary = splitString(platform.summary);
    const card_paragraph_div = document.createElement("div");
    card_paragraph_div.className = "mb-3";
    card_body.appendChild(card_paragraph_div);

    const card_paragraph = document.createElement("p");
    card_paragraph.className = "card-text mb-0";
    card_paragraph.textContent = summary[0];
    card_paragraph_div.appendChild(card_paragraph);

    const card_footer = document.createElement("div");
    card_footer.className = "card-footer p-2 pt-0 border-0 rounded-0";
    card.appendChild(card_footer);

    // Add metadata from version if available
    const version = getPlatformVersion(platform);
    if (version) {
        addVersionMetadataToFooter(version, card_paragraph, card_footer, platform, platform_region_flag_map, metadata_key_icon_map);
    }

    return column;
}

$(document).ready(function(){
    // Set cache = false for all jquery ajax requests.
    $.ajaxSetup({
        cache: false,
    })

    // get platform cross-reference from json
    let platform_xref
    let get_platform_xref = function() {
        $.ajax({
            url: `${base_url}/platforms/cross-reference.json`,
            type: "GET",
            dataType: "json",
            async: false,  // this is false, so we can set the platform_xref variable
            success: function (result) {
                platform_xref = result
            }
        })
    }

    let platform_region_flag_map = {
        "europe": {
            "code": String.fromCodePoint(0x1F1EA, 0x1F1FA),
            "size": "fs-2",
        },
        "north_america": {
            "code": String.fromCodePoint(0x1F1FA, 0x1F1F8),
            "size": "fs-2",
        },
        "australia": {
            "code": String.fromCodePoint(0x1F1E6, 0x1F1FA),
            "size": "fs-2",
        },
        "new_zealand": {
            "code": String.fromCodePoint(0x1F1F3, 0x1F1FF),
            "size": "fs-2",
        },
        "japan": {
            "code": String.fromCodePoint(0x1F1EF, 0x1F1F5),
            "size": "fs-2",
        },
        "china": {
            "code": String.fromCodePoint(0x1F1E8, 0x1F1F3),
            "size": "fs-2",
        },
        "asia": {
            "code": String.fromCodePoint(0x1F30F),
            "size": "fs-4",
        },
        "worldwide": {
            "code": String.fromCodePoint(0x1F30E),
            "size": "fs-4",
        },
        "korea": {
            "code": String.fromCodePoint(0x1F1F0, 0x1F1F7),
            "size": "fs-2",
        },
        "brazil": {
            "code": String.fromCodePoint(0x1F1E7, 0x1F1F7),
            "size": "fs-2",
        },
    }

    let metadata_key_icon_map = {
        // material icons
        'os': 'code_blocks',
        'cpu': 'memory',
        'graphics': 'developer_board',
        'memory': 'memory_alt',
        'storage': 'storage',
        'media': 'save',
        'connectivity': 'cable',
        'output': 'settings_input_component',
        'resolutions': 'aspect_ratio',
        'sound': 'volume_up',
        // these will be processed slightly differently
        'platform_version_release_dates': null,
        'summary': null,
    }


    // create platform cards
    let initialize = function(){
        $.ajax({
            url: `${base_url}/platforms/all.json`,
            type: "GET",
            dataType:"json",
            success: function (result) {
                const platforms = processPlatformsData(result, platform_xref);
                const sorted = platforms.toSorted(globalThis.rankingSorter("name", "id")).reverse();

                for(let item in sorted) {
                    const column = createPlatformCardElement(sorted[item], platform_region_flag_map, metadata_key_icon_map, base_path);
                    platforms_container.appendChild(column);
                }
            }
        });
    }

    get_platform_xref()
    initialize()
})

/**
 * Search for games by name across all buckets.
 * Results link to game detail pages.
 */
function run_search() {
    const search_term = document.getElementById("search_term").value.trim()
    const search_container = document.getElementById("search-container")

    search_container.innerHTML = ""

    if (!search_term) {
        return
    }


    // Determine the bucket for the search term (same logic as Python backend)
    const bucket = search_term.replaceAll(/[^a-z0-9]/gi, '').slice(0, 2).toLowerCase() || '@'
    const bucket_url = `${base_url}/buckets/${encodeURIComponent(bucket)}.json`

    const loading = document.createElement("p")
    loading.className = "text-muted"
    loading.textContent = "Searching…"
    search_container.appendChild(loading)

    fetch(bucket_url)
        .then(r => {
            if (!r.ok) throw new Error(`Bucket not found`)
            return r.json()
        })
        .then(bucket_data => {
            loading.remove()

            // Filter results by name (case-insensitive)
            const term_lower = search_term.toLowerCase()
            const matches = Object.entries(bucket_data).filter(([_id, game]) =>
                game.name.toLowerCase().includes(term_lower)
            )

            if (matches.length === 0) {
                const noResults = document.createElement("p")
                noResults.className = "text-muted"
                noResults.textContent = `No games found matching "${search_term}".`
                search_container.appendChild(noResults)
                return
            }

            const resultsHeading = document.createElement("h5")
            resultsHeading.className = "mb-3"
            resultsHeading.textContent = `Search Results for "${search_term}" (${matches.length} found)`
            search_container.appendChild(resultsHeading)

            const row = document.createElement("div")
            row.className = "row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3"
            search_container.appendChild(row)

            // Fetch platform names to display
            fetch(`${base_url}/platforms/all.json`)
                .then(r => r.json())
                .then(allPlatforms => {
                    // Fetch full game data for each match
                    const gamePromises = matches.slice(0, 60).map(([id, _game]) =>
                        fetchGameData(id, _game.name)
                    )

                    Promise.all(gamePromises).then(results => {
                        renderSearchResults(results, row, allPlatforms)
                        addMoreResultsNote(search_container, matches.length, 60)
                    })
                })
                .catch(() => {
                    // Fallback if platforms can't be loaded - still fetch game data
                    const gamePromises = matches.slice(0, 60).map(([id, _game]) =>
                        fetchGameData(id, _game.name)
                    )

                    Promise.all(gamePromises).then(results => {
                        renderSearchResults(results, row, null)
                        addMoreResultsNote(search_container, matches.length, 60)
                    })
                })
        })
        .catch(err => {
            loading.remove()
            const errEl = document.createElement("p")
            errEl.className = "text-danger"
            errEl.textContent = `Search failed: ${err.message}`
            search_container.appendChild(errEl)
        })
}
