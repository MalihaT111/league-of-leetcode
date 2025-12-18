# League of LeetCode

A competitive LeetCode matchmaking platform where users compete head-to-head on coding problems with ELO rankings.

## Features

- **Real-time Matchmaking**: WebSocket-based matchmaking system
- **ELO Rating System**: Track your competitive ranking
- **LeetCode Integration**: Fetch problems and verify solutions
- **Friends System**: Add friends and send friend requests
- **Settings & Preferences**: 
  - Topic filtering (83 LeetCode topics)
  - Difficulty selection (Easy, Medium, Hard)
  - Repeat questions toggle
- **Match History**: Track your wins, losses, and performance
- **Profile Stats**: View your LeetCode stats and match history

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM with async support
- **MySQL** - Database
- **Redis** - Matchmaking queue and caching
- **WebSockets** - Real-time matchmaking
- **LeetCode GraphQL API** - Problem fetching and stats
- **Bcrypt/Argon2** - Password hashing
- **JWT** - Authentication tokens
- **Playwright** - Web scraping for LeetCode integration

### Frontend
- **Next.js 15** - React framework with App Router and Turbopack
- **React 19** - UI library
- **TypeScript** - Type safety
- **Mantine UI** - Component library
- **TanStack Query** - Server state management and data fetching
- **Three.js + React Three Fiber** - 3D graphics and animations
- **pnpm** - Package manager

## Project Structure

```
leagueofleetcode/
├── backend/
│   ├── src/
│   │   ├── auth/           # Authentication & registration
│   │   ├── database/       # Models and database setup
│   │   ├── friends/        # Friends system
│   │   ├── history/        # Match history
│   │   ├── leetcode/       # LeetCode API integration
│   │   ├── matchmaking/    # Matchmaking logic & WebSockets
│   │   ├── profile/        # User profiles
│   │   ├── results/        # Match results
│   │   ├── settings/       # User settings
│   │   └── users/          # User management
│   ├── requirements.txt
│   └── topic_map_cache.json
│
└── frontend/
    ├── src/
    │   ├── app/            # Next.js pages
    │   ├── components/     # React components
    │   ├── lib/            # Utilities and hooks
    │   └── utils/          # Helper functions
    ├── package.json
    └── tsconfig.json
```

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+
- MySQL 8.0+
- Redis 7.0+
- pnpm (recommended) or npm

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Create .env file with:
# DATABASE_URL=mysql+aiomysql://user:password@localhost/league_of_leetcode
# SECRET_KEY=your-secret-key

# Start Redis (required for matchmaking)
redis-server

# Start the server
uvicorn src.main:app --reload
```

Backend runs on `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Set up environment variables (optional)
# Create .env.local if you need to override API URL:
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Start development server
pnpm dev
```

Frontend runs on `http://localhost:3000`

### Using Justfile (Recommended)

The project includes a `justfile` for easy task management:

```bash
# Start both backend and frontend
just dev

# Start backend only
just dev-backend

# Start frontend only
just dev-frontend
```

**Note:** Redis must be running separately before starting the backend.

## Key Features Documentation

### Settings Validation
- Real-time validation of topic/difficulty combinations
- Hard blocks: Cannot match (no difficulties, no topics, all invalid)
- Soft blocks: Warning (some invalid topics, but can still match)
- Visual feedback with red borders and error messages

### Repeat Questions Toggle
- **ON**: Can receive any problem, including previously completed ones
- **OFF**: Excludes all previously completed problems from matchmaking
- Graceful error when all problems are completed

### Matchmaking System
- Redis-based queue with ELO-sorted matching (±100 ELO range)
- WebSocket notifications for real-time updates
- Matches users with similar ELO ratings
- Considers shared topics and difficulties
- Excludes completed problems if repeat is disabled
- Automatic queue management and cleanup

### Friends System
- Send/accept/reject friend requests
- View friends list
- Friend request notifications

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `GET /me` - Get current user

### Matchmaking
- `WS /matchmaking/ws/{user_id}` - WebSocket connection
- `POST /matchmaking/queue` - Join matchmaking queue
- `DELETE /matchmaking/queue/{user_id}` - Leave queue

### Settings
- `GET /api/settings/{user_id}` - Get user settings
- `PUT /api/settings/{user_id}` - Update settings

### LeetCode
- `GET /api/leetcode/topic-map` - Get topic difficulty map
- `POST /api/leetcode/refresh-topic-map` - Refresh cache
- `GET /api/leetcode/user/{username}/stats` - Get LeetCode stats

### Friends
- `POST /api/friends/request` - Send friend request
- `GET /api/friends/{user_id}/requests` - Get friend requests
- `POST /api/friends/accept` - Accept request
- `POST /api/friends/reject` - Reject request

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=mysql+aiomysql://user:password@localhost/league_of_leetcode
SECRET_KEY=your-secret-key-here
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

**Note:** Frontend will default to `http://localhost:8000` if not specified.

## Development Notes

### Topic Mapping
- Frontend uses display names (e.g., "Sort", "Binary Indexed Tree")
- Backend uses slugs for LeetCode API (e.g., "sorting", "binary-indexed-tree")
- Topic map cache stores topics missing at least one difficulty

### Validation Logic
- Backend returns DISALLOWED difficulties (missing from LeetCode)
- Frontend checks if selected difficulty is in disallowed list
- Topic is invalid only if ALL selected difficulties are disallowed

### Database Schema
- `users` - User accounts, settings, and ELO ratings
- `match_history` - Completed matches with results
- `friends` - Friend relationships and requests
- `match_requests` - Friend-to-friend match challenges
- Redis queue - Active matchmaking queue (ephemeral)

## Testing

```bash
# Backend tests
cd backend
pytest

# Manual API testing
./backend/test_friends_api.sh  # Bash script
python backend/test_friends_api.py  # Python script
```

## Troubleshooting

### Backend won't start
- Check MySQL is running: `mysql -u root -p`
- **Check Redis is running**: `redis-cli ping` (should return "PONG")
- Verify database credentials in .env
- Ensure all dependencies are installed: `pip install -r requirements.txt`

### Frontend won't connect to backend
- Verify backend is running on port 8000
- Check CORS settings in backend/src/main.py
- Verify API URL in frontend .env.local (or defaults to localhost:8000)

### Matchmaking not working
- **Ensure Redis is running** - matchmaking requires Redis
- Check WebSocket connection in browser console
- Verify user settings are valid (topics and difficulties)
- Check backend logs for errors
- Test Redis connection: `redis-cli zscore matchmaking_queue <user_id>`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- LeetCode for the problem database
- FastAPI and Next.js communities
- All contributors
