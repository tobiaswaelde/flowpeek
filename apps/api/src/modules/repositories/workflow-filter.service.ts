import { BadRequestException, Injectable } from '@nestjs/common';
import picomatch from 'picomatch';

export type WorkflowFilterMode = 'ALLOW' | 'DENY';

/** A persisted repository workflow filter used during read-only synchronization. */
export interface WorkflowFilterRule {
  mode: WorkflowFilterMode;
  pattern: string;
}

/** Validates and evaluates repository workflow filters with deny precedence. */
@Injectable()
export class WorkflowFilterService {
  /** Validate a workflow-name glob before it is stored as a repository filter. */
  validatePattern(pattern: string): void {
    if (pattern.trim().length === 0 || pattern.includes('\u0000')) {
      throw new BadRequestException('Workflow filter patterns must not be empty.');
    }

    try {
      picomatch(pattern, { bash: true });
    } catch {
      throw new BadRequestException('Workflow filter pattern is invalid.');
    }
  }

  /**
   * Return whether a workflow should be tracked.
   *
   * Deny rules always take precedence. With one or more allow rules, a name
   * must match at least one allow rule; without allow rules, it is included.
   */
  shouldTrack(workflowName: string, filters: WorkflowFilterRule[]): boolean {
    const matchingRule = (mode: WorkflowFilterMode) =>
      filters.some((filter) => filter.mode === mode && picomatch.isMatch(workflowName, filter.pattern, { bash: true }));

    if (matchingRule('DENY')) return false;

    const hasAllowRules = filters.some((filter) => filter.mode === 'ALLOW');
    return !hasAllowRules || matchingRule('ALLOW');
  }
}
