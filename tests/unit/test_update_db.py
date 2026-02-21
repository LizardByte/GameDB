# standard imports
import argparse
import json
import os
from unittest.mock import MagicMock, patch

# lib imports
import pytest

# module under test — imported after patching module-level globals
import src.update_db as udb


def _make_args(tmp_path, **overrides):
    """Return a minimal args Namespace."""
    ns = argparse.Namespace(
        out_dir=str(tmp_path / 'out'),
        indent=None,
        test_mode=False,
        test_limit=1000,
        youtube_api_key='fake_yt_key',
    )
    for k, v in overrides.items():
        setattr(ns, k, v)
    return ns


def test_igdb_authorization(requests_mock):
    requests_mock.post(
        'https://id.twitch.tv/oauth2/token',
        json={'access_token': 'tok123', 'expires_in': 3600},
    )
    result = udb.igdb_authorization(client_id='cid', client_secret='csec')
    assert result['access_token'] == 'tok123'
    assert requests_mock.last_request.method == 'POST'


@pytest.mark.parametrize('indent', [None, 4])
def test_write_json_files(tmp_path, indent):
    udb.args = _make_args(tmp_path, indent=indent)
    data = {'key': 'value', 'num': 42}
    file_path = str(tmp_path / 'test_dir' / 'myfile')

    udb.write_json_files(file_path=file_path, data=data)

    written = json.loads((tmp_path / 'test_dir' / 'myfile.json').read_text())
    assert written == data


def test_write_json_files_creates_directory(tmp_path):
    udb.args = _make_args(tmp_path)
    nested = str(tmp_path / 'a' / 'b' / 'c' / 'file')
    udb.write_json_files(file_path=nested, data={'x': 1})
    assert (tmp_path / 'a' / 'b' / 'c' / 'file.json').exists()


@pytest.mark.parametrize('test_mode,test_limit,expected_count', [
    (False, 1000, 3),
    (True, 2, 2),
])
def test_fetch_endpoint_pagination(tmp_path, test_mode, test_limit, expected_count):
    udb.args = _make_args(tmp_path, test_mode=test_mode, test_limit=test_limit)

    page1 = json.dumps([{'id': 1, 'name': 'A'}, {'id': 2, 'name': 'B'}]).encode()
    page2 = json.dumps([{'id': 3, 'name': 'C'}]).encode()
    empty = json.dumps([]).encode()

    mock_wrapper = MagicMock()
    mock_wrapper.api_request.side_effect = [page1, page2, empty]
    udb.wrapper = mock_wrapper

    result = udb._fetch_endpoint(
        endpoint='games',
        fields=['name'],
        limit=2,
        test_mode=test_mode,
        test_limit=test_limit,
    )

    assert len(result) == expected_count


def test_fetch_endpoint_http_retry(tmp_path):
    udb.args = _make_args(tmp_path)

    good_page = json.dumps([{'id': 1, 'name': 'X'}]).encode()
    empty = json.dumps([]).encode()

    mock_wrapper = MagicMock()
    mock_wrapper.api_request.side_effect = [
        __import__('requests').exceptions.HTTPError('429'),
        good_page,
        empty,
    ]
    udb.wrapper = mock_wrapper

    with patch('src.update_db.time.sleep') as mock_sleep:
        result = udb._fetch_endpoint(
            endpoint='games',
            fields=['name'],
            limit=500,
            test_mode=False,
            test_limit=1000,
        )

    mock_sleep.assert_called_once_with(1)
    assert 1 in result


def test_fetch_all_endpoints_writes_all_json_only_when_flagged(tmp_path):
    udb.args = _make_args(tmp_path)

    mock_wrapper = MagicMock()
    mock_wrapper.api_request.return_value = json.dumps([]).encode()
    udb.wrapper = mock_wrapper

    request_dict = {
        'characters': {'fields': ['name'], 'write_all': True},
        'games': {'fields': ['name'], 'write_all': False},
    }

    with patch('src.update_db.write_json_files') as mock_write:
        udb._fetch_all_endpoints(
            request_dict=request_dict,
            limit=500,
            test_mode=False,
            test_limit=1000,
        )

    assert mock_write.call_count == 1
    written_path = mock_write.call_args[1]['file_path']
    assert 'characters' in written_path
    assert 'all' in written_path


