import base64
from fastapi import FastAPI, Form
from classifier import DrawingClassifierCore
from PIL import Image
import io
from fastapi.middleware.cors import CORSMiddleware
from sklearn.exceptions import NotFittedError
from firebase_utils import db

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
    class3: str = Form(...),
    persistent: bool = Form(False)
):
    """Initialize a new project, marking it temporary if not saved permanently."""
    global clf

    project_ref = db.collection("projects").document(project_name)
    if project_ref.get().exists:
        return {"error": "Project with this name already exists. Please choose a different name."}

    clf = DrawingClassifierCore(project_name, class1, class2, class3, persistent=persistent)

    project_ref.set({
        "class1": class1,
        "class2": class2,
        "class3": class3,
        "class1_counter": 0,
        "class2_counter": 0,
        "class3_counter": 0,
        "models": {},
        "temporary": not persistent  # ✅ use flag instead of separate collection
    })

    return {"message": "Project initialized", "classNames": [class1, class2, class3]}


@app.get("/check-project-name/")
def check_project_name(project_name: str):
    exists_in_projects = db.collection("projects").document(project_name).get().exists
    return {"exists": exists_in_projects}


@app.post("/save/")
async def save_image(
    image_base64: str = Form(...),
    class_num: int = Form(...),
    project_name: str = Form(...)
):
    """Save an image (Base64) to Firestore under this project's images subcollection."""
    global clf
    try:
        header, encoded = image_base64.split(",", 1)
        img_bytes = base64.b64decode(encoded)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        clf.save(img, class_num)
        return {"message": f"Image saved for class {class_num}"}
    except Exception as e:
        return {"error": f"Failed to save image: {str(e)}"}


@app.post("/train/")
async def train():
    """Train the active model."""
    try:
        if clf.class1_counter < 2 or clf.class2_counter < 2 or clf.class3_counter < 2:
            return {"error": "Each class must have at least two images before training."}

        clf.train_model()
        return {"message": "Model trained successfully."}
    except Exception as e:
        return {"error": f"Training failed: {str(e)}"}


@app.post("/predict/")
async def predict(image_base64: str = Form(...), project_name: str = Form(...)):
    global clf
    try:
        header, encoded = image_base64.split(",", 1)
        img_bytes = base64.b64decode(encoded)
        img = Image.open(io.BytesIO(img_bytes)).convert("L")
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
async def save_model():
    clf.save_model()
    return {"message": "Model saved to Firebase."}


@app.post("/load-model/")
async def load_model(
    project_name: str = Form(...),
    class1: str = Form(None),
    class2: str = Form(None),
    class3: str = Form(None)
    ):
    global clf
    clf = DrawingClassifierCore.load_existing(project_name)
    if not clf:
        return {"error": f"No project found with name '{project_name}'."}

    # Validate class names if provided
    if class1 and class2 and class3:
        if [class1, class2, class3] != [clf.class1, clf.class2, clf.class3]:
            return {"error": "Provided class names do not match saved project classes."}

    return {
        "message": f"Project '{project_name}' loaded successfully.",
        "project": {
            "name": project_name,
            "classes": [clf.class1, clf.class2, clf.class3],
            "persistent": clf.persistent
        }
    }

@app.post("/save-all/")
async def save_all():
    """Mark the project as permanent and persist all models/images."""
    global clf
    clf.save_everything()

    project_ref = db.collection("projects").document(clf.proj_name)
    project_ref.update({"temporary": False})  # ✅ flag as permanent
    return {"message": f"Project '{clf.proj_name}' permanently saved to Firebase."}


@app.post("/discard-project/")
async def discard_project(project_name: str = Form(...)):
    """Deletes all data for a temporary project."""
    try:
        project_ref = db.collection("projects").document(project_name)
        project_doc = project_ref.get()
        if not project_doc.exists:
            return {"error": "Project not found."}

        data = project_doc.to_dict()
        if not data.get("temporary", False):
            return {"error": f"Cannot discard a permanent project '{project_name}'."}

        # Delete all images
        images_ref = project_ref.collection("images").stream()
        deleted_count = 0
        for doc in images_ref:
            doc.reference.delete()
            deleted_count += 1

        # Delete project itself
        project_ref.delete()
        return {"message": f"Temporary project '{project_name}' discarded. {deleted_count} images deleted."}
    except Exception as e:
        return {"error": f"Failed to discard project: {str(e)}"}
