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

const { renderCollection } = require('../gh-pages-template/assets/js/collection_detail.js');

const baseDom = `
    <title></title>
    <h1 id="collection-name"></h1>
    <a id="collection-igdb-link" class="d-none"></a>
    <div id="collection-games-section" class="d-none">
        <div id="collection-games"></div>
    </div>
`;

describe('collection_detail.js', () => {
    beforeEach(() => {
        document.body.innerHTML = baseDom;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('renderCollection', () => {
        test('sets title and name', () => {
            renderCollection({ name: 'Sonic the Hedgehog' });
            expect(document.title).toContain('Sonic the Hedgehog');
            expect(document.getElementById('collection-name').textContent).toBe('Sonic the Hedgehog');
        });

        test('uses fallback title and name when name absent', () => {
            renderCollection({});
            expect(document.title).toContain('Series');
            expect(document.getElementById('collection-name').textContent).toBe('Unknown Series');
        });

        test('shows IGDB link when URL provided', () => {
            renderCollection({ name: 'Mario', url: 'https://igdb.com/collections/mario' });
            const link = document.getElementById('collection-igdb-link');
            expect(link.classList.contains('d-none')).toBe(false);
            expect(link.href).toContain('igdb.com');
        });

        test('keeps IGDB link hidden when no URL', () => {
            renderCollection({ name: 'Zelda' });
            expect(document.getElementById('collection-igdb-link').classList.contains('d-none')).toBe(true);
        });

        test('shows games section when games present', () => {
            renderCollection({
                name: 'Metroid',
                games: [{ id: 1, name: 'Metroid Prime', cover: { url: '//img.igdb.com/t_thumb/c.jpg' } }],
            });
            expect(document.getElementById('collection-games-section').classList.contains('d-none')).toBe(false);
        });

        test('keeps games section hidden when no games', () => {
            renderCollection({ name: 'Empty' });
            expect(document.getElementById('collection-games-section').classList.contains('d-none')).toBe(true);
        });
    });

    describe('DOMContentLoaded integration', () => {
        test('fires loadItemDetail on DOMContentLoaded', () => {
            globalThis.history.pushState(null, '', '/');
            expect(() => document.dispatchEvent(new Event('DOMContentLoaded'))).not.toThrow();
        });
    });
});