def test_append_characters_to_games():
    full_dict = {
        'games': {
            1: {'id': 1, 'name': 'Halo'},
        },
        'characters': {
            99: {'id': 99, 'name': 'Chief', 'mug_shot': {'url': '//x'}, 'games': [1]},
        },
    }
    request_dict = {
        'games': {
            'fields': ['name'],
            'write_all': False,
            'append': {
                'characters': {
                    'fields': ['id', 'name', 'mug_shot'],
                },
            },
        },
    }

    udb._append_related_items(full_dict=full_dict, request_dict=request_dict)

    assert 'characters' in full_dict['games'][1]
    assert full_dict['games'][1]['characters'][0]['name'] == 'Chief'
    assert full_dict['games'][1]['characters'][0]['mug_shot'] == {'url': '//x'}


def test_append_second_item_to_existing_list():
    """When the list already exists in the dest, append without reinitialising."""
    full_dict = {
        'games': {
            1: {'id': 1, 'name': 'Halo', 'characters': [{'id': 1, 'name': 'Existing'}]},
        },
        'characters': {
            99: {'id': 99, 'name': 'Chief', 'games': [1]},
        },
    }
    request_dict = {
        'games': {
            'fields': ['name'],
            'write_all': False,
            'append': {'characters': {'fields': ['id', 'name']}},
        },
    }

    udb._append_related_items(full_dict=full_dict, request_dict=request_dict)

    assert len(full_dict['games'][1]['characters']) == 2


def test_append_games_to_platforms():
    full_dict = {
        'platforms': {
            6: {'id': 6, 'name': 'PC'},
        },
        'games': {
            1: {'id': 1, 'name': 'Halo', 'cover': None, 'release_dates': [], 'platforms': [6]},
        },
    }
    request_dict = {
        'platforms': {
            'fields': ['name'],
            'write_all': True,
            'append': {
                'games': {
                    'fields': ['id', 'name', 'cover', 'release_dates'],
                },
            },
        },
    }

    udb._append_related_items(full_dict=full_dict, request_dict=request_dict)

    assert 'games' in full_dict['platforms'][6]
    assert full_dict['platforms'][6]['games'][0]['name'] == 'Halo'


def test_append_skips_missing_dest():
    full_dict = {
        'games': {},
        'characters': {
            1: {'id': 1, 'name': 'X', 'games': [999]},
        },
    }
    request_dict = {
        'games': {
            'fields': ['name'],
            'write_all': False,
            'append': {'characters': {'fields': ['id', 'name']}},
        },
    }
    udb._append_related_items(full_dict=full_dict, request_dict=request_dict)
    assert full_dict['games'] == {}


def test_append_skips_source_with_no_endpoint_key():
    """Source item missing the endpoint key (e.g. character with no 'games') is skipped."""
    full_dict = {
        'games': {1: {'id': 1, 'name': 'Halo'}},
        'characters': {
            99: {'id': 99, 'name': 'Chief'},  # no 'games' key
        },
    }
    request_dict = {
        'games': {
            'fields': ['name'],
            'write_all': False,
            'append': {'characters': {'fields': ['id', 'name']}},
        },
    }
    udb._append_related_items(full_dict=full_dict, request_dict=request_dict)
    assert 'characters' not in full_dict['games'][1]


def test_append_skips_endpoint_without_append_key():
    full_dict = {'characters': {1: {'id': 1, 'name': 'X'}}}
    request_dict = {
        'characters': {'fields': ['name'], 'write_all': True},
    }
    udb._append_related_items(full_dict=full_dict, request_dict=request_dict)


def test_add_platform_game_counts(tmp_path):
    udb.args = _make_args(tmp_path)
    full_dict = {
        'platforms': {
            6: {'id': 6, 'name': 'PC', 'games': [{'id': 1}, {'id': 2}]},
            48: {'id': 48, 'name': 'PS4'},
        },
    }

    with patch('src.update_db.write_json_files') as mock_write:
        udb._add_platform_game_counts(full_dict=full_dict)

    assert full_dict['platforms'][6]['game_count'] == 2
    assert full_dict['platforms'][48]['game_count'] == 0
    mock_write.assert_called_once()


