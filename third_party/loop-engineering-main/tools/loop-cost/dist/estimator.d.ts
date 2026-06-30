export type ReadinessLevel = 'L1' | 'L2' | 'L3';
export declare const VALID_READINESS_LEVELS: ReadinessLevel[];
export declare function assertValidLevel(level: string): asserts level is ReadinessLevel;
export interface PatternCost {
    tokens_noop: number;
    tokens_report: number;
    tokens_action: number;
    suggested_daily_cap: number;
    early_exit_required: boolean;
}
export interface RegistryPattern {
    id: string;
    name: string;
    cadence: string;
    token_cost: string;
    cost: PatternCost;
}
export interface RegistryDoc {
    patterns: RegistryPattern[];
}
export interface EstimateInput {
    pattern: RegistryPattern;
    cadence?: string;
    level: ReadinessLevel;
    conservative?: boolean;
}
export interface EstimateResult {
    patternId: string;
    patternName: string;
    cadence: string;
    level: ReadinessLevel;
    runsPerDay: number;
    tokenCostTier: string;
    suggestedDailyCap: number;
    earlyExitRequired: boolean;
    scenarios: {
        noop: {
            tokensPerRun: number;
            tokensPerDay: number;
        };
        report: {
            tokensPerRun: number;
            tokensPerDay: number;
        };
        action: {
            tokensPerRun: number;
            tokensPerDay: number;
        };
        realistic: {
            tokensPerRun: number;
            tokensPerDay: number;
            assumptions: string;
        };
    };
    warnings: string[];
}
export declare function parseInterval(token: string): number;
/** Runs per day for a single interval like 15m or 1d. */
export declare function runsPerDayForInterval(interval: string): number;
/**
 * Parse pattern cadence (e.g. 5m-15m, 1d-2h) into runs/day.
 * conservative=true picks the slower cadence in a range.
 */
export declare function cadenceToRunsPerDay(cadence: string, conservative?: boolean): number;
export declare function estimateCost(input: EstimateInput): EstimateResult;
export declare function formatEstimateHuman(r: EstimateResult): string;
