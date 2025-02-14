# Local AI Desktop

Local AI Desktop is a fully offline and local AI chat application using [Ollama](https://ollama.ai/) for AI model inference. It provides a simple Electron-based GUI and a backend powered by Express.js to communicate with locally hosted AI models.

## Features

- **Offline & Local**: Runs entirely on your machine without an internet connection (no data collection from third parties).
- **Modular AI Backend**: Easily switch between different models.
- **Live Streaming Responses**: Words appear in real-time as they are generated.
- **Cross-Platform**: Works on Linux and Windows (in the future).
- **Electron UI**: Native-like experience with a simple chat interface.

## Installation

### Prerequisites
Make sure you have the following installed:

- **Node.js** (v18+ recommended)
- **npm** (or yarn/pnpm I haven't tested it though)
- **Ollama** ([Installation Guide](https://ollama.ai/))
- (Linux only) Install required dependencies:
  ```bash
  sudo apt install -y libwebkit2gtk-4.0-dev libjavascriptcoregtk-4.0-dev libsoup-3.0-dev librsvg2-dev build-essential pkg-config curl wget libssl-dev libgtk-3-dev
  ```

### Clone the Repository
```bash
git clone https://github.com/maliknie/local-ai-desktop.git
cd local-ai-desktop
```

### Install Dependencies
```bash
npm install
```

### Build the files
```bash
npm run build
```

### Start the Backend
```bash
npm run backend
```

### Start the Electron App
```bash
npm start
```

## Usage

1. **Launch Ollama** before running the app (if it's not already running):
   ```bash
   ollama serve
   ```
2. **Build** the files:
   ```bash
   npm run build
   ```
3. **Start the Electron app** and chat with the AI:
   ```bash
   npm start
   ```
4. **Select an AI model** from the dropdown (default: `deepseek-r1:32b`, you'll have to download the desired model via Ollama).
5. **Send messages** and receive responses in real-time.


## API Endpoints

The backend provides the following endpoints:

- `GET /models` - List available AI models.
- `POST /set-model` - Set the active AI model.
- `POST /chat` - Send a message to the AI.

## Troubleshooting

- **AI not responding?** Ensure Ollama is running (`ollama serve`).
- **GPU acceleration issues?** The app will disable GPU if unsupported.
- **Backend not running?** Manually run `npm run backend` before starting the app via `npm start`.

## Roadmap

- [ ] Add conversation history
- [ ] Add windows support
- [ ] UI enhancements

## License
This project is licensed under the MIT License.

## Contributions
Pull requests are welcome! Open an issue if you find a bug or want to suggest an improvement.

