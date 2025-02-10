import torch
import gym
import time
import pandas as pd
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import numpy as np
import gym
import re
import json
import requests


pricesdf = pd.read_csv('/Users/jatin/Documents/model stuff/IPLPlayerTrends.csv')
# need to predict prices of all these

def feature_similarity(tensor1, tensor2, epsilon=1e-6):
    tensor1, tensor2 = tensor1.flatten(), tensor2.flatten()  # Ensure 1D
    
    similarity = 1 - (torch.abs(tensor1 - tensor2) / (torch.maximum(tensor1, tensor2) + epsilon))
    overall_similarity = similarity.mean()  # Get average similarity across features
    

    return overall_similarity

def position_score(player1_bataverages, player2_bataverages, player1_bowlaverages, player2_bowlaverages, role1, role2, weight=0.5):
    if role1 == 'Batter' and role2 == 'Batter':
        # Existing batter-batter comparison
        best_position = torch.argmax(player2_bataverages).item()
        p1_avg = player1_bataverages[best_position]
        p2_avg = player2_bataverages[best_position]
        
        if p2_avg > p1_avg:
            return 1.0
        
        dot_product = torch.dot(player1_bataverages, player2_bataverages)
        norm_p1 = torch.norm(player1_bataverages)
        norm_p2 = torch.norm(player2_bataverages)
        similarity = dot_product / (norm_p1 * norm_p2 + 1e-6)
        score = torch.sigmoid(similarity)
        
    elif role1 == 'Bowler' and role2 == 'Bowler':
        # Existing bowler-bowler comparison
        best_position = torch.argmax(player2_bowlaverages).item()
        p1_avg = player1_bowlaverages[best_position]
        p2_avg = player2_bowlaverages[best_position]
        
        if p2_avg < p1_avg:
            return 1.0
        
        dot_product = torch.dot(player1_bowlaverages, player2_bowlaverages)
        norm_p1 = torch.norm(player1_bowlaverages)
        norm_p2 = torch.norm(player2_bowlaverages)
        similarity = dot_product / (norm_p1 * norm_p2 + 1e-6)
        score = torch.sigmoid(similarity)
        
    elif (role1, role2) in [('Allrounder', 'Bowler'), ('Bowler', 'Allrounder')]:
        # Existing bowler-allrounder comparison
        batting_best = torch.argmax(player2_bataverages).item()
        bowling_best = torch.argmax(player1_bowlaverages).item()
        
        bat_score = 1.0 if player2_bataverages[batting_best] > player1_bataverages[batting_best] \
            else torch.sigmoid(torch.dot(player1_bataverages, player2_bataverages) / (torch.norm(player1_bataverages)*torch.norm(player2_bataverages)+1e-6))
        
        bowl_score = 1.0 if player2_bowlaverages[bowling_best] < player1_bowlaverages[bowling_best] \
            else torch.sigmoid(torch.dot(player1_bowlaverages, player2_bowlaverages) / (torch.norm(player1_bowlaverages)*torch.norm(player2_bowlaverages)+1e-6))
        
        score = (weight * bat_score) + ((1 - weight) * bowl_score)

    # New batter-allrounder comparisons #########################################
    elif (role1, role2) in [('Batter', 'Allrounder'), ('Allrounder', 'Batter')]:
        # Determine which is batter/allrounder based on roles
        batter_bat = player1_bataverages if role1 == 'Batter' else player2_bataverages
        allrounder_bat = player2_bataverages if role2 == 'Allrounder' else player1_bataverages
        allrounder_bowl = player2_bowlaverages if role2 == 'Allrounder' else player1_bowlaverages

        # Batting comparison at batter's strongest position
        batting_pos = torch.argmax(batter_bat).item()
        bat_score = 1.0 if allrounder_bat[batting_pos] > batter_bat[batting_pos] \
            else torch.sigmoid(torch.dot(batter_bat, allrounder_bat) / (torch.norm(batter_bat)*torch.norm(allrounder_bat)+1e-6))

        # Bowling comparison (allrounder vs batter's bowling ability)
        bowl_pos = torch.argmax(allrounder_bowl).item()
        bowl_score = 1.0 if allrounder_bowl[bowl_pos] < player1_bowlaverages[bowl_pos] \
            else torch.sigmoid(torch.dot(allrounder_bowl, player1_bowlaverages) / (torch.norm(allrounder_bowl)*torch.norm(player1_bowlaverages)+1e-6))

        score = (weight * bat_score) + ((1 - weight) * bowl_score)

    else:
        return 0.0
    return score.item()


