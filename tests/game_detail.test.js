/**
 * @jest-environment jsdom
 */

import {
    describe,
    test,
    expect,
    jest,
    beforeEach,
    afterEach,
} from '@jest/globals';

// Set up global dependencies needed by item_detail.js (which game_detail depends on)
globalThis.GAMEDB_CONFIG = { base_path: '/GameDB' };
globalThis.openImageModal = jest.fn();

// Require item_detail first (game_detail depends on it)
const itemDetail = require('../gh-pages-template/assets/js/item_detail.js');

// Make item_detail functions global so game_detail can use them
globalThis.igdbImageUrl = itemDetail.igdbImageUrl;
globalThis.makeBadge = itemDetail.makeBadge;
globalThis.addDlRow = itemDetail.addDlRow;
globalThis.loadItemDetail = itemDetail.loadItemDetail;
globalThis.renderGameList = itemDetail.renderGameList;
globalThis.getRegionFlag = itemDetail.getRegionFlag;
globalThis.base_path = '/GameDB';
globalThis.base_url = 'http://localhost/GameDB';

const {
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
    setupGameBanner,
    initGameBanner,
} = require('../gh-pages-template/assets/js/game_detail.js');

// Full DOM used by most tests
const fullDom = `
    <div id="header-big-imgs" data-num-img="0"></div>
    <header class="header-section">
        <div class="intro-header"></div>
        <div class="page-heading"><h1></h1></div>
    </header>
    <div id="game-name"></div>
    <img id="game-cover" style="display:none;" alt="" src="" />
    <div id="game-cover-placeholder"></div>
    <div id="game-badges"></div>
    <dl id="game-meta"></dl>
    <div id="game-summary-section" class="d-none"><p id="game-summary"></p></div>
    <div id="game-storyline-section" class="d-none"><p id="game-storyline"></p></div>
    <div id="game-screenshots-section" class="d-none"><div id="game-screenshots"></div></div>
    <div id="game-videos-section" class="d-none"><div id="game-videos"></div></div>
    <div id="game-external-section" class="d-none"><div id="game-external"></div></div>
    <div id="game-characters-section" class="d-none"><div id="game-characters"></div></div>
    <a id="game-igdb-link" class="d-none"></a>
`;

