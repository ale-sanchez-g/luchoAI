---
id: ytkb-000
title: Index and Metadata Schema — Youth Team-Sport Training Knowledge Base
doc_type: index
sport: [football, rugby, general-team-sport]
age_range: 5-18
sex: all
maturation_stage: all
last_reviewed: 2026-06-12
review_frequency: annual
references:
  - name: Sport for Life (LTAD framework)
    url: https://sportforlife.ca
  - name: NSCA Position Statements
    url: https://www.nsca.com/about-us/position-statements/
---

# Youth Team-Sport Training Knowledge Base — Index

This knowledge base provides evidence-informed context for generating youth training
programs for team sports (football/soccer and rugby). Files are designed to be filtered
by metadata before content retrieval.

## File Index

| ID | File | Purpose |
|----|------|---------|
| ytkb-000 | 00-index-and-metadata-schema.md | This file. Schema definition. |
| ytkb-001 | 01-athlete-development-framework.md | LTAD, maturation, PHV, age/stage prescription rules |
| ytkb-002 | 02-speed-and-agility.md | Sprint mechanics, agility, change of direction drills |
| ytkb-003 | 03-strength-and-power-youth.md | Resistance training, plyometrics, safe progression |
| ytkb-004 | 04-endurance-and-conditioning.md | Aerobic development, small-sided games, conditioning |
| ytkb-005 | 05-football-soccer-specific.md | Football-specific sessions and technical-physical blends |
| ytkb-006 | 06-rugby-specific.md | Rugby-specific contact prep, conditioning, positional notes |
| ytkb-007 | 07-injury-prevention-and-recovery.md | Growth-related injury risk, warm-up protocols, recovery |

## Metadata Schema (YAML frontmatter)

Every file uses the following fields. Your AI system should filter on these before
generating programs.

```yaml
id: string            # Unique document ID (ytkb-XXX)
title: string
doc_type: enum        # index | framework | drill-library | sport-specific | safety
sport: list           # football | rugby | general-team-sport
age_range: string     # e.g. "9-12", "13-15", "5-18"
sex: enum             # all | male | female | see-content
                      # "see-content" = sex-specific notes exist inside the doc
maturation_stage: list # pre-PHV | circa-PHV | post-PHV | all
                      # PHV = Peak Height Velocity (adolescent growth spurt)
body_build_notes: string # Free text. How build affects prescription, if at all.
training_focus: list  # speed | agility | strength | power | endurance | technique | recovery
intensity: enum       # low | moderate | high | progressive
equipment: list
session_duration_min: integer  # typical session length where applicable
last_reviewed: date
review_frequency: enum # annual | biannual
references: list       # name + url pairs for live verification
```

## Important Prescription Rules (read before generating any program)

1. **Maturation beats chronological age.** Two 13-year-olds can be 3+ biological years
   apart. Where maturation status is unknown, default to the conservative
   (pre-PHV) prescription and progress based on competency, not age.
2. **Sex differences are minimal pre-puberty.** Pre-PHV programming is effectively
   identical for boys and girls. Post-PHV, females warrant additional emphasis on
   knee-injury prevention (ACL risk) and boys on managing rapid strength gains with
   technique discipline. Details in ytkb-007.
3. **Body build is a coaching cue, not a program filter.** Do not assign different
   programs by somatotype for children. Build matters mainly for: rugby positional
   suitability guidance (post-PHV only), load selection in strength work, and
   landing-mechanics emphasis for taller, rapidly growing athletes.
4. **Technique before load, load before velocity, velocity before complexity.**
5. **All sessions require warm-up and cool-down** — use FIFA 11+ Kids / Activate
   protocols (ytkb-007) as defaults.

## Reference Refresh Strategy

URLs in each file point to governing bodies and standing position statements rather
than news articles, so they remain stable. Check `last_reviewed` against
`review_frequency`; if expired, re-fetch the listed URLs before generating programs.
