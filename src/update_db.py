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
    full_dict = {}

    for end_point, end_point_dict in request_dict.items():
        print(f'now processing endpoint: {end_point}')
        offset = 0
        result = True
        full_dict[end_point] = {}
        test_count = 0

        while result:
            try:
                byte_array = wrapper.api_request(
                    endpoint=end_point,
                    query=f'fields {", ".join(end_point_dict["fields"])}; limit {limit}; offset {offset};'
                )
            except requests.exceptions.HTTPError:
                # handle too many requests
                time.sleep(1)
                continue

            json_result = json.loads(byte_array)  # this is a list of dictionaries

            for item in json_result:
                full_dict[end_point][item['id']] = item

                if args.test_mode:
                    test_count += 1
                    if test_count >= args.test_limit:
                        result = False
                        break

            offset += limit

            if not json_result:
                result = False

        if end_point_dict['write_all']:
            # write the end_point file
            file_path = os.path.join(args.out_dir, end_point, 'all')
            write_json_files(file_path=file_path, data=full_dict[end_point])

        print(f'{len(full_dict[end_point])} items processed in endpoint: {end_point}')

    for end_point, end_point_dict in request_dict.items():
        try:
            append_dict = request_dict[end_point]['append']
        except KeyError:
            pass
        else:
            for item_type, item_type_dict in append_dict.items():
                print(f'adding {item_type} to {end_point}')
                for item_id_src, value in full_dict[item_type].items():
                    try:
                        append_to = value[end_point]
                    except KeyError:
                        pass
                    else:
                        for item_id_dest in append_to:
                            try:
                                full_dict[end_point][item_id_dest]
                            except KeyError:
                                # the destination item doesn't exist
                                pass
                            else:
                                try:
                                    full_dict[end_point][item_id_dest][item_type]
                                except KeyError:
                                    full_dict[end_point][item_id_dest][item_type] = []
                                finally:
                                    full_dict[end_point][item_id_dest][item_type].append({})

                                    for field in item_type_dict['fields']:
                                        try:
                                            field_value = value[field]
                                        except KeyError:
                                            # this item doesn't have the specified field, no problem
                                            pass
                                        else:
                                            full_dict[end_point][item_id_dest][item_type][-1][field] = field_value

    # Add game counts to platforms for the all.json file
    print('calculating game counts for platforms')
    for platform_id, platform_data in full_dict['platforms'].items():
        try:
            games = platform_data['games']
            platform_data['game_count'] = len(games)
        except KeyError:
            # no games for this platform
            platform_data['game_count'] = 0

    # Rewrite platforms/all.json with game counts
    file_path = os.path.join(args.out_dir, 'platforms', 'all')
    write_json_files(file_path=file_path, data=full_dict['platforms'])

    # create buckets and get list of all videos
    print('creating buckets / collecting video ids')
    buckets = {}
    all_videos = []
    for game_id, game_data in full_dict['games'].items():
        # games
        bucket = "".join(x.strip().lower() for x in game_data['name'][:2] if x.isalnum())
        if not re.fullmatch(r'[\da-z]+', bucket):
            bucket = '@'

        try:
            buckets[bucket]
        except KeyError:
            buckets[bucket] = {}
        finally:
            buckets[bucket][game_id] = {'name': game_data['name']}

        # videos
        try:
            game_videos = game_data['videos']
        except KeyError:
            # no videos for this game
            pass
        else:
            for video in game_videos:
                video_id = video['video_id']
                if video_id not in all_videos:
                    all_videos.append(video_id)

    # write the full game index
    for bucket, bucket_data in buckets.items():
        file_path = os.path.join(args.out_dir, 'buckets', str(bucket))
        write_json_files(file_path=file_path, data=bucket_data)

    # get data for videos
    # we can only make 10,000 requests to YouTube api per day, so let's get as much data as possible in each request
    print('collecting video metadata')

    end_point = 'videos'
    full_dict[end_point] = {}

    all_videos.sort()

    cache_file = 'cache/video_groups.json'
    os.makedirs(os.path.dirname(cache_file), exist_ok=True)

    group_size = 50
    if not os.path.isfile(cache_file):
        all_video_groups = [all_videos[x:x + group_size] for x in range(0, len(all_videos), group_size)]
    else:
        with open(cache_file, 'r') as f:
            cached_video_groups = json.load(f)

        # Filter cached video groups to include only those where all videos are in all_videos
        all_video_groups = [x for x in cached_video_groups if all(video in all_videos for video in x)]

        # Find videos that are not in any cached video group
        uncached_videos = [video for video in all_videos if not any(video in group for group in cached_video_groups)]

        # Append uncached videos in groups of up to 50 to all_video_groups
        uncached_video_groups = [uncached_videos[x:x + group_size] for x in range(0, len(uncached_videos), group_size)]
        all_video_groups.extend(uncached_video_groups)

    # write the new video groups to cache
    with open(cache_file, 'w') as f:
        json.dump(all_video_groups, f)

    for video_group in all_video_groups:
        json_result = get_youtube(video_ids=video_group)

        try:
            for item in json_result['items']:
                full_dict[end_point][item['id']] = item
        except KeyError as e:
            print(f'KeyError: {e}\n\n{json.dumps(json_result, indent=2)}')

    # get video details for games
    print('adding videos to games')
    for game_id, game_data in full_dict['games'].items():
        try:
            game_videos = game_data['videos']
        except KeyError:
            # no videos for this game
            pass
        else:
            for video in game_videos:
                try:
                    video_details = full_dict['videos'][video['video_id']]
                except (IndexError, KeyError):
                    # no data for this video
                    pass
                else:
                    video_thumbs = video_details['snippet']['thumbnails']

                    # remove keys that have no value
                    # create a copy of original dictionary since we may alter it, https://stackoverflow.com/a/33815594
                    for video_key, video_value in dict(video_thumbs).items():
                        if video_value is None:
                            del video_thumbs[video_key]

                    # sort the video thumbnails by width into a list
                    video_thumbs = sorted(video_thumbs.items(), key=lambda x: x[1]['width'], reverse=True)

                    # the final video thumbnail
                    video['url'] = f'https://www.youtube.com/watch?v={video_details["id"]}'
                    video['title'] = video_details['snippet']['title']
                    video['thumb'] = video_thumbs[0][1]['url']

    # write the individual files
    for end_point, end_point_dict in full_dict.items():
        print(f'writing individual files for {end_point}')
        for item_id, data in end_point_dict.items():
            file_path = os.path.join(args.out_dir, end_point, str(item_id))
            write_json_files(file_path=file_path, data=data)


def get_platform_cross_reference():
    """
    Write platform cross-reference to json files.
    """
    end_point = 'platforms'

    # write the end_point file
    file_path = os.path.join(args.out_dir, end_point, 'cross-reference')
    write_json_files(file_path=file_path, data=platforms.cross_reference)


if __name__ == '__main__':
    # setup arguments using argparse
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

    # setup igdb authorization and wrapper
    auth = igdb_authorization(client_id=args.twitch_client_id, client_secret=args.twitch_client_secret)
    wrapper = IGDBWrapper(client_id=args.twitch_client_id, auth_token=auth['access_token'])

    # get date, process dictionaries and write data
    get_data()
    get_platform_cross_reference()
