// setup defaults — base_path is injected by Jekyll via window.GAMEDB_CONFIG
const _cfg = window.GAMEDB_CONFIG || {};
let base_path = _cfg.base_path
    ? ("/" + _cfg.base_path).replace(/\/+/g, "/").replace(/\/$/, "")
    : "/GameDB";
let base_url = window.location.origin + base_path;


// get platforms container
let platforms_container = document.getElementById("platforms-container")

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

    let splitString = function(string) {
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

    // create platform cards
    let initialize = function(){
        $.ajax({
            url: `${base_url}/platforms/all.json`,
            type: "GET",
            dataType:"json",
            success: function (result) {
                let platforms = []
                for (let platform in result) {

                    // add screenscraper id to platform, start with null value
                    result[platform]['screenscraper_id'] = null
                    result[platform]['screenscraper_region'] = null

                    for (let xref in platform_xref) {
                        if (platform_xref[xref]['ids']['igdb'] === result[platform]['id']) {
                            result[platform]['screenscraper_id'] = platform_xref[xref]['ids']['screenscraper']
                            result[platform]['screenscraper_region'] = platform_xref[xref]['variables']['screenscraper']['region']
                        }
                    }

                    platforms.push(result[platform])
                }

                let sorted = platforms.sort(window.rankingSorter("name", "id")).reverse()

                for(let item in sorted) {
                    let column = document.createElement("div")
                    column.className = "col-lg-4 mb-5"
                    platforms_container.appendChild(column)

                    let card = document.createElement("div")
                    card.className = "card h-100 shadow border-0 rounded-0"
                    column.appendChild(card)

                    let banner_div = document.createElement("div")
                    banner_div.className = "hover-zoom"
                    card.append(banner_div)

                    let banner_link = document.createElement("a")
                    banner_link.href = `${base_path}/browse/platforms/?id=${sorted[item]['id']}`
                    banner_div.append(banner_link)

                    let banner = document.createElement("img")
                    banner.className = "card-img-top rounded-0"

                    // see if screensraper id has an image
                    if (sorted[item]['screenscraper_id'] !== null && sorted[item]['screenscraper_region'] !== null) {
                        banner.src = `https://screenscraper.fr/image.php?plateformid=${sorted[item]['screenscraper_id']}&media=wheel&region=${sorted[item]['screenscraper_region']}&num=&version=&maxwidth=600&maxheight=600`
                        banner.classList.add("bg-dark")
                        banner.classList.add("bg-gradient")
                        banner.classList.add("p-4")
                    }
                    else {
                        try {
                            banner.src = sorted[item]['platform_logo']['url'].replace("t_thumb", "t_cover_big")
                        }
                        catch (err) {
                            banner.src = `${base_path}/assets/img/no-logo.png`
                            banner.classList.add("bg-dark")
                            banner.classList.add("bg-gradient")
                            banner.classList.add("p-4")
                            banner_div.classList.remove("hover-zoom")
                        }
                    }
                    banner.alt = ""
                    banner_link.append(banner)

                    let card_body = document.createElement("div")
                    card_body.className = "card-body p-4 rounded-0"
                    card.appendChild(card_body)

                    let card_title_link = document.createElement("a")
                    card_title_link.className = "text-decoration-none project-card-link"
                    card_title_link.href = `${base_path}/browse/platforms/?id=${sorted[item]['id']}`
                    card_body.appendChild(card_title_link)

                    let card_title_text = document.createElement("h5")
                    card_title_text.className = "card-title mb-1 fw-bolder"
                    card_title_text.textContent = sorted[item]['name']
                    card_title_link.appendChild(card_title_text)

                    // small external IGDB link
                    let igdb_link = document.createElement("a")
                    igdb_link.href = sorted[item]['url']
                    igdb_link.target = "_blank"
                    igdb_link.rel = "noopener"
                    igdb_link.className = "small text-muted text-decoration-none mb-2 d-inline-block"
                    igdb_link.textContent = "View on IGDB ↗"
                    card_body.appendChild(igdb_link)

                    // game count
                    if (sorted[item]['games'] && sorted[item]['games'].length > 0) {
                        let game_count = document.createElement("div")
                        game_count.className = "small text-muted mb-2"
                        game_count.textContent = `${sorted[item]['games'].length} game${sorted[item]['games'].length === 1 ? '' : 's'}`
                        card_body.appendChild(game_count)
                    }

                    let summary = splitString(sorted[item]['summary'])

                    let card_paragraph_div = document.createElement("div")
                    card_paragraph_div.className = "mb-3"
                    card_body.appendChild(card_paragraph_div)

                    let card_paragraph = document.createElement("p")
                    card_paragraph.className = "card-text mb-0"
                    card_paragraph.textContent = summary[0]
                    card_paragraph_div.appendChild(card_paragraph)

                    let card_footer = document.createElement("div")
                    card_footer.className = "card-footer p-2 pt-0 border-0 rounded-0"
                    card.appendChild(card_footer)

                    // get first or last version depending on "category"
                    let version
                    if (sorted[item]['category'] === 4) {
                        // this is an operating system, so get the last version (hopefully newest)
                        version = sorted[item]['versions'][sorted[item]['versions'].length - 1]
                    }
                    else {
                        // this is a console/pc/etc., so get the first version (initial version)
                        version = sorted[item]['versions'][0]
                    }

                    for (let key in metadata_key_icon_map) {
                        if (version[key] !== undefined) {
                            // process summary first
                            if (key === 'summary') {
                                if (sorted[item]['summary'] === undefined) {
                                    summary = splitString(version[key])
                                    card_paragraph.textContent = summary[0]
                                }
                            }
                            else {
                                // create div for metadata
                                let metadata_div = document.createElement("div")
                                metadata_div.className = "ms-4 mb-2"

                                if (key === 'platform_version_release_dates') {
                                    // get the region and release date for each release date
                                    for (let release_date in version[key]) {
                                        // create div container for each release date
                                        let release_date_div = document.createElement("div")
                                        release_date_div.className = "d-flex align-items-center"
                                        metadata_div.appendChild(release_date_div)

                                        // show flag emoji as prefix
                                        let regionName = version[key][release_date]['release_region']['region']
                                        let flag_prefix = document.createElement("span")
                                        flag_prefix.className = `${platform_region_flag_map[regionName]['size']} me-3 text-center`
                                        flag_prefix.textContent = platform_region_flag_map[regionName]['code']
                                        flag_prefix.title = regionName.replace("_", " ")
                                        release_date_div.appendChild(flag_prefix)

                                        // add date
                                        let date = document.createElement("span")
                                        date.textContent = version[key][release_date]['human']
                                        release_date_div.appendChild(date)
                                    }
                                }
                                else {
                                    let key_div = document.createElement("div")
                                    key_div.className = "d-flex align-items-center"
                                    metadata_div.appendChild(key_div)

                                    // add key symbol as prefix
                                    let key_prefix = document.createElement("span")
                                    key_prefix.className = "material-symbols-outlined fs-2 me-3 text-center"
                                    key_prefix.textContent = metadata_key_icon_map[key]
                                    key_prefix.title = key.replace("_", " ")
                                    key_div.appendChild(key_prefix)

                                    // add value
                                    let key_value = document.createElement("span")
                                    key_value.textContent = version[key]
                                    key_div.appendChild(key_value)
                                }

                                // add metadata div to footer
                                card_body.appendChild(metadata_div)
                            }
                        }
                    }

                    if (summary.length > 1) {
                        // create a see more "action/link"
                        let see_more = document.createElement("a")

                        // create a see less "action/link"
                        let see_less = document.createElement("a")

                        // populate see more/less links
                        see_more.className = ""
                        see_more.onclick = function() {
                            card_paragraph.textContent = summary[1]
                            see_more.classList.add("d-none")
                            see_less.classList.remove("d-none")
                        }
                        see_more.textContent = "See more"
                        card_paragraph_div.appendChild(see_more)

                        see_less.className = "d-none"
                        see_less.onclick = function() {
                            card_paragraph.textContent = summary[0]
                            see_less.classList.add("d-none")
                            see_more.classList.remove("d-none")
                        }
                        see_less.textContent = "See less"
                        card_paragraph_div.appendChild(see_less)
                    }
                }
            }
        })
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
                        fetch(`${base_url}/games/${id}.json`)
                            .then(r => r.ok ? r.json() : null)
                            .then(fullGame => ({ id, game: fullGame || { name: _game.name } }))
                            .catch(() => ({ id, game: { name: _game.name } }))
                    )

                    Promise.all(gamePromises).then(results => {
                        results.forEach(({ id, game }) => {
                            const col = document.createElement("div")
                            col.className = "col"
                            col.style.maxWidth = "180px"
                            row.appendChild(col)

                            const card = document.createElement("a")
                            card.className = "card h-100 text-decoration-none shadow-sm border-0 rounded-0"
                            card.href = `${base_path}/browse/games/?id=${id}`
                            col.appendChild(card)

                            // Cover image or placeholder
                            if (game.cover && game.cover.url) {
                                const coverImg = document.createElement("img")
                                coverImg.className = "card-img-top rounded-top-0"
                                // Convert IGDB URL properly - URLs start with //
                                let coverUrl = game.cover.url
                                coverUrl = 'https:' + coverUrl.replace('t_thumb', 't_cover_big')
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
                            nameEl.style.webkitBoxOrient = "vertical"
                            cardBody.appendChild(nameEl)

                            // Platforms with release years
                            if (game.platforms && game.platforms.length > 0) {
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
                        })

                        if (matches.length > 60) {
                            const moreNote = document.createElement("p")
                            moreNote.className = "text-muted mt-3 small"
                            moreNote.textContent = `Showing first 60 of ${matches.length} results. Try a more specific search term.`
                            search_container.appendChild(moreNote)
                        }
                    })
                })
                .catch(() => {
                    // Fallback if platforms can't be loaded - still fetch game data
                    const gamePromises = matches.slice(0, 60).map(([id, _game]) =>
                        fetch(`${base_url}/games/${id}.json`)
                            .then(r => r.ok ? r.json() : null)
                            .then(fullGame => ({ id, game: fullGame || { name: _game.name } }))
                            .catch(() => ({ id, game: { name: _game.name } }))
                    )

                    Promise.all(gamePromises).then(results => {
                        results.forEach(({ id, game }) => {
                            const col = document.createElement("div")
                            col.className = "col"
                            col.style.maxWidth = "180px"
                            row.appendChild(col)

                            const card = document.createElement("a")
                            card.className = "card h-100 text-decoration-none shadow-sm border-0 rounded-0"
                            card.href = `${base_path}/browse/games/?id=${id}`
                            col.appendChild(card)

                            if (game.cover && game.cover.url) {
                                const coverImg = document.createElement("img")
                                coverImg.className = "card-img-top rounded-top-0"
                                // Convert IGDB URL properly - URLs start with //
                                let coverUrl = game.cover.url
                                coverUrl = 'https:' + coverUrl.replace('t_thumb', 't_cover_big')
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

                            const nameEl = document.createElement("p")
                            nameEl.className = "card-text small mb-0 fw-bold"
                            nameEl.textContent = game.name
                            nameEl.title = game.name
                            nameEl.style.overflow = "hidden"
                            nameEl.style.display = "-webkit-box"
                            nameEl.style.webkitLineClamp = "2"
                            nameEl.style.webkitBoxOrient = "vertical"
                            cardBody.appendChild(nameEl)
                        })

                        if (matches.length > 60) {
                            const moreNote = document.createElement("p")
                            moreNote.className = "text-muted mt-3 small"
                            moreNote.textContent = `Showing first 60 of ${matches.length} results. Try a more specific search term.`
                            search_container.appendChild(moreNote)
                        }
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
