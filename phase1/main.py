import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from phase1.inssurance_map import build_commune_stats

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/process-insurance")
def process_data():

    FILE_URL = "https://nexoria-vq48.onrender.com/assurance.csv"
    
    try:
        
        stats_gdf = build_commune_stats(FILE_URL)
        
        # Convert GeoDataFrame to a JSON-serializable list of dictionaries
    
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
    
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)