def style_tokenizer(style):
    if isinstance(style, str) and pd.isna(style):
        return 0.0

    style_mapping = {
        'right-arm offbreak': 1.0,
        'slow left-arm orthodox': 1.0,
        'legbreak googly': 1.5,
        'legbreak': 1.5,
        'left-arm wrist-spin': 1.5,
        'right-arm fast': 5,
        'right-arm fast-medium': 5,
        'left-arm medium-fast': 4.5,
        'right-arm medium-fast': 4.5,
        'right-arm fast-medium': 3,
        'left-arm fast-medium': 3,
        'left-arm medium': 2.5,
        'right-arm medium': 2.5,
        'slow left-arm medium': 2.5
    }
    
    # Handle case where style is missing or invalid
    if isinstance(style, str):
        return style_mapping.get(style, 0.0)
    return 0.0


df = pd.read_csv('/Users/jatin/Documents/python/the big thing/csvs/csk_dataset.csv')
pricesdf = pd.read_csv('/Users/jatin/Documents/python/the big thing/CatBoostPredictedIPLPlayerPrices.csv')
class xPlayer(gym.Env):
    def __init__(self, tensor, name, bat_style, bowl_style, bowling_average, batting_average,
                 bowling_innings, economy_rate, field_style, awards, runs, sixes, fours, 
                 strike_rate, importance, wickets, postenbat, postenbol, batting_innings,role):
        self.name = name
        self.bat_style = bat_style
        self.bowl_style = bowl_style
        self.awards = awards
        self.importance = importance
        self.runs = runs
        self.bowling_innings = bowling_innings
        self.batting_innings = batting_innings
        self.batting_average = batting_average
        self.bowling_average = bowling_average
        self.economy_rate = economy_rate
        self.strike_rate = strike_rate
        self.fours = fours
        self.sixes = sixes
        self.field_style = field_style
        self.wickets = wickets
        self.tensor = tensor
        self.postenbat = postenbat
        self.postenbol = postenbol
        self.role = role

def create_squad(df, squad={}):
    for i in range(len(df)): 
        row = df.iloc[i]
        
        # Feature processing
        bowl_style = style_tokenizer(row['bowl_style'])
        field_style = 1 if row['field_style'] == 'wicketkeeper' else 0
        bat_style = 2 if row['bat_style'] == 'left-hand bat' else 1.0
        
        # Performance metrics
        batting_innings = row['batting_innings']
        bpi = (row['fours'] + row['sixes']) / batting_innings if batting_innings else 0
        rpi = row['runs'] / batting_innings if batting_innings else 0
        wpi = row['wickets'] / row['bowling_innings'] if row['bowling_innings'] else 0

        # Tensor construction
        additional_tensor = torch.tensor([bpi, rpi, wpi], dtype=torch.float32)
        
        selected_tensor = torch.tensor([
            bat_style,
            bowl_style,
            field_style,
            row['batting_average'],
            row['strike_rate'],
            row['bowling_average'],
            row['economy_rate']
        ], dtype=torch.float32)
        
        position_tensor_batting = torch.tensor(
            [row.get(f'{pos+1}st position batting', 0.0) for pos in range(11)],
            dtype=torch.float32
        )
        
        position_tensor_bowling = torch.tensor(
            [row.get(f'{pos+1}st position bowling', 0.0) for pos in range(11)],
            dtype=torch.float32
        )

        # Player object creation
        squad[row['name']] = xPlayer(
            tensor=torch.cat((selected_tensor, additional_tensor)),
            name=row['name'],
            bat_style=bat_style,
            bowl_style=bowl_style,
            field_style=field_style,
            batting_average=row['batting_average'],
            bowling_average=row['bowling_average'],
            economy_rate=row['economy_rate'],
            awards=row['awards'],
            runs=row['runs'],
            sixes=row['sixes'],
            fours=row['fours'],
            strike_rate=row['strike_rate'],
            importance=row['importance'],
            wickets=row['wickets'],
            postenbat=position_tensor_batting,
            postenbol=position_tensor_bowling,
            batting_innings=row['batting_innings'],
            bowling_innings=row['bowling_innings'],
            role=row['role']
        )
    
    return squad


