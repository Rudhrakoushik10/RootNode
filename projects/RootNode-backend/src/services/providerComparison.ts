import { getServices, type Service } from '../db.js';

export interface ServiceSelection {
  service: Service;
  score: number;
  reasons: string[];
}

export async function findServicesByCategory(category: string): Promise<Service[]> {
  const allServices = await getServices();
  return allServices.filter(s => s.category.toLowerCase() === category.toLowerCase());
}

export async function compareProviders(category: string): Promise<ServiceSelection[]> {
  const services = await findServicesByCategory(category);
  
  if (services.length === 0) {
    return [];
  }

  const scored = services.map(service => {
    const reasons: string[] = [];
    let score = 50;

    // Prefer localhost/mock provider endpoints for local testing
    if (service.endpoint.includes('localhost') || service.endpoint.includes('127.0.0.1')) {
      score += 100;
      reasons.push('Local provider (testing mode)');
    }

    if (service.price_algo <= 0.002) {
      score += 20;
      reasons.push('Budget-friendly price');
    } else if (service.price_algo <= 0.005) {
      score += 10;
      reasons.push('Moderate pricing');
    }

    if (service.rating >= 4.5) {
      score += 20;
      reasons.push('High rating (' + service.rating + '/5)');
    } else if (service.rating >= 4.0) {
      score += 10;
      reasons.push('Good rating (' + service.rating + '/5)');
    }

    if (service.avg_response_time_ms <= 500) {
      score += 15;
      reasons.push('Fast response time');
    } else if (service.avg_response_time_ms <= 1000) {
      score += 5;
      reasons.push('Acceptable response time');
    }

    return {
      service,
      score,
      reasons,
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}

export async function selectBestProvider(category: string): Promise<ServiceSelection | null> {
  const comparisons = await compareProviders(category);
  return comparisons[0] || null;
}
