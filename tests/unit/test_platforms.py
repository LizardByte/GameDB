# lib imports
import pytest

# local imports
import src.platforms as platforms_module

# Screenscraper IDs that are intentionally shared between multiple IGDB platforms
# because screenscraper treats them as the same platform entry.
ALLOWED_DUPLICATE_SCREENSCRAPER_IDS = {
    3,  # NES and Family Computer share the same screenscraper platform
    4,  # SNES and Super Famicom share the same screenscraper platform
    144,  # TRS-80 and TRS-80 Color Computer share the same screenscraper platform
}


def test_cross_reference_is_list():
    assert isinstance(platforms_module.cross_reference, list)


def test_cross_reference_is_not_empty():
    assert len(platforms_module.cross_reference) > 0


@pytest.mark.parametrize('entry', platforms_module.cross_reference)
def test_cross_reference_entry_has_required_keys(entry):
    assert 'ids' in entry, f"Entry missing 'ids': {entry}"
    assert 'name' in entry, f"Entry missing 'name': {entry}"
    assert 'variables' in entry, f"Entry missing 'variables': {entry}"


@pytest.mark.parametrize('entry', platforms_module.cross_reference)
def test_cross_reference_entry_ids_has_igdb(entry):
    assert 'igdb' in entry['ids'], f"Entry 'ids' missing 'igdb': {entry}"
    assert isinstance(entry['ids']['igdb'], int), f"'igdb' id must be int: {entry}"


@pytest.mark.parametrize('entry', platforms_module.cross_reference)
def test_cross_reference_entry_ids_has_screenscraper(entry):
    # screenscraper id may be None for platforms not on screenscraper, but key must exist
    assert 'screenscraper' in entry['ids'], f"Entry 'ids' missing 'screenscraper': {entry}"


@pytest.mark.parametrize('entry', platforms_module.cross_reference)
def test_cross_reference_entry_name_is_non_empty_string(entry):
    assert isinstance(entry['name'], str), f"'name' must be str: {entry}"
    assert entry['name'].strip() != '', f"'name' must not be blank: {entry}"


@pytest.mark.parametrize('entry', platforms_module.cross_reference)
def test_cross_reference_entry_variables_has_screenscraper(entry):
    assert 'screenscraper' in entry['variables'], f"'variables' missing 'screenscraper': {entry}"


@pytest.mark.parametrize('entry', platforms_module.cross_reference)
def test_cross_reference_entry_screenscraper_variables_has_region(entry):
    assert 'region' in entry['variables']['screenscraper'], (
        f"'variables.screenscraper' missing 'region': {entry}"
    )


def test_cross_reference_igdb_ids_unique():
    igdb_ids = [e['ids']['igdb'] for e in platforms_module.cross_reference]
    assert len(igdb_ids) == len(set(igdb_ids)), "Duplicate IGDB IDs found in cross_reference"


def test_cross_reference_screenscraper_ids_unique():
    """Screenscraper IDs must be unique except for explicitly allowed duplicates."""
    from collections import Counter
    ss_ids = [
        e['ids']['screenscraper']
        for e in platforms_module.cross_reference
        if e['ids']['screenscraper'] is not None
    ]
    counts = Counter(ss_ids)
    unexpected_dupes = {
        sid for sid, count in counts.items() if count > 1 and sid not in ALLOWED_DUPLICATE_SCREENSCRAPER_IDS}
    assert not unexpected_dupes, f"Unexpected duplicate Screenscraper IDs: {unexpected_dupes}"


def test_cross_reference_names_unique():
    names = [e['name'] for e in platforms_module.cross_reference]
    assert len(names) == len(set(names)), "Duplicate names found in cross_reference"
