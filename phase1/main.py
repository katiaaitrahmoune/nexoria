import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from phase1.inssurance_map import build_commune_stats

app = FastAPI()

# Enable CORS for your React/Node frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to your specific domain in production
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/process-insurance")
def process_data():
    # The URL where your daily CSV is hosted
    FILE_URL = "https://nexoria-vq48.onrender.com/assurance.csv"
    
    try:
        # Run your logic (which now handles the download internally)
        stats_gdf = build_commune_stats(FILE_URL)
        
        # Convert GeoDataFrame to a JSON-serializable list of dictionaries
        # We drop the 'geometry' column as it cannot be sent via JSON
        result = stats_gdf.drop(columns='geometry').reset_index().to_dict(orient='records')
        
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    # Render uses the PORT environment variable
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)