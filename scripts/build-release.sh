#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[[ -z "$(git status --porcelain)" ]] || { printf 'Checkout sujo; commit/revisão antes do build identificado.\n'; exit 2; }
npm --prefix frontend ci --ignore-scripts
npm --prefix frontend run typecheck
npm --prefix frontend run build
npm --prefix frontend audit --audit-level=moderate
bash scripts/with-env.sh test bash backend/mvnw -B -ntp -f backend/pom.xml clean verify
python3 scripts/audit-java.py
python3 -c 'import hashlib,json,os,subprocess; from pathlib import Path; r=Path(os.environ.get("RM_HOME",Path.home()/".local/share/restaurant-manager")); j=Path("backend/target/restaurant-manager-0.1.0-SNAPSHOT.jar"); (r/"build-gate.json").write_text(json.dumps({"git_sha":subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip(),"artifact_sha256":hashlib.sha256(j.read_bytes()).hexdigest(),"checks":"backend+frontend"}))'
