/**
 * EcoStamp Phase 2 — Premium content data
 * In production these would be fetched from a CMS / database.
 * For the hackathon they are statically defined here.
 */

// ── Eco Guides ─────────────────────────────────────────────────────────────

export const GUIDES = {
  'train-travel-europe': {
    title:    'The Definitive Guide to Carbon-Optimal Rail Travel in Europe',
    excerpt:  'Europe\'s rail network cuts emissions by up to 90% vs flying. Here\'s how to plan the perfect low-carbon itinerary.',
    category: 'transport',
    readTime: '12 min',
    author:   'EcoStamp Research',
    publishedAt: '2026-02-01',
    tags:     ['rail', 'europe', 'carbon', 'transport'],
    content: `
# The Definitive Guide to Carbon-Optimal Rail Travel in Europe

## Why Train Travel is the Climate-Correct Choice

Flying from London to Paris emits approximately **61kg CO₂ per passenger**.
The Eurostar covers the same journey in 2h15 and emits just **3.2kg CO₂** —
a 95% reduction. For most European routes under 1,000km, rail is the dominant
decarbonisation lever for personal travel.

## Key Routes and Emissions Comparison

| Route          | Flight (kg CO₂) | Train (kg CO₂) | Time penalty |
|----------------|-----------------|-----------------|--------------|
| London–Paris   | 61              | 3.2             | +0h45        |
| Paris–Barcelona| 118             | 8.4             | +3h00        |
| Amsterdam–Berlin| 75             | 7.1             | +1h30        |
| London–Edinburgh| 82             | 6.8             | +2h15        |

## Booking Strategy

**Night trains** are the ultimate efficiency play: you eliminate a hotel night
while covering 800–1200km overnight. The European Sleeper (Brussels–Berlin–Prague)
and the Nightjet network (Vienna hub) have both expanded significantly in 2025.

## The EcoStamp Scoring System

EcoRail-certified providers in the EcoStamp registry are scored on:
- **Carbon intensity** per passenger-km vs modal average
- **Renewable energy** sourcing percentage
- **Circular economy** practices in operations

Booking via an EcoStamp-verified train provider earns you 2 eco points and
generates a verifiable on-chain stamp of your sustainable travel choice.

## Practical Tips

1. Book 60–90 days ahead for Eurostar / Thalys — prices 40% lower
2. Interrail Global Pass for multi-country trips (>5 legs)
3. Use the SNCF Ouigo and Renfe Avlo ultra-low-cost high-speed options
4. Always choose train over domestic flight for under-600km routes
    `,
    contentExtended: `
# The Definitive Guide to Carbon-Optimal Rail Travel in Europe
*Extended Edition — EcoStamp Gold Member*

[... Full 6,000 word guide with offline city guides, verified hotel connections,
 seasonal booking calendars, carbon budget calculator, and partner discounts ...]

## Advanced Carbon Budgeting for Rail Trips

[Full data tables and methodology for 47 European city pairs...]

## EcoStamp Partner Discounts

As a verified EcoStamp holder you qualify for:
- 10% off European Sleeper night trains
- Priority boarding on Eurostar with Green tier+
- Free carbon certificate from GoldStandard for Gold tier holders
    `,
  },

  'eco-hotels-certification': {
    title:    'How to Verify an Eco Hotel\'s Sustainability Claims',
    excerpt:  'Greenwashing is rife in hotel marketing. Learn to read certifications, on-chain stamps, and what actually matters.',
    category: 'accommodation',
    readTime: '8 min',
    author:   'EcoStamp Research',
    publishedAt: '2026-01-15',
    tags:     ['hotels', 'certification', 'greenwashing', 'accommodation'],
    content: `
# How to Verify an Eco Hotel's Sustainability Claims

## The Greenwashing Problem

73% of hotels claim some form of sustainability commitment in their marketing.
Only 12% hold a third-party verified certification. The gap is greenwashing —
and it costs travelers both money and carbon impact.

## Tier 1 Certifications (Trust These)

- **Green Key** — audited annually, 70+ countries
- **LEED** — construction & operations standard, gold/platinum levels
- **EU Ecolabel** — EU-backed, covers energy, waste, and water

## What the EcoStamp Registry Adds

When a hotel applies to the EcoStamp registry, they submit:
1. Third-party certification document hash
2. Energy consumption data (kWh/room-night)
3. Water consumption (litres/room-night)
4. Waste diversion rate (% from landfill)

All four data points are stored as a hash in the provider-registry contract.
You can verify them at any time on the Stacks explorer — it's the first
immutable, tamper-proof eco hotel registry on Bitcoin L2.

## Red Flags in Hotel Marketing

- "We recycle" — legal requirement in most countries, not a differentiator
- "Carbon neutral" without methodology or certificate
- Solar panels on the website photo but not in the energy breakdown
- "Eco-friendly" without specifying what, how, or verified by whom

## The EcoStamp Score

Our 100-point eco score weights:
- Carbon intensity (40%) — kgCO₂/room-night vs regional grid average
- Water (20%) — litres/room-night vs local benchmark
- Waste (20%) — diversion rate
- Biodiversity (10%) — land use and local ecosystem impact
- Social (10%) — local employment and fair wages
    `,
  },

  'carbon-budget-travel': {
    title:    'Your Annual Carbon Budget for Travel: A Practical Framework',
    excerpt:  'How to travel meaningfully within a 1.5°C-aligned personal carbon budget, without giving up exploration.',
    category: 'sustainability',
    readTime: '10 min',
    author:   'EcoStamp Research',
    publishedAt: '2026-03-01',
    tags:     ['carbon budget', 'framework', 'lifestyle', 'climate'],
    content: `
# Your Annual Carbon Budget for Travel: A Practical Framework

## The 1.5°C Budget

To align personal consumption with a 1.5°C trajectory, the Science Based
Targets initiative estimates a total personal carbon budget of approximately
**2.5 tonnes CO₂e per year** by 2030 (down from ~4.7t in 2023 for an average
EU citizen).

Travel is typically 20–40% of personal emissions. That gives you a travel
budget of roughly **500kg–1,000kg CO₂** annually.

## What That Buys You

| Mode              | Emission factor | Example journey          | Budget used |
|-------------------|-----------------|--------------------------|-------------|
| Train (EU avg)    | 6g CO₂/km       | London–Barcelona (1,800km)| 108kg      |
| EV (EU grid)      | 22g CO₂/km      | Road trip, 1,500km        | 33kg       |
| Short-haul flight | 255g CO₂/km     | London–Barcelona          | 459kg      |
| Long-haul flight  | 195g CO₂/km     | London–NYC (5,600km)      | 1,092kg    |

A single transatlantic flight round-trip (2,184kg) exceeds an entire 2030
budget. Two short-haul flights and a road trip also bust it easily.

## The EcoStamp Approach: Quality > Quantity

The EcoStamp philosophy isn't "fly less and suffer" — it's "travel better
and prove it." Each stamp you earn records a specific carbon-lite choice.
Over time, your stamp collection becomes a verifiable portfolio of intentional
travel aligned with your values.

## Building Your Travel Carbon Ledger

1. Set your annual budget (we suggest 800kg as a starting point)
2. Log every trip using verified provider stamps
3. Track your running total in the EcoStamp Impact Dashboard
4. Use your remaining budget strategically for the highest-value journeys
    `,
  },
};

