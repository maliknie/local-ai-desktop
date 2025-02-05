const chatInput = document.getElementById("chat-input") as HTMLTextAreaElement;
const chatOutput = document.getElementById("chat-output") as HTMLDivElement;
const modelSelector = document.getElementById("model-selector") as HTMLSelectElement;
const stopButton = document.getElementById("stop-button") as HTMLButtonElement;
const openTerminalButton = document.getElementById("open-terminal-btn") as HTMLButtonElement;
const homeButton = document.getElementById("home");
const { ipcRenderer } = require("electron");

if (openTerminalButton) {
  openTerminalButton.addEventListener("click", () => {
      ipcRenderer.send("open-terminal");
  });
}

homeButton?.addEventListener("click", () => {
  window.location.href= "index.html";
});

const chatHistory: {role: string; content: string; images: string | null;}[] = [];

const appState = {
  selectedModel: "deepseek-r1:32b",
  isGenerating: false,
  abortController: new AbortController,

  setModel(model: string) {
      console.log(`Updating model: ${model}`);
      this.selectedModel = model;
  },

  startGenerating() {
      console.log("AI generation started...");
      this.isGenerating = true;
      this.abortController = new AbortController;
  },

  stopGenerating() {
      console.log("AI generation stopped.");
      this.isGenerating = false;
      try {this.abortController.abort();} catch {}
  },

  getAbortControllerSignal() {
      return this.abortController.signal;
  },

  setIsGeneratingFalse() {
      console.log("AI generation stopped.");
      this.isGenerating = false;
  },

  getModel() {
      return this.selectedModel;
  },
};

interface ModelResponse {
  models: string[];
}

function stopGeneration() {
  if (appState.isGenerating) {
    appState.stopGenerating();
    
    fetch("http://127.0.0.1:3001/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    .then(response => response.json())
    .then(data => console.log("Stop request sent:", data))
    .catch(error => console.error("Error stopping generation:", error));
  }
}

async function fetchModels(): Promise<void> {
  console.log("Fetching models...")
  try {
    const response = await fetch("http://localhost:3001/models");
    const data: ModelResponse = await response.json();
    
    if (!data.models || data.models.length === 0) {
      console.error("No models received");
      return;
    }

    modelSelector.innerHTML = ""; 

    data.models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = model;
      modelSelector.appendChild(option);
    });

    console.log("Dropdown populated with models:", data.models);
    if (data.models.length > 0) setModel(data.models[0]);
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

async function setModel(model: string): Promise<void> {
  console.log(`Setting model: ${model}`);
  try {
    await fetch("http://localhost:3001/set-model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    });
  } catch (error) {
    console.error("Error setting model:", error);
    console.log("Error contacting backend");
  }
}

modelSelector.addEventListener("change", () => {
  setModel(modelSelector.value);
});

function escapeHTML(text: string) {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendMessageChat() {
  appState.startGenerating();
  const message = chatInput.value.trim();
  const message_json = {"role": "user", "content": message, images: null};

  chatOutput.innerHTML += `<p><strong>You:</strong> ${message}</p>`;
  chatInput.value = "";

  try {
    chatHistory.push(message_json);
    const response = await fetch ("http://127.0.0.1:3001/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatHistory }),
      signal: appState.getAbortControllerSignal()
    })

    if (!response.ok || !response.body) {
      appState.setIsGeneratingFalse();
      throw new Error("Failed to fetch AI response.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aiResponse = "";
    let aiMessageElement = document.createElement("p");
    aiMessageElement.innerHTML = `<strong>AI:</strong> `;
    chatOutput.appendChild(aiMessageElement);

    async function readChunk() {
      const { done, value } = await reader.read();
      if (done) {
        appState.setIsGeneratingFalse();
        return;}

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const parsed = JSON.parse(line.replace(/^data: /, "").trim());
          if (parsed.word) {
            const safeWord = escapeHTML(parsed.word);
            aiResponse += safeWord + "";
            aiMessageElement.innerHTML = `<strong>AI:</strong> ${aiResponse}`;
          }

          if (parsed.done) {
            appState.setIsGeneratingFalse();
            chatHistory.push({role: "assistant", content: parsed.completeResponse, images: null});
          }
        } catch (error) {
          console.error("Error parsing chunk:", line);
        }
      }

      readChunk();
    }

    readChunk();
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.warn("Fetch request aborted. Cleaning up...");
      return;
    } else {
      console.error("Error:", error);
      chatOutput.innerHTML += `<p><strong>AI:</strong> Error contacting AI</p>`;
    }
    appState.setIsGeneratingFalse();
  }
}

fetchModels();
