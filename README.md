# AETHER Frontend - Real-Time Location Tracker UI

React + Vite frontend with glassmorphic UI, offline resilience, and integrated pathfinding.

## 🚀 Features

### 🧠 Aether Intelligence Layer

- **Contextual GPS Analysis**: Automatic GPS signal confidence grading (High/Medium/Low)
- **Speed Trend Detection**: Monitors velocity changes (acceleration, deceleration, stable)
- **Connection Heuristics**: Distinguishes between "Live", "Recovering", and "Offline" states

### 📡 Offline Resilience

- **Zero Data Loss**: Buffers location packets locally when offline
- **Auto-Sync**: Automatic sync to server upon reconnection
- **Smart Recovery**: Visual indicators for buffer status

### 🗺️ Integrated Pathfinding

- **OSRM Routing Engine**: Turn-by-turn navigation with distance, ETA, and maneuvers
- **Dynamic Rerouting**: Real-time route updates based on movement
- **Interactive Map**: Leaflet-based with custom markers and polylines

### 📱 Mobile Agent Support

- **QR Code Pairing**: Instant mobile-to-desktop connection
- **Guest Mode**: Mobile devices join as agents by scanning QR code
- **Responsive Design**: Glassmorphic UI adapts to all screen sizes

## 🎨 UI Design

**Visual Style:**

- Glassmorphism with backdrop blur effects
- Hex-Grid Sci-Fi styling
- Neon accents and dynamic gradients
- High-visibility HUD overlays

**Key Components:**

- **PathFinder Module** (`PathFinder.jsx`): Core map and intelligence
- **Control Panel**: Collapsible glass panel with search and agent list
- **HUD Overlay**: Real-time stats (speed, connection, alerts)
- **Navigation Box**: Floating turn-by-turn directions

## 🏗️ Architecture

**Tech Stack:**

- React 18
- Vite (build tool)
- Leaflet + leaflet-routing-machine
- Socket.IO Client
- Tailwind CSS

**Services:**

- `AlertEngine.js` - Processes telemetry into actionable alerts
- `OfflineBuffer.js` - Store-and-forward mechanism for unstable networks

**State Management:**

- React hooks (`useState`, `useRef`, `useEffect`)
- Socket.IO event-driven updates

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

**Required Variables:**

- `VITE_API_URL` - Backend API URL (e.g., `http://localhost:5000`)

### Development

```bash
npm run dev
```

App runs on `http://localhost:5173`

### Build

```bash
npm run build
```

Output in `dist/` directory

## 📦 Deployment

### Render.com (Recommended)

1. Connect GitHub repository
2. **Build Command:** `npm install && npm run build`
3. **Publish Directory:** `dist`
4. **Environment Variable:** `VITE_API_URL=https://your-backend-url`

### Vercel

1. Import repository
2. Framework: Vite
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add env variable: `VITE_API_URL`

## 🎯 Usage

### Local Testing

1. Start backend server first
2. Start frontend dev server
3. Open `http://localhost:5173/pathfinder`
4. Grant location permissions
5. Click "Add New Agent" to generate QR code for mobile

### Mobile Agent Setup

1. Open app on desktop
2. Click "Add New Agent"
3. Scan QR code with mobile device
4. Grant location permissions on mobile
5. Start tracking!

## 📂 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── Home/
│   │       ├── PathFinder.jsx    # Core tracking module
│   │       ├── Home.jsx          # Landing page
│   │       └── RealTimeClock.jsx
│   ├── hooks/
│   │   └── useUserDistances.js   # Distance calculations
│   ├── services/
│   │   ├── AlertEngine.js         # Smart alerts
│   │   └── OfflineBuffer.js       # Offline resilience
│   ├── App.jsx
│   └── main.jsx
├── public/
│   └── favicon.svg
└── vite.config.js
```

## 🔧 Configuration

### Vite Config

- Dev server on port 5173
- Auto-open browser
- Code splitting for vendor, leaflet, socket.io
- Source maps enabled

## 📄 License

GPL-3.0

---

**Part of AETHER V2** - Advanced Entity Tracking & Heuristic Evaluation Resource

**Maintained by:** [NVIAM](https://github.com/NVIAM37)
