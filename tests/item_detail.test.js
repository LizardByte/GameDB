/**
 * @jest-environment jsdom
 */

import {
    describe,
    expect,
    test,
    jest,
    beforeEach,
    afterEach,
} from '@jest/globals';

// Set up global dependencies before requiring the module
globalThis.GAMEDB_CONFIG = { base_path: '/GameDB' };

const {
    igdbImageUrl,
    getRegionFlag,
    makeBadge,
    addDlRow,
    showError,
    loadItemDetail,
    renderGameList,
    renderGameCard,
} = require('../gh-pages-template/assets/js/item_detail.js');

describe('item_detail.js', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        jest.restoreAllMocks();
    });

    describe('getQueryParam', () => {
        test('returns param value when present', () => {
            globalThis.history.pushState(null, '', '?id=42');
            const { getQueryParam: gqp } = require('../gh-pages-template/assets/js/item_detail.js');
            expect(gqp('id')).toBe('42');
            globalThis.history.pushState(null, '', '/');
        });

        test('returns null when param is absent', () => {
            globalThis.history.pushState(null, '', '/');
            const { getQueryParam: gqp } = require('../gh-pages-template/assets/js/item_detail.js');
            expect(gqp('id')).toBeNull();
        });
    });

    describe('igdbImageUrl', () => {
        test('replaces t_thumb with the requested size and adds https scheme', () => {
            const url = '//images.igdb.com/igdb/image/upload/t_thumb/abc123.jpg';
            const result = igdbImageUrl(url, 't_cover_big_2x');
            expect(result).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big_2x/abc123.jpg');
        });

        test('uses default size t_cover_big when no size provided', () => {
            const url = '//images.igdb.com/igdb/image/upload/t_thumb/abc123.jpg';
            expect(igdbImageUrl(url)).toContain('t_cover_big');
        });

        test('returns null for null input', () => {
            expect(igdbImageUrl(null, 't_cover_big_2x')).toBeNull();
        });

        test('returns null for undefined input', () => {
            expect(igdbImageUrl(undefined, 't_cover_big_2x')).toBeNull();
        });

        test('returns null for empty string', () => {
            expect(igdbImageUrl('', 't_cover_big_2x')).toBeNull();
        });
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

    describe('makeBadge', () => {
        test('creates badge with provided class', () => {
            const badge = makeBadge('Action', 'bg-primary');
            expect(badge.tagName).toBe('SPAN');
            expect(badge.className).toContain('badge');
            expect(badge.className).toContain('bg-primary');
            expect(badge.textContent).toBe('Action');
        });

        test('uses bg-secondary as default class', () => {
            const badge = makeBadge('Default');
            expect(badge.className).toContain('bg-secondary');
        });
    });

    describe('addDlRow', () => {
        test('appends dt and dd with string value', () => {
            const dl = document.createElement('dl');
            addDlRow(dl, 'Developer', 'Test Studio');
            expect(dl.children.length).toBe(2);
            expect(dl.children[0].tagName).toBe('DT');
            expect(dl.children[1].tagName).toBe('DD');
            expect(dl.children[0].textContent).toBe('Developer');
            expect(dl.children[1].textContent).toBe('Test Studio');
        });

        test('appends child element when value is HTMLElement', () => {
            const dl = document.createElement('dl');
            const link = document.createElement('a');
            link.textContent = 'Click';
            addDlRow(dl, 'Link', link);
            expect(dl.children[1].querySelector('a')).not.toBeNull();
        });

        test('appends child when value is DocumentFragment', () => {
            const dl = document.createElement('dl');
            const frag = document.createDocumentFragment();
            const span = document.createElement('span');
            span.textContent = 'frag content';
            frag.appendChild(span);
            addDlRow(dl, 'Frag', frag);
            expect(dl.children[1].querySelector('span')).not.toBeNull();
        });
    });

    describe('showError', () => {
        test('shows error element and hides content and loading', () => {
            document.body.innerHTML = `
                <div id="item-error" class="d-none"></div>
                <div id="item-content"></div>
                <div id="item-loading"></div>
            `;
            showError('Something went wrong');
            const errEl = document.getElementById('item-error');
            expect(errEl.textContent).toBe('Something went wrong');
            expect(errEl.classList.contains('d-none')).toBe(false);
            expect(document.getElementById('item-content').classList.contains('d-none')).toBe(true);
            expect(document.getElementById('item-loading').classList.contains('d-none')).toBe(true);
        });

        test('works when optional elements are absent', () => {
            document.body.innerHTML = '';
            // Should not throw
            expect(() => showError('Missing elements')).not.toThrow();
        });
    });

    describe('loadItemDetail', () => {
        // Helper to flush the promise chain (fetch -> .then -> .then -> .catch)
        const flushPromises = () => new Promise(r => setTimeout(r, 0));

        beforeEach(() => {
            document.body.innerHTML = `
                <div id="item-error" class="d-none"></div>
                <div id="item-content" class="d-none"></div>
                <div id="item-loading"></div>
            `;
        });

        test('calls showError when no id param', () => {
            globalThis.history.pushState(null, '', '/');
            loadItemDetail('games', jest.fn());
            const errEl = document.getElementById('item-error');
            expect(errEl.classList.contains('d-none')).toBe(false);
        });

        test('fetches data and calls renderFn on success', async () => {
            globalThis.history.pushState(null, '', '?id=1');
            const mockData = { name: 'Test Game' };
            globalThis.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockData),
            });
            const renderFn = jest.fn();
            loadItemDetail('games', renderFn);
            await flushPromises();
            await flushPromises();
            expect(renderFn).toHaveBeenCalledWith(mockData);
        });

        test('calls showError when fetch response is not ok', async () => {
            globalThis.history.pushState(null, '', '?id=999');
            globalThis.fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 404,
            });
            loadItemDetail('games', jest.fn());
            await flushPromises();
            await flushPromises();
            const errEl = document.getElementById('item-error');
            expect(errEl.classList.contains('d-none')).toBe(false);
        });

        test('calls showError when fetch rejects', async () => {
            globalThis.history.pushState(null, '', '?id=1');
            globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
            loadItemDetail('games', jest.fn());
            await flushPromises();
            await flushPromises();
            const errEl = document.getElementById('item-error');
            expect(errEl.classList.contains('d-none')).toBe(false);
        });

        test('hides loading and shows content on success', async () => {
            globalThis.history.pushState(null, '', '?id=1');
            globalThis.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ name: 'Game' }),
            });
            loadItemDetail('games', jest.fn());
            await flushPromises();
            await flushPromises();
            expect(document.getElementById('item-loading').classList.contains('d-none')).toBe(true);
            expect(document.getElementById('item-content').classList.contains('d-none')).toBe(false);
        });

        test('succeeds when item-loading and item-content elements are absent', async () => {
            document.body.innerHTML = '<div id="item-error" class="d-none"></div>';
            globalThis.history.pushState(null, '', '?id=1');
            globalThis.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ name: 'Game' }),
            });
            const renderFn = jest.fn();
            loadItemDetail('games', renderFn);
            await flushPromises();
            await flushPromises();
            expect(renderFn).toHaveBeenCalled();
        });
    });

    describe('renderGameList', () => {
        test('shows "No games listed." for null', () => {
            const container = document.createElement('div');
            renderGameList(container, null);
            expect(container.textContent).toBe('No games listed.');
        });

        test('shows "No games listed." for empty array', () => {
            const container = document.createElement('div');
            renderGameList(container, []);
            expect(container.textContent).toBe('No games listed.');
        });

        test('renders game cards for objects with full data', () => {
            const container = document.createElement('div');
            const games = [
                { id: 1, name: 'Game One', cover: { url: '//images.igdb.com/t_thumb/1.jpg' } },
            ];
            renderGameList(container, games);
            expect(container.querySelector('.game-card')).not.toBeNull();
        });

        test('renders game cards for raw IDs (fetches data)', async () => {
            globalThis.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ name: 'Fetched Game', cover: { url: '//images.igdb.com/t_thumb/x.jpg' } }),
            });
            const container = document.createElement('div');
            renderGameList(container, [42]);
            await new Promise(r => setTimeout(r, 0));
            expect(globalThis.fetch).toHaveBeenCalled();
        });

        test('handles failed fetch for raw IDs gracefully', async () => {
            globalThis.fetch = jest.fn().mockRejectedValue(new Error('fail'));
            const container = document.createElement('div');
            renderGameList(container, [99]);
            await new Promise(r => setTimeout(r, 0));
            // Should not throw; container still has a row
            expect(container.querySelector('.row')).not.toBeNull();
        });

        test('renders game without cover (fetch returns not-ok)', async () => {
            globalThis.fetch = jest.fn().mockResolvedValue({ ok: false });
            const container = document.createElement('div');
            renderGameList(container, [7]);
            await new Promise(r => setTimeout(r, 0));
            expect(container.querySelector('.row')).not.toBeNull();
        });

        test('renders game object with cover but no URL (null cover url)', () => {
            const container = document.createElement('div');
            renderGameList(container, [{ id: 10, name: 'No URL Game', cover: {} }]);
            expect(container.querySelector('.game-card')).not.toBeNull();
        });

        test('renders fetched game with no cover (cover is null in response)', async () => {
            globalThis.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ name: 'No Cover Game', cover: null }),
            });
            const container = document.createElement('div');
            renderGameList(container, [15]);
            // Flush all microtask ticks for the full promise chain
            for (let i = 0; i < 10; i++) await Promise.resolve();
            expect(container.querySelector('.row')).not.toBeNull();
        });
    });

    describe('renderGameCard', () => {
        test('renders card with cover image', () => {
            const row = document.createElement('div');
            renderGameCard(row, 1, 'My Game', 'https://images.igdb.com/cover.jpg');
            const img = row.querySelector('img');
            expect(img).not.toBeNull();
            expect(img.src).toContain('cover.jpg');
        });

        test('renders placeholder when no cover URL', () => {
            const row = document.createElement('div');
            renderGameCard(row, 2, 'No Cover', null);
            expect(row.querySelector('img')).toBeNull();
            expect(row.querySelector('.material-symbols-outlined')).not.toBeNull();
        });

        test('renders game name', () => {
            const row = document.createElement('div');
            renderGameCard(row, 3, 'Named Game', null);
            expect(row.textContent).toContain('Named Game');
        });

        test('renders game ID when no name provided', () => {
            const row = document.createElement('div');
            renderGameCard(row, 55, null, null);
            expect(row.textContent).toContain('Game #55');
        });

        test('renders cover img with empty alt when cover present but no name', () => {
            const row = document.createElement('div');
            renderGameCard(row, 10, null, 'https://images.igdb.com/cover.jpg');
            const img = row.querySelector('img');
            expect(img).not.toBeNull();
            expect(img.alt).toBe('');
        });
    });

    describe('base_path defaults to /GameDB when GAMEDB_CONFIG has no base_path', () => {
        test('getQueryParam still works without GAMEDB_CONFIG.base_path', () => {
            // Reset modules and require without base_path to exercise the else branch
            jest.resetModules();
            globalThis.GAMEDB_CONFIG = {};
            const freshModule = require('../gh-pages-template/assets/js/item_detail.js');
            globalThis.history.pushState(null, '', '?id=5');
            expect(freshModule.getQueryParam('id')).toBe('5');
            // Restore
            globalThis.GAMEDB_CONFIG = { base_path: '/GameDB' };
        });
    });
});
