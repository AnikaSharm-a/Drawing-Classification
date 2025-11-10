import React, { useState } from "react";
import { apiFetch } from "./api";

function SetupForm({ onSetup, onBack }) {
  const [projectName, setProjectName] = useState("");
  const [class1, setClass1] = useState("");
  const [class2, setClass2] = useState("");
  const [class3, setClass3] = useState("");
  const [persistent, setPersistent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!projectName || !class1 || !class2 || !class3) {
      setError("Please fill all fields.");
      return;
    }

    setChecking(true);
    const checkRes = await apiFetch(`/check-project-name/?project_name=${projectName}`);
    const checkData = await checkRes.json();
    setChecking(false);

    if (checkData.exists) {
      setError("Project already exists! Please choose a different name.");
      return;
    }

    let formData = new FormData();
    formData.append("project_name", projectName);
    formData.append("class1", class1);
    formData.append("class2", class2);
    formData.append("class3", class3);
    formData.append("persistent", persistent);

    const res = await apiFetch("/init-project/", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    onSetup({
      name: projectName,
      classes: data.classNames,
      persistent: persistent,
    });
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label>
          Project Name:
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </label>
        <br />
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
        <label>
          <input
            type="checkbox"
            checked={persistent}
            onChange={(e) => setPersistent(e.target.checked)}
          />
          Save project permanently
        </label>
        <br />
        <button type="submit" disabled={checking}>
          {checking ? "Checking..." : "Start Project"}
        </button>
        <button onClick={onBack} style={{ marginLeft: "10px" }}>
          Back
        </button>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>
    </div>
  );
}

export default SetupForm;