@pytest.mark.parametrize('name,expected_bucket', [
    ('Halo', 'ha'),
    ('123 Game', '12'),
    ('  !!  Special', '@'),
    ('A', 'a'),
])
def test_build_buckets_bucket_names(name, expected_bucket):
    full_dict = {
        'games': {1: {'id': 1, 'name': name}},
    }
    buckets, _ = udb._build_buckets_and_collect_videos(full_dict=full_dict)
    assert expected_bucket in buckets
    assert 1 in buckets[expected_bucket]


def test_build_buckets_deduplicates_videos():
    full_dict = {
        'games': {
            1: {'id': 1, 'name': 'Alpha', 'videos': [
                {'video_id': 'vid1'},
                {'video_id': 'vid2'},
            ]},
            2: {'id': 2, 'name': 'Beta', 'videos': [
                {'video_id': 'vid1'},
            ]},
        },
    }
    _, all_videos = udb._build_buckets_and_collect_videos(full_dict=full_dict)
    assert all_videos.count('vid1') == 1
    assert 'vid2' in all_videos


def test_build_buckets_no_videos():
    full_dict = {'games': {1: {'id': 1, 'name': 'Silent'}}}
    _, all_videos = udb._build_buckets_and_collect_videos(full_dict=full_dict)
    assert all_videos == []


def test_resolve_video_groups_no_cache(tmp_path):
    cache = str(tmp_path / 'cache' / 'vg.json')
    all_videos = [f'v{i}' for i in range(5)]

    groups = udb._resolve_video_groups(all_videos=all_videos, cache_file=cache, group_size=2)

    assert groups == [['v0', 'v1'], ['v2', 'v3'], ['v4']]
    assert os.path.isfile(cache)
    saved = json.loads(open(cache).read())
    assert saved == groups


def test_resolve_video_groups_with_cache_keeps_valid_filters_stale(tmp_path):
    cache = str(tmp_path / 'cache' / 'vg.json')
    os.makedirs(os.path.dirname(cache))

    cached = [['v0', 'v1'], ['old', 'v2']]
    with open(cache, 'w') as f:
        json.dump(cached, f)

    all_videos = ['v0', 'v1', 'v2', 'v3']

    groups = udb._resolve_video_groups(all_videos=all_videos, cache_file=cache, group_size=50)

    assert ['v0', 'v1'] in groups
    for g in groups:
        assert 'old' not in g
    all_in_groups = [v for g in groups for v in g]
    assert 'v3' in all_in_groups


def test_fetch_youtube_metadata(tmp_path):
    udb.args = _make_args(tmp_path)
    full_dict = {'videos': {}}

    yt_response = {
        'items': [
            {'id': 'abc', 'snippet': {'title': 'Trailer', 'thumbnails': {'default': {'url': '//t.jpg', 'width': 120}}}},
        ]
    }

    with patch('src.update_db.get_youtube', return_value=yt_response):
        udb._fetch_youtube_metadata(full_dict=full_dict, all_video_groups=[['abc']])

    assert 'abc' in full_dict['videos']
    assert full_dict['videos']['abc']['snippet']['title'] == 'Trailer'


def test_fetch_youtube_metadata_handles_missing_items_key(tmp_path, capsys):
    udb.args = _make_args(tmp_path)
    full_dict = {'videos': {}}

    with patch('src.update_db.get_youtube', return_value={'error': 'quota exceeded'}):
        udb._fetch_youtube_metadata(full_dict=full_dict, all_video_groups=[['abc']])

    captured = capsys.readouterr()
    assert 'KeyError' in captured.out
    assert full_dict['videos'] == {}


def test_enrich_game_videos():
    full_dict = {
        'games': {
            1: {
                'name': 'Halo',
                'videos': [{'video_id': 'abc', 'name': 'Trailer'}],
            },
        },
        'videos': {
            'abc': {
                'id': 'abc',
                'snippet': {
                    'title': 'Halo Trailer',
                    'thumbnails': {
                        'default': {'url': '//small.jpg', 'width': 120},
                        'high': {'url': '//big.jpg', 'width': 480},
                        'null_thumb': None,
                    },
                },
            },
        },
    }

    udb._enrich_game_videos(full_dict=full_dict)

    video = full_dict['games'][1]['videos'][0]
    assert video['url'] == 'https://www.youtube.com/watch?v=abc'
    assert video['title'] == 'Halo Trailer'
    assert video['thumb'] == '//big.jpg'


