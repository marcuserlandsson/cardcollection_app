import requests
from supabase import create_client
from datetime import datetime

url = "https://uvbymfdtduhbcojqxzwi.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2YnltZmR0ZHVoYmNvanF4endpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2ODY5NjcsImV4cCI6MjA1NzI2Mjk2N30.AUTvCLm4onmeXZSFyWMKp7NclcndptH-MP75ALekxlY"
supabase = create_client(url, key)

def fetch_and_cache_cards():
    # Fetch data from Digimon Card API
    response = requests.get("https://digimoncard.io/api-public/getAllCards.php?sort=name&series=Digimon Card Game&sortdirection=asc")
    cards = response.json()

    # Process each card and extract relevant information
    processed_cards = []
    for card in cards:
        cardnum = card.get('cardnumber', '')
        expansion = cardnum.split('-')[0]
        processed_card = {
            'card_number': cardnum,
            'card_name': card.get('name', ''),
            'card_expansion': expansion,
            'last_updated': datetime.utcnow().isoformat()
        }
        processed_cards.append(processed_card)
        print("batch done!")

    # Process in batches
    BATCH_SIZE = 15
    for i in range(0, len(processed_cards), BATCH_SIZE):
        batch = processed_cards[i:i+BATCH_SIZE]
        
        # Upsert batch into Supabase
        result = supabase.table("cards").upsert(batch).execute()
        print(f"Processed batch {i//BATCH_SIZE + 1}, cards {i+1}-{min(i+BATCH_SIZE, len(processed_cards))}")

# Run daily or on demand
fetch_and_cache_cards()