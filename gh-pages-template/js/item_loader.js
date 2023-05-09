// setup defaults
let org_name = "LizardByte"
let base_url = `https://db.${org_name.toLowerCase()}.dev`

// scripts to load
let scripts = [
    'https://app.lizardbyte.dev/js/levenshtein_distance.js',
    'https://app.lizardbyte.dev/js/ranking_sorter.js'
]

// get search options, we will append each platform to this list
let search_options = document.getElementById("search_type")

// get platforms container
platforms_container = document.getElementById("platforms-container")


$(document).ready(function(){
    // Set cache = false for all jquery ajax requests.
    $.ajaxSetup({
        cache: false,
    })

    let script_queue = scripts.map(function(script) {
        return $.getScript(script)
    })

    $.when.apply(null, script_queue).done(function() {
        initialize()
    })

    // get platform cross-reference from json
    let platform_xref
    $.ajax({
        url: `${base_url}/platforms/cross-reference.json`,
        type: "GET",
        dataType:"json",
        async: false,  // this is false, so we can set the platform_xref variable
        success: function (result) {
            platform_xref = result
        }
    })

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

                    for (let xref in platform_xref) {
                        if (platform_xref[xref]['ids']['igdb'] === result[platform]['id']) {
                            result[platform]['screenscraper_id'] = platform_xref[xref]['ids']['screenscraper']
                        }
                    }

                    platforms.push(result[platform])
                }

                let sorted = platforms.sort(rankingSorter("name", "id")).reverse()

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
                    if (sorted[item]['screenscraper_id'] !== null) {
                        // todo - check if png image url is valid
                        banner.src = `https://screenscraper.fr/image.php?plateformid=${sorted[item]['screenscraper_id']}&media=wheel&region=wor&num=&version=&maxwidth=600&maxheight=600`
                        banner.classList.add("bg-dark")
                        banner.classList.add("bg-gradient")
                        banner.classList.add("p-4")
                    }
                    else {
                        try {
                            banner.src = sorted[item]['platform_logo']['url'].replace("t_thumb", "t_cover_big")
                        }
                        catch (err) {
                            banner.src = "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"
                        }
                    }
                    banner.alt = ""
                    banner_link.append(banner)

                    let card_body = document.createElement("div")
                    card_body.className = "bg-dark text-white card-body p-4 rounded-0"
                    card.appendChild(card_body)

                    let card_title_link = document.createElement("a")
                    card_title_link.className = "text-decoration-none link-light"
                    card_title_link.href = sorted[item]['url']
                    card_title_link.target = "_blank"
                    card_body.appendChild(card_title_link)

                    let card_title_text = document.createElement("h5")
                    card_title_text.className = "card-title mb-3 fw-bolder"
                    card_title_text.textContent = sorted[item]['name']
                    card_title_link.appendChild(card_title_text)

                    let card_paragraph = document.createElement("p")
                    card_paragraph.className = "card-text mb-0"
                    card_paragraph.textContent = sorted[item]['summary']
                    card_body.appendChild(card_paragraph)

                    let card_footer = document.createElement("div")
                    card_footer.className = "card-footer p-2 pt-0 bg-dark text-white border-0 rounded-0"
                    card.appendChild(card_footer)
                }
            }
        })
    }
})
