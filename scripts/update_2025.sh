#!/usr/bin/env bash
# Update 2025 H2H from Sleeper (safe weekly run)
# Usage: ./update_2025.sh

set -euo pipefail

# Adjust these if your paths differ locally:
LEAGUE_ID="1257071385973362690"
SEASON="2025"

# If you run this from the same folder that has sleeper_to_h2h.py
# and your mapping file (2025_team_mapping.json), and your site's
# assets live at ../assets, the defaults below should "just work".

H2H_IN="../assets/H2H.json"
H2H_OUT="../assets/H2H.updated.json"
MAPPING="./2025_team_mapping.json"

python3 ./sleeper_to_h2h.py   --league "${LEAGUE_ID}"   --season "${SEASON}"   --h2h "${H2H_IN}"   --out "${H2H_OUT}"   --map "${MAPPING}"   --weeks 1-14   --sort-mode season   --only-played

echo "Wrote ${H2H_OUT}"
echo "Review the diff, then replace:"
echo "  cp ${H2H_OUT} ${H2H_IN}"
