# Financial Statement Visualization - Documentation

This directory contains research findings, design decisions, and architectural documentation for the financial statement visualization project.

## Document Structure

- **research/**: Research findings from specialized agents
  - `financial-data-providers.md`: Financial data provider analysis and recommendations
  - `market-analysis.md`: Market research and competitive analysis
  - `user-research.md`: User needs and behavior insights

- **design/**: Architecture and design decisions
  - `data-provider-abstraction.md`: Data provider layer design rationale
  - `api-design.md`: REST API design decisions
  - `database-schema.md`: Database design and normalization decisions
  - `ui-architecture.md`: Frontend architecture decisions

- **decisions/**: Architecture Decision Records (ADRs)
  - `001-data-provider-abstraction.md`: Decision to implement provider abstraction
  - `002-sec-edgar-primary.md`: Decision to use SEC EDGAR as primary source
  - `003-testing-strategy.md`: Testing approach for financial data accuracy

- **communication/**: Agent communication and handoffs
  - `agent-handoffs.md`: Information passed between agents
  - `research-requests.md`: Pending research requests for specialized agents
  - `implementation-feedback.md`: Feedback from implementation back to research

## Agent Communication Protocol

### Research Request Format
```markdown
## Research Request: [Topic]
**Requesting Agent**: [main/specialized]
**Date**: [YYYY-MM-DD]
**Priority**: [high/medium/low]

### Context
[Background information and current state]

### Research Questions
1. [Specific question 1]
2. [Specific question 2]

### Expected Deliverables
- [Expected output format]
- [Key decisions needed]

### Implementation Impact
[How this research affects current implementation]
```

### Research Response Format
```markdown
## Research Response: [Topic]
**Research Agent**: [agent-name]
**Date**: [YYYY-MM-DD]
**Status**: [complete/partial/needs-followup]

### Executive Summary
[Key findings and recommendations]

### Detailed Analysis
[Comprehensive analysis]

### Implementation Recommendations
[Specific actions for implementation]

### Follow-up Questions
[Additional research needed]
```

## Version Control
- All documents are version controlled with git
- Major research updates trigger documentation reviews
- Implementation decisions reference specific research versions