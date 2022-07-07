# standard imports
import argparse
import pathlib
import json
import os

# lib imports
import requests
from dotenv import load_dotenv
from igdb.wrapper import IGDBWrapper

# local imports
from igdb_enums import enums

# setup environment if running locally
load_dotenv()


def igdb_authorization(client_id: str, client_secret: str) -> dict:
    auth_headers = dict(
        Accept='application/json',
        client_id=client_id,
        client_secret=client_secret,
        grant_type='client_credentials'
    )

    token_url = 'https://id.twitch.tv/oauth2/token'

    authorization = post_json(url=token_url, headers=auth_headers)
    return authorization


def post_json(url: str, headers: dict) -> dict:
    result = requests.post(url=url, data=headers).json()
    return result


def write_json_files(file_path: str, data: dict):
    # determine the directory
    directory = os.path.dirname(file_path)

    pathlib.Path(directory).mkdir(parents=True, exist_ok=True)

    with open(f'{file_path}.json', 'w') as f:
        json.dump(obj=data, fp=f, indent=args.indent)


def get_igdb_data():
    request_dict = dict(
        characters=dict(
            fields=[
                'games',
                'gender',
                'mug_shot.url',
                'name',
                'species',
            ],
            write_all=True,
        ),
        games=dict(
            fields=[
                'age_ratings.category',
                'age_ratings.rating',
                'aggregated_rating',
                'artworks.url',
                'collection.name',
                'cover.url',
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
                'screenshots.url',
                'storyline',
                'summary',
                'themes.name',
                'videos.name',
                'videos.video_id',
            ],
            append=dict(
                characters=dict(
                    fields=[
                        'id',
                        'gender',
                        'mug_shot',
                        'name',
                        'species',
                    ]
                )
            ),
            write_all=False,
        ),
        platforms=dict(
            fields=[
                'abbreviation',
                'alternative_name',
                'name',
            ],
            append=dict(
                games=dict(
                    fields=[
                        'id',
                        'name',
                        'release_dates',
                    ]
                )
            ),
            write_all=True,
        ),
    )
    limit = 500
    full_dict = dict()

    for end_point, end_point_dict in request_dict.items():
        print(f'now processing endpoint: {end_point}')
        offset = 0
        result = True
        full_dict[end_point] = dict()

        while result:
            byte_array = wrapper.api_request(
                endpoint=end_point,
                query=f'fields {", ".join(end_point_dict["fields"])}; limit {limit}; offset {offset};'
            )
            json_result = json.loads(byte_array)  # this is a list of dictionaries
            # items.extend(json_result)

            for item in json_result:
                full_dict[end_point][item['id']] = item

                # file_path = os.path.join(end_point, str(item['id']))
                # write_json_files(file_path=file_path, data=item)

                if args.test_mode:
                    break

            # print(json.dumps(json_result, indent=4))

            offset += limit

            if not json_result:
                result = False

        if end_point_dict['write_all']:
            # write the end_point file
            file_path = os.path.join(end_point, 'all')
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
                                    full_dict[end_point][item_id_dest][item_type].append(dict())

                                    for field in item_type_dict['fields']:
                                        try:
                                            field_value = value[field]
                                        except KeyError:
                                            # this item doesn't have the specified field, no problem
                                            pass
                                        else:
                                            full_dict[end_point][item_id_dest][item_type][-1][field] = field_value

    # write the individual files
    for end_point, end_point_dict in full_dict.items():
        print(f'writing individual files for {end_point}')
        for item_id, data in end_point_dict.items():
            file_path = os.path.join(end_point, str(item_id))
            write_json_files(file_path=file_path, data=data)


def get_igdb_enums():
    end_point = 'enums'
    for enum, values in enums.items():
        file_path = os.path.join(end_point, enum)
        write_json_files(file_path=file_path, data=values)

        if args.test_mode:
            break

    # write the end_point file
    file_path = os.path.join(end_point, 'all')
    write_json_files(file_path=file_path, data=enums)


if __name__ == '__main__':
    # setup arguments using argparse
    parser = argparse.ArgumentParser(description="Download entire igdb database.")
    parser.add_argument('--client_id', type=str, required=False, default=os.getenv('TWITCH_CLIENT_ID'),
                        help='Twitch developer client id')
    parser.add_argument('--client_secret', type=str, required=False, default=os.getenv('TWITCH_CLIENT_SECRET'),
                        help='Twitch developer client secret')
    parser.add_argument('-t', '--test_mode', action='store_true',
                        help='Only write one item file per end point, per request.')
    parser.add_argument('-i', '--indent_json', action='store_true', help='Indent json files.')

    args = parser.parse_args()
    args.indent = 4 if args.indent_json else None

    if not args.client_id or not args.client_secret:
        raise SystemExit('No secrets supplied. Required secrets are "TWITCH_CLIENT_ID" and "TWITCH_CLIENT_SECRET". '
                         'They should be placed in org/repo secrets if using github, or ".env" file if running local.')

    # setup igdb authorization and wrapper
    auth = igdb_authorization(client_id=args.client_id, client_secret=args.client_secret)
    wrapper = IGDBWrapper(client_id=args.client_id, auth_token=auth['access_token'])

    # get date, process dictionaries and write data
    get_igdb_data()
    get_igdb_enums()
