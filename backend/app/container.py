class Container:
    def __init__(self):
        self.model = None
        self.demo_patients: dict = {}

    async def startup(self):
        self.model = load_model("models/bbinn.pt")
        self.demo_patients = DemoService.load_from_csv("data/processed/...")

container = Container()

# deps.py
def get_prediction_service() -> PredictionService:
    return PredictionService(model=container.model, ...)