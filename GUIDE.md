# Micro Car Pooling App — Project Guide

A full-stack institutional car pooling application with a **2-layer security model** (alphanumeric password + 6-digit PIN), real-time GPS tracking via WebSockets, and PostgreSQL/PostGIS geospatial data.

## Project Structure

```
ateeq2/
├── backend/          # Node.js + Express + PostgreSQL/PostGIS + Socket.io
├── mobile/           # React Native CLI (TypeScript)
└── GUIDE.md          # This file
```

---

## How the Project Works

### Architecture

```
┌─────────────────┐     REST + JWT      ┌──────────────────┐
│  React Native   │ ◄──────────────────► │  Express API     │
│  Mobile App     │                      │  (Node.js/TS)    │
└────────┬────────┘                      └────────┬─────────┘
         │                                        │
         │ WebSocket (Socket.io)                    │ SQL
         ▼                                        ▼
┌─────────────────┐                      ┌──────────────────┐
│  Pod GPS Rooms  │ ◄──────────────────► │  PostgreSQL +    │
│  (live tracking)│                      │  PostGIS         │
└─────────────────┘                      └──────────────────┘
```

### Authentication Flow (2-Layer)

1. **Onboarding**
   - User enters an institutional email (domain must be in allowlist)
   - Backend sends a 6-digit OTP (logged to console in development)
   - User verifies OTP → receives a short-lived verified-email token

2. **Security Setup**
   - **Layer 1:** User sets an alphanumeric password (bcrypt hashed)
   - **Layer 2:** User sets a 6-digit security PIN (bcrypt hashed)

3. **Login**
   - **Step 1:** Email + password → partial token (5 min, PIN required)
   - **Step 2:** 6-digit PIN → full JWT (24h session)

JWT is only issued after Layer 2 PIN verification. All protected API routes require the full JWT.

### Real-Time Tracking

- Drivers join a Socket.io room: `pod:{podId}`
- Driver broadcasts GPS via `gps:update` events
- Passengers receive `driver:location` updates on the live map
- A `mockGPS` stub simulates driver movement for testing without a physical device

### SOS Emergency

- Persistent red SOS button appears during active rides
- Sends `POST /rides/:id/sos` and broadcasts `sos:alert` to the pod room

---

## Features Implemented

### Backend
- [x] 2-layer authentication (password + PIN) with bcrypt
- [x] Institutional email domain verification
- [x] OTP email verification flow
- [x] JWT session management (partial + full tokens)
- [x] PostgreSQL schema: Users, Rides, Pods, Pod Members, Geofences, SOS Alerts
- [x] PostGIS geography types for origins, destinations, and geofence polygons
- [x] Socket.io pod rooms for live GPS broadcasting
- [x] REST API for pods, rides, geofences, and SOS

### Mobile (React Native)
- [x] Onboarding with email domain verification
- [x] OTP entry screen
- [x] Security setup (password + PIN)
- [x] Two-step login flow
- [x] Dashboard with upcoming commute pods
- [x] Live map with react-native-maps + WebSocket driver tracking
- [x] SOS emergency button on active rides
- [x] mockGPS stub for driver simulation
- [x] Zustand state management
- [x] Responsive UI on all screens

---

## Environment Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 22.11.0 |
| PostgreSQL | 15+ with PostGIS extension |
| React Native dev environment | [Setup guide](https://reactnative.dev/docs/set-up-your-environment) |
| Android Studio or Xcode | For running the mobile app |

### PostgreSQL + PostGIS Setup

1. Install PostgreSQL and enable PostGIS:
   ```sql
   CREATE DATABASE carpool;
   \c carpool
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

2. Update `backend/.env` with your connection string:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/carpool
   ```

### Backend Environment (`backend/.env`)

Copy from example:
```bash
cd backend
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `PORT` | API server port (default: 3000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for full JWT tokens |
| `JWT_PARTIAL_SECRET` | Secret for partial login tokens |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated allowed domains |
| `OTP_EXPIRY_MINUTES` | OTP validity period |
| `CORS_ORIGIN` | CORS allowed origin |

### Mobile Environment (`mobile/.env`)

Copy from example:
```bash
cd mobile
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `API_BASE_URL` | Backend REST URL (`http://10.0.2.2:3000` for Android emulator) |
| `SOCKET_URL` | Backend WebSocket URL |
| `ALLOWED_EMAIL_DOMAINS` | Must match backend allowlist |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key (required for Android maps) |

**Network notes:**
- Android emulator → use `http://10.0.2.2:3000`
- iOS simulator → use `http://localhost:3000`
- Physical device → use your machine's LAN IP (e.g. `http://192.168.1.10:3000`)

---

## How to Run the Backend

```bash
cd backend
npm install
cp .env.example .env        # Edit DATABASE_URL and secrets
npm run migrate             # Create tables + PostGIS schema
npm run seed                # Insert sample users, ride, and pod
npm run dev                 # Start dev server on port 3000
```

Verify: open `http://localhost:3000/health` — should return `{ "status": "ok" }`.

### Seed Test Accounts

| Role | Email | Password | PIN |
|------|-------|----------|-----|
| Driver | driver@university.edu | Password123 | 123456 |
| Passenger | passenger@university.edu | Password123 | 123456 |

---

## How to Run the Mobile App

```bash
cd mobile
npm install
cp .env.example .env        # Set API_BASE_URL for your environment
```

**Android:**
```bash
npm start          # Terminal 1 — Metro bundler
npm run android    # Terminal 2 — build and launch
```

**iOS (macOS only):**
```bash
cd ios && bundle exec pod install && cd ..
npm start
npm run ios
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/request-otp` | — | Request OTP for institutional email |
| POST | `/auth/verify-otp` | — | Verify OTP code |
| POST | `/auth/setup-security` | Verified email token | Set password + PIN |
| POST | `/auth/login` | — | Layer 1 login → partial token |
| POST | `/auth/verify-pin` | X-Partial-Token header | Layer 2 PIN → full JWT |
| GET | `/auth/me` | Full JWT | Current user profile |
| GET | `/pods/upcoming` | Full JWT | Upcoming commute pods |
| GET | `/pods/:id` | Full JWT | Pod details |
| PATCH | `/pods/:id/activate` | Full JWT | Driver activates pod |
| POST | `/rides/:id/sos` | Full JWT | Trigger SOS alert |
| GET | `/geofences` | Full JWT | Active geofences |

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `pod:join` | Client → Server | Join a pod tracking room |
| `pod:leave` | Client → Server | Leave a pod room |
| `gps:update` | Client → Server | Driver broadcasts location |
| `driver:location` | Server → Client | Passengers receive driver position |
| `sos:alert` | Server → Client | Emergency alert broadcast |

---

## Testing the Full Flow

1. Start backend (`npm run dev`) and seed data (`npm run seed`)
2. Launch mobile app
3. **New user:** Onboarding → enter `@university.edu` email → OTP (check backend console) → set password + PIN → login
4. **Existing user:** Login with seed credentials → enter PIN
5. Dashboard shows "Morning Commute Pod"
6. Tap pod → Live Map opens
7. As **driver**: mock GPS auto-broadcasts movement
8. As **passenger**: watch driver marker move in real time
9. Tap **SOS** during active ride to broadcast emergency alert

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native 0.85, TypeScript, Zustand, React Navigation |
| Maps | react-native-maps (Google Maps on Android) |
| Real-time | socket.io-client |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL + PostGIS |
| Auth | bcryptjs, jsonwebtoken |
| Real-time server | Socket.io |