// ── Carbon-optimal routes ──────────────────────────────────────────────────

export const ROUTES = [
  {
    from: 'London',
    to:   'Paris',
    carbonSaved: '57.8kg CO₂ vs flying',
    options: [
      {
        rank: 1,
        mode: 'train',
        operator: 'Eurostar',
        duration: '2h15',
        co2: 3.2,
        cost: '~£60',
        ecoScore: 97,
        note: 'Fastest and cleanest. Book 60+ days ahead for best price.',
        stampProvider: 'EcoRail Europe',
      },
      {
        rank: 2,
        mode: 'bus',
        operator: 'FlixBus',
        duration: '8h30',
        co2: 9.4,
        cost: '~£20',
        ecoScore: 73,
        note: 'Budget option. Significant time cost vs train.',
        stampProvider: null,
      },
      {
        rank: 3,
        mode: 'flight',
        operator: 'Various',
        duration: '1h15',
        co2: 61.0,
        cost: '~£80',
        ecoScore: 12,
        note: 'Not recommended. 19x higher emissions than Eurostar.',
        stampProvider: null,
      },
    ],
  },
  {
    from: 'Amsterdam',
    to:   'Berlin',
    carbonSaved: '67.9kg CO₂ vs flying',
    options: [
      {
        rank: 1,
        mode: 'train',
        operator: 'Deutsche Bahn IC/ICE',
        duration: '5h45',
        co2: 7.1,
        cost: '~€45',
        ecoScore: 95,
        note: 'Direct IC trains multiple times daily. Night train option too.',
        stampProvider: 'EcoRail Europe',
      },
      {
        rank: 2,
        mode: 'train',
        operator: 'European Sleeper',
        duration: 'overnight',
        co2: 6.8,
        cost: '~€89',
        ecoScore: 97,
        note: 'Night train — saves hotel cost and maximises time.',
        stampProvider: 'EcoRail Europe',
      },
    ],
  },
  {
    from: 'Paris',
    to:   'Barcelona',
    carbonSaved: '109.6kg CO₂ vs flying',
    options: [
      {
        rank: 1,
        mode: 'train',
        operator: 'SNCF/Renfe TGV',
        duration: '6h25',
        co2: 8.4,
        cost: '~€70',
        ecoScore: 94,
        note: 'High-speed TGV direct. Book 3 months ahead.',
        stampProvider: 'EcoRail Europe',
      },
    ],
  },
];

