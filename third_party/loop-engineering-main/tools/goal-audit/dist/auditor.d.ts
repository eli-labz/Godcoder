export interface GoalSignals {
    goalFile: {
        present: boolean;
        path?: string;
    };
    goalConfig: {
        present: boolean;
    };
    skills: {
        count: number;
        goalSkills: string[];
    };
    verifier: {
        present: boolean;
    };
    scoper: {
        present: boolean;
    };
    agentsMd: {
        present: boolean;
        mentionsGoal: boolean;
    };
    patterns: {
        documented: boolean;
    };
    safety: {
        safetyDocPresent: boolean;
        budgetDoc: boolean;
    };
    tests: {
        present: boolean;
    };
    ci: {
        present: boolean;
    };
    runLog: {
        present: boolean;
    };
}
export interface Finding {
    level: 'ok' | 'warn' | 'fail';
    message: string;
}
export interface AuditResult {
    target: string;
    score: number;
    level: 'G0' | 'G1' | 'G2' | 'G3';
    assessment: string;
    signals: GoalSignals;
    findings: Finding[];
    recommendations: string[];
}
export declare function auditProject(target: string): Promise<AuditResult>;
//# sourceMappingURL=auditor.d.ts.map