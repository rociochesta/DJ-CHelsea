// Positions are the user's numbered asset folders, not the classic US board.
// In particular, Chile/Oklahoma each have three properties; Games has two.
export const LOVOPOLY_GROUPS = {
  chile: { name: 'Chile', color: '#ed246d' },
  oklahoma: { name: 'Oklahoma', color: '#00b5e5' },
  together: { name: 'Together', color: '#d60c37' },
  distance: { name: 'Across the distance', color: '#ff9017' },
  games: { name: 'Our games', color: '#00ad71' },
  chemistry: { name: 'Chemistry', color: '#8747c5' },
  you: { name: 'You', color: '#f8c02d' },
  us: { name: 'Us', color: '#ef1645' },
};

const spaces = [
  ['Hello, Beautiful', 'go'],
  ['Costanera Center', 'property', 'chile'],
  ['From Me to You', 'community'],
  ['Cerro San Cristóbal', 'property', 'chile'],
  ['Long Distance Tax', 'tax'],
  ['Santiago Airport', 'station'],
  ['Barrio Lastarria', 'property', 'chile'],
  ['Love or Disaster', 'chance'],
  ["Eskimo Joe’s", 'property', 'oklahoma'],
  ['Boomer Lake', 'property', 'oklahoma'],
  ['Kiss Detention', 'detention'],
  ['Grey Snow Eagle House', 'property', 'oklahoma'],
  ['Chemistry Generator', 'utility'],
  ['Sushi', 'property', 'together'],
  ['NA Meeting', 'property', 'together'],
  ['WhatsApp Express', 'station'],
  ['Gay Bar', 'property', 'together'],
  ['From Me to You', 'community'],
  ['Midnight Spicy', 'property', 'distance'],
  ['Plane Ticket', 'property', 'distance'],
  ['Netflix & Chill', 'rest'],
  ['Good Morning Text', 'property', 'distance'],
  ['Love or Disaster', 'chance'],
  ['Words With You', 'property', 'games'],
  ['Music Quiz Battle', 'property', 'games'],
  ['Love Airlines', 'station'],
  ['The Tension Is Real', 'property', 'chemistry'],
  ['Tease Me Again', 'property', 'chemistry'],
  ['Kiss Factory', 'utility'],
  ['One More Kiss', 'property', 'chemistry'],
  ["Can’t Behave", 'go-to-detention'],
  ['Your Eyes', 'property', 'you'],
  ['Your Sense of Humor', 'property', 'you'],
  ['From Me to You', 'community'],
  ['The Way You Think', 'property', 'you'],
  ['Oklahoma City Airport', 'station'],
  ['Love or Disaster', 'chance'],
  ['All Yours', 'property', 'us'],
  ['Being Naughty Fine', 'tax'],
  ['Completely Mine', 'property', 'us'],
];

const repeatedArt = { 17: 2, 33: 2, 22: 7, 36: 7 };
const overlays = { 3: 'cerro-birds-overlay.svg', 4: 'long-distance-airplane.svg', 5: 'santiago-airport-plane.svg' };
// Classic deed schedules assigned by color group, not by board index.
// Chile has an extra property: its first two deeds share the lower schedule.
const deeds = {
  chile: [[60,2,10,30,90,160,250],[60,2,10,30,90,160,250],[60,4,20,60,180,320,450]],
  oklahoma: [[100,6,30,90,270,400,550],[100,6,30,90,270,400,550],[120,8,40,100,300,450,600]],
  together: [[140,10,50,150,450,625,750],[140,10,50,150,450,625,750],[160,12,60,180,500,700,900]],
  distance: [[180,14,70,200,550,750,950],[180,14,70,200,550,750,950],[200,16,80,220,600,800,1000]],
  games: [[220,18,90,250,700,875,1050],[240,20,100,300,750,925,1100]],
  chemistry: [[260,22,110,330,800,975,1150],[260,22,110,330,800,975,1150],[280,24,120,360,850,1025,1200]],
  you: [[300,26,130,390,900,1100,1275],[300,26,130,390,900,1100,1275],[320,28,150,450,1000,1200,1400]],
  us: [[350,35,175,500,1100,1300,1500],[400,50,200,600,1400,1700,2000]],
};
const deedFor = (id, group) => deeds[group]?.[spaces.slice(0,id).filter(s => s[2] === group).length];
export const LOVOPOLY_TILES = spaces.map(([name, type, group], id) => ({
  id, name, type, group: group || null,
  price: type === 'property' ? deedFor(id, group)[0] : type === 'station' ? 200 : type === 'utility' ? 150 : 0,
  rent: type === 'property' ? deedFor(id, group)[1] : 0,
  rents: type === 'property' ? deedFor(id, group).slice(1) : [],
  buildingCost: type === 'property' ? 50 * (1 + Math.floor(Object.keys(LOVOPOLY_GROUPS).indexOf(group) / 2)) : 0,
  image: `/lovopoly/tile-${String(repeatedArt[id] ?? id).padStart(2, '0')}.webp`,
  thumbnail: `/lovopoly/board-${String(repeatedArt[id] ?? id).padStart(2, '0')}.webp`,
  overlay: overlays[id] ? `/lovopoly/${overlays[id]}` : null,
}));

export const TOKEN_COLORS = {
  Blush: '#ffc3d8', Gold: '#ffdf96', Mint: '#9ae8c8',
  Sky: '#a9d9ff', Lilac: '#d6bdff', Ivory: '#fff2dd',
};

const tokenSets = {
  Love: 'Heart Lips Ring Rose Plane Star Arrow Bow Cherry Coffee Cupcake Gift Key Lovelock Phone',
  Animal: 'Bat Bee Crab Fox Giraffe Hedge Jellyfish Lamb Panda Penguin Pig Sloth Snail Squid Turtle',
};

export const LOVOPOLY_TOKENS = Object.entries(tokenSets).flatMap(([category, names]) =>
  names.split(' ').map(asset => ({
    id: asset === 'Lips' ? 'kiss' : asset.toLowerCase(),
    name: ({ Hedge: 'Hedgehog', Lovelock: 'Love lock' })[asset] || asset,
    category,
    asset: category + '_' + asset,
  }))
);

export const PREMIUM_TOKENS = LOVOPOLY_TOKENS.filter(token => !['plane', 'jellyfish'].includes(token.id));

// Board coordinates in a 1250-square: nine 100×175 spaces per edge.
export function lovopolyTileLayout(id) {
  if (!Number.isInteger(id) || id < 0 || id > 39) throw new Error('Invalid tile.');
  if (id % 10 === 0) return { x: id === 0 || id === 30 ? 1075 : 0, y: id < 20 ? 1075 : 0, w: 175, h: 175, rotation: 0 };
  if (id < 10) return { x: 1075 - id * 100, y: 1075, w: 100, h: 175, rotation: 0 };
  if (id < 20) return { x: 0, y: 1075 - (id - 10) * 100, w: 175, h: 100, rotation: 90 };
  if (id < 30) return { x: 175 + (id - 21) * 100, y: 0, w: 100, h: 175, rotation: 180 };
  return { x: 1075, y: 175 + (id - 31) * 100, w: 175, h: 100, rotation: 270 };
}
