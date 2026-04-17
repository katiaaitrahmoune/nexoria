from fastapi import FastAPI
from inssurance_map import build_commune_stats

app = FastAPI()

# Replace this with your actual working link
DATA_URL = "https://your-server.com/path/to/CATNAT_2023.csv"

@app.get("/api/map-data")
def refresh_and_get_data():
    try:
        # The function now handles the download and processing
        final_data = build_commune_stats.get_commune_stats(DATA_URL)
        return {"status": "success", "data": final_data}
    except Exception as e:
        return {"status": "error", "message": str(e)}