# Design Guidelines: F1 Predictive Market Platform

## Design Approach

**Reference-Based Approach**: Drawing inspiration from modern trading platforms (Robinhood, Coinbase) combined with the high-octane energy of Formula 1 racing. The design balances the precision of financial interfaces with the excitement of motorsport.

**Core Principle**: Create a premium trading experience that feels both professional and thrilling, where data clarity meets racing adrenaline.

## Typography System

**Primary Font**: Inter or DM Sans via Google Fonts
- Headers: 700 weight for team names and major CTAs
- Body: 400-500 weight for prices and statistics
- Data Display: 600 weight, tabular numbers for pricing

**Hierarchy**:
- Hero/Page Titles: text-5xl to text-6xl, font-bold
- Team Names: text-2xl to text-3xl, font-bold
- Share Prices: text-3xl to text-4xl, font-semibold, tabular-nums
- Labels/Metadata: text-sm, font-medium, uppercase tracking
- Body Text: text-base
- Small Data: text-xs to text-sm

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, and 12** (e.g., p-4, gap-6, mb-12)
- Card padding: p-6
- Section spacing: py-12 to py-16
- Component gaps: gap-4 to gap-6
- Micro-spacing: space-y-2

**Grid System**: 
- Team cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-5 (all 10 teams)
- Dashboard: Two-column split (portfolio + market stats)
- Max container width: max-w-7xl

## Hero Section

**Layout**: Split hero with asymmetric design
- Left (60%): Bold headline "Trade the 2026 F1 Championship", subheading about market mechanics, primary CTA "Start Trading" with blurred background, current market size stat
- Right (40%): High-impact F1 racing imagery (cars on track, podium celebration, or pit stop action)
- Background: Subtle gradient overlay, angular geometric accents suggesting speed

## Core Components

### Team Trading Cards
Each F1 team gets a distinctive card:
- Team logo prominent at top
- Current share price (large, bold, center)
- Price change indicator (+/- percentage with arrow)
- Mini sparkline chart showing price history
- Shares available counter
- "Buy Shares" button
- Card layout: Compact, scannable, data-forward

### Market Dashboard
**Portfolio Section**:
- Total investment value (hero metric)
- Current portfolio worth
- Unrealized gain/loss
- Holdings breakdown by team (horizontal bars showing distribution)

**Market Statistics**:
- Total prize pool (prominent display)
- Active traders count
- Volume traded today
- Market distribution pie chart

### Trading Interface Modal
When buying shares:
- Team branding header
- Current price with real-time updates
- Quantity selector (stepper input)
- Total cost calculator
- Balance display
- Confirm purchase button
- Risk disclaimer text

### Real-Time Market View
Live trading feed component:
- Scrollable list of recent trades
- Team name, quantity, price per trade
- Time stamps
- Visual indicators for buy activity

## Component Library

**Navigation**: Fixed top nav
- Logo left
- User wallet balance (prominent)
- Portfolio link
- User menu right
- Sticky on scroll

**Data Cards**: 
- Elevated with subtle shadow
- Rounded corners (rounded-lg)
- Border accent on hover state
- Clean internal padding

**Buttons**:
- Primary: Bold, full-width for trading actions
- Secondary: Outlined for cancel/secondary actions
- Icon buttons: For quantity steppers

**Forms**:
- Large touch targets for mobile
- Clear labels above inputs
- Inline validation
- Disabled states for insufficient balance

**Charts**: Use Chart.js or Recharts
- Line charts for price history
- Pie charts for market distribution
- Bar charts for portfolio breakdown

## Icons

**Library**: Heroicons via CDN
- TrendingUp/TrendingDown for price changes
- ChartBar for statistics
- Wallet for balance
- CheckCircle for confirmations
- ArrowUp/ArrowDown for price indicators

## Animations

**Minimal, purposeful animations**:
- Price update pulse (subtle flash on change)
- Card hover lift (transform: translateY(-2px))
- Loading states for trade execution
- Success confirmation (scale + fade)

## Images

**Hero Image**: High-quality F1 action shot - preferably cars racing wheel-to-wheel or dramatic podium celebration. Full-bleed right side of hero section.

**Team Logos**: Official F1 team logos for each of the 10 teams (Mercedes, Red Bull, Ferrari, McLaren, Aston Martin, Alpine, Williams, RB, Sauber, Haas)

**Optional Backgrounds**: Subtle track map patterns or racing stripe motifs as decorative elements

## Page Structure

1. **Hero**: Split layout with CTA and imagery
2. **Market Overview**: Live prices for all 10 teams (5-column grid on desktop)
3. **How It Works**: 3-step explainer (Buy shares → Prices adjust → Winner takes prize pool)
4. **Market Stats**: Current prize pool, distribution, activity metrics
5. **CTA Section**: "Join the Market" with wallet setup
6. **Footer**: Simple links, disclaimer about mock trading

## Responsive Behavior

- Desktop: Multi-column grids, side-by-side dashboards
- Tablet: 2-column team grids, stacked dashboard sections
- Mobile: Single column, bottom-fixed trading bar, swipeable team carousel