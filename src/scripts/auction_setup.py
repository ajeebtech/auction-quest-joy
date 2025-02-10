
import pandas as pd
import json

def load_auction_data():
    # Read the CSV file
    df = pd.read_csv('csvs/auction_dataset.csv')
    
    # Convert DataFrame to list of player dictionaries
    players = []
    for _, row in df.iterrows():
        player = {
            'id': int(row.name),  # Using index as ID
            'name': row['Player'],
            'role': row['Type'],
            'basePrice': int(float(row['Base Price']) * 1000000),  # Convert to millions
            'nationality': 'India',  # Default to India since not in dataset
            'stats': {
                'matches': int(row['Matches']),
                'runs': int(row['Runs']),
                'wickets': int(row['Wickets']),
                'average': float(row['Average']) if pd.notna(row['Average']) else 0.0
            }
        }
        players.append(player)
    
    # Save to JSON file that will be read by frontend
    with open('src/data/players.json', 'w') as f:
        json.dump(players, f)

if __name__ == "__main__":
    load_auction_data()