def create_player(df, player):
    # Get matching rows and validate uniqueness
    player_matches = df[df["name"] == player]
    if len(player_matches) != 1:
        raise ValueError(f"Expected 1 match for player '{player}', found {len(player_matches)}")
    
    row = player_matches.iloc[0]  # Explicit single row selection
    
    # Style conversions
    bowl_style = style_tokenizer(row['bowl_style'])
    field_style = 1 if row['field_style'] == 'wicketkeeper' else 0
    bat_style = 2 if row['bat_style'] == 'left-hand bat' else 1

    # Performance indicators with scalar checks
    batting_innings = row['batting_innings']
    bowling_innings = row['bowling_innings']
    
    bpi = 0 if not batting_innings else (row['fours'] + row['sixes']) / batting_innings
    rpi = 0 if not batting_innings else row['runs'] / batting_innings
    wpi = 0 if not bowling_innings else row['wickets'] / bowling_innings

    # Tensor construction
    additional_tensor = torch.tensor([bpi, rpi, wpi], dtype=torch.float32)
    selected_tensor = torch.tensor([
            bat_style,
            bowl_style,
            field_style,
            row['batting_average'],
            row['strike_rate'],
            row['bowling_average'],
            row['economy_rate']
        ], dtype=torch.float32)
    position_tensor_batting = torch.tensor(
            [row.get(f'{pos+1}st position batting', 0.0) for pos in range(11)],
            dtype=torch.float32
        )
        
    position_tensor_bowling = torch.tensor(
        [row.get(f'{pos+1}st position bowling', 0.0) for pos in range(11)],
        dtype=torch.float32
    )

    player = xPlayer(
        tensor=torch.cat((selected_tensor, additional_tensor)),
        name=row['name'],
        bat_style=bat_style,
        bowl_style=bowl_style,
        field_style=field_style,
        batting_average=row['batting_average'],
        bowling_average=row['bowling_average'],
        economy_rate=row['economy_rate'],
        awards=row['awards'],
        runs=row['runs'],
        sixes=row['sixes'],
        fours=row['fours'],
        strike_rate=row['strike_rate'],
        importance=row['importance'],
        wickets=row['wickets'],
        postenbat=position_tensor_batting,
        postenbol=position_tensor_bowling,
        batting_innings=row['batting_innings'],
        bowling_innings=row['bowling_innings'],
        role=row['role']
    )
    return player


def normalize_awards(player_awards, min_awards=0, max_awards=43):
    normalized_score = (player_awards - min_awards) / (max_awards - min_awards + 1e-6)
    return normalized_score

def relatability_score(newplyr, player):  # this will be done with respect to every player in that squad, this is only comparing the player to the players in the squad
    score = position_score(player2_bataverages=newplyr.postenbat, player1_bataverages=player.postenbat,
                            player2_bowlaverages=newplyr.postenbol, player1_bowlaverages=player.postenbol,
                            role1=newplyr.role,role2=player.role)
    relatibility = feature_similarity(newplyr.tensor, player.tensor)
    score += relatibility
    try:
        score += normalize_awards(newplyr.awards)*0.4
    except Exception:
        pass
    try:
        score += newplyr.importance
    except:
        pass
    return score

def price_predictor(plyr, df=pricesdf):
    player_df = df[df['Player'] == plyr.name]
    predicted_amount = 5_000_000  # Default value
    
    if not player_df.empty:  # Correct empty check
        predicted_amount = player_df['Predicted Amount'].iloc[0] 
    
    return predicted_amount


