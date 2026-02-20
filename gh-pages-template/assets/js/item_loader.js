// setup defaults
let org_name = "LizardByte"
let base_url = `https://app.${org_name.toLowerCase()}.dev/GameDB`

// get search options, we will append each platform to this list
let search_options = document.getElementById("search_type")

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

        // Ensure the string is longer than 500 characters
        if (string.length > 500) {
            // Find the last full word prior to the 500th character using regex
            const regex = /(.{0,500})\b/;
            const match = regex.exec(string);

            if (match) {
                // Split the string at the end of the last full word
                const splitIndex = match[1].length;
                const firstPart = string.slice(0, splitIndex);

                return [firstPart, string];
            }
      }

      // Return the string as is if it's shorter than 500 characters
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
                    // create search option
                    let search_option = document.createElement("option")
                    search_option.value = sorted[item]['id']
                    search_option.textContent = sorted[item]['name']
                    search_options.appendChild(search_option)

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
                    banner_link.href = sorted[item]['url']
                    banner_link.target = "_blank"
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
                            banner.src = "/GameDB/assets/img/no-logo.png"
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
                    card_title_link.href = sorted[item]['url']
                    card_title_link.target = "_blank"
                    card_body.appendChild(card_title_link)

                    let card_title_text = document.createElement("h5")
                    card_title_text.className = "card-title mb-3 fw-bolder"
                    card_title_text.textContent = sorted[item]['name']
                    card_title_link.appendChild(card_title_text)

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
