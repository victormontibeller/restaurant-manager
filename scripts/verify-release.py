#!/usr/bin/env python3
"""Health não destrutivo + identidade do processo e hash do release servido."""
import json
import os
from pathlib import Path
import sys
from release_support import verify

root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
print(json.dumps(verify(root, sys.argv[1] if len(sys.argv) > 1 else None)))
