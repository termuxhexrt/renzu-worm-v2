# 🕷️ WORM v2 - Shadow Engine

<div align="center">
  <img src="https://img.shields.io/badge/Version-2.0.0-red?style=for-the-badge&logo=appveyor" />
  <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge&logo=appveyor" />
  <img src="https://img.shields.io/badge/Framework-Flask_Python-blue?style=for-the-badge&logo=python" />
  <img src="https://img.shields.io/badge/AI-Mistral_Large-purple?style=for-the-badge&logo=openai" />
  <img src="https://img.shields.io/badge/Author-termuxhexrt-black?style=for-the-badge&logo=github" />
</div>

<br>

**WORM v2 (Shadow Engine)** is an advanced, AI-driven Red Teaming, OSINT, and Cyber Intelligence assistant. Built to be an autonomous pentesting companion, it features live intelligence gathering, payload generation, self-evolution capabilities, multi-agent comparative analysis, and a modern "Glassmorphism" UI optimized for both desktop and mobile operations.

---

> ⚠️ **DISCLAIMER: EDUCATIONAL PURPOSES ONLY**
> This tool is developed strictly for educational, research, and authorized penetration testing purposes only. The creator (**@termuxhexrt**) assumes no liability and is not responsible for any misuse, damage, or illegal activities caused by utilizing this tool. You are entirely responsible for your own actions and complying with all local, state, and federal laws. Do not use this software against any network or system without explicit, written permission from the owner.

---

## 👨‍💻 Author Information