def test_enrich_game_videos_skips_missing_video_id():
    full_dict = {
        'games': {
            1: {'name': 'Game', 'videos': [{'video_id': 'missing_id'}]},
        },
        'videos': {},
    }
    udb._enrich_game_videos(full_dict=full_dict)
    assert 'url' not in full_dict['games'][1]['videos'][0]


def test_enrich_game_videos_skips_games_with_no_videos():
    full_dict = {
        'games': {1: {'name': 'No Videos'}},
        'videos': {},
    }
    udb._enrich_game_videos(full_dict=full_dict)


def test_get_youtube(tmp_path):
    udb.args = _make_args(tmp_path, youtube_api_key='yt_key_123')

    mock_response = MagicMock()
    mock_response.json.return_value = {'items': []}

    mock_session = MagicMock()
    mock_session.get.return_value = mock_response

    with patch('src.update_db.requests_cache.CachedSession', return_value=mock_session):
        result = udb.get_youtube(video_ids=['abc', 'def'])

    assert result == {'items': []}
    called_url = mock_session.get.call_args[1]['url']
    assert 'abc,def' in called_url
    assert 'yt_key_123' in called_url


def test_get_platform_cross_reference(tmp_path):
    udb.args = _make_args(tmp_path)

    with patch('src.update_db.write_json_files') as mock_write:
        udb.get_platform_cross_reference()

    mock_write.assert_called_once()
    call_kwargs = mock_write.call_args[1]
    assert 'cross-reference' in call_kwargs['file_path']
    assert call_kwargs['data'] is udb.platforms.cross_reference


def test_get_data_orchestration(tmp_path):
    """get_data() calls all helpers in order with correct data flow."""
    udb.args = _make_args(tmp_path)

    mock_full_dict = {
        'games': {1: {'id': 1, 'name': 'TestGame'}},
        'platforms': {6: {'id': 6, 'name': 'PC'}},
    }

    with patch('src.update_db._fetch_all_endpoints', return_value=mock_full_dict) as m_fetch, \
         patch('src.update_db._append_related_items') as m_append, \
         patch('src.update_db._add_platform_game_counts') as m_counts, \
         patch('src.update_db._build_buckets_and_collect_videos',
               return_value=({'ha': {1: {'name': 'TestGame'}}}, ['vid1'])) as m_buckets, \
         patch('src.update_db._resolve_video_groups', return_value=[['vid1']]) as m_vgroups, \
         patch('src.update_db._fetch_youtube_metadata') as m_yt, \
         patch('src.update_db._enrich_game_videos') as m_enrich, \
         patch('src.update_db.write_json_files') as m_write:
        udb.get_data()

    m_fetch.assert_called_once()
    m_append.assert_called_once()
    m_counts.assert_called_once()
    m_buckets.assert_called_once()
    m_vgroups.assert_called_once()
    m_yt.assert_called_once()
    m_enrich.assert_called_once()
    assert m_write.call_count >= 2  # bucket files + individual files


def test_main_raises_on_missing_secrets(tmp_path):
    """main() raises SystemExit when required secrets are absent."""
    with patch('src.update_db.argparse.ArgumentParser.parse_args') as mock_parse:
        mock_parse.return_value = argparse.Namespace(
            out_dir=str(tmp_path),
            indent_json=False,
            twitch_client_id=None,
            twitch_client_secret=None,
            youtube_api_key=None,
            test_mode=False,
            test_limit=1000,
        )
        with pytest.raises(SystemExit):
            udb.main()


def test_main_success(tmp_path):
    """main() sets args/wrapper globals and runs update functions."""
    with patch('src.update_db.argparse.ArgumentParser.parse_args') as mock_parse, \
         patch('src.update_db.igdb_authorization', return_value={'access_token': 'tok'}) as m_auth, \
         patch('src.update_db.IGDBWrapper') as m_wrapper_cls, \
         patch('src.update_db.get_data') as m_get_data, \
         patch('src.update_db.get_platform_cross_reference') as m_xref:
        mock_parse.return_value = argparse.Namespace(
            out_dir=str(tmp_path),
            indent_json=False,
            twitch_client_id='cid',
            twitch_client_secret='csec',
            youtube_api_key='yt',
            test_mode=False,
            test_limit=1000,
        )
        udb.main()

    m_auth.assert_called_once_with(client_id='cid', client_secret='csec')
    m_wrapper_cls.assert_called_once()
    m_get_data.assert_called_once()
    m_xref.assert_called_once()
