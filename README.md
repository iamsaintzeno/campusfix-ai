# CampusFix AI

## Problem Statement

Campus maintenance problems are often reported informally, which makes it difficult for facilities teams to understand, prioritize, and track them.

## Proposed Solution

CampusFix AI gives students a simple form for reporting an issue. The backend classifies and summarizes each report, stores it in SQLite, and displays it in a small dashboard where staff can filter by priority and mark work resolved.

## Features

- Submit an issue title, description, and location.
- Automatically produce a category, priority, and short summary.
- View issue counts and reports in an admin dashboard.
- Filter reports by priority and mark open issues resolved.
- Start with fictional demo reports on a fresh database.
- Use optional Gemini analysis with a deterministic local fallback classifier. **Gemini is not required for the application to work.**

## Technical Implementation

The React/Vite frontend calls a FastAPI backend over HTTP. The backend validates requests with Pydantic, uses Gemini only when a backend API key is configured, and otherwise classifies issues locally using keywords and simple urgency rules. Issues and their analysis are stored in one SQLite table. The API key stays on the backend.

On first startup, the backend inserts four fictional reports if the database is empty. It does not add them again after any issues exist.

## Project Structure

```text
.
├── backend/
│   ├── analyzer.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   └── schemas.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── .gitignore
└── README.md
```

## Setup Instructions

Requirements: Python 3.10+ and Node.js 18+.

### Deployment-ready configuration

The project is set up for a simple Vercel + Render deployment flow:

- Frontend: Vercel static app
- Backend: Render web service
- Frontend API URL: set via `VITE_API_URL`
- Backend CORS: set via `CORS_ORIGINS`

Use the example environment files before deployment:

```powershell
copy .env.example .env
copy frontend\.env.example frontend\.env.local
```

### Backend

From the project root, create and activate a virtual environment, then install dependencies:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

The first run creates `backend/campusfix.db` and inserts the fictional demo issues.

Gemini is optional. To enable it, set `GEMINI_API_KEY` in the backend process environment before starting Uvicorn. You can optionally set `GEMINI_MODEL`; it defaults to `gemini-2.0-flash`. Keep the key on the backend and never put it in frontend code. Without a key, the local classifier is used.

### Frontend

In a second terminal, from the project root:

```powershell
cd frontend
npm install
npm run dev
```

To use a different backend URL, set the Vite variable `VITE_API_URL` before starting the frontend; it defaults to `http://localhost:8000`.

## Usage

Open the frontend at <http://localhost:5173>. Submit an issue in **Report an issue** and see its analysis after submission. Choose **Admin dashboard** to view totals and reports. Use the priority filters and the **Mark resolved** action to manage reports.

The backend API and interactive docs are at <http://localhost:8000> and <http://localhost:8000/docs>.

## Deploy to Vercel + Render

### 1) Deploy the backend on Render

- Import this repository into Render.
- Create a web service and set the root directory to `backend`.
- Use the included `render.yaml` as a reference or paste the equivalent commands:

```bash
pip install -r requirements.txt
gunicorn main:app --workers 2 --bind 0.0.0.0:$PORT --timeout 120
```

Add environment variables:

```text
GEMINI_API_KEY=your_key_if_you_have_one
GEMINI_MODEL=gemini-2.0-flash
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:5173,http://127.0.0.1:5173
```

### 2) Deploy the frontend on Vercel

- Import the `frontend` folder as the project root.
- Set the environment variable:

```text
VITE_API_URL=https://your-render-service.onrender.com
```

- Build command: `npm run build`
- Output directory: `dist`

### 3) Confirm the deployed flow

- Submit a new issue through the frontend.
- Confirm it appears in the dashboard and the backend responds correctly.
- Keep the API key on the backend only; never expose it in the frontend.

## API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Check that the API is running |
| `GET` | `/issues` | List issues, newest first |
| `POST` | `/issues` | Analyze and save an issue |
| `PATCH` | `/issues/{id}/resolve` | Mark an issue resolved |
| `POST` | `/analyze` | Analyze an issue without saving it |

`POST /issues` and `POST /analyze` accept JSON with `title`, `description`, and `location`. Analysis returns a category (`Electrical`, `Network`, `Cleanliness`, `Water`, `Furniture`, or `Other`), a priority (`High`, `Medium`, or `Low`), and a short summary.

## AI and Fallback Logic

When `GEMINI_API_KEY` is configured, the backend asks Gemini for a JSON classification and validates the response. If the key is absent, the request fails, or the response is invalid, a warning is logged and the local classifier is used. The fallback classifies the requested issue types from keywords and assigns high priority for explicit hazards and whole-lab network outages, medium for common maintenance issues, and low for minor or cosmetic reports. No AI service is needed for local development or core app functionality.

## Technologies Used

- React 18, Vite, and plain CSS
- Python, FastAPI, and Pydantic
- SQLite
- Optional Gemini API integration

## Limitations

- The fallback uses keywords and simple rules; it is not a general-purpose AI model.
- The dashboard is a demo admin view and does not include authentication or role permissions.
- The application does not yet notify facilities staff or track work beyond Open/Resolved.
- Demo data is inserted only when the database has no issue records.

## Future Scope

- Add campus accounts and staff permissions.
- Support photos, comments, and assignment to facilities teams.
- Track resolution times and notify students about updates.
- Improve classifier evaluation with anonymized campus reports.
