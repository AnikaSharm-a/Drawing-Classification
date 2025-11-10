import io
import pickle
import base64
import numpy as np
import cv2 as cv
from PIL import Image
from sklearn.svm import LinearSVC
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from firebase_utils import db


class DrawingClassifierCore:
    def __init__(self, proj_name, class1, class2, class3, persistent=False):
        self.proj_name = proj_name
        self.class1, self.class2, self.class3 = class1, class2, class3
        self.class1_counter, self.class2_counter, self.class3_counter = 0, 0, 0
        self.clf = LinearSVC()
        self.persistent = persistent
        self.models = {}

    def save(self, img: Image.Image, class_num: int):
        """Save uploaded image to Firestore under /projects/{proj}/images."""
        img = img.convert("RGB")
        img.thumbnail((100, 100), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        img_bytes = buf.getvalue()
        img_base64 = base64.b64encode(img_bytes).decode("utf-8")

        class_name = [self.class1, self.class2, self.class3][class_num - 1]
        counter = getattr(self, f"class{class_num}_counter")

        db.collection("projects").document(self.proj_name).collection("images").add({
            "class_num": class_num,
            "class_name": class_name,
            "image": img_base64
        })

        setattr(self, f"class{class_num}_counter", counter + 1)
        db.collection("projects").document(self.proj_name).update({
            f"class{class_num}_counter": counter + 1
        })

    def train_model(self):
        """Train using stored Base64 images."""
        img_list, class_list = [], []

        images_ref = db.collection("projects").document(self.proj_name).collection("images").stream()
        for doc in images_ref:
            data = doc.to_dict()
            class_num = data["class_num"]
            img_base64 = data["image"]
            img_bytes = base64.b64decode(img_base64)
            img = cv.imdecode(np.frombuffer(img_bytes, np.uint8), cv.IMREAD_GRAYSCALE)
            if img is not None:
                img_list.append(img.reshape(10000))
                class_list.append(class_num)

        self.clf.fit(img_list, class_list)
        clf_name = type(self.clf).__name__
        self.models[clf_name] = self.clf
        self._save_all_models_to_firestore()

    def predict(self, img: Image.Image) -> str:
        img = img.convert("RGB")
        img.thumbnail((100, 100), Image.Resampling.LANCZOS)
        arr = np.array(img)[:, :, 0].reshape(10000)
        prediction = self.clf.predict([arr])[0]
        return [self.class1, self.class2, self.class3][prediction - 1]

    def rotate_model(self):
        """Rotate between model types."""
        if isinstance(self.clf, LinearSVC):
            self.clf = KNeighborsClassifier()
        elif isinstance(self.clf, KNeighborsClassifier):
            self.clf = LogisticRegression()
        elif isinstance(self.clf, LogisticRegression):
            self.clf = DecisionTreeClassifier()
        elif isinstance(self.clf, DecisionTreeClassifier):
            self.clf = RandomForestClassifier()
        elif isinstance(self.clf, RandomForestClassifier):
            self.clf = GaussianNB()
        elif isinstance(self.clf, GaussianNB):
            self.clf = LinearSVC()
        return type(self.clf).__name__

    def _save_all_models_to_firestore(self):
        """Save all trained models to Firestore as Base64 pickles."""
        encoded_models = {}
        for name, model in self.models.items():
            buf = io.BytesIO()
            pickle.dump(model, buf)
            encoded_models[name] = base64.b64encode(buf.getvalue()).decode("utf-8")

        db.collection("projects").document(self.proj_name).update({
            "models": encoded_models
        })

    def save_everything(self):
        """Save metadata and models (no more temp migration)."""
        perm_ref = db.collection("projects").document(self.proj_name)
        perm_ref.set({
            "class1": self.class1,
            "class2": self.class2,
            "class3": self.class3,
            "class1_counter": self.class1_counter,
            "class2_counter": self.class2_counter,
            "class3_counter": self.class3_counter,
            "temporary": False
        }, merge=True)

        self._save_all_models_to_firestore()
        self.persistent = True

    @classmethod
    def load_existing(cls, proj_name):
        """Load an existing project and all saved models."""
        project_doc = db.collection("projects").document(proj_name).get()
        if not project_doc.exists:
            return None

        data = project_doc.to_dict()
        instance = cls(proj_name, data["class1"], data["class2"], data["class3"], persistent=True)
        instance.class1_counter = data.get("class1_counter", 1)
        instance.class2_counter = data.get("class2_counter", 1)
        instance.class3_counter = data.get("class3_counter", 1)

        models_dict = data.get("models", {})
        instance.models = {}
        for name, model_b64 in models_dict.items():
            model_bytes = base64.b64decode(model_b64)
            instance.models[name] = pickle.loads(model_bytes)

        if "LinearSVC" in instance.models:
            instance.clf = instance.models["LinearSVC"]
        elif instance.models:
            instance.clf = next(iter(instance.models.values()))

        return instance