def calculate_budget(relatibility: float, predicted_price: float):
    final_budget = 0  # Avoid naming conflict
    if relatibility > 2.22222222:
        final_budget = predicted_price + 50000000
    else:
        final_budget = predicted_price + 10000000
    return final_budget

def find_closest_player(isquad,newplyr):
    scores = {}
    for name,pobject in isquad.items():
        scores[name] = relatability_score(player = pobject,newplyr=newplyr)
    max_key = max(scores, key=scores.get)
    return isquad[max_key]

def calculate_reward(price, relatibility, budget):
    score = 0  # Changed 'reward' to 'score' inside the function
    if price < budget:
        score += 5
    else:
        score -= 5
    if relatibility > 2.22222222:
        score += 10
    else:
        score -= 3
    return score

def skip_reward(relatibility,price,budget):
    if relatibility < 2:
        return +5
    if price < budget:
        return -5

def loot_rewards(squad):
    reward = 0
    if squad.wks == 0:
        reward -= 11
    elif 4 > squad.wks > 2:
        reward += 11
    if squad.overseas > 8:
        reward -= 11
    return reward

# def retention_function(retentions,isquad,retentionsdf):

#     for player in retentions:
#         if player not in retentionsdf['name'].values:
#             # stats_taking(player, 0)
#             pass


# import pandas as pd

# # Load the existing CSV
# csv_path = "your_file.csv"
# df = pd.read_csv(csv_path)

# # Define the new row as a dictionary (only specifying available columns)
# new_row = {
#     "Name": "Steve Smith",
#     "Country": "Australia",
#     "Specialism": "Batsman",
#     "Price": 2000000
# }

# # Convert to DataFrame and align columns, filling missing values with 0
# new_row_df = pd.DataFrame([new_row])
# new_row_df = new_row_df.reindex(columns=df.columns, fill_value=0)

# # Append the new row and save
# df = pd.concat([df, new_row_df], ignore_index=True)
# df.to_csv(csv_path, index=False)

# data = []



# def stats_taking(player, i):
#     while len(data) <= i:
#         data.append({})
#     data[i]['name'] = player.name.title()
#     data[i]['role'] = player.role
#     driver = webdriver.Chrome(options=options)
#     options.add_argument('--headless')
#     driver.get('https://stats.espncricinfo.com/ci/engine/stats/index.html')
#     driver.maximize_window()
#     search_box = driver.find_element(By.NAME, "search")
#     search_query = player.name
#     search_box.send_keys(search_query.strip())
#     search_box.send_keys(Keys.RETURN)
#     link = driver.find_element(By.XPATH, "//a[starts-with(text(), 'Players and Officials')]")
#     link.click()
#     WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "gurusearch_player")))
#     table = driver.find_element(By.ID, "gurusearch_player")
#     max_matches = 0
#     link_to_click = None
#     rows = table.find_elements(By.XPATH, ".//table/tbody/tr[@valign='top']")
#     for row in rows:
#         try:
#             match_links = row.find_elements(By.XPATH, ".//td[3]/a[contains(text(), 'Twenty20 matches player')]")
            
#             for link in match_links:
#                 parent_text = link.find_element(By.XPATH, "./..").text
#                 match = re.search(r"(\d+) matches", parent_text)
                
