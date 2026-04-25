from backend.inference import load_model, _load_demo_patients
from backend.app.services.prediction_service import PredictionService


class Container:
    def __init__(self):
        self.model = None
        self.demo_patients: dict = {}

    async def startup(self):
        self.model = load_model("model/outputs/models/bbinn_model.pt")
        self.demo_patients = _load_demo_patients()


container = Container()


def get_prediction_service() -> PredictionService:
    return PredictionService(model=container.model, demo_patients=container.demo_patients)
