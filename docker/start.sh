#!/bin/sh
set -e

echo "🚀 Starting Panel Ejecutivo..."

# Start backend in background
echo "📡 Starting backend server..."
cd /app/backend
node dist/server.js &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend..."
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start"
    exit 1
fi

echo "✅ Backend running on port 3001"

# Start nginx
echo "🌐 Starting nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!

echo "✅ Nginx running on port 80"
echo "🎉 Panel Ejecutivo is ready!"
echo ""
echo "📊 Dashboard: http://localhost"
echo "🔧 API:       http://localhost/api"
echo "💚 Health:    http://localhost/health"

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?




