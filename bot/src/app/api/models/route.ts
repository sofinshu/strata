import { NextResponse } from 'next/server';

// This is a mock list of models. In a real application, this would come from a database or external service.
const models = [
  {
    id: 'nemotron-3-super-free',
    name: 'Nemotron 3 Super',
    description: 'A powerful free model provided by OpenCode.',
    isFree: true,
  },
  {
    id: 'mimo-vl',
    name: 'MiMo VL',
    description: 'Vision-language model for multimodal tasks.',
    isFree: true,
  },
  {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    description: 'Compact version of GPT-5 for efficient inference.',
    isFree: true,
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    description: 'High-performance model from Anthropic.',
    isFree: false,
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    description: 'Google\'s advanced reasoning model.',
    isFree: false,
  },
  // Add more models as needed
];

export async function GET() {
  try {
    // Simulate a delay or any async operation if needed
    // In a real scenario, you might fetch from a database or external API
    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}