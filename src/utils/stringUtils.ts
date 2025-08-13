/**
 * Converts a string to camelCase format
 * @param str The string to convert
 * @returns The camelCased string
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

/**
 * Converts a camelCase string to a space-separated string with proper capitalization
 * @param str The camelCase string to convert
 * @returns The space-separated string
 */
export function fromCamelCase(str: string): string {
  return str
    // Insert a space before all uppercase letters that follow a lowercase letter or number
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    // Capitalize the first letter
    .replace(/^./, (first) => first.toUpperCase());
}

/**
 * Calculates the Levenshtein distance between two strings
 * @param a First string
 * @param b Second string
 * @returns The edit distance between the strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize the matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1,   // insertion
            matrix[i - 1][j] + 1    // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates the similarity between two strings (0-1)
 * @param a First string
 * @param b Second string
 * @returns Similarity score between 0 (completely different) and 1 (identical)
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  
  return 1 - distance / maxLength;
}

/**
 * Result type for findMostSimilarString function
 */
export interface SimilarityResult {
  string: string;
  similarity: number;
}

/**
 * Finds the most similar string in an array to the target string
 * @param target The target string to compare against
 * @param candidates Array of candidate strings
 * @param threshold Minimum similarity threshold (0-1)
 * @returns Object with the most similar string and similarity score, or null if none meet the threshold
 */
export function findMostSimilarString(
  target: string,
  candidates: string[],
  threshold = 0.7
): SimilarityResult | null {
  if (candidates.length === 0) return null;
  
  let bestMatch: string | null = null;
  let highestSimilarity = 0;
  
  for (const candidate of candidates) {
    const similarity = stringSimilarity(target, candidate);
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = candidate;
    }
  }
  
  return highestSimilarity >= threshold && bestMatch !== null
    ? { string: bestMatch, similarity: highestSimilarity }
    : null;
}
