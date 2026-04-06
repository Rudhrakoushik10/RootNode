import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function seedServices() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'admin',
    database: process.env.MYSQL_DATABASE || 'rootnode_db',
  });

  const services = [
    {
      name: 'WeatherCo API',
      provider: 'WeatherCo',
      provider_wallet: 'BACKEND_WALLET_NOT_SET',
      price_algo: 0.001,
      category: 'weather',
      endpoint: 'http://localhost:4000/api/weather',
      description: 'Real-time weather data and forecasts',
      rating: 4.8,
      avg_response_time_ms: 200,
    },
    {
      name: 'HealthData API',
      provider: 'HealthData Inc',
      provider_wallet: 'BACKEND_WALLET_NOT_SET',
      price_algo: 0.002,
      category: 'medical',
      endpoint: 'http://localhost:4000/api/medical',
      description: 'Medical records and health data',
      rating: 4.6,
      avg_response_time_ms: 350,
    },
    {
      name: 'SatGeo API',
      provider: 'SatGeo',
      provider_wallet: 'BACKEND_WALLET_NOT_SET',
      price_algo: 0.003,
      category: 'satellite',
      endpoint: 'http://localhost:4000/api/satellite',
      description: 'Satellite imagery and geospatial data',
      rating: 4.9,
      avg_response_time_ms: 500,
    },
    {
      name: 'DisasterRoute API',
      provider: 'DisasterRoute',
      provider_wallet: 'BACKEND_WALLET_NOT_SET',
      price_algo: 0.0015,
      category: 'routing',
      endpoint: 'http://localhost:4000/api/routing',
      description: 'Route planning and optimization',
      rating: 4.7,
      avg_response_time_ms: 150,
    },
    {
      name: 'TaxPro API',
      provider: 'TaxPro Finance',
      provider_wallet: 'BACKEND_WALLET_NOT_SET',
      price_algo: 0.0025,
      category: 'finance',
      endpoint: 'http://localhost:4000/api/finance',
      description: 'Financial data and market information',
      rating: 4.5,
      avg_response_time_ms: 250,
    },
  ];

  console.log('Seeding services...');
  
  for (const service of services) {
    try {
      await connection.execute(
        `INSERT INTO services (name, provider, provider_wallet, price_algo, category, endpoint, description, rating, avg_response_time_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          service.name,
          service.provider,
          service.provider_wallet,
          service.price_algo,
          service.category,
          service.endpoint,
          service.description,
          service.rating,
          service.avg_response_time_ms,
        ]
      );
      console.log(`  Added: ${service.name} (${service.category})`);
    } catch (error) {
      if ((error as any).code === 'ER_DUP_ENTRY') {
        console.log(`  Already exists: ${service.name}`);
      } else {
        console.error(`  Error adding ${service.name}:`, error);
      }
    }
  }

  console.log('\nSeeding complete!');
  await connection.end();
}

seedServices().catch(console.error);
