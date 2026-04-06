import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const DEV_MODE = process.env.DEV_MODE !== 'false';

console.log('========================================');
console.log('RootNode Mock Provider Server');
console.log('========================================');
console.log(`Port: ${PORT}`);
console.log(`Dev Mode: ${DEV_MODE}`);
console.log('========================================\n');

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    provider: 'RootNode Mock x402 Provider',
    version: '1.0.0',
    devMode: DEV_MODE,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    provider: 'RootNode Mock Provider',
    version: '1.0.0',
    endpoints: {
      weather: '/api/weather',
      medical: '/api/medical',
      satellite: '/api/satellite',
      routing: '/api/routing',
      finance: '/api/finance',
    },
    devMode: DEV_MODE,
  });
});

// Weather endpoint - returns mock data
app.get('/api/weather', (req, res) => {
  console.log('[MOCK] /api/weather called');
  res.json({
    location: 'Chennai, Tamil Nadu, India',
    temperature: '32°C',
    feels_like: '35°C',
    condition: 'Partly Cloudy',
    humidity: '75%',
    wind_speed: '15 km/h',
    forecast: 'Expect clear skies with occasional clouds in the evening',
    data_source: 'mock_provider',
    timestamp: new Date().toISOString(),
  });
});

// Medical endpoint - returns mock data
app.get('/api/medical', (req, res) => {
  console.log('[MOCK] /api/medical called');
  res.json({
    patient_id: 'MOCK-001',
    records: [
      { type: 'checkup', date: '2024-01-15', result: 'Normal - all vitals healthy' },
      { type: 'blood_pressure', date: '2024-01-20', result: '120/80 mmHg - Normal' },
      { type: 'blood_test', date: '2024-01-22', result: 'All values within range' },
    ],
    recommendations: ['Maintain balanced diet', 'Regular exercise recommended'],
    data_source: 'mock_provider',
    timestamp: new Date().toISOString(),
  });
});

// Satellite endpoint - returns mock data
app.get('/api/satellite', (req, res) => {
  console.log('[MOCK] /api/satellite called');
  res.json({
    location: 'Wayanad, Kerala, India',
    imagery: 'High-resolution satellite image captured',
    resolution: '0.5m per pixel',
    coverage: '100 sq km',
    cloud_cover: '15%',
    bands: ['RGB', 'NIR', 'SWIR'],
    data_source: 'mock_provider',
    timestamp: new Date().toISOString(),
  });
});

// Routing endpoint - returns mock data
app.get('/api/routing', (req, res) => {
  console.log('[MOCK] /api/routing called');
  res.json({
    origin: 'Chennai Central',
    destination: 'Bangalore Majestic',
    distance: '350 km',
    estimated_time: '5h 30m',
    route: 'NH-48 via Vellore, Krishnagiri, Hosur',
    tolls: 5,
    traffic_condition: 'Normal - light traffic expected',
    alternate_routes: 2,
    data_source: 'mock_provider',
    timestamp: new Date().toISOString(),
  });
});

// Finance endpoint - returns mock data
app.get('/api/finance', (req, res) => {
  console.log('[MOCK] /api/finance called');
  res.json({
    symbol: 'RELIANCE',
    price: '₹2,847.50',
    change: '+1.25%',
    volume: '8.5M shares',
    market_cap: '₹19.2L Cr',
    pe_ratio: '28.5',
    data_source: 'mock_provider',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.path} not found`,
    available_endpoints: ['/api/health', '/api/info', '/api/weather', '/api/medical', '/api/satellite', '/api/routing', '/api/finance'],
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Mock provider running on http://localhost:${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log('  GET /api/health    - Health check');
  console.log('  GET /api/info      - Provider info');
  console.log('  GET /api/weather   - Weather data');
  console.log('  GET /api/medical   - Medical records');
  console.log('  GET /api/satellite - Satellite imagery');
  console.log('  GET /api/routing   - Route planning');
  console.log('  GET /api/finance   - Financial data');
  console.log('');
});

// Error handling
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`ERROR: Port ${PORT} is already in use`);
    console.error('Please stop any other servers using this port and try again');
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

process.on('SIGINT', () => {
  console.log('\nShutting down mock provider...');
  server.close(() => {
    console.log('Mock provider stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down mock provider...');
  server.close(() => {
    console.log('Mock provider stopped');
    process.exit(0);
  });
});

export default app;
