#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[[ -z "$(git status --porcelain)" ]] || { printf 'Checkout sujo; commit/revisão antes do build identificado.\n'; exit 2; }
export RM_BUILD_SHA="$(git rev-parse HEAD)"
exec 9>"${RM_HOME:-$HOME/.local/share/restaurant-manager}/deploy.lock"
flock -n 9 || { printf 'Build/deploy concorrente recusado.\n'; exit 2; }
python3 scripts/check-repository.py
python3 -m unittest discover -s scripts -p 'test_*.py'
npm --prefix frontend ci --ignore-scripts
npm --prefix frontend run typecheck
npm --prefix frontend run build
npm --prefix frontend audit --audit-level=moderate
bash scripts/with-env.sh test bash backend/mvnw -B -ntp -f backend/pom.xml clean verify
python3 scripts/audit-java.py
python3 -c 'import os,sys; from pathlib import Path; sys.path.insert(0,"scripts"); from release_support import clean_sha,artifact_hash,atomic_json; r=Path(os.environ.get("RM_HOME",Path.home()/".local/share/restaurant-manager")); j=Path("backend/target/restaurant-manager-0.1.0-SNAPSHOT.jar"); sha=clean_sha(Path.cwd(),os.environ["RM_BUILD_SHA"]); atomic_json(r/"build-gate.json",{"git_sha":sha,"artifact_sha256":artifact_hash(j),"checks":"backend+frontend"})'
