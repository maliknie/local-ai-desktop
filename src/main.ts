import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "path";
import { execSync, spawn } from "child_process";

let mainWindow: BrowserWindow | null = null;

function isGPUSupported(): boolean {
  try {
    const result = execSync("glxinfo | grep 'OpenGL renderer'").toString();
    return !result.includes("llvmpipe"); // `llvmpipe` means no real GPU acceleration
  } catch (error) {
    return false;
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

function openTerminal() {
  const platform = process.platform;
  let terminalCommand;

  if (platform === "win32") {
    terminalCommand = "cmd.exe";
  } else if (platform === "darwin") {
    terminalCommand = "open -a Terminal";
  } else {
    terminalCommand = "x-terminal-emulator || gnome-terminal || konsole || xfce4-terminal || lxterminal || xterm";
  }

  try {
    spawn(terminalCommand, { shell: true, detached: true, stdio: "ignore" });
    mainWindow?.webContents.send("terminal-response", "Terminal Opened!");
  } catch (error) {
    console.error("Error opening terminal:", error);
    mainWindow?.webContents.send("terminal-response", "Failed to open terminal.");
  }
}

ipcMain.on("open-terminal", () => {
  console.log("✅ Received request to open terminal");
  openTerminal();
});
