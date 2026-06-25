import time
import random
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from skin_model import predict_skin_disease

app = FastAPI(title="ArogyaSathi AI Screening Backend")

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """Health check endpoint required by ArogyaSathi front-end."""
    return {"status": "healthy"}


@app.post("/predict/skin")
async def predict_skin(image: UploadFile = File(...)):
    """
    Skin classification endpoint (SkinVision-ViT).
    Uses the real Hugging Face model 'LaurianeMD/vit-skin-disease' via PyTorch.
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        img_bytes = await image.read()
        # Call the inference model loader
        result = predict_skin_disease(img_bytes)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
