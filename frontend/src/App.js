import logo from './logo.svg';
import './App.css';
import DrawingCanvas from './DrawingCanvas';
import SetupForm from "./SetupForm.js";
import { useState } from "react";

function App() {
  const [project, setProject] = useState(null);

  return (
    <div className="App">
      {/* <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header> */}
      <h1>Drawing Classifier</h1>
      {!project ? (
        <SetupForm onSetup={setProject} />
      ) : (
        <DrawingCanvas project={project} />
      )}    
    </div>
  );
}

export default App;
