# standard imports
import argparse
from datetime import timedelta
import pathlib
import json
import os
import re
import time

# lib imports
import requests
import requests_cache
from dotenv import load_dotenv
from igdb.wrapper import IGDBWrapper

# local imports
import platforms

# setup environment if running locally
load_dotenv()

# module-level globals populated by main()
args = None
wrapper = None


def igdb_authorization(client_id: str, client_secret: str) -> dict:
    """
    Get the igdb authorization.

    Parameters
    ----------
    client_id : str
        Twitch developer client id.
    client_secret : str
        Twitch developer client secret.

    Returns
    -------
    dict
        Dictionary containing access token and expiration.
    """
    auth_headers = {
        'Accept': 'application/json',
        'client_id': client_id,
        'client_secret': client_secret,
        'grant_type': 'client_credentials',
    }

    token_url = 'https://id.twitch.tv/oauth2/token'

    authorization = requests.post(url=token_url, data=auth_headers)
    return authorization.json()


def write_json_files(file_path: str, data: dict):
    """
    Write dictionary to json file.

    Parameters
    ----------
    file_path : str
        The file path to save the file at, excluding the file extension which will be `.json`
    data
        The dictionary data to write in the json file.
    """
    # determine the directory
    directory = os.path.dirname(file_path)

    pathlib.Path(directory).mkdir(parents=True, exist_ok=True)

    with open(f'{file_path}.json', 'w') as f:
        json.dump(obj=data, fp=f, indent=args.indent)


def get_youtube(video_ids: list) -> dict:
    """
    Get metadata for YouTube videos.

    Parameters
    ----------
    video_ids : list
        List of YouTube videos to get metadata for.

    Returns
    -------
    dict
        JSON data formatted as a dictionary.
    """
    # https://developers.google.com/youtube/v3/getting-started
    uri = 'https://www.googleapis.com/youtube/v3/videos'
    videos = ','.join(video_ids)
    fields = 'items(id,snippet(title,description,thumbnails,localized))'
    url = f'{uri}?id={videos}&key={args.youtube_api_key}&part=snippet&fields={fields}'
    headers = {'Accept': 'application/json'}

    session = requests_cache.CachedSession(
        cache_name='cache/youtube_cache',
        backend='sqlite',
        expire_after=timedelta(days=1),
    )
    response = session.get(url=url, headers=headers)
    return response.json()


def _fetch_endpoint(endpoint: str, fields: list, limit: int, test_mode: bool, test_limit: int) -> dict:
    """
    Fetch all pages from IGDB for a single endpoint.

    Parameters
    ----------
    endpoint : str
        The IGDB endpoint name.
    fields : list
        List of field names to request.
    limit : int
        Number of items per page.
    test_mode : bool
        Whether to stop early after test_limit items.
    test_limit : int
        Maximum items to collect when test_mode is True.

    Returns
    -------
    dict
        Dictionary of {id: item} for all fetched items.
    """
    result_dict = {}
    offset = 0
    has_more = True
    test_count = 0

    while has_more:
        try:
            byte_array = wrapper.api_request(
                endpoint=endpoint,
                query=f'fields {", ".join(fields)}; limit {limit}; offset {offset};'
            )
        except requests.exceptions.HTTPError:
            time.sleep(1)
            continue

        json_result = json.loads(byte_array)

        for item in json_result:
            result_dict[item['id']] = item

            if test_mode:
                test_count += 1
                if test_count >= test_limit:
                    has_more = False
                    break

        offset += limit

        if not json_result:
            has_more = False

    return result_dict


def _fetch_all_endpoints(request_dict: dict, limit: int, test_mode: bool, test_limit: int) -> dict:
    """
    Fetch data from all IGDB endpoints and write all.json files where applicable.

    Parameters
    ----------
    request_dict : dict
        Endpoint configuration dictionary.
    limit : int
        Items per IGDB page.
    test_mode : bool
        Whether to stop early.
    test_limit : int
        Max items per endpoint in test mode.

    Returns
    -------
    dict
        Combined dictionary of all fetched data keyed by endpoint name.
    """
    full_dict = {}

    for endpoint, endpoint_dict in request_dict.items():
        print(f'now processing endpoint: {endpoint}')
        full_dict[endpoint] = _fetch_endpoint(
            endpoint=endpoint,
            fields=endpoint_dict['fields'],
            limit=limit,
            test_mode=test_mode,
            test_limit=test_limit,
        )

        if endpoint_dict['write_all']:
            file_path = os.path.join(args.out_dir, endpoint, 'all')
            write_json_files(file_path=file_path, data=full_dict[endpoint])

        print(f'{len(full_dict[endpoint])} items processed in endpoint: {endpoint}')

    return full_dict


