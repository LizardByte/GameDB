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

globalThis.GAMEDB_CONFIG = { base_path: '/GameDB' };
globalThis.rankingSorter = () => () => 0;

// item_loader.js reads platforms_container at module load time via getElementById
// so we need the element in the DOM before require()
document.body.innerHTML = `
    <div id="platforms-container"></div>
    <div id="search-container"></div>
    <input id="search_term" value="" />
`;

const {
    splitString,
    fetchGameData,
    createGameCard,
    renderSearchResults,
    addMoreResultsNote,
    createPlatformBanner,
    createPlatformCardBody,
    getPlatformVersion,
    addVersionMetadataToFooter,
    addReleaseDatesToFooter,
    addMetadataItemToFooter,
    processPlatformsData,
    createPlatformCardElement,
    fetchJson,
    initializePlatformCards,
    run_search,
} = require('../gh-pages-template/assets/js/item_loader.js');

describe('item_loader.js', () => {
    beforeEach(() => {
        // Reset just the dynamic containers, not the full body (platforms-container needed at load time)
        const sc = document.getElementById('search-container');
        if (sc) sc.innerHTML = '';
        const st = document.getElementById('search_term');
        if (st) st.value = '';
        const pc = document.getElementById('platforms-container');
        if (pc) pc.innerHTML = '';
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('splitString', () => {
        test('returns string as-is when short', () => {
            expect(splitString('hello')).toEqual(['hello']);
        });

        test('returns [undefined] for undefined', () => {
            expect(splitString(undefined)).toEqual([undefined]);
        });

        test('splits at word boundary when longer than 200 chars', () => {
            const long = 'word '.repeat(50); // 250 chars
            const result = splitString(long);
            expect(result.length).toBe(2);
            expect(result[0].length).toBeLessThanOrEqual(200);
            expect(result[1]).toBe(long);
        });
    });

    describe('fetchGameData', () => {
        test('fetches and returns game data on success', async () => {
            globalThis.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ name: 'Halo' }),
            });
            const result = await fetchGameData(1, 'Halo');
            expect(result).toEqual({ id: 1, game: { name: 'Halo' } });
        });

        test('returns fallback with gameName when response is not ok', async () => {
            globalThis.fetch = jest.fn().mockResolvedValue({ ok: false });
            const result = await fetchGameData(2, 'Fallback Game');
            expect(result).toEqual({ id: 2, game: { name: 'Fallback Game' } });
        });

        test('returns fallback with gameName when fetch rejects', async () => {
            globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
            const result = await fetchGameData(3, 'Error Game');
            expect(result).toEqual({ id: 3, game: { name: 'Error Game' } });
        });
    });

    describe('fetchJson', () => {
        test('fetches JSON with no-store cache behavior', async () => {
            globalThis.fetch = jest.fn().mockResolvedValue({
                json: () => Promise.resolve({ ok: true }),
            });
            await expect(fetchJson('/data.json')).resolves.toEqual({ ok: true });
            expect(globalThis.fetch).toHaveBeenCalledWith('/data.json', { cache: 'no-store' });
        });
    });

    describe('createGameCard', () => {
        test('renders card with cover image', () => {
            const col = createGameCard(1, {
                name: 'Test Game',
                cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/cover.jpg' },
            });
            expect(col.querySelector('img')).not.toBeNull();
            expect(col.querySelector('img').src).toContain('t_cover_big_2x');
        });

        test('renders placeholder when no cover', () => {
            const col = createGameCard(2, { name: 'No Cover' });
            expect(col.querySelector('img')).toBeNull();
            expect(col.querySelector('.material-symbols-outlined')).not.toBeNull();
        });

        test('renders platforms with release years when allPlatforms provided', () => {
            const allPlatforms = { '1': { name: 'PC' }, '2': { name: 'PS5' }, '3': { name: 'Xbox' }, '4': { name: 'Switch' } };
            const col = createGameCard(3, {
                name: 'Multi Platform',
                platforms: [1, 2, 3, 4],
                release_dates: [
                    { platform: 1, y: 2020 },
                    { platform: 2, y: 2021 },
                    { platform: 1, y: 2019 }, // earlier year replaces
                    { platform: 2, y: 2022 }, // later year does NOT replace (covers false branch of rd.y < platformYears)
                ],
            }, allPlatforms);
            // Should show first 3 platforms + "+1 more"
            const badges = col.querySelectorAll('.badge');
            expect(badges.length).toBe(4); // 3 platforms + "+1 more"
            expect(col.textContent).toContain('+1 more');
        });

        test('renders platforms without release year when no release dates', () => {
            const allPlatforms = { '1': { name: 'PC' } };
            const col = createGameCard(4, {
                name: 'PC Game',
                platforms: [1],
            }, allPlatforms);
            expect(col.textContent).toContain('PC');
        });

        test('uses platform ID as name when platform not in allPlatforms', () => {
            const col = createGameCard(5, {
                name: 'Unknown Platform Game',
                platforms: [999],
            }, {});
            expect(col.textContent).toContain('999');
        });
    });

    describe('renderSearchResults', () => {
        test('appends game cards to row', () => {
            const row = document.createElement('div');
            renderSearchResults(
                [{ id: 1, game: { name: 'Game A' } }, { id: 2, game: { name: 'Game B' } }],
                row,
                null,
            );
            expect(row.children.length).toBe(2);
        });
    });

    describe('addMoreResultsNote', () => {
        test('appends note when total exceeds shown', () => {
            const container = document.createElement('div');
            addMoreResultsNote(container, 100, 60);
            expect(container.children.length).toBe(1);
            expect(container.textContent).toContain('60');
        });

        test('does nothing when total equals shown', () => {
            const container = document.createElement('div');
            addMoreResultsNote(container, 60, 60);
            expect(container.children.length).toBe(0);
        });
    });

    describe('createPlatformBanner', () => {
        test('creates banner with screenscraper image', () => {
            const banner = createPlatformBanner({ screenscraper_id: 123, screenscraper_region: 'us', id: 1 }, '/test');
            expect(banner.src).toContain('screenscraper.fr');
            expect(banner.src).toContain('123');
        });

        test('creates banner with IGDB logo (t_thumb replaced)', () => {
            const banner = createPlatformBanner({
                screenscraper_id: null,
                screenscraper_region: null,
                platform_logo: { url: '//images.igdb.com/igdb/image/upload/t_thumb/logo.jpg' },
                id: 1,
            }, '/test');
            expect(banner.src).toContain('t_720p');
        });

        test('creates placeholder when no images', () => {
            const banner = createPlatformBanner({ screenscraper_id: null, screenscraper_region: null, id: 1 }, '/test');
            expect(banner.src).toContain('no-logo.png');
        });
    });

    describe('createPlatformCardBody', () => {
        test('creates card body with title and link', () => {
            const body = createPlatformCardBody({ id: 1, name: 'PS5', url: 'https://igdb.com' }, '/test');
            expect(body.textContent).toContain('PS5');
            expect(body.textContent).toContain('View on IGDB');
            expect(body.querySelector('a').href).toContain('id=1');
        });

        test('includes game count (plural)', () => {
            const body = createPlatformCardBody({ id: 1, name: 'PS5', url: '', game_count: 42 }, '/test');
            expect(body.textContent).toContain('42 games');
        });

        test('includes game count (singular)', () => {
            const body = createPlatformCardBody({ id: 1, name: 'PS5', url: '', game_count: 1 }, '/test');
            expect(body.textContent).toContain('1 game');
            expect(body.textContent).not.toContain('1 games');
        });
    });

    describe('getPlatformVersion', () => {
        test('returns null when no versions', () => {
            expect(getPlatformVersion({ versions: [] })).toBeNull();
            expect(getPlatformVersion({ category: 1 })).toBeNull();
        });

        test('returns last version for OS (category 4)', () => {
            const p = { category: 4, versions: [{ name: 'v1' }, { name: 'v3' }] };
            expect(getPlatformVersion(p).name).toBe('v3');
        });

        test('returns first version for Console (category 1)', () => {
            const p = { category: 1, versions: [{ name: 'Original' }, { name: 'Slim' }] };
            expect(getPlatformVersion(p).name).toBe('Original');
        });
    });

    describe('addVersionMetadataToFooter', () => {
        const regionMap = { north_america: { code: '🇺🇸', size: 'fs-2' } };
        const iconMap = {
            cpu: 'memory',
            platform_version_release_dates: null,
            summary: null,
        };

        test('adds cpu metadata item', () => {
            const para = document.createElement('p');
            const footer = document.createElement('div');
            addVersionMetadataToFooter({ cpu: 'Intel 486' }, para, footer, {}, regionMap, iconMap);
            expect(footer.textContent).toContain('Intel 486');
        });

        test('sets summary on card_paragraph when platform has no summary', () => {
            const para = document.createElement('p');
            const footer = document.createElement('div');
            addVersionMetadataToFooter({ summary: 'Version summary' }, para, footer, {}, regionMap, iconMap);
            expect(para.textContent).toContain('Version summary');
        });

        test('skips summary when platform already has summary', () => {
            const para = document.createElement('p');
            const footer = document.createElement('div');
            addVersionMetadataToFooter(
                { summary: 'Version summary' },
                para, footer,
                { summary: 'Platform summary' }, // platform has its own summary
                regionMap, iconMap,
            );
            expect(para.textContent).toBe('');
        });

        test('adds release dates to footer', () => {
            const para = document.createElement('p');
            const footer = document.createElement('div');
            addVersionMetadataToFooter(
                { platform_version_release_dates: [{ release_region: { region: 'north_america' }, human: 'Nov 2001' }] },
                para, footer, {}, regionMap, iconMap,
            );
            expect(footer.textContent).toContain('Nov 2001');
        });

        test('skips keys not present in version', () => {
            const para = document.createElement('p');
            const footer = document.createElement('div');
            addVersionMetadataToFooter({}, para, footer, {}, regionMap, iconMap);
            expect(footer.children.length).toBe(0);
        });

        test('skips metadata key when it has null icon and is not a special key', () => {
            const para = document.createElement('p');
            const footer = document.createElement('div');
            // 'media' key has a value but null icon in the map passed
            const customIconMap = { media: null, platform_version_release_dates: null, summary: null };
            addVersionMetadataToFooter({ media: 'Blu-ray' }, para, footer, {}, regionMap, customIconMap);
            // Should not add to footer since icon is null and not a special key
            expect(footer.children.length).toBe(0);
        });
    });

    describe('addReleaseDatesToFooter', () => {
        test('adds release dates with regions', () => {
            const footer = document.createElement('div');
            addReleaseDatesToFooter(
                [
                    { release_region: { region: 'north_america' }, human: 'Nov 15, 2013' },
                    { release_region: { region: 'unknown_region' }, y: 2014 },
                    { release_region: null, human: null, y: 2015 },
                ],
                footer,
                { north_america: { code: '🇺🇸', size: 'fs-2' } },
            );
            expect(footer.textContent).toContain('Nov 15, 2013');
            expect(footer.textContent).toContain('2015');
        });

        test('renders empty string when release date has no human or y', () => {
            const footer = document.createElement('div');
            addReleaseDatesToFooter(
                [{ release_region: null, human: null, y: null }],
                footer,
                {},
            );
            // Should render the div without crashing
            expect(footer.querySelector('div')).not.toBeNull();
        });
    });

    describe('addMetadataItemToFooter', () => {
        test('adds metadata item with icon', () => {
            const footer = document.createElement('div');
            addMetadataItemToFooter('cpu', 'Intel Core i7', footer, 'memory');
            expect(footer.textContent).toContain('Intel Core i7');
            expect(footer.querySelector('.material-symbols-outlined').textContent).toBe('memory');
        });
    });

    describe('processPlatformsData', () => {
        test('maps screenscraper IDs from xref', () => {
            const result = processPlatformsData(
                { ps5: { id: 167, name: 'PS5' }, xbox: { id: 169, name: 'Xbox' } },
                { ps5: { ids: { igdb: 167, screenscraper: 1000 }, variables: { screenscraper: { region: 'us' } } } },
            );
            expect(result[0].screenscraper_id).toBe(1000);
            expect(result[0].screenscraper_region).toBe('us');
            expect(result[1].screenscraper_id).toBeNull();
        });
    });

    describe('createPlatformCardElement', () => {
        const regionMap = { north_america: { code: '🇺🇸', size: 'fs-2' } };
        const iconMap = { cpu: 'memory', platform_version_release_dates: null, summary: null };

        test('creates full card with version metadata', () => {
            const platform = {
                id: 1,
                name: 'PS5',
                url: 'https://igdb.com',
                summary: 'A great console.',
                category: 1,
                screenscraper_id: null,
                screenscraper_region: null,
                versions: [{ name: 'Launch', cpu: 'AMD Zen 2' }],
            };
            const col = createPlatformCardElement(platform, regionMap, iconMap, '/test');
            expect(col.textContent).toContain('PS5');
            expect(col.textContent).toContain('AMD Zen 2');
        });

        test('creates card without version when no versions', () => {
            const platform = {
                id: 2, name: 'Switch', url: '', summary: 'Nintendo Switch.',
                screenscraper_id: 555, screenscraper_region: 'us',
                platform_logo: { url: '//images.igdb.com/t_thumb/sw.jpg' },
            };
            const col = createPlatformCardElement(platform, regionMap, iconMap, '/test');
            expect(col.textContent).toContain('Switch');
        });
    });

    describe('initializePlatformCards', () => {
        test('loads cross-reference before rendering platform cards', async () => {
            globalThis.fetch = jest.fn(url => Promise.resolve({
                json: () => Promise.resolve(
                    url.includes('cross-reference')
                        ? { pc: { ids: { igdb: 1, screenscraper: 123 }, variables: { screenscraper: { region: 'us' } } } }
                        : { '1': { id: 1, name: 'PC', url: 'https://igdb.com', summary: 'Personal computer.' } },
                ),
            }));

            await initializePlatformCards();

            expect(globalThis.fetch).toHaveBeenNthCalledWith(
                1,
                'http://localhost/GameDB/platforms/cross-reference.json',
                { cache: 'no-store' },
            );
            expect(globalThis.fetch).toHaveBeenNthCalledWith(
                2,
                'http://localhost/GameDB/platforms/all.json',
                { cache: 'no-store' },
            );
            expect(document.getElementById('platforms-container').textContent).toContain('PC');
        });
    });

    describe('run_search', () => {
        /**
         * Wait for queued promise callbacks in fetch-driven rendering tests.
         *
         * @returns {Promise<void>} Resolves after the current macrotask.
         */
        const flushPromises = () => new Promise(r => setTimeout(r, 0));

        test('does nothing when search term is empty', () => {
            document.getElementById('search_term').value = '  ';
            run_search();
            expect(document.getElementById('search-container').innerHTML).toBe('');
        });

        test('shows loading, then renders results on success', async () => {
            document.getElementById('search_term').value = 'halo';
            globalThis.fetch = jest.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({
                        '1': { name: 'Halo: CE' },
                        '2': { name: 'Halo 2' },
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({}), // platforms
                })
                .mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve({ name: 'Halo: CE', cover: null }),
                });
            run_search();
            await flushPromises();
            await flushPromises();
            await flushPromises();
            const container = document.getElementById('search-container');
            expect(container.textContent).toContain('Halo');
        });

        test('shows no results message when no matches', async () => {
            document.getElementById('search_term').value = 'zzznomatch';
            globalThis.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ '1': { name: 'Unrelated' } }),
            });
            run_search();
            await flushPromises();
            await flushPromises();
            expect(document.getElementById('search-container').textContent).toContain('No games found');
        });

        test('shows error when bucket fetch fails', async () => {
            document.getElementById('search_term').value = 'fail';
            globalThis.fetch = jest.fn().mockResolvedValue({ ok: false });
            run_search();
            await flushPromises();
            await flushPromises();
            expect(document.getElementById('search-container').textContent).toContain('Search failed');
        });

        test('shows error when fetch rejects', async () => {
            document.getElementById('search_term').value = 'crash';
            globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network down'));
            run_search();
            await flushPromises();
            await flushPromises();
            expect(document.getElementById('search-container').textContent).toContain('Search failed');
        });

        test('uses @ bucket when search term has no alphanumeric characters', async () => {
            document.getElementById('search_term').value = '!!!';
            globalThis.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({}),
            });
            run_search();
            await flushPromises();
            await flushPromises();
            const fetchUrl = globalThis.fetch.mock.calls[0][0];
            expect(fetchUrl).toContain('%40'); // @ URL-encoded
        });

        test('renders results even when platform fetch fails', async () => {
            document.getElementById('search_term').value = 'mario';
            globalThis.fetch = jest.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ '10': { name: 'Mario' } }),
                })
                .mockRejectedValueOnce(new Error('Platform fetch failed'))
                .mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve({ name: 'Mario' }),
                });
            run_search();
            await flushPromises();
            await flushPromises();
            await flushPromises();
            const container = document.getElementById('search-container');
            expect(container.textContent).toContain('Mario');
        });
    });
});
