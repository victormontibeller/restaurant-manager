#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[[ -z "$(git status --porcelain)" ]] || { printf 'Checkout sujo; commit/revisão antes do build identificado.\n'; exit 2; }
export RM_BUILD_SHA="$(git rev-parse HEAD)"
export NODE_OPTIONS="--max-old-space-size=768"
export NG_BUILD_MAX_WORKERS=2
exec 9>"${RM_HOME:-$HOME/.local/share/restaurant-manager}/deploy.lock"
flock -n 9 || { printf 'Build/deploy concorrente recusado.\n'; exit 2; }
python3 scripts/check-repository.py
python3 -m unittest discover -s scripts -p 'test_*.py'
npm --prefix frontend ci --ignore-scripts
npm --prefix frontend run typecheck
node scripts/test_platform_session.cjs
node scripts/test_unit_events.cjs
node scripts/test_event_config.cjs
node scripts/test_inactive_memberships.cjs
node scripts/test_hml_fixture.cjs
bash scripts/test-profile-templates.sh
npm --prefix frontend run build
npm --prefix frontend audit --audit-level=moderate
bash scripts/with-env.sh test bash backend/mvnw -B -ntp -f backend/pom.xml clean verify
bash scripts/with-env.sh test python3 scripts/audit-java.py
python3 -c 'import os,sys; from pathlib import Path; sys.path.insert(0,"scripts"); from release_support import clean_sha,artifact_hash,atomic_json; r=Path(os.environ.get("RM_HOME",Path.home()/".local/share/restaurant-manager")); j=Path("backend/target/restaurant-manager-0.1.0-SNAPSHOT.jar"); sha=clean_sha(Path.cwd(),os.environ["RM_BUILD_SHA"]); atomic_json(Path(os.environ.get("RM_BUILD_GATE_FILE",r/"build-gate.json")),{"git_sha":sha,"artifact_sha256":artifact_hash(j),"checks":"backend+frontend"})'
