# test_build_commune_stats.py

from inssurance_map import build_commune_stats

# local csv file path
csv_file = "../DATA/CATNAT_2023_2025.xlsx - 2023.csv"

# run function
commune_stats = build_commune_stats(csv_file)

# print first rows
print(commune_stats.head())

# print columns
print(commune_stats.columns)

# print one commune example
print(commune_stats.iloc[0])