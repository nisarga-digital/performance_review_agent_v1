from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import review

app = FastAPI(
    title="Performance Review Assistant API",
    description="API for generating performance reviews and answering employee data questions.",
    version="1.0.0",
)

# Allow frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(review.router)


@app.get("/", tags=["root"])
def read_root():
    return {"message": "Performance Review Assistant API is running. Use /api/health to check status."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="[IP_ADDRESS]", port=8000, reload=True)