// ── Verified eco hotel directory ───────────────────────────────────────────

export const HOTELS = [
  {
    id: 1,
    name: 'The Green Lodge',
    country: 'DE',
    city: 'Berlin',
    category: 'hotel',
    ecoScore: 92,
    certifications: ['Green Key Gold', 'EU Ecolabel'],
    energyKwhPerRoomNight: 18.2,
    waterLitresPerRoomNight: 112,
    wasteRecycleRate: 0.87,
    renewableEnergyPct: 100,
    stampRegistryId: 1,
    verifiedOnChain: true,
    website: 'https://example-greenlodge.com',
    description: 'Carbon-neutral hotel in Mitte. 100% renewable electricity, onsite rainwater harvesting, zero single-use plastics.',
  },
  {
    id: 2,
    name: 'Bamboo Boutique',
    country: 'PT',
    city: 'Lisbon',
    category: 'hotel',
    ecoScore: 95,
    certifications: ['Green Key Gold', 'Biosphere Tourism'],
    energyKwhPerRoomNight: 14.8,
    waterLitresPerRoomNight: 95,
    wasteRecycleRate: 0.91,
    renewableEnergyPct: 100,
    stampRegistryId: 5,
    verifiedOnChain: true,
    website: 'https://example-bamboo.com',
    description: 'Boutique hotel built from locally-sourced bamboo and cork. Rooftop garden restaurant with zero food-miles produce.',
  },
  {
    id: 3,
    name: 'Arctic Eco Lodge',
    country: 'NO',
    city: 'Tromsø',
    category: 'hotel',
    ecoScore: 98,
    certifications: ['Nordic Swan Ecolabel', 'Green Key Gold'],
    energyKwhPerRoomNight: 11.2,
    waterLitresPerRoomNight: 88,
    wasteRecycleRate: 0.95,
    renewableEnergyPct: 100,
    stampRegistryId: 7,
    verifiedOnChain: true,
    website: 'https://example-arctic.com',
    description: 'Powered entirely by Norwegian hydropower. Wildlife-first design with zero light pollution policy. Aurora viewing certified.',
  },
  {
    id: 4,
    name: 'Solar Hacienda',
    country: 'ES',
    city: 'Seville',
    category: 'hotel',
    ecoScore: 88,
    certifications: ['Q de Calidad Turística', 'Green Key Silver'],
    energyKwhPerRoomNight: 22.4,
    waterLitresPerRoomNight: 130,
    wasteRecycleRate: 0.78,
    renewableEnergyPct: 84,
    stampRegistryId: 9,
    verifiedOnChain: true,
    website: 'https://example-solar.com',
    description: 'Andalusian cortijo with 400 solar panels. Organic olive grove and traditional rammed-earth construction.',
  },
];