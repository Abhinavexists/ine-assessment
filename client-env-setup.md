# Client Environment Variables Setup

## For Render Deployment

### Required Environment Variables in Render Dashboard:

1. **VITE_API_URL**: `https://ine-auction.onrender.com/api`
2. **VITE_API_WS**: `https://ine-auction.onrender.com`

### Important Notes:

- These variables must be set in Render's Environment tab
- They are passed as build arguments to Docker during deployment
- The Dockerfile now properly handles these during the Vite build process
- If you change your Render service URL, update these accordingly

### Troubleshooting:

If you still see `localhost:3000` connections:
1. Check that both environment variables are set correctly in Render
2. Make sure there are no typos or extra spaces
3. Trigger a fresh deployment after setting the variables
4. Check the build logs for any errors during the Vite build step

### For Local Development:

Create a `.env.local` file in the `client/` directory with:
```
VITE_API_URL=http://localhost:3000/api
VITE_API_WS=http://localhost:3000
```