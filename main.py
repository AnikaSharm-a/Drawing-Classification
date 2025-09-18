from fastapi import FastAPI, UploadFile, Form
from classifier import DrawingClassifierCore
from PIL import Image
import io
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
from sklearn.exceptions import NotFittedError

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clf = None

@app.post("/init-project/")
async def init_project(
    project_name: str = Form(...),
    class1: str = Form(...),
    class2: str = Form(...),
    class3: str = Form(...)
):
    global clf
    clf = DrawingClassifierCore(project_name, class1, class2, class3)
    return {"message": "Project initialized", "classNames": [class1, class2, class3]}

@app.post("/save/")
async def save_image(file: UploadFile, class_num: int = Form(...)):
    contents = await file.read()
    img = Image.open(io.BytesIO(contents))
    clf.save(img, class_num)
    return {"message": f"Image saved for class {class_num}"}

@app.post("/train/")
async def train():
    try:
        # Before training, check that each class has at least 1 image
        if clf.class1_counter <= 2 or clf.class2_counter <= 2 or clf.class3_counter <= 2:
            return {"error": "Each class must have at least two images before training."}

        clf.train_model()
        return {"message": "Model trained successfully."}
    except Exception as e:
        return {"error": f"Training failed: {str(e)}"}

@app.post("/predict/")
async def predict(file: UploadFile):
    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert("L")  # grayscale
        prediction = clf.predict(img)
        return {"prediction": prediction}
    except NotFittedError:
        return {"error": "Train the model first."}
    except Exception as e:
        return {"error": f"Prediction failed: {str(e)}"}

@app.post("/rotate/")
async def rotate():
    model_name = clf.rotate_model()
    return {"model": model_name}

@app.post("/save-model/")
async def save_model(filename: str = Form("model.pkl")):
    clf.save_model(filename)
    return {"message": f"Model saved as {filename}"}

@app.post("/load-model/")
async def load_model(filename: str = Form("model.pkl")):
    clf.load_model(filename)
    return {"message": f"Model {filename} loaded"}

@app.post("/save-everything/")
async def save_everything():
    clf.save_everything()
    return {"message": "Project saved"}
