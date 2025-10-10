
import argparse
import json
import sys
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
from datetime import date, timedelta, datetime

API_BASE = "https://api.sleeper.app/v1"

def http_get_json(url: str):
    try:
        req = Request(url, headers={"User-Agent": "Sleeper-H2H-Updater/1.0"})
        with urlopen(req, timeout=30) as resp:
            data = resp.read()
        return json.loads(data.decode("utf-8"))
    except HTTPError as e:
        print(f"[HTTPError] {e.code} for {url}", file=sys.stderr)
        raise
    except URLError as e:
        print(f"[URLError] {e.reason} for {url}", file=sys.stderr)
        raise

def get_users(league_id: str):
    return http_get_json(f"{API_BASE}/league/{league_id}/users")

def get_rosters(league_id: str):
    return http_get_json(f"{API_BASE}/league/{league_id}/rosters")

def get_matchups(league_id: str, week: int):
    return http_get_json(f"{API_BASE}/league/{league_id}/matchups/{week}")

def list_teams(league_id: str):
    users = get_users(league_id)
    rosters = get_rosters(league_id)
    users_by_id = {u["user_id"]: u for u in users}
    result = []
    for r in rosters:
        owner_id = r.get("owner_id")
        user = users_by_id.get(owner_id, {})
        display_name = user.get("display_name") or user.get("username") or ""
        username = user.get("username") or ""
        roster_id = r.get("roster_id")
        team_name = (r.get("metadata") or {}).get("team_name") or (user.get("metadata") or {}).get("team_name") or ""
        result.append({
            "roster_id": roster_id,
            "owner_user_id": owner_id,
            "display_name": display_name,
            "username": username,
            "sleeper_team_name": team_name,
        })
    result.sort(key=lambda x: int(x["roster_id"]))
    return result

def sunday_for_week(season: int, week: int) -> date:
    # 2025 anchor: Week 1 Sunday = 2025-09-07; Week 6 = 2025-10-12
    if season != 2025:
        raise ValueError("This helper is currently anchored for 2025 only as requested.")
    week1 = date(2025, 9, 7)
    return week1 + timedelta(days=7*(week-1))

def pair_matchups(matchups):
    by_mid = {}
    for m in matchups:
        mid = m.get("matchup_id")
        if mid is None:
            continue
        by_mid.setdefault(mid, []).append(m)
    pairs = []
    for mid, items in by_mid.items():
        if len(items) == 2:
            pairs.append((items[0], items[1]))
    return pairs

def round2(x):
    return float(f"{float(x):.2f}")

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

