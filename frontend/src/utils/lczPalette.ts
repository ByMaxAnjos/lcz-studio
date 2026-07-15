/**
 * LCZ Color Palette
 * 17 Local Climate Zone classes with their standardized colors
 * Based on WUDAPT LCZ scheme
 */

export const LCZ_PALETTE = {
  // Built types (1-10)
  1: '#910019',  // Compact highrise
  2: '#d91e1e',  // Compact midrise
  3: '#ff0000',  // Compact lowrise
  4: '#bf4d4d',  // Open highrise
  5: '#d97676',  // Open midrise
  6: '#ffaaaa',  // Open lowrise
  7: '#ca9146',  // Lightweight lowrise
  8: '#ffb3ae',  // Large lowrise
  9: '#ffd37f',  // Sparsely built
  10: '#a4cc51', // Heavy industry
  
  // Land cover types (11-17)
  11: '#61ae63', // Dense trees
  12: '#30a500', // Scattered trees
  13: '#b3cc33', // Bush, scrub
  14: '#ffff00', // Low plants
  15: '#ababab', // Bare rock or paved
  16: '#ffffff', // Bare soil or sand
  17: '#e6e6e6', // Water
}

export const LCZ_NAMES = {
  1: 'Compact highrise',
  2: 'Compact midrise',
  3: 'Compact lowrise',
  4: 'Open highrise',
  5: 'Open midrise',
  6: 'Open lowrise',
  7: 'Lightweight lowrise',
  8: 'Large lowrise',
  9: 'Sparsely built',
  10: 'Heavy industry',
  11: 'Dense trees',
  12: 'Scattered trees',
  13: 'Bush, scrub',
  14: 'Low plants',
  15: 'Bare rock or paved',
  16: 'Bare soil or sand',
  17: 'Water',
}

export function getLCZColor(lczClass: number): string {
  return LCZ_PALETTE[lczClass as keyof typeof LCZ_PALETTE] || '#cccccc'
}

export function getLCZName(lczClass: number): string {
  return LCZ_NAMES[lczClass as keyof typeof LCZ_NAMES] || 'Unknown'
}

export function getLCZPaletteArray(): { value: number; color: string; name: string }[] {
  return Object.entries(LCZ_PALETTE).map(([key, color]) => ({
    value: parseInt(key),
    color,
    name: getLCZName(parseInt(key)),
  }))
}