#                 if match:
#                     matches_count = int(match.group(1))
#                     if matches_count > max_matches:
#                         max_matches = matches_count
#                         link_to_click = link
#         except Exception as e:
#             print(f"Error processing row: {e}")
#             continue
#     try:
#         link_to_click.click()
#     except Exception as e:
#         return
#     menu_url = driver.current_url
#     player_info = driver.find_element(By.XPATH, "//p[@style='padding-bottom:10px']").text
#     try:
#         details = player_info.split(' - ')[1].strip()
#         styles = details.split('; ')  # Split into batting, bowling, and other styles
#         print(f"Extracted Details: {styles}")
#         for detail in styles:
#             if "bat" in detail:  # Detect batting style
#                 batting_style = detail
#                 data[i]['bat_style'] = batting_style
#                 print(f"Batting Style: {batting_style}")
#             elif "arm" in detail or "break" in detail:  # Detect bowling style
#                 bowling_style = detail
#                 data[i]['bowl_style'] = bowling_style
#                 print(f"Bowling Style: {bowling_style}")
#             elif "wicketkeeper" in detail:  # Detect fielding role
#                 fielding_style = "wicketkeeper"
#                 data[i]['field_style'] = 1
#                 print(f"Fielding Style: {fielding_style}")
#     except IndexError:
#         pass
#     radio_button = driver.find_element(By.XPATH, "//input[@type='radio' and @value='cumulative']")
#     radio_button.click()
#     radio_button = driver.find_element(By.XPATH, "//input[@type='radio' and @value='awards_match']")
#     radio_button.click()
#     submit_button = driver.find_element(By.XPATH, "//input[@type='submit' and @value='Submit query']")
#     submit_button.click()
#     try:
#         player_of_match_elements = driver.find_elements(By.XPATH, "//td[text()='player of the match']")
#         potm_awards = len(player_of_match_elements)
#         data[i]['awards'] = int(potm_awards)
#         print(f'potm awards {potm_awards}')
#         driver.get(menu_url)
#     except Exception as e:
#         print('No awards found')
#         driver.get(menu_url)
    
#     radio_button = driver.find_element(By.XPATH, "//input[@type='radio' and @value='results']")
#     radio_button.click()
#     submit_button = driver.find_element(By.XPATH, "//input[@type='submit' and @value='Submit query']")
#     submit_button.click()
    
#     try:
#         wins = driver.find_elements(By.XPATH, "//td[text()='won']")
#         losses = driver.find_elements(By.XPATH, "//td[text()='lost']")
#         importance = len(wins) / len(losses)
#         data[i]['importance'] = importance
#         print(f"Importance: {importance}")
#         driver.get(menu_url)
#     except Exception as e:
#         driver.get(menu_url)
#         pass
#     radio_button = driver.find_element(By.XPATH, "//input[@type='radio' and @value='bowling']")
#     radio_button.click()
#     submit_button = driver.find_element(By.XPATH, "//input[@type='submit' and @value='Submit query']")
#     submit_button.click()
#     row = driver.find_element(By.XPATH, "//tr[@class='data1']")
#     cells = row.find_elements(By.TAG_NAME, "td")
#     try:
#         bowling_innings = int(cells[3].text)
#         data[i]['bowling_innings'] = bowling_innings
#     except Exception:
#         pass
#     try:
#         wickets = int(cells[7].text)
#         data[i]['wickets'] = wickets
#     except Exception:
#         pass
#     try:
#         bowling_average = float(cells[9].text)
#         data[i]['bowling_average'] = bowling_average
#     except Exception:
#         pass
#     try:
#         economy = float(cells[10].text)
#         data[i]['economy_rate'] = economy
#     except Exception:
#         pass
#     try:
#         print(f"Wickets: {wickets}, Bowling Average: {bowling_average}, Economy: {economy}")
#     except Exception:
#         pass
#     position_rows = driver.find_elements(By.CLASS_NAME, 'data1')
#     try:
#         for row in position_rows:
#             try:
#                 first_col = row.find_element(By.CSS_SELECTOR, 'td.left').text.strip()
                
