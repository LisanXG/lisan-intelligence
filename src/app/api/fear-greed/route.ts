import { NextResponse } from 'next/server';

// Server-side API route - fetches Fear & Greed Index
export async function GET() {
    try {
        const response = await fetch(
            'https://api.alternative.me/fng/',
            {
                headers: {
                    'Accept': 'application/json',
                },
                next: { revalidate: 300 }, // Cache for 5 minutes
            }
        );

        if (!response.ok) {
            throw new Error(`Alternative.me API error: ${response.status}`);
        }

        const data = await response.json();
        const fngData = data.data[0];

        return NextResponse.json({
            value: parseInt(fngData.value),
            value_classification: fngData.value_classification,
            timestamp: fngData.timestamp,
        });
    } catch (error) {
        console.error('Fear & Greed API error:', error);

        // Return mock data as fallback
        return NextResponse.json({
            value: 65,
            value_classification: 'Greed',
            timestamp: Date.now().toString(),
        });
    }
}
