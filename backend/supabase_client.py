import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ["SUPABASE_URL"]
key: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Singleton client used by all route handlers.
# The service role key bypasses Row Level Security — ownership checks are
# done explicitly in the API layer instead.
supabase: Client = create_client(url, key)
