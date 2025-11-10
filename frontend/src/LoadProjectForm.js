import React, { useState } from "react";
import { apiFetch } from "./api";

function LoadProjectForm({ onLoad, onBack }) {
  const [projectName, setProjectName] = useState("");
  const [class1, setClass1] = useState("");
  const [class2, setClass2] = useState("");
  const [class3, setClass3] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleLoad = async () => {
    if (!projectName) {
      setError("Please enter a project name.");
      return;
    }

    setChecking(true);
    setError("");

    let formData = new FormData();
    formData.append("project_name", projectName);
    if (class1 && class2 && class3) {
      formData.append("class1", class1);
      formData.append("class2", class2);
      formData.append("class3", class3);
    }

    try {
      const res = await apiFetch("/load-model/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setChecking(false);

      if (data.error) {
        setError(data.error);
        return;
      }

      onLoad(data.project); // project info returned from backend
    } catch (err) {
      setError("Failed to load project.");
      setChecking(false);
    }
  };

  return (
    <div>
      <h2>Load Existing Project</h2>
      <label>
        Project Name:
        <input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
      </label>
      <br />
      <p>Optional: Fill all class names to validate against saved classes</p>
      <label>
        Class 1:
        <input value={class1} onChange={(e) => setClass1(e.target.value)} />
      </label>
      <br />
      <label>
        Class 2:
        <input value={class2} onChange={(e) => setClass2(e.target.value)} />
      </label>
      <br />
      <label>
        Class 3:
        <input value={class3} onChange={(e) => setClass3(e.target.value)} />
      </label>
      <br />
      <button onClick={handleLoad} disabled={checking}>
        {checking ? "Checking..." : "Load Project"}
      </button>
      <button onClick={onBack} style={{ marginLeft: "10px" }}>
        Back
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default LoadProjectForm;