def _build_related_entry(value: dict, fields: list) -> dict:
    """
    Build a new entry dict from value containing only the specified fields.

    Parameters
    ----------
    value : dict
        The source item dictionary.
    fields : list
        The list of field names to include.

    Returns
    -------
    dict
        A dictionary containing only the requested fields present in value.
    """
    return {field: value[field] for field in fields if field in value}


def _append_item_to_endpoint(full_dict: dict, endpoint: str, item_type: str, value: dict, fields: list) -> None:
    """
    Append a single related item into all matching destination entries in the endpoint.

    Parameters
    ----------
    full_dict : dict
        The combined data dictionary (mutated in-place).
    endpoint : str
        The destination endpoint name.
    item_type : str
        The type key under which to append the entry.
    value : dict
        The source item containing a list of destination IDs under the endpoint key.
    fields : list
        Fields to copy from value into the new entry.
    """
    append_to = value.get(endpoint)
    if not append_to:
        return

    new_entry = _build_related_entry(value=value, fields=fields)

    for item_id_dest in append_to:
        if item_id_dest not in full_dict[endpoint]:
            continue
        if item_type not in full_dict[endpoint][item_id_dest]:
            full_dict[endpoint][item_id_dest][item_type] = []
        full_dict[endpoint][item_id_dest][item_type].append(new_entry)


def _append_item_type(full_dict: dict, endpoint: str, item_type: str, fields: list) -> None:
    """
    Append all items of a given type into the appropriate endpoint entries.

    Parameters
    ----------
    full_dict : dict
        The combined data dictionary (mutated in-place).
    endpoint : str
        The destination endpoint name.
    item_type : str
        The source item type to iterate over.
    fields : list
        Fields to include in each appended entry.
    """
    print(f'adding {item_type} to {endpoint}')
    for value in full_dict[item_type].values():
        _append_item_to_endpoint(
            full_dict=full_dict,
            endpoint=endpoint,
            item_type=item_type,
            value=value,
            fields=fields,
        )


def _append_related_items(full_dict: dict, request_dict: dict) -> None:
    """
    Append related items (e.g. characters to games, games to platforms) into full_dict in-place.

    Parameters
    ----------
    full_dict : dict
        The combined data dictionary (mutated in-place).
    request_dict : dict
        Endpoint configuration containing 'append' sub-dicts.
    """
    for endpoint, endpoint_dict in request_dict.items():
        append_dict = endpoint_dict.get('append')
        if not append_dict:
            continue

        for item_type, item_type_dict in append_dict.items():
            _append_item_type(
                full_dict=full_dict,
                endpoint=endpoint,
                item_type=item_type,
                fields=item_type_dict['fields'],
            )


def _add_platform_game_counts(full_dict: dict) -> None:
    """
    Calculate and attach game counts to each platform, then rewrite platforms/all.json.

    The ``games`` list (appended by :func:`_append_related_items`) is intentionally excluded from
    the ``all.json`` summary file because it would make the file excessively large.  The full game
    list is still available in each individual platform JSON file.

    Parameters
    ----------
    full_dict : dict
        The combined data dictionary (mutated in-place).
    """
    print('calculating game counts for platforms')
    for platform_data in full_dict['platforms'].values():
        platform_data['game_count'] = len(platform_data.get('games', []))

    # Write a lightweight all.json that omits the 'games' list so the file stays small enough
    # to be hosted on GitHub Pages (< 100 MB limit).
    summary_data = {
        pid: {k: v for k, v in pdata.items() if k != 'games'}
        for pid, pdata in full_dict['platforms'].items()
    }
    file_path = os.path.join(args.out_dir, 'platforms', 'all')
    write_json_files(file_path=file_path, data=summary_data)


def _build_buckets_and_collect_videos(full_dict: dict) -> tuple:
    """
    Build search buckets from game names and collect all unique video IDs.

    Parameters
    ----------
    full_dict : dict
        The combined data dictionary.

    Returns
    -------
    tuple
        A (buckets dict, all_videos list) pair.
    """
    print('creating buckets / collecting video ids')
    buckets = {}
    all_videos = []

    for game_id, game_data in full_dict['games'].items():
        bucket = "".join(x.strip().lower() for x in game_data['name'][:2] if x.isalnum())
        if not re.fullmatch(r'[\da-z]+', bucket):
            bucket = '@'

        if bucket not in buckets:
            buckets[bucket] = {}
        buckets[bucket][game_id] = {'name': game_data['name']}

        for video in game_data.get('videos', []):
            video_id = video['video_id']
            if video_id not in all_videos:
                all_videos.append(video_id)

    return buckets, all_videos


