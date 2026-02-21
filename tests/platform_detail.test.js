/**
 * @jest-environment jsdom
 */

import {
    describe,
    test,
    expect,
    beforeEach,
    afterEach,
} from '@jest/globals';

globalThis.GAMEDB_CONFIG = { base_path: '/GameDB' };

const itemDetail = require('../gh-pages-template/assets/js/item_detail.js');
globalThis.igdbImageUrl = itemDetail.igdbImageUrl;
globalThis.makeBadge = itemDetail.makeBadge;
globalThis.addDlRow = itemDetail.addDlRow;
globalThis.loadItemDetail = itemDetail.loadItemDetail;
globalThis.renderGameList = itemDetail.renderGameList;
globalThis.base_path = '/GameDB';
globalThis.base_url = 'http://localhost/GameDB';

const {
    getRegionFlag,
    renderPlatformLogo,
    renderPlatformBadges,
    renderPlatformMetadata,
    createVersionAccordionItem,
    populateVersionBody,
    renderPlatform,
} = require('../gh-pages-template/assets/js/platform_detail.js');

const baseDom = `
    <title></title>
    <h1 id="platform-name"></h1>
    <img id="platform-logo" style="display:none;" alt="" src="" />
    <div id="platform-logo-placeholder"></div>
    <div id="platform-badges"></div>
    <dl id="platform-meta"></dl>
    <div id="platform-summary-section" class="d-none">
        <p id="platform-summary"></p>
    </div>
    <div id="platform-versions-section" class="d-none">
        <div id="platform-versions" class="accordion"></div>
    </div>
    <div id="platform-games-section" class="d-none">
        <div id="platform-games"></div>
    </div>
    <a id="platform-igdb-link" class="d-none"></a>
`;

