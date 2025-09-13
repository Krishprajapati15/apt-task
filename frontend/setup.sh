#!/bin/bash

# Real-time Order Management System Setup Script
echo "🚀 Real-time Order Management System Setup"
echo "=========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js $(node --version) detected"
}

# Check if MongoDB is running
check_mongodb() {
    if ! command -v mongod &> /dev/null; then
        print_warning "MongoDB is not installed or not in PATH"
        print_warning "Please install MongoDB and ensure it's running as a replica set"
        print_warning "For development, you can use: mongod --replSet rs0"
        return 1
    fi
    
    if ! pgrep -x "mongod" > /dev/null; then
        print_warning "MongoDB is not running"
        print_warning "Please start MongoDB with: mongod --replSet rs0"
        return 1
    fi
    
    print_success "MongoDB is running"
    return 0
}

# Setup MongoDB replica set
setup_mongodb() {
    print_status "Setting up MongoDB replica set..."
    
    # Check if replica set is already initialized
    REPLICA_STATUS=$(mongosh --eval "rs.status().ok" --quiet 2>/dev/null || echo "0")
    
    if [ "$REPLICA_STATUS" = "1" ]; then
        print_success "MongoDB replica set is already initialized"
    else
        print_status "Initializing MongoDB replica set..."
        mongosh --eval "rs.initiate()" --quiet
        
        if [ $? -eq 0 ]; then
            print_success "MongoDB replica set initialized"
            sleep 5  # Wait for replica set to be ready
        else
            print_error "Failed to initialize MongoDB replica set"
            exit 1
        fi
    fi
}

# Create project structure
create_structure() {
    print_status "Creating project structure..."
    
    mkdir -p real-time-order-system/{backend/src/{config,models,routes,services,middleware},frontend/src/{components,hooks,services,app},cli-client}
    
    print_success "Project structure created"
}

# Setup backend
setup_backend() {
    print_status "Setting up backend..."
    
    cd real-time-order-system/backend
    
    # Initialize package.json if it doesn't exist
    if [ ! -f package.json ]; then
        npm init -y > /dev/null
    fi
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    npm install express mongoose socket.io cors helmet morgan dotenv express-validator nodemailer express-rate-limit compression --silent
    
    # Install dev dependencies
    npm install nodemon jest supertest eslint eslint-config-airbnb-base eslint-plugin-import --save-dev --silent
    
    # Create .env file
    if [ ! -f .env ]; then
        print_status "Creating backend .env file..."
        cat > .env << EOL
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/orderdb
DB_NAME=orderdb

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Email Configuration (Update with your Gmail credentials)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Security (Optional)
JWT_SECRET=your-jwt-secret-key-here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOL
        print_success "Backend .env file created"
        print_warning "Please update the email credentials in backend/.env"
    fi
    
    cd ../..
    print_success "Backend setup completed"
}

# Setup frontend
setup_frontend() {
    print_status "Setting up frontend..."
    
    cd real-time-order-system/frontend
    
    # Initialize Next.js project if it doesn't exist
    if [ ! -f package.json ]; then
        npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --silent
    fi
    
    # Install additional dependencies
    print_status "Installing frontend dependencies..."
    npm install socket.io-client lucide-react clsx tailwind-merge --silent
    
    # Install dev dependencies
    npm install @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom prettier prettier-plugin-tailwindcss --save-dev --silent
    
    # Create .env.local file
    if [ ! -f .env.local ]; then
        print_status "Creating frontend .env.local file..."
        echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:3001" > .env.local
        print_success "Frontend .env.local file created"
    fi
    
    cd ../..
    print_success "Frontend setup completed"
}

# Setup CLI client
setup_cli() {
    print_status "Setting up CLI client..."
    
    cd real-time-order-system/cli-client
    
    # Initialize package.json if it doesn't exist
    if [ ! -f package.json ]; then
        npm init -y > /dev/null
    fi
    
    # Install dependencies
    print_status "Installing CLI client dependencies..."
    npm install socket.io-client node-fetch --silent
    npm install nodemon --save-dev --silent
    
    cd ../..
    print_success "CLI client setup completed"
}

# Create startup scripts
create_scripts() {
    print_status "Creating startup scripts..."
    
    cd real-time-order-system
    
    # Backend start script
    cat > start-backend.sh << 'EOL'
#!/bin/bash
echo "🚀 Starting backend server..."
cd backend
npm run dev
EOL
    
    # Frontend start script
    cat > start-frontend.sh << 'EOL'
#!/bin/bash
echo "🎨 Starting frontend server..."
cd frontend
npm run dev
EOL
    
    # CLI client start script
    cat > start-cli.sh << 'EOL'
#!/bin/bash
echo "💻 Starting CLI client..."
cd cli-client
npm start
EOL
    
    # Complete startup script
    cat > start-all.sh << 'EOL'
#!/bin/bash
echo "🚀 Starting Real-time Order Management System..."
echo "================================================"

# Start backend in background
echo "Starting backend server..."
cd backend && npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 5

# Start frontend in background
echo "Starting frontend server..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 System started successfully!"
echo "📊 Backend running on: http://localhost:3001"
echo "🎨