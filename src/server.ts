import express, { Application, Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app: Application = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

let selectedModel = "deepseek-r1:32b";

interface ModelListResponse {
  models: { name: string }[];
}

interface ChatRequest {
  message: string;
}

interface ChatResponse {
  response: string;
}

// Get available models from Ollama
app.get("/models", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Fetching models from Ollama...");

    // Fetch available models from Ollama
    const response = await fetch("http://127.0.0.1:11434/api/tags");
    if (!response.ok) {
      throw new Error(`Ollama API failed with status ${response.status}`);
    }

    // Define the response structure explicitly
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


// Set AI model dynamically
app.post("/set-model", (req: Request, res: Response): void => {
  const { model }: { model: string } = req.body;
  if (!model) {
    res.status(400).json({ error: "No model provided" });
    return;
  }

  selectedModel = model;
  res.json({ success: true, model });
});

// Handle AI chat requests
app.use(express.json());

app.post("/chat", async (req: Request, res: Response) => {
  console.log("Received chat request:", req.body);

  const { message } = req.body;
  if (!message) {
    console.error("No message provided");
    res.status(400).json({ error: "No message provided" });
    return;
  }

  try {
    console.log("Sending request to Ollama...");
    const ollamaURL = "http://127.0.0.1:11434/api/generate";

    console.log("Ollama request payload:", JSON.stringify({ model: "deepseek-r1:32b", prompt: message }));

    const ollamaResponse = await fetch(ollamaURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "deepseek-r1:32b", prompt: message }),
    });

    console.log("Ollama API response status:", ollamaResponse.status);

    if (!ollamaResponse.ok || !ollamaResponse.body) {
      throw new Error(`Ollama responded with status ${ollamaResponse.status}`);
    }

    // Set up response headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // **Directly stream Ollama's response to the frontend**
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

// Start backend
app.listen(PORT, () => {
  console.log(`Backend running at http:///127.0.0.1:${PORT}`);
});
