import './App.css';
import SetupForm from "./SetupForm";
import LoadProjectForm from "./LoadProjectForm";
import DrawingCanvas from './DrawingCanvas';
import { useState } from "react";

function App() {
  const [page, setPage] = useState("home"); // home, new, load, drawing
  const [project, setProject] = useState(null);

  return (
    <div className="App">
      <h1>Drawing Classifier</h1>

      {page === "home" && (
        <div>
          <button onClick={() => setPage("new")}>Create New Project</button>
          <button onClick={() => setPage("load")}>Load Existing Project</button>
        </div>
      )}

      {page === "new" && (
        <SetupForm 
          onSetup={(proj) => { setProject(proj); setPage("drawing"); }} 
          onBack={() => setPage("home")}
        />
      )}

      {page === "load" && (
        <LoadProjectForm
          onLoad={(proj) => { setProject(proj); setPage("drawing"); }}
          onBack={() => setPage("home")}
        />
      )}

      {page === "drawing" && project && (
        <DrawingCanvas 
          project={project} 
          onBack={() => setPage("home")}
        />
      )}
    </div>
  );
}

export default App;
