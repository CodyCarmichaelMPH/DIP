# Disease Intelligence Program (DIP)

**Live Application**: https://codycarmic haelmph.github.io/DIP/

## Overview

The Disease Intelligence Program (DIP) is a comprehensive disease modeling and surveillance platform designed for Pierce County, Washington. It combines real-time data visualization, predictive modeling, and AI-powered research assistance to support public health decision-making.

## Features

### 📊 Dashboard
- Real-time disease surveillance data for COVID-19, Influenza, and RSV
- Interactive time-series visualizations with predictions
- Pierce County calibrated epidemiological parameters
- Starsim agent-based model simulations
- SEIR compartmental model simulations

### 🔬 SILAS Research Assistant
- AI-powered research assistant for epidemiological queries
- Context-aware responses using Perplexity AI
- Conversation history and management
- Specialized in infectious disease modeling

### 🎯 Scenario Builder
- Custom disease scenario creation and comparison
- Parameter adjustment for transmission dynamics
- Vaccination coverage modeling
- Network contact patterns
- Visual comparison of model outcomes

### 🗺️ Map View
- Geographic visualization of Pierce County
- Facility layer overlays (hospitals, nursing homes, childcare centers)
- Demographic and socioeconomic data layers
- Interactive tract-level data

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **State Management**: React Query (TanStack Query)
- **Icons**: Lucide React
- **Maps**: Leaflet

### Backend
- **Framework**: FastAPI (Python)
- **API Architecture**: RESTful with mounted `/api` prefix
- **CORS**: Multi-origin support (GitHub Pages + custom domains)
- **AI Integration**: Perplexity AI API
- **Modeling**: Custom SEIR and Starsim implementations

## Architecture

```
┌─────────────────────────────────────┐
│   GitHub Pages (Frontend)            │
│   https://codycarmic haelmph.github.io/DIP   │
└────────────┬────────────────────────┘
             │
             │ HTTPS API Calls
             ↓
┌─────────────────────────────────────┐
│   Google Cloud Run (Backend)         │
│   FastAPI + Python                   │
│   /api/* endpoints                   │
└─────────────────────────────────────┘
```

## Deployment

### Frontend (GitHub Pages)
The frontend is automatically deployed to GitHub Pages via GitHub Actions on every push to the `main` branch.

**Workflow**: `.github/workflows/deploy-gh-pages.yml`

### Backend (Google Cloud Run)
The backend is deployed to Google Cloud Run and accessible at:
`https://dip-backend-398210810947.us-west1.run.app/api`

**Health Check**: https://dip-backend-398210810947.us-west1.run.app/health

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.11+
- npm

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python simple_backend.py
```

The backend will run on `http://localhost:8000`

## Configuration

### Environment Variables

**Frontend** (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:8000/api  # For local development
# Production uses: https://dip-backend-398210810947.us-west1.run.app/api
```

**Backend** (`backend/.env`):
```env
PERPLEXITY_API_KEY=your-api-key-here
ENVIRONMENT=production
```

## API Endpoints

### Simulation Endpoints
- `POST /api/starsim/simulate` - Run Starsim agent-based simulation
- `POST /api/seir/simulate` - Run SEIR compartmental simulation

### Scenario Management
- `GET /api/scenarios` - List all scenarios
- `POST /api/scenarios` - Create new scenario
- `GET /api/scenarios/{id}` - Get scenario details
- `PUT /api/scenarios/{id}` - Update scenario
- `DELETE /api/scenarios/{id}` - Delete scenario

### Research Assistant
- `POST /api/research/query` - Submit research query to SILAS
- `GET /api/conversations` - List conversation history
- `POST /api/conversations` - Create new conversation

## Data Sources

- **Pierce County Health Department**: COVID-19, Flu, and RSV surveillance data
- **Washington State Department of Health**: Vaccination coverage and respiratory disease data
- **US Census Bureau**: Demographic and socioeconomic data
- **OpenStreetMap**: Facility locations and geographic boundaries

## Security

- CORS configured for specific origins only
- API keys stored as Google Cloud Secrets
- No sensitive data in frontend code
- HTTPS enforcement for all communications

## License

Proprietary - Broadly Epi Software

## Contact

**Point of Contact**: Cody.Carmichael@broadlyepi.com

## Development Status

⚠️ **Note**: This application is in active development. Calibrated parameters and simulation results may not be representative of reality and are currently used for testing purposes.

## Future Features

- AI Assisted Leadership Brief creation
- Spatial Disease Analysis
- Layer Based Visualization
- Person Travel Visualizations
- Jurisdiction Selection
- And more!

---

Built with ❤️ by the Broadly Epi Team

