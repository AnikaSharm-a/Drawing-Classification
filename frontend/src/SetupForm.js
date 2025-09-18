import React, { useState } from "react";

function SetupForm({ onSetup }) {
  const [projectName, setProjectName] = useState("");
  const [class1, setClass1] = useState("");
  const [class2, setClass2] = useState("");
  const [class3, setClass3] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    let formData = new FormData();
    formData.append("project_name", projectName);
    formData.append("class1", class1);
    formData.append("class2", class2);
    formData.append("class3", class3);

    const res = await fetch("http://127.0.0.1:8000/init-project/", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    onSetup({ name: projectName, classes: data.classNames });
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Project Name:
        <input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
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
      <button type="submit">Start Project</button>
    </form>
  );
}

export default SetupForm;