#                 # Check if this row is about a position
#                 if 'position' in first_col.lower():
#                     # Get the 8th column (index 7) which contains economy rate
#                     cells = row.find_elements(By.TAG_NAME, 'td')
#                     if len(cells) > 7:
#                         position_avg = cells[7].text.strip()
#                         data[i][f'{first_col} bowling'] = float(position_avg)
#                         print(f'{first_col}: {position_avg}')
#             except:
#                 continue
#     except Exception:
#         pass
#     # driver.get(menu_url)
#     # for stadium, home in zip(stads, homes):
#     #     dropdown = driver.find_element(By.NAME, "ground")
#     #     try:
#     #         select = Select(dropdown)
#     #         select.select_by_visible_text(stadium)
#     #         radio_button = driver.find_element(By.XPATH, "//input[@type='radio' and @value='bowling']")
#     #         radio_button.click()
#     #         try:
#     #             second_tbody = driver.find_elements(By.TAG_NAME, "tbody")[1]  
#     #             row = second_tbody.find_element(By.CLASS_NAME, "data1") 
#     #             value = row.find_elements(By.TAG_NAME, "td")[11].text 
#     #             print(f"{home} economy: {value}")
#     #             data[i][f'{home}_economy'] = float(value)
#     #         except:
#     #             print(f"{home} economy: N/A")
#     #             pass
#     #     except:
#     #         print(f"{home} economy: N/A")
#     #         continue
#     driver.get(menu_url)
#     radio_button = driver.find_element(By.XPATH, "//input[@type='radio' and @value='batting']")
#     radio_button.click()
#     submit_button = driver.find_element(By.XPATH, "//input[@type='submit' and @value='Submit query']")
#     submit_button.click()
#     table_row = driver.find_element(By.CLASS_NAME, "data1")
#     cells = table_row.find_elements(By.TAG_NAME, "td")
#     position_rows = driver.find_elements(By.CLASS_NAME, 'data1')
#     try:
#         for row in position_rows:
#             # Get the text from first column
#             try:
#                 first_col = row.find_element(By.CSS_SELECTOR, 'td.left').text.strip()
                
#                 # Check if this row is about a position
#                 if 'position' in first_col.lower():
#                     # Get the 8th column (index 7) which contains economy rate
#                     cells = row.find_elements(By.TAG_NAME, 'td')
#                     if len(cells) > 7:
#                         position_avg = cells[7].text.strip()
#                         data[i][f'{first_col} batting'] = float(position_avg)
#                         print(f'{first_col}: {position_avg}')
#             except:
#                 continue
#     except Exception:
#         pass
#     cells = table_row.find_elements(By.TAG_NAME, "td")
#     try:
#         runs = int(cells[5].text)
#         data[i]['runs'] = runs
#         print(f'runs: {runs}')
#     except Exception:
#         pass
#     try:
#         batting_average = float(cells[7].text)
#         data[i]['batting_average'] = batting_average
#     except Exception:
#         pass
#     try:
#         batting_innings = int(cells[3].text)
#         data[i]['batting_innings'] = batting_innings
#     except Exception:
#         pass
#     except Exception:
#         pass
#     try:
#         strike_rate = float(cells[9].text)
#         data[i]['strike_rate'] = strike_rate
#     except Exception:
#         pass
#     try:
#         fours = int(cells[13].text)
#         data[i]['fours'] = fours
#     except:
#         pass
#     try:
#         sixes = int(cells[14].text)
#         data[i]['sixes'] = sixes
#     except:
#         pass
#     try:
#         print(f"Runs: {runs}, Batting Average: {batting_average}, Strike Rate: {strike_rate}")
#     except:
#         pass
#     driver.get(menu_url)
#     # for stadium, home in zip(stads, homes):
#     #     dropdown = driver.find_element(By.NAME, "ground")
#     #     select = Select(dropdown)
#     #     try:
#     #         select.select_by_visible_text(stadium)
#     #         radio_button = driver.find_element(By.XPATH, "//input[@type='radio' and @value='batting']")
#     #         radio_button.click()
#     #         submit_button = driver.find_element(By.XPATH, "//input[@type='submit' and @value='Submit query']")
#     #         second_tbody = driver.find_elements(By.TAG_NAME, "tbody")[1]  
#     #         row = second_tbody.find_element(By.CLASS_NAME, "data1")
#     #         value = row.find_elements(By.TAG_NAME, "td")[5].text
#     #         print(f"{home} average: {value}")
#     #         data[i][f'{home}_average'] = value
#     #     except:
#     #         print(f"{home} average: N/A")
#     #         pass
#     #     driver.get(menu_url)
#     driver.quit()


