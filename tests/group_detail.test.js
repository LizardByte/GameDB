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
globalThis.makeBadge = itemDetail.makeBadge;
globalThis.addDlRow = itemDetail.addDlRow;
globalThis.loadItemDetail = itemDetail.loadItemDetail;
globalThis.renderGameList = itemDetail.renderGameList;
globalThis.igdbImageUrl = itemDetail.igdbImageUrl;
globalThis.base_path = '/GameDB';
globalThis.base_url = 'http://localhost/GameDB';

const { GROUP_CONFIG, renderGroup } = require('../gh-pages-template/assets/js/group_detail.js');

// --- Helpers ---

function makeGroupDom(type) {
    return `
        <title></title>
        <h1 id="${type}-name"></h1>
        <a id="${type}-igdb-link" class="d-none"></a>
        <div id="${type}-games-section" class="d-none">
            <div id="${type}-games"></div>
        </div>
    `;
}

/**
 * Shared renderGroup behaviour tests, run for each supported type.
 * @param {'collection'|'franchise'} type
 * @param {{ name: string, defaultTitle: string, defaultName: string }} config
 */
function describeRenderGroup(type, config) {
    describe(`renderGroup – ${type} type`, () => {
        beforeEach(() => {
            globalThis.GAMEDB_GROUP_TYPE = type;
            document.body.innerHTML = makeGroupDom(type);
        });

        test('sets title and name', () => {
            renderGroup({ name: config.name });
            expect(document.title).toContain(config.name);
            expect(document.getElementById(`${type}-name`).textContent).toBe(config.name);
        });

        test('uses fallback title and name when name absent', () => {
            renderGroup({});
            expect(document.title).toContain(config.defaultTitle);
            expect(document.getElementById(`${type}-name`).textContent).toBe(config.defaultName);
        });

        test('shows IGDB link when URL provided', () => {
            renderGroup({ name: config.name, url: `https://igdb.com/${type}s/test` });
            const link = document.getElementById(`${type}-igdb-link`);
            expect(link.classList.contains('d-none')).toBe(false);
            expect(link.href).toContain('igdb.com');
        });

        test('keeps IGDB link hidden when no URL', () => {
            renderGroup({ name: config.name });
            expect(document.getElementById(`${type}-igdb-link`).classList.contains('d-none')).toBe(true);
        });

        test('shows games section when games present', () => {
            renderGroup({
                name: config.name,
                games: [{ id: 1, name: 'Test Game', cover: { url: '//img.igdb.com/t_thumb/c.jpg' } }],
            });
            expect(document.getElementById(`${type}-games-section`).classList.contains('d-none')).toBe(false);
        });

        test('keeps games section hidden when no games', () => {
            renderGroup({ name: config.name });
            expect(document.getElementById(`${type}-games-section`).classList.contains('d-none')).toBe(true);
        });
    });
}

// --- Tests ---

describe('group_detail.js', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        delete globalThis.GAMEDB_GROUP_TYPE;
    });

    describe('GROUP_CONFIG', () => {
        test('defines collection config', () => {
            expect(GROUP_CONFIG.collection.endpoint).toBe('collections');
            expect(GROUP_CONFIG.collection.defaultTitle).toBe('Series');
            expect(GROUP_CONFIG.collection.defaultName).toBe('Unknown Series');
        });

        test('defines franchise config', () => {
            expect(GROUP_CONFIG.franchise.endpoint).toBe('franchises');
            expect(GROUP_CONFIG.franchise.defaultTitle).toBe('Franchise');
            expect(GROUP_CONFIG.franchise.defaultName).toBe('Unknown Franchise');
        });
    });

    describeRenderGroup('collection', {
        name: 'Sonic the Hedgehog',
        defaultTitle: 'Series',
        defaultName: 'Unknown Series',
    });

    describeRenderGroup('franchise', {
        name: 'The Legend of Zelda',
        defaultTitle: 'Franchise',
        defaultName: 'Unknown Franchise',
    });

    describe('renderGroup – defaults to collection type when GAMEDB_GROUP_TYPE is unset', () => {
        beforeEach(() => {
            document.body.innerHTML = makeGroupDom('collection');
        });

        test('falls back to collection type', () => {
            renderGroup({ name: 'Default Series' });
            expect(document.getElementById('collection-name').textContent).toBe('Default Series');
        });
    });

    describe('DOMContentLoaded integration', () => {
        test('fires loadItemDetail for collection on DOMContentLoaded', () => {
            globalThis.GAMEDB_GROUP_TYPE = 'collection';
            globalThis.history.pushState(null, '', '/');
            expect(() => document.dispatchEvent(new Event('DOMContentLoaded'))).not.toThrow();
        });

        test('fires loadItemDetail for franchise on DOMContentLoaded', () => {
            globalThis.GAMEDB_GROUP_TYPE = 'franchise';
            globalThis.history.pushState(null, '', '/');
            expect(() => document.dispatchEvent(new Event('DOMContentLoaded'))).not.toThrow();
        });

        test('fires loadItemDetail with default collection type when GAMEDB_GROUP_TYPE is unset', () => {
            globalThis.history.pushState(null, '', '/');
            expect(() => document.dispatchEvent(new Event('DOMContentLoaded'))).not.toThrow();
        });
    });
});
