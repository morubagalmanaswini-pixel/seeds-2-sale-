from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="FarmDirect Delivery AI")


class VehicleRequest(BaseModel):
    weight_kg: float = Field(ge=0)


class VehicleResponse(BaseModel):
    vehicle: str
    reason: str


@app.post("/recommend-vehicle", response_model=VehicleResponse)
def recommend_vehicle(request: VehicleRequest) -> VehicleResponse:
    if request.weight_kg <= 20:
        return VehicleResponse(vehicle="Bike", reason="Suitable for loads up to 20 kg")
    if request.weight_kg <= 300:
        return VehicleResponse(vehicle="Auto", reason="Suitable for loads from 20 to 300 kg")
    if request.weight_kg <= 1500:
        return VehicleResponse(vehicle="Mini Truck", reason="Suitable for loads from 300 to 1500 kg")
    return VehicleResponse(vehicle="Truck", reason="Suitable for loads above 1500 kg")
