
# Default recipe to display help
default:
    @just --list

# Install all dependencies (backend + frontend)
install: install-backend install-frontend
    @echo "✅ All dependencies installed"

# Install backend dependencies
install-backend:
    @echo "📦 Installing backend dependencies..."
    cd backend && python3 -m venv .venv
    cd backend && .venv/bin/pip install -r requirements.txt
    @echo "✅ Backend dependencies installed"

# Install frontend dependencies
install-frontend:
    @echo "📦 Installing frontend dependencies..."
    cd frontend && pnpm i
    @echo "✅ Frontend dependencies installed"

# ============================================================================
# Development
# ============================================================================

# Start both backend and frontend development servers
dev:
    @echo "🚀 Starting development servers..."
    @echo "Backend: http://localhost:8000"
    @echo "Frontend: http://localhost:3000"
    just dev-backend & just dev-frontend

# Start backend development server
dev-backend:
    @echo "🐍 Starting backend server..."
    cd backend && .venv/bin/uvicorn src.main:app --reload

# Start frontend development server
dev-frontend:
    @echo "⚛️  Starting frontend server..."
    cd frontend && pnpm i && pnpm run dev
