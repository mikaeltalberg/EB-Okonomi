# supabase_test.py
#
# This is a complete example showing how to:
# - connect to Supabase
# - insert data
# - fetch data
# - update data
# - delete data

from supabase import create_client, Client

# ---------------------------------------------------
# 1. PASTE YOUR SUPABASE INFO HERE
# ---------------------------------------------------
SUPABASE_URL = "https://bgqsivfeglvhzkftelez.supabase.co"
SUPABASE_ANON_KEY = "sb_secret_tkgSK3FpKVekrvTXZS_dmw_041JnYBV"   # Use anon key ONLY

# Create client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


# ---------------------------------------------------
# 2. EXAMPLE FUNCTIONS
# ---------------------------------------------------

def insert_player(name: str, score: int):
    data = {"name": name, "score": score}
    response = supabase.table("players").insert(data).execute()
    print("INSERT RESULT:", response)


def fetch_players():
    response = supabase.table("players").select("*").execute()
    print("ALL PLAYERS:", response.data)


def update_score(name: str, new_score: int):
    response = (
        supabase.table("players")
        .update({"score": new_score})
        .eq("name", name)
        .execute()
    )
    print("UPDATE RESULT:", response)


def delete_player(name: str):
    response = supabase.table("players").delete().eq("name", name).execute()
    print("DELETE RESULT:", response)


# ---------------------------------------------------
# 3. RUN EVERYTHING FOR A DEMO
# ---------------------------------------------------

if __name__ == "__main__":
    print("\n➤ Inserting player...")
    insert_player("Mikael", 10)

    print("\n➤ Fetching players...")
    fetch_players()

    print("\n➤ Updating player score...")
    update_score("Mikael", 25)

    print("\n➤ Fetching again...")
    fetch_players()

    print("\n➤ Deleting player...")
    delete_player("Mikael")

    print("\n➤ Done!")

