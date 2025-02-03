import express, { Application, Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app: Application = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

let selectedModel = "deepseek-r1:32b";
let currentAbortController: AbortController = new AbortController();

interface ModelListResponse {
  models: { name: string }[];
}

interface ChatRequest {
  message: string;
}

interface ChatResponse {
  response: string;
}

app.get("/models", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Fetching models from Ollama...");

    const response = await fetch("http://127.0.0.1:11434/api/tags");
    if (!response.ok) {
      throw new Error(`Ollama API failed with status ${response.status}`);
    }

    interface OllamaModel {
      name: string;
    }
    interface OllamaResponse {
      models: OllamaModel[];
    }

    const data: OllamaResponse = await response.json();
    console.log("Ollama response:", data);

    if (!data.models || !Array.isArray(data.models)) {
      throw new Error("Invalid response format from Ollama");
    }

    const models: string[] = data.models.map((m: OllamaModel) => m.name);
    console.log("Extracted models:", models);

    res.json({ models });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error fetching models:", error.message);
      res.status(500).json({ error: `Failed to get models: ${error.message}` });
    } else {
      console.error("Unknown error:", error);
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
});


app.post("/set-model", (req: Request, res: Response): void => {
  console.log("SETTING MODEL BACKEND");
  const { model }: { model: string } = req.body;
  if (!model) {
    res.status(400).json({ error: "No model provided" });
    console.log("ERROR");
    return;
  }

  selectedModel = model;
  res.json({ success: true, model });
  console.log(selectedModel);
});

app.use(express.json());

app.post("/chat", async (req: Request, res: Response) => {
  console.log("Recieved chat request: ", req.body);
  
  const message = req.body.chatHistory;

  try {
    console.log("Sending request to Ollama...");
    const ollamaURL =  "http://127.0.0.1:11434/api/chat";

    const ollamaResponse = await fetch(ollamaURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: selectedModel, messages: message }),
    });

    console.log("Ollama API response status:", ollamaResponse.status);

    if (!ollamaResponse.ok || !ollamaResponse.body) {
      throw new Error(`Ollama responded with status ${ollamaResponse.status}`);
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    // Stream Ollama's response to the frontend

    let fullResponse = "";

    ollamaResponse.body.on("data", (chunk) => {
      const chunkText = chunk.toString();
      console.log("Received chunk:", chunkText);

      try {
        const jsonData = JSON.parse(chunkText);
        if (jsonData.message && jsonData.message.content) {
          const word = jsonData.message.content;
          fullResponse += word;

          res.write(`data: ${JSON.stringify({ word })}\n\n`);
        }
      } catch (error) {
        console.error("Error parsing JSON chunk:", chunkText);
      }
    });

    ollamaResponse.body.on("end", () => {
      console.log("Ollama response stream ended.");
      res.write(`data: ${JSON.stringify({ done: true, completeResponse: fullResponse })}\n\n`);
      res.end();
    });

    ollamaResponse.body.on("error", (err) => {
      console.error("Error reading Ollama response:", err);
      res.end();
    });

  } catch (error) {
    console.error("Error fetching AI response:", error);
    res.status(500).json({ error: "Failed to fetch AI response" });
  }
    
});

app.post("/generate", async (req: Request, res: Response) => {
  console.log("Received generate request:", req.body);

  const { message } = req.body;
  if (!message) {
    console.error("No message provided");
    res.status(400).json({ error: "No message provided" });
    return;
  }

  try {
    console.log("Sending request to Ollama...");
    const ollamaURL = "http://127.0.0.1:11434/api/generate";

    console.log("Ollama request payload:", JSON.stringify({ model: selectedModel, prompt: message }));

    const ollamaResponse = await fetch(ollamaURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: selectedModel, prompt: message }),
    });

    console.log("Ollama API response status:", ollamaResponse.status);

    if (!ollamaResponse.ok || !ollamaResponse.body) {
      throw new Error(`Ollama responded with status ${ollamaResponse.status}`);
    }

    // Set up response headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Directly stream Ollama's response to the frontend
    ollamaResponse.body.on("data", (chunk) => {
      const chunkText = chunk.toString();
      console.log("Received chunk:", chunkText);

      try {
        const jsonData = JSON.parse(chunkText);
        if (jsonData.response) {
          res.write(`data: ${JSON.stringify({ word: jsonData.response })}\n\n`);
        }
      } catch (error) {
        console.error("Error parsing JSON chunk:", chunkText);
      }
    });

    ollamaResponse.body.on("end", () => {
      console.log("Ollama response stream ended.");
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    });

    ollamaResponse.body.on("error", (err) => {
      console.error("Error reading Ollama response:", err);
      res.end();
    });

  } catch (error) {
    console.error("Error fetching AI response:", error);
    res.status(500).json({ error: "Failed to fetch AI response" });
  }
});

app.post("/stop", async (req: Request, res: Response) => {
  console.log("Received stop request.");

  try {
    const response = await fetch("http://127.0.0.1:11434/api/kill", {
      method: "POST",
    });

    if (response.ok) {
      console.log("Ollama generation stopped successfully.");
      res.json({ success: true, message: "Generation stopped." });
    } else {
      console.error("Failed to stop Ollama generation.");
      res.status(500).json({ success: false, message: "Failed to stop generation." });
    }
  } catch (error) {
    console.error("Error stopping Ollama:", error);
    res.status(500).json({ success: false, message: "Error stopping Ollama." });
  }
});



app.listen(PORT, () => {
  console.log(`Backend running at http:///127.0.0.1:${PORT}`);
});