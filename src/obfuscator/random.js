/**
 * Seeded PRNG (Mulberry32 + Xoshiro128**) y utilidades criptográficas
 */
export class Random {
  constructor(seed = Math.floor(Math.random() * 0xFFFFFFF)) {
    this.reserved = new Set();
    this.seed = seed;
    this.s = seed >>> 0;
  }

  // Generador Mulberry32 de 32-bit
  nextFloat() {
    let t = (this.s += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min, max) {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  nextBoolean(probability = 0.5) {
    return this.nextFloat() < probability;
  }

  shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  hexId(length = 4) {
    let result = '_0x';
    const chars = '0123456789abcdef';
    for (let i = 0; i < length; i++) {
      result += chars[this.nextInt(0, chars.length - 1)];
    }
    while (this.reserved.has(result)) result += '_';
    this.reserved.add(result);
    return result;
  }
}