def _resolve_video_groups(all_videos: list, cache_file: str, group_size: int) -> list:
    """
    Resolve the list of video groups, using and updating the cache file.

    Parameters
    ----------
    all_videos : list
        All video IDs that currently exist.
    cache_file : str
        Path to the JSON file caching previous video groups.
    group_size : int
        Maximum number of videos per YouTube API call.

    Returns
    -------
    list
        List of video-ID sub-lists ready for YouTube API requests.
    """
    os.makedirs(os.path.dirname(cache_file), exist_ok=True)

    if not os.path.isfile(cache_file):
        all_video_groups = [all_videos[x:x + group_size] for x in range(0, len(all_videos), group_size)]
    else:
        with open(cache_file, 'r') as f:
            cached_video_groups = json.load(f)

        all_video_groups = [g for g in cached_video_groups if all(v in all_videos for v in g)]

        uncached_videos = [v for v in all_videos if not any(v in g for g in cached_video_groups)]
        uncached_groups = [uncached_videos[x:x + group_size] for x in range(0, len(uncached_videos), group_size)]
        all_video_groups.extend(uncached_groups)

    with open(cache_file, 'w') as f:
        json.dump(all_video_groups, f)

    return all_video_groups


def _fetch_youtube_metadata(full_dict: dict, all_video_groups: list) -> None:
    """
    Fetch YouTube metadata for all video groups and store in full_dict['videos'].

    Parameters
    ----------
    full_dict : dict
        The combined data dictionary (mutated in-place).
    all_video_groups : list
        List of video-ID sub-lists.
    """
    print('collecting video metadata')
    full_dict['videos'] = {}

    for video_group in all_video_groups:
        json_result = get_youtube(video_ids=video_group)
        try:
            for item in json_result['items']:
                full_dict['videos'][item['id']] = item
        except KeyError as e:
            print(f'KeyError: {e}\n\n{json.dumps(json_result, indent=2)}')


def _enrich_game_videos(full_dict: dict) -> None:
    """
    Attach YouTube URL, title, and thumbnail to each video in game data.

    Parameters
    ----------
    full_dict : dict
        The combined data dictionary (mutated in-place).
    """
    print('adding videos to games')
    for game_data in full_dict['games'].values():
        for video in game_data.get('videos', []):
            try:
                video_details = full_dict['videos'][video['video_id']]
            except (IndexError, KeyError):
                continue

            video_thumbs = video_details['snippet']['thumbnails']
            video_thumbs = {k: v for k, v in video_thumbs.items() if v is not None}

            video_thumbs = sorted(video_thumbs.items(), key=lambda x: x[1]['width'], reverse=True)

            video['url'] = f'https://www.youtube.com/watch?v={video_details["id"]}'
            video['title'] = video_details['snippet']['title']
            video['thumb'] = video_thumbs[0][1]['url']


