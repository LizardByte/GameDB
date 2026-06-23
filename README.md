<div align="center">
  <h1 align="center">GameDB</h1>
  <h4 align="center">Jekyll static site with IGDB data</h4>
</div>

<div align="center">
  <a href="https://github.com/LizardByte/GameDB/actions/workflows/ci-tests.yml?query=branch%3Amaster"><img src="https://img.shields.io/github/actions/workflow/status/lizardbyte/gamedb/ci-tests.yml.svg?branch=master&label=CI&logo=github&style=for-the-badge" alt="CI"></a>
  <a href="https://github.com/LizardByte/GameDB/actions/workflows/update-db.yml?query=branch%3Amaster"><img src="https://img.shields.io/github/actions/workflow/status/lizardbyte/gamedb/update-db.yml.svg?branch=master&label=update%20db&logo=github&style=for-the-badge" alt="Update DB"></a>
  <a href="https://app.codecov.io/gh/LizardByte/GameDB"><img src="https://img.shields.io/codecov/c/gh/LizardByte/GameDB.svg?token=AG91ICECDX&style=for-the-badge&logo=codecov&label=codecov" alt="Codecov"></a>
  <a href="https://sonarcloud.io/project/overview?id=LizardByte_GameDB"><img src="https://img.shields.io/sonar/quality_gate/LizardByte_GameDB?server=https%3A%2F%2Fsonarcloud.io&style=for-the-badge&logo=sonarqubecloud&label=sonarcloud" alt="SonarCloud"></a>
</div>

---

<div align="center">
  <a href="https://app.lizardbyte.dev/GameDB/characters/all.json"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapp.lizardbyte.dev%2FGameDB%2Fstats.json&query=%24.characters&label=characters&style=for-the-badge&color=blue" alt="Characters"></a>
  <a href="https://app.lizardbyte.dev/GameDB/collections/all.json"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapp.lizardbyte.dev%2FGameDB%2Fstats.json&query=%24.collections&label=collections&style=for-the-badge&color=blue" alt="Collections"></a>
  <a href="https://app.lizardbyte.dev/GameDB/franchises/all.json"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapp.lizardbyte.dev%2FGameDB%2Fstats.json&query=%24.franchises&label=franchises&style=for-the-badge&color=blue" alt="Franchises"></a>
  <a href="https://app.lizardbyte.dev/GameDB/games"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapp.lizardbyte.dev%2FGameDB%2Fstats.json&query=%24.games&label=games&style=for-the-badge&color=blue" alt="Games"></a>
  <a href="https://app.lizardbyte.dev/GameDB/platforms/all.json"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapp.lizardbyte.dev%2FGameDB%2Fstats.json&query=%24.platforms&label=platforms&style=for-the-badge&color=blue" alt="Platforms"></a>
  <a href="https://app.lizardbyte.dev/GameDB/videos"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapp.lizardbyte.dev%2FGameDB%2Fstats.json&query=%24.videos&label=videos&style=for-the-badge&color=blue" alt="Videos"></a>
</div>

## Overview

GameDB is a database of games, platforms, characters, collections, franchises, and videos sourced from
[IGDB](https://www.igdb.com) and published as a static JSON API via
[GitHub Pages](https://lizardbyte.github.io/GameDB). Video metadata is enriched with data from the YouTube API.

The data is intended to be consumed by [LizardByte](https://app.lizardbyte.dev) projects such as
[Sunshine](https://github.com/LizardByte/Sunshine).

## Data

The database is updated automatically on a schedule via the [update-db](.github/workflows/update-db.yml) workflow.
The generated JSON files are published to the `gh-pages` branch and served at
`https://app.lizardbyte.dev/GameDB/`.

| Endpoint    | Description                                           | URL                                                       |
|-------------|-------------------------------------------------------|-----------------------------------------------------------|
| Buckets     | Game name search index, split by first two characters | `https://app.lizardbyte.dev/GameDB/buckets/<bucket>.json` |
| Characters  | Individual character details and all characters       | `https://app.lizardbyte.dev/GameDB/characters/<id>.json`  |
| Collections | Individual collection details and all collections     | `https://app.lizardbyte.dev/GameDB/collections/<id>.json` |
| Franchises  | Individual franchise details and all franchises       | `https://app.lizardbyte.dev/GameDB/franchises/<id>.json`  |
| Games       | Individual game details (no aggregate `all.json`)     | `https://app.lizardbyte.dev/GameDB/games/<id>.json`       |
| Platforms   | Individual platform details and all platforms         | `https://app.lizardbyte.dev/GameDB/platforms/<id>.json`   |
| Videos      | Individual YouTube video metadata                     | `https://app.lizardbyte.dev/GameDB/videos/<id>.json`      |
| Stats       | Total item counts per category                        | `https://app.lizardbyte.dev/GameDB/stats.json`            |

`all.json` files (e.g. `characters/all.json`) contain a summary of every item in that category as a single
dictionary keyed by ID.

Buckets are used as a lightweight search index for game names. Each bucket file is named after the first two
alphanumeric characters of the game name (lowercased), e.g. `ha.json` for games starting with "Ha" such as
*Halo*. Games whose names contain a space as the second character are put into a bucket named after the first
character. Games whose names do not start with two alphanumeric characters are grouped into `@.json`. Each bucket
contains a dictionary of `{ id: { name } }` entries, keeping individual files small for fast lookups.

## Development

Code contributors can use the [Developer Setup](docs/developerSetup.md) guide.
