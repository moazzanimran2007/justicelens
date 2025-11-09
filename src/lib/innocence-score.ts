/**
 * Calculate innocence likelihood score based on analysis data
 * Returns a score from 0-100
 */

interface InnocenceScoreData {
  innocenceClaims?: {
    count: number;
    examples?: string[];
  };
  biasIndicators?: {
    categories?: Array<{
      severity: string;
      count: number;
    }>;
    overall_assessment?: string;
  };
  legalMemo?: {
    wrongful_conviction_issues?: string[];
    evidence_used_to_convict?: string[];
    defense_presented?: string;
    prosecution_presented?: string;
  };
}

export function calculateInnocenceScore(data: InnocenceScoreData): number {
  let score = 0;

  // 1. Innocence Claims Score (30 points max)
  if (data.innocenceClaims) {
    const claimCount = data.innocenceClaims.count || 0;
    const claimScore = Math.min(claimCount * 5, 30); // 5 points per claim, max 30
    score += claimScore;
  }

  // 2. Wrongful Conviction Indicators (35 points max)
  if (data.legalMemo?.wrongful_conviction_issues) {
    const issueCount = data.legalMemo.wrongful_conviction_issues.length;
    const convictionScore = Math.min(issueCount * 7, 35); // 7 points per issue, max 35
    score += convictionScore;
  }

  // 3. Bias Score Impact (25 points max)
  if (data.biasIndicators?.categories) {
    const totalBiasCount = data.biasIndicators.categories.reduce((sum, cat) => {
      const multiplier = cat.severity === "high" ? 2 : cat.severity === "moderate" ? 1.5 : 1;
      return sum + (cat.count * multiplier);
    }, 0);
    const biasScore = Math.min(totalBiasCount * 2, 25); // 2 points per weighted bias, max 25
    score += biasScore;
  }

  // 4. Evidence Quality Assessment (10 points max)
  if (data.legalMemo?.evidence_used_to_convict) {
    const evidenceCount = data.legalMemo.evidence_used_to_convict.length;
    // Fewer pieces of evidence might indicate weaker case
    if (evidenceCount <= 2) {
      score += 10;
    } else if (evidenceCount <= 4) {
      score += 6;
    } else {
      score += 3;
    }
  }

  return Math.min(Math.round(score), 100);
}

export function getScoreCategory(score: number): {
  label: string;
  color: string;
  description: string;
} {
  if (score >= 75) {
    return {
      label: "High Likelihood",
      color: "text-primary",
      description: "Strong indicators suggest potential wrongful conviction",
    };
  } else if (score >= 50) {
    return {
      label: "Moderate Likelihood",
      color: "text-warning",
      description: "Notable concerns warrant further investigation",
    };
  } else if (score >= 25) {
    return {
      label: "Low-Moderate Likelihood",
      color: "text-accent",
      description: "Some indicators present but not conclusive",
    };
  } else {
    return {
      label: "Low Likelihood",
      color: "text-muted-foreground",
      description: "Limited indicators of potential innocence",
    };
  }
}
