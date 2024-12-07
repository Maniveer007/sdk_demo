import React, { useState, useCallback } from "react";
import CryptoJS from "crypto-js";

const SecureFileHandler = () => {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blobId, setBlobId] = useState(""); // Add this to store the blobId

  // Constants for chunk sizes
  const UPLOAD_CHUNK_SIZE = 64 * 1024;
  const PROCESSING_CHUNK_SIZE = 32 * 1024;

  // Utility functions remain the same
  const resetStatus = () => {
    setStatus({ type: "", message: "" });
    setProgress(0);
  };

  const updateStatus = (type, message) => {
    setStatus({ type, message });
  };

  // Helper functions
  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  };

  const chunkArrayBuffer = (arrayBuffer, chunkSize) => {
    const chunks = [];
    const totalChunks = Math.ceil(arrayBuffer.byteLength / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, arrayBuffer.byteLength);
      chunks.push(arrayBuffer.slice(start, end));
    }

    return chunks;
  };

  const arrayBufferToBase64 = async (buffer) => {
    const chunks = chunkArrayBuffer(buffer, PROCESSING_CHUNK_SIZE);
    let base64 = "";

    for (let i = 0; i < chunks.length; i++) {
      const chunk = new Uint8Array(chunks[i]);
      const chunkStr = String.fromCharCode.apply(null, chunk);
      base64 += btoa(chunkStr);

      // Update progress
      setProgress((prev) => Math.min(prev + 100 / chunks.length / 2, 50));
    }

    return base64;
  };

  const detectFileType = (bytes) => {
    if (!bytes || !bytes.length) {
      return "application/octet-stream";
    }

    try {
      if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return "image/jpeg";
      }
      if (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47
      ) {
        return "image/png";
      }
      if (
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46
      ) {
        return "application/pdf";
      }

      // Check if it might be a text file
      const isText = bytes.every(
        (byte) =>
          (byte >= 32 && byte <= 126) || // ASCII printable characters
          byte === 9 || // tab
          byte === 10 || // newline
          byte === 13 // carriage return
      );

      if (isText) {
        return "text/plain";
      }

      return "application/octet-stream";
    } catch (error) {
      console.error("Error detecting file type:", error);
      return "application/octet-stream";
    }
  };

  const getStatusColor = () => {
    const colors = {
      error: "text-red-600",
      success: "text-green-600",
      info: "text-blue-600",
    };
    return colors[status.type] || "";
  };

  // UPLOAD FUNCTION - Handles file reading, encryption, and uploading
  const handleUpload = async () => {
    if (!file || !password) {
      updateStatus("error", "Please select a file and enter a password");
      return;
    }

    setIsProcessing(true);
    resetStatus();

    try {
      // Generate encryption key
      const key = CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);

      // Read file
      updateStatus("info", "Reading file...");
      const fileContent = await readFileAsArrayBuffer(file);

      // Encrypt file
      updateStatus("info", "Encrypting file...");
      const wordArray = CryptoJS.lib.WordArray.create(
        new Uint8Array(fileContent)
      );
      const encrypted = CryptoJS.AES.encrypt(wordArray, key).toString();

      // Upload encrypted file
      updateStatus("info", "Uploading encrypted file...");
      const encryptedBytes = new Uint8Array(
        atob(encrypted)
          .split("")
          .map((char) => char.charCodeAt(0))
      );

      const blob = new Blob([encryptedBytes], {
        type: "application/octet-stream",
      });

      const response = await fetch(
        "https://publisher.walrus-testnet.walrus.space/v1/store?epochs=5",
        {
          method: "PUT",
          body: blob,
          headers: {
            "Content-Type": "application/octet-stream",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      const uploadedBlobId = result.newlyCreated.blobObject.blobId;
      setBlobId(uploadedBlobId); // Store the blobId

      setProgress(100);
      updateStatus(
        "success",
        `File uploaded successfully! Blob ID: ${uploadedBlobId}`
      );
    } catch (error) {
      console.error("Upload failed:", error);
      updateStatus("error", `Upload failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // DOWNLOAD FUNCTION - Handles downloading and decryption
  const handleDownload = async () => {
    if (!blobId || !password) {
      updateStatus("error", "Missing blob ID or password");
      return;
    }

    setIsProcessing(true);
    resetStatus();

    try {
      // Download encrypted file
      updateStatus("info", "Downloading encrypted file...");
      const response = await fetch(
        `https://aggregator.walrus-testnet.walrus.space/v1/${blobId}`
      );

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      // Process downloaded file
      const encryptedData = await response.arrayBuffer();
      const encryptedBase64 = await arrayBufferToBase64(encryptedData);

      // Decrypt file
      updateStatus("info", "Decrypting file...");
      const key = CryptoJS.SHA256("123456").toString(CryptoJS.enc.Hex); // Using fixed key for decryption
      const decrypted = CryptoJS.AES.decrypt(encryptedBase64, key);

      // Process decryption in chunks
      const decryptedBytes = new Uint8Array(decrypted.sigBytes);
      const words = decrypted.words;

      for (let i = 0; i < decrypted.sigBytes; i += PROCESSING_CHUNK_SIZE) {
        const end = Math.min(i + PROCESSING_CHUNK_SIZE, decrypted.sigBytes);
        for (let j = i; j < end; j++) {
          decryptedBytes[j] = (words[j >>> 2] >>> (24 - (j % 4) * 8)) & 0xff;
        }
        setProgress(Math.min(50 + (i / decrypted.sigBytes) * 50, 95));
      }

      // Download decrypted file
      const mimeType = detectFileType(decryptedBytes);
      const blob = new Blob([decryptedBytes], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "DECRYPTED_FILE";
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);

      setProgress(100);
      updateStatus("success", "File downloaded and decrypted successfully!");
    } catch (error) {
      console.error("Download failed:", error);
      updateStatus("error", `Download failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6">Secure File Handler</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select File
          </label>
          <input
            type="file"
            onChange={(e) => {
              setFile(e.target.files[0]);
              resetStatus();
            }}
            className="block w-full text-sm text-gray-500 
                     file:mr-4 file:py-2 file:px-4 
                     file:rounded-md file:border-0 
                     file:text-sm file:font-semibold 
                     file:bg-blue-50 file:text-blue-700 
                     hover:file:bg-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              resetStatus();
            }}
            className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter encryption password"
          />
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleUpload}
            disabled={isProcessing || !file || !password}
            className={`flex-1 py-2 px-4 rounded-md text-white font-medium
                     ${
                       isProcessing
                         ? "bg-gray-400 cursor-not-allowed"
                         : "bg-blue-600 hover:bg-blue-700"
                     }`}
          >
            {isProcessing ? "Processing..." : "Upload"}
          </button>

          <button
            onClick={handleDownload}
            disabled={isProcessing || !blobId || !password}
            className={`flex-1 py-2 px-4 rounded-md text-white font-medium
                     ${
                       isProcessing
                         ? "bg-gray-400 cursor-not-allowed"
                         : "bg-green-600 hover:bg-green-700"
                     }`}
          >
            {isProcessing ? "Processing..." : "Download"}
          </button>
        </div>

        {isProcessing && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2 text-center">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}

        {status.message && (
          <div className={`mt-4 ${getStatusColor()}`}>{status.message}</div>
        )}

        {blobId && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-700">Blob ID:</p>
            <p className="text-sm text-gray-600 break-all">{blobId}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecureFileHandler;
