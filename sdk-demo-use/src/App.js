import React, { useState } from "react";
const StorageSDK = require("sdk-demo-1111");

function App() {
  const [status, setStatus] = useState("");
  const [blobId, setBlobId] = useState("");
  const [uploadedBlobId, setUploadedBlobId] = useState("");
  const storage = new StorageSDK();

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setStatus("Uploading...");
      const result = await storage.storeFile(file, 5);
      console.log(result);
      setUploadedBlobId(result.blobId); // Assuming the API returns blobId
      setStatus("Upload complete! Blob ID: " + result.blobId);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
      console.error(err);
    }
  };

  const handleBlobIdSubmit = async () => {
    if (!blobId.trim()) {
      setStatus("Please enter a Blob ID");
      return;
    }

    try {
      setStatus("Downloading...");
      const data = await fetch(
        `https://aggregator.walrus-testnet.walrus.space/v1/${blobId}`
      );
      await downloadStreamAsFile(data.body, `file-${blobId}`);
      setStatus("Download complete!");
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error(error);
    }
  };

  async function downloadStreamAsFile(stream, suggestedFileName = "download") {
    try {
      const reader = stream.getReader();
      const firstChunk = await reader.read();
      reader.releaseLock();

      const fileType = detectFileType(firstChunk.value);

      const newStream = new ReadableStream({
        start(controller) {
          controller.enqueue(firstChunk.value);
        },
        async pull(controller) {
          const reader = stream.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
          reader.releaseLock();
        },
      });

      const response = new Response(newStream);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${suggestedFileName}${getFileExtension(fileType)}`;

      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      throw error;
    }
  }

  function detectFileType(bytes) {
    const arr = new Uint8Array(bytes);

    if (arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) {
      return "image/jpeg";
    }
    if (
      arr[0] === 0x89 &&
      arr[1] === 0x50 &&
      arr[2] === 0x4e &&
      arr[3] === 0x47
    ) {
      return "image/png";
    }
    if (
      arr[0] === 0x25 &&
      arr[1] === 0x50 &&
      arr[2] === 0x44 &&
      arr[3] === 0x46
    ) {
      return "application/pdf";
    }

    return "application/octet-stream";
  }

  function getFileExtension(mimeType) {
    const extensions = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "application/pdf": ".pdf",
      "application/octet-stream": "",
    };
    return extensions[mimeType] || "";
  }

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Walrus File Storage</h1>

      {/* Upload Section */}
      <div
        style={{
          marginBottom: "30px",
          padding: "20px",
          border: "1px solid #ccc",
          borderRadius: "8px",
        }}
      >
        <h2>Upload File</h2>
        <input
          type="file"
          onChange={handleFileChange}
          style={{ marginBottom: "10px", display: "block" }}
        />
        {uploadedBlobId && (
          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              backgroundColor: "#f0f0f0",
              borderRadius: "4px",
            }}
          >
            Last Uploaded Blob ID: {uploadedBlobId}
          </div>
        )}
      </div>

      {/* Download Section */}
      <div
        style={{
          marginBottom: "30px",
          padding: "20px",
          border: "1px solid #ccc",
          borderRadius: "8px",
        }}
      >
        <h2>Download File</h2>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            type="text"
            value={blobId}
            onChange={(e) => setBlobId(e.target.value)}
            placeholder="Enter Blob ID"
            style={{
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              flexGrow: 1,
            }}
          />
          <button
            onClick={handleBlobIdSubmit}
            style={{
              padding: "8px 16px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Download
          </button>
        </div>
      </div>

      {/* Status Display */}
      {status && (
        <div
          style={{
            padding: "10px",
            backgroundColor: status.includes("Error") ? "#ffebee" : "#e8f5e9",
            borderRadius: "4px",
            marginTop: "20px",
          }}
        >
          {status}
        </div>
      )}
    </div>
  );
}

export default App;
