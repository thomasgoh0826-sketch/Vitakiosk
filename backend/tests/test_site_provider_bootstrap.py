from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys


def test_main_loads_site_provider_env_before_route_singletons() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    env = os.environ.copy()
    env.update(
        {
            "VITAKIOSK_LOAD_DOTENV": "false",
            "SITE_DATABASE_PROVIDER": "supabase",
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "test-service-role-key",
            "SITE_EMAIL_PROVIDER": "gmail_connected",
            "SITE_OWNER_EMAIL": "owner@example.com",
            "SITE_EMAIL_SMTP_USERNAME": "owner@example.com",
            "SITE_EMAIL_SMTP_APP_PASSWORD": "test app password",
        },
    )
    code = "\n".join(
        [
            "import json",
            "import backend.app.main",
            "from backend.app.routes import site",
            "print(json.dumps({",
            "    'database_provider': site.site_database.name,",
            "    'email_provider': site.site_email.name,",
            "}))",
        ],
    )

    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=repo_root,
        env=env,
        capture_output=True,
        text=True,
        check=True,
    )

    payload = json.loads(result.stdout)
    assert payload == {
        "database_provider": "supabase",
        "email_provider": "gmail_connected",
    }
