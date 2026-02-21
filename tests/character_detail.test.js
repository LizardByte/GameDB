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
globalThis.loadItemDetail = itemDetail.loadItemDetail;
globalThis.renderGameList = itemDetail.renderGameList;
globalThis.base_path = '/GameDB';
globalThis.base_url = 'http://localhost/GameDB';

const { renderCharacter } = require('../gh-pages-template/assets/js/character_detail.js');

const baseDom = `
    <title></title>
    <h1 id="character-name"></h1>
    <img id="character-mug" style="display:none;" alt="" src="" />
    <div id="character-mug-placeholder"></div>
    <div id="character-badges"></div>
    <div id="character-games-section" class="d-none">
        <div id="character-games"></div>
    </div>
`;

describe('character_detail.js', () => {
    beforeEach(() => {
        document.body.innerHTML = baseDom;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('renderCharacter', () => {
        test('sets title and name', () => {
            renderCharacter({ name: 'Link' });
            expect(document.title).toContain('Link');
            expect(document.getElementById('character-name').textContent).toBe('Link');
        });

        test('uses fallback title and name when name absent', () => {
            renderCharacter({});
            expect(document.title).toContain('Character');
            expect(document.getElementById('character-name').textContent).toBe('Unknown Character');
        });

        test('shows mug shot image when URL provided', () => {
            renderCharacter({
                name: 'Zelda',
                mug_shot: { url: '//images.igdb.com/igdb/image/upload/t_thumb/mug.jpg' },
            });
            const mugEl = document.getElementById('character-mug');
            expect(mugEl.style.display).toBe('');
            expect(mugEl.alt).toBe('Zelda');
            expect(mugEl.src).toContain('mug.jpg');
        });

        test('shows mug shot with empty alt when no name', () => {
            renderCharacter({
                mug_shot: { url: '//images.igdb.com/igdb/image/upload/t_thumb/mug.jpg' },
            });
            const mugEl = document.getElementById('character-mug');
            expect(mugEl.alt).toBe('');
        });

        test('shows placeholder when no mug shot', () => {
            renderCharacter({ name: 'NPC' });
            const mugEl = document.getElementById('character-mug');
            expect(mugEl.style.display).toBe('none');
        });

        test('renders gender and species badges', () => {
            renderCharacter({
                name: 'Samus',
                character_gender: { name: 'Female' },
                character_species: { name: 'Human' },
            });
            const badges = document.getElementById('character-badges');
            expect(badges.textContent).toContain('Female');
            expect(badges.textContent).toContain('Human');
        });

        test('skips badges when gender and species absent', () => {
            renderCharacter({ name: 'Robot' });
            expect(document.getElementById('character-badges').children.length).toBe(0);
        });

        test('shows games section when games present', () => {
            renderCharacter({
                name: 'Mario',
                games: [{ id: 1, name: 'Super Mario', cover: { url: '//img.igdb.com/t_thumb/c.jpg' } }],
            });
            expect(document.getElementById('character-games-section').classList.contains('d-none')).toBe(false);
        });

        test('keeps games section hidden when no games', () => {
            renderCharacter({ name: 'Ghost' });
            expect(document.getElementById('character-games-section').classList.contains('d-none')).toBe(true);
        });
    });

    describe('DOMContentLoaded integration', () => {
        test('fires loadItemDetail on DOMContentLoaded', () => {
            // loadItemDetail is already global; dispatching the event exercises the callback
            globalThis.history.pushState(null, '', '/');
            // Should not throw when id is absent
            expect(() => document.dispatchEvent(new Event('DOMContentLoaded'))).not.toThrow();
        });
    });
});
