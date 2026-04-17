import os
import json
import pandas as pd
import geopandas as gpd
import requests # Added for downloading
from pathlib import Path

def download_file(url, local_path):
    """Helper to download a file if a URL is provided."""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        with open(local_path, "wb") as f:
            f.write(response.content)
        print(f"✅ Successfully downloaded/updated: {local_path}")
        return local_path
    except Exception as e:
        if os.path.exists(local_path):
            print(f"⚠️ Download failed, using existing local file. Error: {e}")
            return local_path
        else:
            raise Exception(f"❌ Failed to download file and no local cache found: {e}")
BASE_DIR = Path(__file__).resolve().parent
def build_commune_stats(
    insurance_input, # Renamed to represent it could be a URL or Path
    communes_json_path=BASE_DIR /"../DATA/Commune_Of_Algeria.json",
    danger_shapefile_path=BASE_DIR /"../DATA/rpa99_zones_sismiques.shp",
    danger_csv_path=BASE_DIR /"../DATA/rpa99_zones_sismiques.csv",
):
    os.environ["SHAPE_RESTORE_SHX"] = "YES"
    local_csv_path = "latest_insurance_data.csv"

    # -------------------------------------------------
    # 1. Download Logic
    # -------------------------------------------------
    # If the input starts with http, download it first
    if isinstance(insurance_input, str) and insurance_input.startswith(("http://", "https://")):
        insurance_source = download_file(insurance_input, local_csv_path)
    else:
        insurance_source = insurance_input

    # -------------------------------------------------
    # 2. Load insurance CSV
    # -------------------------------------------------
    if isinstance(insurance_source, str):
        insurance_list = pd.read_csv(insurance_source)
    else:
        insurance_list = insurance_source.copy()

    # ... (Rest of your processing logic remains exactly the same) ...
    
    # -------------------------------------------------
    # Load communes JSON
    # -------------------------------------------------
    with open(communes_json_path, "r", encoding="utf-8") as f:
        communes_raw = json.load(f)

    df_communes = pd.DataFrame(communes_raw)
    df_communes["wilaya_id"] = pd.to_numeric(
        df_communes["wilaya_id"], errors="coerce"
    )

    # Keep your cleaning steps
    df_communes = df_communes.drop(columns="ar_name", errors="ignore")

    # -------------------------------------------------
    # Clean insurance columns
    # -------------------------------------------------
    insurance_list["COMMUNE"] = (
        insurance_list["COMMUNE"]
        .astype(str)
        .str.split(" - ")
        .str[1]
    )

    insurance_list["WILAYA"] = (
        insurance_list["WILAYA"]
        .astype(str)
        .str.split(" - ")
        .str[1]
    )

    # -------------------------------------------------
    # Clean commune names
    # -------------------------------------------------
    df_communes["name"] = df_communes["name"].str.upper()
    df_communes = df_communes.rename(columns={"name": "COMMUNE"})

    # -------------------------------------------------
    # Merge insurance + communes
    # -------------------------------------------------
    insurance_merged = pd.merge(
        insurance_list,
        df_communes,
        on="COMMUNE",
        how="inner"
    )

    insurance_merged = insurance_merged.drop(columns="id", errors="ignore")

    # -------------------------------------------------
    # Load danger zones
    # -------------------------------------------------
    danger_zones = gpd.read_file(danger_shapefile_path)
    algerian_communes = pd.read_csv(danger_csv_path)

    danger_zones["WILAYA"] = algerian_communes["Wilaya"]
    danger_zones["Level"] = algerian_communes["Danger_level"]

    danger_zones["WILAYA"] = danger_zones["WILAYA"].str.upper()

    # -------------------------------------------------
    # Merge insurance + danger zones
    # -------------------------------------------------
    insurance_final = pd.merge(
        insurance_list,
        danger_zones,
        on="WILAYA",
        how="inner"
    )

    # -------------------------------------------------
    # Group by commune
    # -------------------------------------------------
    commune_stats = insurance_final.groupby("COMMUNE").agg(
        {
            "NUMERO_POLICE": lambda x: list(x),
            "Level": lambda x: x.mode().iloc[0] if not x.mode().empty else None,
            "geometry": "first",
        }
    ).rename(columns={"NUMERO_POLICE": "POLICE_LIST"})

    # Count buildings
    commune_stats["count"] = commune_stats["POLICE_LIST"].apply(len)

    # Coordinates
    commune_stats["lat"] = commune_stats["geometry"].apply(
        lambda p: p.y if p is not None else None
    )
    commune_stats["lon"] = commune_stats["geometry"].apply(
        lambda p: p.x if p is not None else None
    )

    # Convert to GeoDataFrame
    commune_stats = gpd.GeoDataFrame(
        commune_stats,
        geometry="geometry",
        crs=danger_zones.crs
    )

    return commune_stats