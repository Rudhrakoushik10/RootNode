import { Service, Provider } from '../agent/types'

const mockProviders: Provider[] = [
  {
    id: 'prov-1',
    name: 'AI Labs',
    address: 'WMHF4FLJNKY2BPFK7YPV5ID6OZ7LVDB2B66ZTXEAMLL2NX4WJZRJFVX66M',
    reputation: 0.95,
    supportedServices: ['chat', 'image-gen', 'text-analysis'],
  },
  {
    id: 'prov-2',
    name: 'Neural Net Co',
    address: 'XYZV4FLJNKY2BPFK7YPV5ID6OZ7LVDB2B66ZTXEAMLL2NX4WJZRJFVX99',
    reputation: 0.88,
    supportedServices: ['chat', 'translation', 'text-analysis'],
  },
]

const mockServices: Service[] = [
  {
    id: 'svc-chat-gpt4',
    name: 'Chat GPT-4',
    endpoint: 'https://api.gpt4.example.com/chat',
    pricePerCall: 5000,
    priceUnit: 'microAlgo',
    trustScore: 0.95,
    avgLatencyMs: 1200,
    description: 'GPT-4 powered chat completion',
    capabilities: ['chat', 'text-generation', 'reasoning'],
    provider: mockProviders[0],
  },
  {
    id: 'svc-chat-claude',
    name: 'Claude Chat',
    endpoint: 'https://api.claude.example.com/messages',
    pricePerCall: 4000,
    priceUnit: 'microAlgo',
    trustScore: 0.93,
    avgLatencyMs: 1500,
    description: 'Claude powered conversation',
    capabilities: ['chat', 'text-generation', 'analysis'],
    provider: mockProviders[1],
  },
  {
    id: 'svc-image-stable',
    name: 'Stable Diffusion',
    endpoint: 'https://api.stablediffusion.example.com/generate',
    pricePerCall: 10000,
    priceUnit: 'microAlgo',
    trustScore: 0.90,
    avgLatencyMs: 5000,
    description: 'AI image generation',
    capabilities: ['image-generation', 'art-creation'],
    provider: mockProviders[0],
  },
]

export class ServiceRegistry {
  private services: Map<string, Service> = new Map()
  private providers: Map<string, Provider> = new Map()

  constructor() {
    this.loadServices(mockServices)
    this.loadProviders(mockProviders)
  }

  private loadServices(services: Service[]) {
    services.forEach((s) => this.services.set(s.id, s))
  }

  private loadProviders(providers: Provider[]) {
    providers.forEach((p) => this.providers.set(p.id, p))
  }

  getService(serviceId: string): Service | undefined {
    return this.services.get(serviceId)
  }

  getAllServices(): Service[] {
    return Array.from(this.services.values())
  }

  getServicesByCapability(capability: string): Service[] {
    return this.getAllServices().filter((s) => s.capabilities.includes(capability))
  }

  getServicesForTask(taskDescription: string): Service[] {
    const keywords = taskDescription.toLowerCase().split(/\s+/)
    const matchedServices: { service: Service; score: number }[] = []

    for (const service of this.getAllServices()) {
      let score = 0
      const descLower = service.description.toLowerCase()
      const capsLower = service.capabilities.map((c) => c.toLowerCase())

      for (const keyword of keywords) {
        if (descLower.includes(keyword)) score += 1
        if (capsLower.some((c) => c.includes(keyword))) score += 2
      }

      if (score > 0) {
        matchedServices.push({ service, score })
      }
    }

    return matchedServices.sort((a, b) => b.score - a.score).map((m) => m.service)
  }

  addService(service: Service): void {
    this.services.set(service.id, service)
  }
}

export const serviceRegistry = new ServiceRegistry()
