const chatInput = document.getElementById("chat-input") as HTMLTextAreaElement;
const chatOutput = document.getElementById("chat-output") as HTMLDivElement;
const modelSelector = document.getElementById("model-selector") as HTMLSelectElement; // Get dropdown from HTML

interface ModelResponse {
  models: string[];
}

async function fetchModels(): Promise<void> {
  try {
    const response = await fetch("http://localhost:3001/models");
    const data: ModelResponse = await response.json();
    
    if (!data.models || data.models.length === 0) {
      console.error("No models received");
      return;
    }

    modelSelector.innerHTML = ""; // Clear existing options

    data.models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = model;
      modelSelector.appendChild(option);
    });

    console.log("Dropdown populated with models:", data.models);
    if (data.models.length > 0) setModel(data.models[0]); // Select first model by default
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
  }
}

modelSelector.addEventListener("change", () => {
  setModel(modelSelector.value);
});

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
  
    chatOutput.innerHTML += `<p><strong>You:</strong> ${message}</p>`;
    chatInput.value = "";
  
    try {
      const response = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
  
      if (!response.ok || !response.body) {
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
        if (done) return;
  
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
  
        for (const line of lines) {
          if (!line.trim()) continue;
  
          try {
            const parsed = JSON.parse(line.replace(/^data: /, "").trim());
            if (parsed.word) {
              aiResponse += parsed.word + " ";
              aiMessageElement.innerHTML = `<strong>AI:</strong> ${aiResponse}`;
            }
          } catch (error) {
            console.error("Error parsing chunk:", line);
          }
        }
  
        readChunk();
      }
  
      readChunk();
    } catch (error) {
      console.error("Error:", error);
      chatOutput.innerHTML += `<p><strong>AI:</strong> Error contacting AI</p>`;
    }
  }

fetchModels(); // Ensure models are fetched at the start