describe('platform_detail.js', () => {
    beforeEach(() => {
        document.body.innerHTML = baseDom;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('getRegionFlag', () => {
        test('returns correct flags for all known regions', () => {
            expect(getRegionFlag('europe')).toBe('🇪🇺');
            expect(getRegionFlag('north_america')).toBe('🇺🇸');
            expect(getRegionFlag('australia')).toBe('🇦🇺');
            expect(getRegionFlag('new_zealand')).toBe('🇳🇿');
            expect(getRegionFlag('japan')).toBe('🇯🇵');
            expect(getRegionFlag('china')).toBe('🇨🇳');
            expect(getRegionFlag('asia')).toBe('🌏');
            expect(getRegionFlag('worldwide')).toBe('🌍');
            expect(getRegionFlag('korea')).toBe('🇰🇷');
            expect(getRegionFlag('brazil')).toBe('🇧🇷');
        });

        test('returns default globe for unknown region', () => {
            expect(getRegionFlag('unknown')).toBe('🌐');
            expect(getRegionFlag('')).toBe('🌐');
        });
    });

    describe('renderPlatformLogo', () => {
        test('renders logo when URL provided', () => {
            renderPlatformLogo({
                name: 'PlayStation 5',
                platform_logo: { url: '//images.igdb.com/igdb/image/upload/t_logo_med_2x/ps5.jpg' },
            });
            const logo = document.getElementById('platform-logo');
            expect(logo.style.display).toBe('');
            expect(logo.alt).toBe('PlayStation 5');
        });

        test('renders logo with empty alt when no name', () => {
            renderPlatformLogo({
                platform_logo: { url: '//images.igdb.com/igdb/image/upload/t_logo_med_2x/ps5.jpg' },
            });
            expect(document.getElementById('platform-logo').alt).toBe('');
        });

        test('shows placeholder when no logo URL', () => {
            renderPlatformLogo({ name: 'Test Platform' });
            expect(document.getElementById('platform-logo').style.display).toBe('none');
        });

        test('shows placeholder when platform_logo present but no url', () => {
            renderPlatformLogo({ name: 'No URL', platform_logo: {} });
            expect(document.getElementById('platform-logo').style.display).toBe('none');
        });
    });

    describe('renderPlatformBadges', () => {
        test('renders category and generation badges', () => {
            renderPlatformBadges({ category: 1, generation: 9 });
            const badges = document.getElementById('platform-badges');
            expect(badges.children.length).toBe(2);
        });

        test('renders only category when no generation', () => {
            renderPlatformBadges({ category: 2 });
            expect(document.getElementById('platform-badges').children.length).toBe(1);
        });

        test('renders only generation when no category', () => {
            renderPlatformBadges({ generation: 8 });
            expect(document.getElementById('platform-badges').children.length).toBe(1);
        });

        test('renders nothing when no category or generation', () => {
            renderPlatformBadges({});
            expect(document.getElementById('platform-badges').children.length).toBe(0);
        });

        test('renders fallback text for unknown category number', () => {
            renderPlatformBadges({ category: 999 });
            expect(document.getElementById('platform-badges').textContent).toContain('Category 999');
        });
    });

    describe('renderPlatformMetadata', () => {
        test('renders game count (plural)', () => {
            renderPlatformMetadata({ games: Array(42).fill({}) });
            expect(document.getElementById('platform-meta').textContent).toContain('42 games');
        });

        test('renders game count (singular)', () => {
            renderPlatformMetadata({ games: [{}] });
            expect(document.getElementById('platform-meta').textContent).toContain('1 game');
        });

        test('renders abbreviation', () => {
            renderPlatformMetadata({ abbreviation: 'PS5' });
            expect(document.getElementById('platform-meta').textContent).toContain('PS5');
        });

        test('renders alternative name', () => {
            renderPlatformMetadata({ alternative_name: 'PlayStation 5 Digital Edition' });
            expect(document.getElementById('platform-meta').textContent).toContain('Digital Edition');
        });

        test('renders platform type', () => {
            renderPlatformMetadata({ platform_type: { name: 'Console' } });
            expect(document.getElementById('platform-meta').textContent).toContain('Console');
        });

        test('renders nothing when no data', () => {
            renderPlatformMetadata({});
            expect(document.getElementById('platform-meta').children.length).toBe(0);
        });
    });

    describe('createVersionAccordionItem', () => {
        test('creates accordion item for first version (expanded)', () => {
            const item = createVersionAccordionItem({ name: 'Original' }, 0);
            expect(item.className).toContain('accordion-item');
            const button = item.querySelector('button');
            expect(button.getAttribute('aria-expanded')).toBe('true');
            expect(button.textContent).toContain('Original');
        });

        test('creates collapsed accordion item for subsequent versions', () => {
            const item = createVersionAccordionItem({ name: 'Slim' }, 1);
            const button = item.querySelector('button');
            expect(button.className).toContain('collapsed');
            expect(button.getAttribute('aria-expanded')).toBe('false');
        });

        test('uses fallback name when version has no name', () => {
            const item = createVersionAccordionItem({}, 0);
            const button = item.querySelector('button');
            expect(button.textContent).toContain('Version 1');
        });

        test('adds logo img when version has platform_logo url', () => {
            const item = createVersionAccordionItem({
                name: 'Pro',
                platform_logo: { url: '//images.igdb.com/igdb/image/upload/t_thumb/logo.jpg' },
            }, 0);
            expect(item.querySelector('button img')).not.toBeNull();
        });
    });

    describe('populateVersionBody', () => {
        test('renders summary paragraph', () => {
            const body = document.createElement('div');
            populateVersionBody(body, { summary: 'A hardware version.' });
            expect(body.querySelector('p').textContent).toBe('A hardware version.');
        });

        test('renders release dates list', () => {
            const body = document.createElement('div');
            populateVersionBody(body, {
                platform_version_release_dates: [
                    { release_region: { region: 'north_america' }, human: 'Sep 9, 1999' },
                    { release_region: null, human: '2000' },
                ],
            });
            expect(body.querySelector('ul')).not.toBeNull();
            expect(body.textContent).toContain('Sep 9, 1999');
        });

        test('renders release date with null region (uses globe fallback)', () => {
            const body = document.createElement('div');
            populateVersionBody(body, {
                platform_version_release_dates: [
                    { release_region: null, human: 'Nov 2001' },
                ],
            });
            expect(body.textContent).toContain('🌐');
            expect(body.textContent).toContain('Nov 2001');
        });

        test('renders release date using y fallback when no human', () => {
            const body = document.createElement('div');
            populateVersionBody(body, {
                platform_version_release_dates: [
                    { release_region: null, human: null, y: 1999 },
                ],
            });
            expect(body.textContent).toContain('1999');
        });

        test('renders release date with empty string when no human or y', () => {
            const body = document.createElement('div');
            populateVersionBody(body, {
                platform_version_release_dates: [
                    { release_region: null, human: null, y: null },
                ],
            });
            // Should render without crashing
            expect(body.querySelector('ul')).not.toBeNull();
        });

        test('renders spec table when specs present', () => {
            const body = document.createElement('div');
            populateVersionBody(body, { cpu: 'Intel 286', os: 'DOS' });
            expect(body.querySelector('dl')).not.toBeNull();
            expect(body.textContent).toContain('Intel 286');
        });

        test('renders IGDB link when url present', () => {
            const body = document.createElement('div');
            populateVersionBody(body, { url: 'https://igdb.com/platform_versions/1' });
            const link = body.querySelector('a');
            expect(link).not.toBeNull();
            expect(link.href).toContain('igdb.com');
        });

        test('renders nothing extra when version is empty', () => {
            const body = document.createElement('div');
            populateVersionBody(body, {});
            expect(body.children.length).toBe(0);
        });
    });

    describe('renderPlatform', () => {
        test('renders full platform with all fields', () => {
            renderPlatform({
                name: 'Super Nintendo',
                summary: 'A classic console.',
                url: 'https://igdb.com/platforms/snes',
                platform_logo: { url: '//images.igdb.com/igdb/image/upload/t_logo_med_2x/snes.jpg' },
                category: 1,
                generation: 4,
                games: [{ id: 1, name: 'Super Mario World', cover: { url: '//img.igdb.com/t_thumb/c.jpg' } }],
                versions: [
                    { name: 'Original', summary: 'The original SNES.' },
                    { name: 'Mini', summary: 'The SNES Mini.' },
                ],
            });
            expect(document.getElementById('platform-name').textContent).toBe('Super Nintendo');
            expect(document.title).toContain('Super Nintendo');
            expect(document.getElementById('platform-summary-section').classList.contains('d-none')).toBe(false);
            expect(document.getElementById('platform-versions-section').classList.contains('d-none')).toBe(false);
            expect(document.getElementById('platform-games-section').classList.contains('d-none')).toBe(false);
            expect(document.getElementById('platform-igdb-link').classList.contains('d-none')).toBe(false);
        });

        test('renders minimal platform with no optional fields', () => {
            renderPlatform({});
            expect(document.getElementById('platform-name').textContent).toBe('Unknown Platform');
            expect(document.getElementById('platform-summary-section').classList.contains('d-none')).toBe(true);
            expect(document.getElementById('platform-versions-section').classList.contains('d-none')).toBe(true);
            expect(document.getElementById('platform-games-section').classList.contains('d-none')).toBe(true);
            expect(document.getElementById('platform-igdb-link').classList.contains('d-none')).toBe(true);
        });
    });

    describe('DOMContentLoaded integration', () => {
        test('fires loadItemDetail on DOMContentLoaded', () => {
            globalThis.history.pushState(null, '', '/');
            expect(() => document.dispatchEvent(new Event('DOMContentLoaded'))).not.toThrow();
        });
    });
});