def get_data():
    """
    Get data from IGDB and YouTube.

    Build a combined dictionary of IGDB and YouTube data for characters, games, platforms, and videos. Character data
    is appended to the games list. Games are appended to platforms. Videos metadata is also added to the games list.
    Individual files will be written to disk for each item.
    """
    request_dict = {
        'characters': {
            'fields': [
                'character_gender.name',
                'character_species.name',
                'games',
                'mug_shot.url',
                'name',
            ],
            'write_all': True,
        },
        'collections': {
            'fields': [
                'games',
                'name',
                'slug',
                'url',
            ],
            'write_all': True,
        },
        'franchises': {
            'fields': [
                'games',
                'name',
                'slug',
                'url',
            ],
            'write_all': True,
        },
        'games': {
            'fields': [
                'age_ratings.organization.name',
                'age_ratings.rating_category.rating',
                'aggregated_rating',
                'artworks.url',
                'collections.name',
                'cover.url',
                'external_games.external_game_source.name',
                'external_games.game_release_format.format',
                'external_games.name',
                'external_games.platform',
                'external_games.uid',
                'external_games.url',
                'franchise.name',
                'franchises.name',
                'game_modes.name',
                'genres.name',
                'involved_companies.company.name',
                'involved_companies.developer',
                'multiplayer_modes.*',
                'name',
                'platforms',
                'player_perspectives.name',
                'rating',
                'release_dates.date',
                'release_dates.y',
                'release_dates.platform',
                'release_dates.release_region.region',
                'screenshots.url',
                'slug',
                'storyline',
                'summary',
                'themes.name',
                'url',
                'videos.name',
                'videos.video_id',
            ],
            'append': {
                'characters': {
                    'fields': [
                        'id',
                        'gender',
                        'mug_shot',
                        'name',
                        'species',
                    ],
                },
            },
            'write_all': False,
        },
        'platforms': {
            'fields': [
                'abbreviation',
                'alternative_name',
                'generation',
                'name',
                'platform_logo.url',
                'platform_type.name',
                'summary',
                'url',
                'versions.connectivity',
                'versions.cpu',
                'versions.graphics',
                'versions.main_manufacturer.company.name',
                'versions.media',
                'versions.memory',
                'versions.name',
                'versions.os',
                'versions.output',
                'versions.platform_logo.url',
                'versions.platform_version_release_dates.date',
                'versions.platform_version_release_dates.human',
                'versions.platform_version_release_dates.m',
                'versions.platform_version_release_dates.release_region.region',
                'versions.platform_version_release_dates.y',
                'versions.resolutions',
                'versions.sound',
                'versions.storage',
                'versions.summary',
                'versions.url',
            ],
            'append': {
                'games': {
                    'fields': [
                        'id',
                        'cover',
                        'name',
                        'release_dates',
                    ],
                },
            },
            'write_all': True,
        },
    }

    limit = 500

    full_dict = _fetch_all_endpoints(
        request_dict=request_dict,
        limit=limit,
        test_mode=args.test_mode,
        test_limit=args.test_limit,
    )

    _append_related_items(full_dict=full_dict, request_dict=request_dict)

    _add_platform_game_counts(full_dict=full_dict)

    buckets, all_videos = _build_buckets_and_collect_videos(full_dict=full_dict)

    for bucket, bucket_data in buckets.items():
        file_path = os.path.join(args.out_dir, 'buckets', str(bucket))
        write_json_files(file_path=file_path, data=bucket_data)

    all_videos.sort()
    all_video_groups = _resolve_video_groups(
        all_videos=all_videos,
        cache_file='cache/video_groups.json',
        group_size=50,
    )

    _fetch_youtube_metadata(full_dict=full_dict, all_video_groups=all_video_groups)

    _enrich_game_videos(full_dict=full_dict)

    for endpoint, endpoint_dict in full_dict.items():
        print(f'writing individual files for {endpoint}')
        for item_id, data in endpoint_dict.items():
            file_path = os.path.join(args.out_dir, endpoint, str(item_id))
            write_json_files(file_path=file_path, data=data)


def get_platform_cross_reference():
    """
    Write platform cross-reference to json files.
    """
    end_point = 'platforms'

    # write the end_point file
    file_path = os.path.join(args.out_dir, end_point, 'cross-reference')
    write_json_files(file_path=file_path, data=platforms.cross_reference)


def main():
    """Parse CLI arguments, initialise IGDB wrapper, and run the database update."""
    global args, wrapper

    parser = argparse.ArgumentParser(description="Download entire igdb database.")
    parser.add_argument(
        '-o',
        '--out_dir',
        type=str,
        required=False,
        default='gh-pages',
        help='Output directory for json files.',
    )
    parser.add_argument(
        '--twitch_client_id',
        type=str,
        required=False,
        default=os.getenv('TWITCH_CLIENT_ID'),
        help='Twitch developer client id',
    )
    parser.add_argument(
        '--twitch_client_secret',
        type=str,
        required=False,
        default=os.getenv('TWITCH_CLIENT_SECRET'),
        help='Twitch developer client secret',
    )
    parser.add_argument(
        '--youtube_api_key',
        type=str,
        required=False,
        default=os.getenv('YOUTUBE_API_KEY'),
        help='Youtube API key',
    )
    parser.add_argument(
        '-t',
        '--test_mode',
        action='store_true',
        help='Only write limited items per endpoint.',
    )
    parser.add_argument(
        '--test_limit',
        type=int,
        required=False,
        default=1000,
        help='Number of items to collect per endpoint when test_mode is enabled (default: 10).',
    )
    parser.add_argument(
        '-i',
        '--indent_json',
        action='store_true',
        help='Indent json files.',
    )

    args = parser.parse_args()
    args.indent = 4 if args.indent_json else None

    if not args.twitch_client_id or not args.twitch_client_secret or not args.youtube_api_key:
        raise SystemExit('Secrets not supplied. Required secrets are "TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET" and '
                         '"YOUTUBE_API_KEY". They should be placed in org/repo secrets if using github, '
                         'or ".env" file if running local.')

    auth = igdb_authorization(client_id=args.twitch_client_id, client_secret=args.twitch_client_secret)
    wrapper = IGDBWrapper(client_id=args.twitch_client_id, auth_token=auth['access_token'])

    get_data()
    get_platform_cross_reference()


if __name__ == '__main__':
    main()
