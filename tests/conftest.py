# standard imports
import argparse

# lib imports
import pytest


@pytest.fixture()
def mock_args(tmp_path):
    """Return a minimal args Namespace that update_db functions expect."""
    ns = argparse.Namespace(
        out_dir=str(tmp_path / 'gh-pages'),
        indent=None,
        test_mode=False,
        test_limit=1000,
        youtube_api_key='fake_yt_key',
    )
    return ns


@pytest.fixture()
def sample_game():
    return {
        'id': 1,
        'name': 'Halo',
        'platforms': [6],
        'videos': [{'video_id': 'abc123', 'name': 'Trailer'}],
        'cover': {'url': '//images.igdb.com/t_thumb/cover.jpg'},
    }


@pytest.fixture()
def sample_platform():
    return {
        'id': 6,
        'name': 'PC (Microsoft Windows)',
        'games': [],
    }


@pytest.fixture()
def sample_character():
    return {
        'id': 99,
        'name': 'Master Chief',
        'games': [1],
        'mug_shot': {'url': '//images.igdb.com/t_thumb/mug.jpg'},
    }