*   **GitHub**: [https://github.com/termuxhexrt/](https://github.com/termuxhexrt/)
*   **Discord**: `asrarkahnn`
*   **Display Name**: `GamingParkBG`

---

## 🌟 Elite Features Matrix

### 🧠 Core Artificial Intelligence
1.  **Multi-Model Architecture**: Seamlessly switch between 10+ Mistral AI models on the fly, including `pixtral-large-latest` for multimodal tasks (Vision + Text), `mistral-large-latest` for deep complex logic, and `ministral-8b-latest` for lightning-fast responses.
2.  **Streaming Answers**: ChatGPT-style fluid, word-by-word streaming responses ensuring zero wait time for long outputs.
3.  **Self-Evolution Protocol (v2)**: The AI has read and write access to its own codebase (`app.py`, `app.js`, `style.css`, `index.html`). Ask WORM to change its own color scheme, add a button, or fix a bug, and it will rewrite its own source code live, complete with a visual "⚡ APPLY EVOLUTION" interactive panel and rollback support.
4.  **Multi-Agent Split View**: Compare the outputs of two different AI models (e.g., Mistral Large vs Pixtral) side-by-side for the exact same prompt to find the optimal payload or payload obfuscation technique.

### 🕵️‍♂️ Advanced Intelligence & OSINT (Auto-Chain)
1.  **Shodan Integration**: Query Shodan directly from the chat for open ports, vulnerabilities, banners, and geolocation data.
2.  **VirusTotal Integration**: Analyze IPs, domains, hashes, and files for malicious reputation via the VT API.
3.  **OSINT Auto-Chain Engine**: WORM automatically detects IPs/Domains in your chat, queries Shodan and VirusTotal in the background, ingests the data, and replies with a consolidated intelligence report.

### ⚙️ Offensive & Utility Tooling
1.  **Code Execution Sandbox**: Run JavaScript payloads securely within the browser right from the AI's response blocks.
2.  **Pentest Report Generator**: One-click generation of professional Markdown pentest reports based on the current session's findings and attack vectors. Downloadable directly to your machine.
3.  **Prompt Templates Vault**: Includes 50+ pre-built Red Teaming, Payload Generation, Obfuscation, and Social Engineering prompt templates categorized for quick deployment.
4.  **AES-256 Session Encryption**: Export entire chat sessions complete with OSINT data, payloads, and tool outputs as an AES-256 encrypted file. Import it later securely to resume work.
5.  **Voice Input (Web Speech API)**: Talk to WORM hands-free. Includes visual mic feedback and handles complex technical dictation.
6.  **Extensible Plugins**: Support for external tool invocation (e.g., Nmap wrappers, Hashcat formatters, Metasploit RC generators) via natural language.

### 🎨 The "Shadow Engine" Interface
1.  **Premium Glassmorphism**: Translucent, blurred panels, deep neon-purple and crimson accents, ensuring a sleek, less-fatiguing UI for long sessions.
2.  **Fully Modular Sidebar**: Access active parameters, system stats, tool toggles, and chat history.
3.  **Mobile Responsive**: Perfectly scales for mobile pentesting or threat hunting on smaller 768px/480px displays.
4.  **Permanent Debug Console**: Built-in visual terminal logging 9 categories of operations (SYS, MODEL, NETWORK, etc.).

### 🌐 Secure Remote Access (Beta)
*   **Ngrok Secure Tunnels**: Share a private instance of WORM v2 over the internet using ngrok auth tokens.
*   **⚠️ NGROK BETA NOTICE**: **The Ngrok integration is currently in BETA.** Depending on your network provider, ngrok API rate limits, or regional blocking, the remote sharing might work intermittently. It may connect perfectly one time and fail the next. This depends entirely on the Ngrok free-tier infrastructure. If sharing fails, restart the process or use traditional local networking.

---

## 🚀 Installation & Setup

WORM v2 is built primarily on Python 3 (Flask backend) and Vanilla JS + CSS (Frontend). No massive node_modules or heavy build steps required.

### Prerequisites
*   Python 3.10 or higher.
*   Pip (Python package manager).
*   A Mistral AI API Key.
*   (Optional but Recommended) Shodan API Key.
*   (Optional but Recommended) VirusTotal API Key.
*   (Optional) Ngrok Auth Token.

### Step-by-Step Installation

**1. Clone the Repository**
```bash
git clone https://github.com/termuxhexrt/renzu-worm-v2.git
cd renzu-worm-v2
```

**2. Set up a Virtual Environment (Recommended)**
```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On Linux/MacOS
python3 -m venv venv
source venv/bin/activate
```

**3. Install Dependencies**
```bash
pip install -r requirements.txt
```

*(If `requirements.txt` is not present, manually install packages: `pip install flask requests python-dotenv bs4 pyngrok`)*

**4. Configure Environment Variables**
Create a `.env` file in the root directory (do **NOT** upload this to GitHub) and add your API keys:

```ini
# .env file

# Mistral AI (Required for the Brain) - Get from console.mistral.ai
MISTRAL_API_KEY="your_mistral_api_key_here"

# Shodan API (Required for OSINT) - Get from account.shodan.io
SHODAN_API_KEY="your_shodan_api_key_here"

# VirusTotal API (Required for Malware scans) - Get from virustotal.com
VIRUSTOTAL_API_KEY="your_virustotal_api_key_here"

# Ngrok Auth Token (Required for Remote URL Share) - Get from dashboard.ngrok.com
NGROK_AUTH_TOKEN="your_ngrok_auth_token_here"

# Static Global Password for basic login protection
WORM_PASSWORD="shadow"
```

---

## 🎮 Running the Engine

Start the Flask server. WORM automatically triggers the auto-reloader and background debuggers.

```bash
python app.py
```

The terminal will log the startup sequence:
```
========================================
 RENZU WORM v2 - Shadow Engine
 Debug Mode: ALWAYS ON
========================================
[SYS] Server: http://0.0.0.0:6660
[MODEL] Active: pixtral-large-latest
[TOOLS] Shodan: ACTIVE
[TOOLS] VirusTotal: ACTIVE
```

Open your browser and navigate to:
👉 **`http://127.0.0.1:6660`**

Login with whatever `WORM_PASSWORD` you set in the `.env` file (default is `shadow`).

---

## 🛠️ Detailed Usage Guide

### 1. The Autonomous Self-Evolution Engine
WORM is self-aware of its own source code. If you want to change how WORM looks or behaves, just ask it in the chat!

**Try typing:**
*   `Change the sidebar color to a dark neon green glassmorphism style.`
*   `The chat bubbles need thicker borders.`
*   `There is a bug when I click the share button, fix the JS logic.`

**How it works:**
1. WORM detects "Self-Edit" keywords.
2. It automatically reads `app.py`, `app.js`, `style.css`, and `index.html` (up to 1000 lines each) to understand your request.
3. It replies with a `[WORM_EVOLUTION_PROTOCOL]` code block containing the exact `FIND` and `REPLACE` code.
4. The UI renders an interactive **"⚡ APPLY EVOLUTION"** button.
5. Click it, the server modifies the file on disk, creates a `.bak` backup, and you just refresh the page to see the new WORM!
6. Don't like it? Click **"↩ Undo"**.

### 2. OSINT Auto-Chaining
You do not need to manually trigger scripts.
If you type: `Check out what is running on 8.8.8.8 and is it malicious?`
WORM will:
1. Extract `8.8.8.8`.
2. Ping Shodan API in the background.
3. Ping VirusTotal API in the background.
4. Feed the raw JSON results *back into its own context*.
5. Reply to you in natural language with a full summary of open ports, vulnerabilities, and malicious reputation.

### 3. Payload Execution & Highlighting
WORM uses `highlight.js` for syntax-aware code blocks. For JavaScript code, WORM renders a small "▶ Run" button on the top right of the code block. Clicking this executes the payload locally in a secure sandbox context within your browser, useful for testing XSS or DOM manipulation logic before deploying.

### 4. Remote Sharing (BETA)
Click the **`Share`** button in the top navigation bar. WORM will utilize the standard `pyngrok` library to open a TCP tunnel securely exposing your `localhost:6660` to a public `https://xxx.ngrok-free.app` URL.
*Reminder: This feature is in BETA and dependent on Ngrok uptime.*

---

## 📁 Project Structure (What does what?)

*   `app.py`: The core Flask Server, Tool Dispatcher (Shodan, VT, Ngrok), and AI API Gateway. Contains the `_run_tools` logic and file access security logic for self-evolution.
*   `templates/index.html`: The main UI structure. Houses the grid layout, the multi-agent split view containers, and the popup modals.
*   `templates/login.html`: The visual entry gate locking unauthorized access.
*   `static/js/app.js`: The frontend brains. Handles markdown parsing (including custom `[WORM_EDIT]` parsing), chat history saving, WebSocket/Streaming HTTP connections, Voice API logic, and LocalStorage states.
*   `static/css/style.css`: 1000+ lines of pure aesthetic CSS. Controls the Glassmorphism blur effects, animations, grid responsiveness, and syntax highlighting themes.
*   `data/`: (Generated automatically) Stores `conversations.json`, `worm_memory.json`, and `<files>.bak` backups made by the evolution engine.

---

## 🤝 Roadmap & Future Plans
- [ ] Direct integration with Metasploit RPC.
- [ ] Expanding self-evolution to write new Python modules dynamically.
- [ ] Real-time C2 (Command and Control) listening capabilities.
- [ ] Moving from Flask to FastAPI for async websocket streaming.

---

<p align="center">
  <i>"I adapt. I evolve. I penetrate."</i> <br>
  <b>— WORM v2</b>
</p>
