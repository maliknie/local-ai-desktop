import { app, BrowserWindow, dialog } from "electron";
import path from "path";
import { execSync } from "child_process";

let mainWindow: BrowserWindow | null = null;

function isGPUSupported(): boolean {
  try {
    const result = execSync("glxinfo | grep 'OpenGL renderer'").toString();
    return !result.includes("llvmpipe"); // `llvmpipe` means no real GPU acceleration
  } catch (error) {
    return false; // If the command fails, assume no GPU
  }
}

let gpuMessage = "✅ GPU acceleration is enabled.";
if (!isGPUSupported()) {
  gpuMessage = "⚠️ GPU is not fully supported. Running in software mode.";
  app.disableHardwareAcceleration();
}

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));

  dialog.showMessageBox({
    type: isGPUSupported() ? "info" : "warning",
    title: "GPU Status",
    message: gpuMessage,
    buttons: ["OK"],
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
