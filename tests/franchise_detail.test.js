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

const { renderFranchise } = require('../gh-pages-template/assets/js/franchise_detail.js');

const baseDom = `
    <title></title>
    <h1 id="franchise-name"></h1>
    <a id="franchise-igdb-link" class="d-none"></a>
    <div id="franchise-games-section" class="d-none">
        <div id="franchise-games"></div>
    </div>
`;

describe('franchise_detail.js', () => {
    beforeEach(() => {
        document.body.innerHTML = baseDom;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('renderFranchise', () => {
        test('sets title and name', () => {
            renderFranchise({ name: 'The Legend of Zelda' });
            expect(document.title).toContain('The Legend of Zelda');
            expect(document.getElementById('franchise-name').textContent).toBe('The Legend of Zelda');
        });

        test('uses fallback title and name when name absent', () => {
            renderFranchise({});
            expect(document.title).toContain('Franchise');
            expect(document.getElementById('franchise-name').textContent).toBe('Unknown Franchise');
        });

        test('shows IGDB link when URL provided', () => {
            renderFranchise({ name: 'Zelda', url: 'https://igdb.com/franchises/zelda' });
            const link = document.getElementById('franchise-igdb-link');
            expect(link.classList.contains('d-none')).toBe(false);
            expect(link.href).toContain('igdb.com');
        });

        test('keeps IGDB link hidden when no URL', () => {
            renderFranchise({ name: 'Mario' });
            expect(document.getElementById('franchise-igdb-link').classList.contains('d-none')).toBe(true);
        });

        test('shows games section when games present', () => {
            renderFranchise({
                name: 'Halo',
                games: [{ id: 5, name: 'Halo: CE', cover: { url: '//img.igdb.com/t_thumb/c.jpg' } }],
            });
            expect(document.getElementById('franchise-games-section').classList.contains('d-none')).toBe(false);
        });

        test('keeps games section hidden when no games', () => {
            renderFranchise({ name: 'Empty' });
            expect(document.getElementById('franchise-games-section').classList.contains('d-none')).toBe(true);
        });
    });

    describe('DOMContentLoaded integration', () => {
        test('fires loadItemDetail on DOMContentLoaded', () => {
            globalThis.history.pushState(null, '', '/');
            expect(() => document.dispatchEvent(new Event('DOMContentLoaded'))).not.toThrow();
        });
    });
});
