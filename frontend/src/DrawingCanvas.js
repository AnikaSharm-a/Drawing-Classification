import React, { useRef, useState, useEffect } from "react";
import ConfirmSaveModal from "./ConfirmSaveModal";
import { apiFetch } from "./api";

function DrawingCanvas({ project, onBack }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [model, setModel] = useState("LinearSVC");
  const [prediction, setPrediction] = useState(null);
  const [hasSaved, setHasSaved] = useState(project.persistent || false);
  const [showConfirm, setShowConfirm] = useState(false);
  const projectName = project.name;

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "black";
  }, []);

  // Prompt to save if leaving or reloading
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!hasSaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasSaved]);

  const getCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
  };

  const startDrawing = (e) => {
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const isCanvasBlank = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pixelBuffer = new Uint32Array(
      ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    return !pixelBuffer.some(color => color !== 0);
  };

  const getImageBase64 = () => {
    const canvas = canvasRef.current;
    const offCanvas = document.createElement("canvas");
    offCanvas.width = canvas.width;
    offCanvas.height = canvas.height;
    const offCtx = offCanvas.getContext("2d");
    offCtx.fillStyle = "white";
    offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
    offCtx.drawImage(canvas, 0, 0);
    return offCanvas.toDataURL("image/png"); // Base64 string
  };

  const saveImage = async (classNum) => {
    if (isCanvasBlank()) {
      alert("Please draw something before saving.");
      return;
    }
    const base64 = getImageBase64();
    let formData = new URLSearchParams();
    formData.append("image_base64", base64);
    formData.append("class_num", classNum);
    formData.append("project_name", projectName);

    const res = await apiFetch("/save/", { 
      method: "POST", 
      body: formData 
    });

    if (res.ok) {
      clearCanvas();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to save image.");
    }
  };

  const predict = async () => {
    if (isCanvasBlank()) {
      alert("Please draw something before predicting.");
      return;
    }
    const base64 = getImageBase64();
    let formData = new URLSearchParams();
    formData.append("image_base64", base64);
    formData.append("project_name", projectName);

    const res = await apiFetch("/predict/", { 
      method: "POST", 
      body: formData 
    });

    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    setPrediction(data.prediction);
  };

  const trainModel = async () => {
    const res = await apiFetch("/train/", { 
      method: "POST", 
      body: new URLSearchParams({ project_name: projectName }), 
    });
    
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    alert(data.message);
  };

  const cycleModel = async () => {
    const res = await apiFetch("/rotate/", {
      method: "POST",
      body: new URLSearchParams({ project_name: projectName }),
    });
    const data = await res.json();
    setModel(data.model);
    setPrediction(null);
  };

  const saveEverything = async () => {
    const res = await apiFetch("/save-all/", {
      method: "POST",
      body: new URLSearchParams({ project_name: projectName }),
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    alert("Project saved permanently!");
    setHasSaved(true);
  };

  const handleBack = () => {
    if (!hasSaved) {
      setShowConfirm(true);
    } else {
      onBack();
    }
  };

  const handleSaveAndBack = async () => {
    await saveEverything();   
    setShowConfirm(false);    
    onBack();                 
  };

  const handleDontSaveAndBack = async () => {
    await apiFetch("/discard-project/", {
      method: "POST",
      body: new URLSearchParams({ project_name: projectName }),
    });
    setShowConfirm(false);
    onBack();
  };
  
  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <div>
      <button onClick={handleBack} style={{ marginBottom: "10px" }}>
        Back
      </button>
      <h2>Project: {project.name}</h2>
      <h3>Current Model: {model}</h3>
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        style={{
          border: "1px solid black",
          background: "white",
          touchAction: "none", // prevents scrolling while drawing on touch screens
        }}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      />
      <div style={{ marginTop: "10px" }}>
        {project.classes.map((c, i) => (
          <button key={c} onClick={() => saveImage(i + 1)}>
            Save {c}
          </button>
        ))}
        <button onClick={trainModel}>Train</button>
        <button onClick={cycleModel}>Cycle Model</button>
        <button onClick={predict}>Predict</button>
        <button onClick={clearCanvas}>Clear</button>
        {!hasSaved && (
          <button onClick={saveEverything} style={{ background: "green", color: "white" }}>
            Save Everything
          </button>
        )}
      </div>
      {prediction && <h3>Prediction: {prediction}</h3>}
      <ConfirmSaveModal 
        visible={showConfirm}
        onSave={handleSaveAndBack}
        onDontSave={handleDontSaveAndBack}
        onCancel={handleCancel}
      />
    </div>
  );
}

export default DrawingCanvas;
