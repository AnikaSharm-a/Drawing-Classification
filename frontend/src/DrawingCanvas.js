import React, { useRef, useState, useEffect } from "react";

function DrawingCanvas({ project }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [model, setModel] = useState("LinearSVC");
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";
  }, []);

  const startDrawing = (e) => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
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


    const getImageBlob = () => {
        return new Promise((resolve) => {
            const canvas = canvasRef.current;

            // create offscreen canvas with white background
            const offCanvas = document.createElement("canvas");
            offCanvas.width = canvas.width;
            offCanvas.height = canvas.height;
            const offCtx = offCanvas.getContext("2d");

            // fill white background
            offCtx.fillStyle = "white";
            offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

            // draw the actual canvas on top
            offCtx.drawImage(canvas, 0, 0);

            // convert to blob
            offCanvas.toBlob((blob) => resolve(blob), "image/png");
        });
    };

  const saveImage = async (classNum) => {
    if (isCanvasBlank()) {
        alert("Please draw something before saving.");
        return;
    }
    const blob = await getImageBlob();
    let formData = new FormData();
    formData.append("file", blob, "drawing.png");
    formData.append("class_num", classNum);

    const res = await fetch("http://127.0.0.1:8000/save/", {
        method: "POST",
        body: formData,
    });

    if (res.ok) {
        clearCanvas(); 
    }
  };


  const trainModel = async () => {
    const res = await fetch("http://127.0.0.1:8000/train/", { method: "POST" });
    const data = await res.json();
    if (data.error) {
        alert(data.error);
        return;
    }
    alert(data.message);
  };

  const cycleModel = async () => {
    const res = await fetch("http://127.0.0.1:8000/rotate/", { method: "POST" });
    const data = await res.json();
    setModel(data.model);
    setPrediction(null);
  };

  const predict = async () => {
    if (isCanvasBlank()) {
        alert("Please draw something before predicting.");
        return;
    }
    const blob = await getImageBlob();
    let formData = new FormData();
    formData.append("file", blob, "drawing.png");

    const res = await fetch("http://127.0.0.1:8000/predict/", {
        method: "POST",
        body: formData,
    });
    const data = await res.json();
    if (data.error) {
        alert(data.error);
        return;
    }
    setPrediction(data.prediction);
  };

  return (
    <div>
      <h2>Project: {project.name}</h2>
      <h3>Current Model: {model}</h3>
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        style={{ border: "1px solid black", background: "white" }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
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
      </div>
      {prediction && <h3>Prediction: {prediction}</h3>}
    </div>
  );
}

export default DrawingCanvas;
