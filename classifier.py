import os
import pickle
import numpy as np
import cv2 as cv
from PIL import Image
from sklearn.svm import LinearSVC
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression


class DrawingClassifierCore:
    def __init__(self, proj_name: str, class1: str, class2: str, class3: str):
        self.proj_name = proj_name
        self.class1, self.class2, self.class3 = class1, class2, class3
        self.class1_counter, self.class2_counter, self.class3_counter = 1, 1, 1
        self.clf = LinearSVC()  # default model

        # create project folder if new
        if not os.path.exists(proj_name):
            os.mkdir(proj_name)
            os.mkdir(os.path.join(proj_name, class1))
            os.mkdir(os.path.join(proj_name, class2))
            os.mkdir(os.path.join(proj_name, class3))

    def save(self, img: Image.Image, class_num: int):
        """Save a drawing image to the proper class folder."""
        img = img.convert("RGB")
        img.thumbnail((100, 100), Image.Resampling.LANCZOS)

        if class_num == 1:
            img.save(f"{self.proj_name}/{self.class1}/{self.class1_counter}.png", "PNG")
            self.class1_counter += 1
        elif class_num == 2:
            img.save(f"{self.proj_name}/{self.class2}/{self.class2_counter}.png", "PNG")
            self.class2_counter += 1
        elif class_num == 3:
            img.save(f"{self.proj_name}/{self.class3}/{self.class3_counter}.png", "PNG")
            self.class3_counter += 1

    def train_model(self):
        img_list = []
        class_list = []

        for x in range(1, self.class1_counter):
            img = cv.imread(f"{self.proj_name}/{self.class1}/{x}.png", cv.IMREAD_GRAYSCALE)
            img_list.append(img.reshape(10000))
            class_list.append(1)

        for x in range(1, self.class2_counter):
            img = cv.imread(f"{self.proj_name}/{self.class2}/{x}.png", cv.IMREAD_GRAYSCALE)
            img_list.append(img.reshape(10000))
            class_list.append(2)

        for x in range(1, self.class3_counter):
            img = cv.imread(f"{self.proj_name}/{self.class3}/{x}.png", cv.IMREAD_GRAYSCALE)
            img_list.append(img.reshape(10000))
            class_list.append(3)

        self.clf.fit(img_list, class_list)

    def predict(self, img: Image.Image) -> str:
        img = img.convert("RGB")
        img.thumbnail((100, 100), Image.Resampling.LANCZOS)
        arr = np.array(img)[:, :, 0].reshape(10000)
        prediction = self.clf.predict([arr])

        if prediction[0] == 1:
            return self.class1
        elif prediction[0] == 2:
            return self.class2
        elif prediction[0] == 3:
            return self.class3

    def rotate_model(self):
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

    def save_model(self, filename: str):
        with open(filename, "wb") as f:
            pickle.dump(self.clf, f)

    def load_model(self, filename: str):
        with open(filename, "rb") as f:
            self.clf = pickle.load(f)

    def save_everything(self):
        data = {
            'c1': self.class1,
            'c2': self.class2,
            'c3': self.class3,
            'c1c': self.class1_counter,
            'c2c': self.class2_counter,
            'c3c': self.class3_counter,
            'clf': self.clf,
            'pname': self.proj_name
        }
        with open(f"{self.proj_name}/{self.proj_name}_data.pickle", "wb") as f:
            pickle.dump(data, f)