describe('game_detail.js', () => {
    beforeEach(() => {
        document.body.innerHTML = fullDom;
        jest.useFakeTimers();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe('renderGameCover', () => {
        test('shows cover image when URL provided', () => {
            renderGameCover({ name: 'Test', cover: { url: '//images.igdb.com/t_thumb/x.jpg' } });
            const cover = document.getElementById('game-cover');
            expect(cover.style.display).toBe('');
            expect(cover.alt).toBe('Test');
            expect(cover.src).toContain('x.jpg');
        });

        test('sets empty alt when cover present but no name', () => {
            renderGameCover({ cover: { url: '//images.igdb.com/t_thumb/x.jpg' } });
            expect(document.getElementById('game-cover').alt).toBe('');
        });

        test('hides cover and shows placeholder when no cover', () => {
            renderGameCover({ name: 'No Cover' });
            expect(document.getElementById('game-cover').style.display).toBe('none');
        });
    });

    describe('renderGameBadges', () => {
        test('renders all badge groups', () => {
            renderGameBadges({
                genres: [{ name: 'Action' }],
                themes: [{ name: 'Sci-fi' }],
                game_modes: [{ name: 'Single player' }],
                player_perspectives: [{ name: 'First person' }],
            });
            expect(document.getElementById('game-badges').children.length).toBe(4);
        });

        test('handles missing badge arrays gracefully', () => {
            renderGameBadges({});
            expect(document.getElementById('game-badges').children.length).toBe(0);
        });
    });

    describe('renderGameRatings', () => {
        test('renders user rating, critic rating, and age ratings', () => {
            const dl = document.getElementById('game-meta');
            renderGameRatings({
                rating: 85.5,
                aggregated_rating: 78.2,
                age_ratings: [
                    { rating_category: { rating: 'T' }, organization: { name: 'ESRB' } },
                    { rating_category: null, organization: null }, // skipped
                ],
            }, dl);
            expect(dl.children.length).toBeGreaterThan(0);
            expect(dl.textContent).toContain('86 / 100');
            expect(dl.textContent).toContain('78 / 100');
            expect(dl.textContent).toContain('ESRB');
        });

        test('skips when no ratings', () => {
            const dl = document.getElementById('game-meta');
            renderGameRatings({}, dl);
            expect(dl.children.length).toBe(0);
        });

        test('skips age ratings row when all entries are incomplete', () => {
            const dl = document.getElementById('game-meta');
            renderGameRatings({
                age_ratings: [{ rating_category: null, organization: null }],
            }, dl);
            expect(dl.children.length).toBe(0);
        });
    });

    describe('renderGamePlatforms', () => {
        test('fetches platforms and renders links on success', async () => {
            jest.useRealTimers();
            const dl = document.getElementById('game-meta');
            globalThis.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ '1': { name: 'PC' } }),
            });
            renderGamePlatforms({ platforms: [1, 2] }, dl);
            await new Promise(r => setTimeout(r, 0));
            expect(dl.textContent).toContain('PC');
            expect(dl.textContent).toContain('Platform #2');
        });

        test('falls back to IDs when fetch fails', async () => {
            jest.useRealTimers();
            const dl = document.getElementById('game-meta');
            globalThis.fetch = jest.fn().mockRejectedValue(new Error('fail'));
            renderGamePlatforms({ platforms: [5] }, dl);
            await new Promise(r => setTimeout(r, 0));
            expect(dl.textContent).toContain('#5');
        });

        test('skips when no platforms', () => {
            const dl = document.getElementById('game-meta');
            renderGamePlatforms({}, dl);
            expect(dl.children.length).toBe(0);
        });
    });

    describe('renderReleaseDates', () => {
        test('renders release dates with region flags', () => {
            const dl = document.getElementById('game-meta');
            renderReleaseDates({
                release_dates: [
                    { date: '2020-01-01', human: 'Jan 1, 2020', y: 2020, release_region: { region: 'europe' } },
                    { date: null, y: 2021, human: null, release_region: null },
                    { date: null, y: null }, // no date or y — skipped
                ],
            }, dl);
            expect(dl.textContent).toContain('Jan 1, 2020');
            expect(dl.textContent).toContain('2021');
        });

        test('skips when no release dates', () => {
            const dl = document.getElementById('game-meta');
            renderReleaseDates({}, dl);
            expect(dl.children.length).toBe(0);
        });

        test('skips row when all entries lack date and y', () => {
            const dl = document.getElementById('game-meta');
            renderReleaseDates({ release_dates: [{ date: null, y: null }] }, dl);
            expect(dl.children.length).toBe(0);
        });

        test('renders release date with unknown release_region (empty flag)', () => {
            const dl = document.getElementById('game-meta');
            renderReleaseDates({
                release_dates: [{ date: '2023', y: 2023, human: '2023', release_region: { region: 'unknown_region' } }],
            }, dl);
            expect(dl.textContent).toContain('2023');
        });

        test('renders release date with truthy date but no human or y (empty string fallback)', () => {
            const dl = document.getElementById('game-meta');
            renderReleaseDates({
                release_dates: [{ date: '2020-01-01', human: null, y: null, release_region: null }],
            }, dl);
            // Should render without crashing; the div has an empty trimmed textContent
            expect(dl.children.length).toBeGreaterThan(0);
        });
    });

    describe('renderCompanies', () => {
        test('renders developers and publishers', () => {
            const dl = document.getElementById('game-meta');
            renderCompanies({
                involved_companies: [
                    { developer: true, company: { name: 'Dev Studio' } },
                    { developer: false, company: { name: 'Publisher Co' } },
                    { developer: true, company: null }, // filtered out
                ],
            }, dl);
            expect(dl.textContent).toContain('Dev Studio');
            expect(dl.textContent).toContain('Publisher Co');
        });

        test('skips when no involved companies', () => {
            const dl = document.getElementById('game-meta');
            renderCompanies({}, dl);
            expect(dl.children.length).toBe(0);
        });

        test('skips rows when devs or pubs list is empty', () => {
            const dl = document.getElementById('game-meta');
            renderCompanies({ involved_companies: [] }, dl);
            expect(dl.children.length).toBe(0);
        });
    });

    describe('renderCollectionsAndFranchises', () => {
        test('renders collections', () => {
            const dl = document.getElementById('game-meta');
            renderCollectionsAndFranchises({
                collections: [{ id: 1, name: 'Sonic Series' }],
            }, dl);
            expect(dl.textContent).toContain('Sonic Series');
        });

        test('renders collections with numeric id fallback', () => {
            const dl = document.getElementById('game-meta');
            renderCollectionsAndFranchises({ collections: [7] }, dl);
            expect(dl.textContent).toContain('#7');
        });

        test('renders franchises array', () => {
            const dl = document.getElementById('game-meta');
            renderCollectionsAndFranchises({
                franchises: [{ id: 2, name: 'Mario' }],
            }, dl);
            expect(dl.textContent).toContain('Mario');
        });

        test('renders franchises array with plain numeric franchise id (no name)', () => {
            const dl = document.getElementById('game-meta');
            renderCollectionsAndFranchises({ franchises: [5] }, dl);
            // f.id is undefined so falls back to f (the number), f.name is undefined so badge shows #5
            expect(dl.textContent).toContain('#5');
        });

        test('falls back to single franchise object when no franchises array', () => {
            const dl = document.getElementById('game-meta');
            renderCollectionsAndFranchises({ franchise: { id: 1, name: 'Halo' } }, dl);
            expect(dl.textContent).toContain('Halo');
        });

        test('falls back to franchise with no id (uses empty string)', () => {
            const dl = document.getElementById('game-meta');
            renderCollectionsAndFranchises({ franchise: { name: 'No ID Franchise' } }, dl);
            expect(dl.textContent).toContain('No ID Franchise');
        });

        test('skips franchise when neither franchises array nor franchise object', () => {
            const dl = document.getElementById('game-meta');
            renderCollectionsAndFranchises({
                franchise: { id: 10, name: 'Zelda' },
            }, dl);
            expect(dl.textContent).toContain('Zelda');
        });

        test('skips franchise when neither franchises array nor franchise object', () => {
            const dl = document.getElementById('game-meta');
            renderCollectionsAndFranchises({}, dl);
            expect(dl.children.length).toBe(0);
        });
    });

    describe('renderMultiplayer', () => {
        test('renders all multiplayer modes', () => {
            const dl = document.getElementById('game-meta');
            renderMultiplayer({
                multiplayer_modes: [{ offlinecoopmax: 2, onlinecoopmax: 4, offlinemax: 4, onlinemax: 8 }],
            }, dl);
            expect(dl.textContent).toContain('Co-op');
        });

        test('skips when no multiplayer modes', () => {
            const dl = document.getElementById('game-meta');
            renderMultiplayer({}, dl);
            expect(dl.children.length).toBe(0);
        });

        test('skips when parts are empty', () => {
            const dl = document.getElementById('game-meta');
            renderMultiplayer({ multiplayer_modes: [{}] }, dl);
            expect(dl.children.length).toBe(0);
        });
    });

    describe('renderScreenshots', () => {
        test('renders screenshot buttons that fire openImageModal on click', () => {
            renderScreenshots({
                screenshots: [
                    { url: '//images.igdb.com/t_thumb/ss1.jpg' },
                    { url: '//images.igdb.com/t_thumb/ss2.jpg' },
                ],
            });
            const section = document.getElementById('game-screenshots-section');
            expect(section.classList.contains('d-none')).toBe(false);
            const buttons = document.querySelectorAll('#game-screenshots button');
            expect(buttons.length).toBe(2);
            buttons[0].click();
            expect(globalThis.openImageModal).toHaveBeenCalled();
        });

        test('skips when no screenshots', () => {
            renderScreenshots({});
            expect(document.getElementById('game-screenshots-section').classList.contains('d-none')).toBe(true);
        });
    });

    describe('renderVideos', () => {
        test('renders video embeds with title', () => {
            renderVideos({ videos: [{ video_id: 'abc123', name: 'Trailer' }] });
            expect(document.getElementById('game-videos-section').classList.contains('d-none')).toBe(false);
            expect(document.querySelector('#game-videos iframe').src).toContain('abc123');
            expect(document.querySelector('#game-videos .card-body')).not.toBeNull();
        });

        test('renders video with title property when name absent', () => {
            renderVideos({ videos: [{ video_id: 'xyz', title: 'Gameplay' }] });
            expect(document.querySelector('#game-videos .card-body').textContent).toContain('Gameplay');
        });

        test('skips video entries without video_id', () => {
            renderVideos({ videos: [{ name: 'No ID' }] });
            expect(document.querySelectorAll('#game-videos iframe').length).toBe(0);
        });

        test('skips when no videos', () => {
            renderVideos({});
            expect(document.getElementById('game-videos-section').classList.contains('d-none')).toBe(true);
        });

        test('skips card body when no name or title', () => {
            renderVideos({ videos: [{ video_id: 'nnn' }] });
            expect(document.querySelector('#game-videos .card-body')).toBeNull();
        });
    });

    describe('renderExternalLinks', () => {
        test('renders external links with source name', () => {
            renderExternalLinks({
                external_games: [
                    { url: 'https://store.steampowered.com/app/1', external_game_source: { name: 'Steam' } },
                ],
            });
            expect(document.getElementById('game-external-section').classList.contains('d-none')).toBe(false);
            expect(document.getElementById('game-external').textContent).toContain('Steam');
        });

        test('renders link with uid when no url', () => {
            renderExternalLinks({
                external_games: [{ uid: '12345', external_game_source: { name: 'GOG' } }],
            });
            expect(document.getElementById('game-external').textContent).toContain('GOG');
        });

        test('uses "External" when no source name', () => {
            renderExternalLinks({
                external_games: [{ url: 'https://example.com' }],
            });
            expect(document.getElementById('game-external').textContent).toContain('External');
        });

        test('skips entries with no url and no uid', () => {
            renderExternalLinks({ external_games: [{}] });
            expect(document.getElementById('game-external').children.length).toBe(0);
        });

        test('skips when no external_games', () => {
            renderExternalLinks({});
            expect(document.getElementById('game-external-section').classList.contains('d-none')).toBe(true);
        });
    });

    describe('renderCharacters', () => {
        test('renders character cards with mug shot and name', () => {
            renderCharacters({
                characters: [{ id: 1, name: 'Hero', mug_shot: { url: '//images.igdb.com/t_thumb/mug.jpg' } }],
            });
            expect(document.getElementById('game-characters-section').classList.contains('d-none')).toBe(false);
            expect(document.querySelector('#game-characters img')).not.toBeNull();
            expect(document.getElementById('game-characters').textContent).toContain('Hero');
        });

        test('renders character with mug shot but no name (empty alt)', () => {
            renderCharacters({ characters: [{ id: 3, mug_shot: { url: '//images.igdb.com/t_thumb/mug.jpg' } }] });
            expect(document.querySelector('#game-characters img').alt).toBe('');
        });

        test('renders character placeholder when no mug shot', () => {
            renderCharacters({ characters: [{ id: 2, name: 'NPC' }] });
            expect(document.querySelector('#game-characters .material-symbols-outlined')).not.toBeNull();
        });

        test('renders character with numeric id (no name or mug)', () => {
            renderCharacters({ characters: [99] });
            const card = document.querySelector('#game-characters a');
            expect(card.href).toContain('id=99');
        });

        test('skips when no characters', () => {
            renderCharacters({});
            expect(document.getElementById('game-characters-section').classList.contains('d-none')).toBe(true);
        });
    });

    describe('setupGameBanner', () => {
        test('sets up banner attributes when artworks present', () => {
            renderGameBadges({}); // ensure intro-header is present
            setupGameBanner({
                artworks: [
                    { url: '//images.igdb.com/t_thumb/art1.jpg' },
                    { url: '//images.igdb.com/t_thumb/art2.jpg' },
                ],
            });
            const bigImgs = document.getElementById('header-big-imgs');
            expect(bigImgs.dataset.numImg).toBe('2');
            expect(bigImgs.dataset.imgSrc1).toContain('art1');
        });

        test('hides page heading when no artworks and heading exists', () => {
            setupGameBanner({});
            const heading = document.querySelector('.page-heading');
            expect(heading.style.display).toBe('none');
        });

        test('does nothing when no artworks and no .page-heading in DOM', () => {
            const pageHeading = document.querySelector('.page-heading');
            pageHeading.remove();
            // Should not throw and should not affect any element
            expect(() => setupGameBanner({})).not.toThrow();
        });

        test('calls initGameBanner when intro-header is present', () => {
            document.querySelector('.intro-header').classList.add('big-img');
            setupGameBanner({
                artworks: [{ url: '//images.igdb.com/t_thumb/art.jpg' }],
            });
            const bigImgs = document.getElementById('header-big-imgs');
            expect(bigImgs.dataset.numImg).toBe('1');
        });

        test('does not throw when artworks present but no intro-header.big-img', () => {
            // Remove intro-header from DOM entirely
            const introHeader = document.querySelector('.intro-header');
            introHeader.remove();
            expect(() => setupGameBanner({
                artworks: [{ url: '//images.igdb.com/t_thumb/art.jpg' }],
            })).not.toThrow();
        });

        test('skips pageHeading visibility when pageHeading absent (no .page-heading)', () => {
            // Remove page-heading from DOM
            const pageHeading = document.querySelector('.page-heading');
            pageHeading.remove();
            document.querySelector('.intro-header').classList.add('big-img');
            expect(() => setupGameBanner({
                artworks: [{ url: '//images.igdb.com/t_thumb/art.jpg' }],
            })).not.toThrow();
        });

        test('skips adding img-desc when it already exists', () => {
            const introHeader = document.querySelector('.intro-header');
            const existingDesc = document.createElement('span');
            existingDesc.className = 'img-desc';
            introHeader.appendChild(existingDesc);
            // Should not add a second img-desc
            setupGameBanner({ artworks: [{ url: '//images.igdb.com/t_thumb/art.jpg' }] });
            expect(document.querySelectorAll('.intro-header .img-desc').length).toBe(1);
        });

        test('does not throw when artworks present but no .page-heading anywhere', () => {
            // Remove header.header-section entirely
            const header = document.querySelector('header.header-section');
            header.remove();
            expect(() => setupGameBanner({ artworks: [{ url: '//img.igdb.com/t.jpg' }] })).not.toThrow();
        });
    });

    describe('initGameBanner', () => {
        test('returns early when numImgs is 0', () => {
            document.getElementById('header-big-imgs').dataset.numImg = '0';
            expect(() => initGameBanner()).not.toThrow();
        });

        test('sets initial image and cycles when multiple artworks', () => {
            const bigImgs = document.getElementById('header-big-imgs');
            bigImgs.dataset.numImg = '2';
            bigImgs.dataset.imgSrc1 = 'https://example.com/art1.jpg';
            bigImgs.dataset.imgSrc2 = 'https://example.com/art2.jpg';
            bigImgs.dataset.imgDesc1 = 'null';
            bigImgs.dataset.imgDesc2 = 'Artwork 2';

            const introHeader = document.querySelector('.intro-header');
            introHeader.classList.add('big-img');
            const imgDesc = document.createElement('span');
            imgDesc.className = 'img-desc';
            introHeader.appendChild(imgDesc);

            initGameBanner();
            expect(introHeader.style.backgroundImage).toContain('art1');
            // desc is "null" so imgDesc should be hidden
            expect(imgDesc.style.display).toBe('none');

            jest.advanceTimersByTime(7100);
            expect(introHeader.style.backgroundImage).toBeDefined();
            // second image has a real desc
            expect(imgDesc.style.display).toBe('block');
        });

        test('returns early when no intro-header.big-img found', () => {
            const bigImgs = document.getElementById('header-big-imgs');
            bigImgs.dataset.numImg = '1';
            bigImgs.dataset.imgSrc1 = 'https://example.com/art.jpg';
            // intro-header does NOT have big-img class — should return early
            expect(() => initGameBanner()).not.toThrow();
        });

        test('sets background image without crashing when no .img-desc inside intro-header', () => {
            const bigImgs = document.getElementById('header-big-imgs');
            bigImgs.dataset.numImg = '1';
            bigImgs.dataset.imgSrc1 = 'https://example.com/art.jpg';
            bigImgs.dataset.imgDesc1 = 'Some description';
            const introHeader = document.querySelector('.intro-header');
            introHeader.classList.add('big-img');
            // Do NOT add .img-desc — covers the if(imgDesc) false branch
            expect(() => initGameBanner()).not.toThrow();
            expect(introHeader.style.backgroundImage).toContain('art.jpg');
        });
    });

    describe('renderGame', () => {
        test('renders full game with all fields', async () => {
            jest.useRealTimers();
            globalThis.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ '1': { name: 'PC' } }),
            });
            renderGame({
                name: 'Full Game',
                summary: 'A summary',
                storyline: 'A storyline',
                url: 'https://igdb.com/game/1',
                cover: { url: '//images.igdb.com/t_thumb/c.jpg' },
                genres: [{ name: 'RPG' }],
                platforms: [1],
                release_dates: [{ date: '2020', y: 2020, human: '2020' }],
                involved_companies: [{ developer: true, company: { name: 'Dev' } }],
                collections: [{ id: 1, name: 'Series' }],
                multiplayer_modes: [{ onlinemax: 4 }],
                screenshots: [{ url: '//images.igdb.com/t_thumb/s.jpg' }],
                videos: [{ video_id: 'v1', name: 'Trailer' }],
                external_games: [{ url: 'https://steam.com', external_game_source: { name: 'Steam' } }],
                characters: [{ id: 1, name: 'Hero', mug_shot: { url: '//images.igdb.com/t_thumb/m.jpg' } }],
                artworks: [{ url: '//images.igdb.com/t_thumb/a.jpg' }],
            });
            expect(document.getElementById('game-name').textContent).toBe('Full Game');
            expect(document.title).toContain('Full Game');
            expect(document.getElementById('game-summary-section').classList.contains('d-none')).toBe(false);
            expect(document.getElementById('game-storyline-section').classList.contains('d-none')).toBe(false);
            expect(document.getElementById('game-igdb-link').classList.contains('d-none')).toBe(false);
        });

        test('renders minimal game with no optional fields', () => {
            renderGame({});
            expect(document.getElementById('game-name').textContent).toBe('Unknown Game');
            expect(document.title).toContain('Game');
        });

        test('renders game without header h1 (pageHeaderH1 is null)', () => {
            // Remove .page-heading h1 from DOM
            const h1 = document.querySelector('header.header-section .page-heading h1');
            if (h1) h1.remove();
            expect(() => renderGame({ name: 'No Header Game' })).not.toThrow();
            expect(document.getElementById('game-name').textContent).toBe('No Header Game');
        });
    });

    describe('DOMContentLoaded integration', () => {
        test('fires loadItemDetail on DOMContentLoaded', () => {
            globalThis.history.pushState(null, '', '/');
            expect(() => document.dispatchEvent(new Event('DOMContentLoaded'))).not.toThrow();
        });
    });
});