def main():
    parser = argparse.ArgumentParser(description="Pull 2025 matchups from Sleeper and append to H2H.json")
    parser.register("type", "sortmode", lambda v: v if v in {"none","season","global"} else (_ for _ in ()).throw(argparse.ArgumentTypeError("sort-mode must be none|season|global")))

    parser.add_argument("--league", required=True, help="Sleeper league ID (e.g., 1257071385973362690)")
    parser.add_argument("--season", type=int, default=2025, help="Season to fetch (default: 2025)")
    parser.add_argument("--h2h", required=True, help="Path to existing H2H.json")
    parser.add_argument("--out", required=True, help="Path to write updated H2H.json")
    parser.add_argument("--map", help="Path to team mapping json (roster_id -> canonical team name)")
    parser.add_argument("--list-teams", action="store_true", help="Only list teams from Sleeper and exit")
    parser.add_argument("--weeks", type=str, default="1-14", help="Weeks to fetch, e.g. '1-8' or '1,2,3,6,9' (default 1-14)")
    parser.add_argument("--only-played", dest="only_played", action="store_true", default=True, help="Include only games that have actually happened and are not 0-0 (default: on)")
    parser.add_argument("--cutoff-date", type=str, default=None, help="Optional YYYY-MM-DD to cap which Sundays count as played")
    parser.add_argument("--sort-mode", type="sortmode", default="season", help="Sort mode: none|season|global (default: season)")

    args = parser.parse_args()

    if args.list_teams:
        teams = list_teams(args.league)
        print(json.dumps(teams, indent=2, ensure_ascii=False))
        print("\nTip: create a mapping JSON like:")
        mapping = { str(t["roster_id"]): "" for t in teams }
        print(json.dumps(mapping, indent=2))
        return

    h2h = load_json(args.h2h)
    if not isinstance(h2h, list):
        print("H2H.json must be a list of game objects.", file=sys.stderr)
        sys.exit(1)

    if not args.map:
        print("Error: --map is required when appending data.", file=sys.stderr)
        sys.exit(2)
    mapping = load_json(args.map)
    mapping = { str(k): v for k, v in mapping.items() }

    teams_info = list_teams(args.league)
    roster_ids = [str(t["roster_id"]) for t in teams_info]
    missing = [rid for rid in roster_ids if mapping.get(rid, "").strip() == ""]
    if missing:
        print("The following roster_ids are missing a canonical name in your mapping:", file=sys.stderr)
        for rid in missing:
            t = next((ti for ti in teams_info if str(ti["roster_id"]) == rid), None)
            print(f"  roster_id={rid}  display_name={t.get('display_name') if t else ''}  username={t.get('username') if t else ''}  sleeper_team_name={t.get('sleeper_team_name') if t else ''}", file=sys.stderr)
        print("Please update your mapping JSON and re-run.", file=sys.stderr)
        sys.exit(3)

    rid_to_name = { str(t["roster_id"]): mapping[str(t["roster_id"])] for t in teams_info }

    weeks = set()
    for token in args.weeks.split(","):
        token = token.strip()
        if "-" in token:
            a,b = token.split("-")
            for w in range(int(a), int(b)+1):
                weeks.add(w)
        elif token:
            weeks.add(int(token))
    weeks = sorted(weeks)

    def key_of(game):
        wk = game.get("week") or 0
        teams = sorted([game.get("teamA",""), game.get("teamB","")])
        return (int(game.get("season")), int(wk), teams[0], teams[1])

    existing_keys = set()
    for g in h2h:
        try:
            existing_keys.add(key_of(g))
        except Exception:
            continue

    if args.cutoff_date:
        cutoff = datetime.strptime(args.cutoff_date, "%Y-%m-%d").date()
    else:
        cutoff = date.today()

    appended = 0
    for w in weeks:
        matchups = get_matchups(args.league, w)
        pairs = pair_matchups(matchups)
        if not pairs:
            continue
        game_date = sunday_for_week(args.season, w)
        if args.only_played and game_date > cutoff:
            continue
        for a,b in pairs:
            ridA = str(a.get("roster_id"))
            ridB = str(b.get("roster_id"))
            if ridA not in rid_to_name or ridB not in rid_to_name:
                print(f"Skipping matchup due to missing mapping: roster_ids {ridA} vs {ridB}", file=sys.stderr)
                continue
            teamA = rid_to_name[ridA]
            teamB = rid_to_name[ridB]

            scoreA = round2(a.get("points", 0.0))
            scoreB = round2(b.get("points", 0.0))

            if args.only_played and (scoreA == 0.0 and scoreB == 0.0):
                continue

            k = (args.season, w, *sorted([teamA, teamB]))
            if k in existing_keys:
                continue

            row = {
                "season": args.season,
                "date": game_date.strftime("%Y-%m-%d"),
                "teamA": teamA,
                "teamB": teamB,
                "scoreA": scoreA,
                "scoreB": scoreB,
                "week": w,
                "round": "",
                "type": "Regular"
            }
            h2h.append(row)
            existing_keys.add(k)
            appended += 1

    # Sorting behavior
    if args.sort_mode == "none":
        h2h_final = h2h
    elif args.sort_mode == "season":
        before = [g for g in h2h if g.get("season") != args.season]
        target = [g for g in h2h if g.get("season") == args.season]
        target_sorted = sorted(target, key=lambda g: (g.get("date",""), g.get("week") or 0, g.get("teamA",""), g.get("teamB","")))
        h2h_final = before + target_sorted
    else:  # global
        h2h_final = sorted(h2h, key=lambda g: (g.get("season", 0), g.get("date", ""), g.get("week") or 0, g.get("teamA",""), g.get("teamB","")))

    save_json(args.out, h2h_final)
    print(f"Done. Appended {appended} new games. Wrote: {args.out}. Sort mode: {args.sort_mode}. Only-played: {args.only_played}. Cutoff: {args.cutoff_date or 'today'}")

if __name__ == "__main__":
    main()
