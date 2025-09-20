---
name: design-review
description: Conduct a comprehensive design review of UI changes using the design-review agent
---

You need to invoke the design-review agent to conduct a comprehensive design review of FinScope's Bloomberg Terminal-inspired interface.

**FinScope Design Standards (September 2025):**
FinScope follows a dark theme financial terminal aesthetic. The review must evaluate against these specific standards:

- **Dark Theme Requirements**: Near-black backgrounds (#0A0B0D), high contrast text
- **Monospace Typography**: ALL financial numbers must use SF Mono, Monaco, or Consolas
- **Visual-First Data**: Sparklines, gauges, and charts over text-heavy presentations
- **Professional Aesthetic**: Bloomberg Terminal sophistication with modern web polish
- **Information Density**: Maximum insight per pixel while maintaining readability

First, start the development server if it's not already running, then use the design-review agent to systematically review all UI changes following the enhanced phases outlined in /.claude/agents/design-review-agent.md.

The agent will:
1. Prepare by analyzing changes and setting up Playwright
2. Test interaction and user flows
3. **Verify FinScope standards**: Dark theme, monospace fonts, visual-first data
4. Assess Bloomberg Terminal-level professional aesthetic
5. Check enhanced accessibility for dark theme
6. Test robustness and financial data accuracy
7. Review code health and design token usage
8. Check content and console for issues

Use the Task tool to invoke the design-review agent with the following prompt:

"Review the FinScope UI against Bloomberg Terminal standards. The development server should be running on http://localhost:3000. Conduct a comprehensive design review focusing on dark theme compliance, monospace typography for financial data, visual-first presentation, and professional financial interface standards. Provide a structured report with findings categorized as Blockers, High-Priority, Medium-Priority, and Nitpicks."

The final output should be a markdown report following the structure defined in the agent configuration.