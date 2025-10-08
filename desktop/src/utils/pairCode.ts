// Utility for generating a 6-digit code for pairing
export function generatePairCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
