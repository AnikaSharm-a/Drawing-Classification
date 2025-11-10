import React from "react";

function ConfirmSaveModal({ visible, onSave, onDontSave, onCancel }) {
  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000
    }}>
      <div style={{ 
        background: "white", padding: "20px", borderRadius: "8px", width: "300px", textAlign: "center"
      }}>
        <p>You have unsaved changes. Do you want to save before leaving?</p>
        <div style={{ marginTop: "15px", display: "flex", justifyContent: "space-between" }}>
          <button onClick={onSave} style={{ background: "green", color: "white" }}>Save</button>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onDontSave} style={{ background: "red", color: "white" }}>Don't Save</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmSaveModal;
