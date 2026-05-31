export interface ContentTemplate {
  id: string
  contentType: string
  name: string
  description: string
  icon: string
  starterContent: string
}

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    id: 'lesson-plan',
    contentType: 'lesson',
    name: 'Lesson Plan',
    description: 'Structured lesson with objectives, materials, and assessment',
    icon: '📋',
    starterContent: `## Lesson Overview\n\n**Topic:** \n**Duration:** \n**Level:** \n\n## Learning Objectives\n\n- \n- \n- \n\n## Materials Needed\n\n- \n- \n\n## Lesson Structure\n\n### 1. Introduction (5 min)\n\n### 2. Main Activity (20 min)\n\n### 3. Practice (15 min)\n\n### 4. Assessment (5 min)\n\n## Key Takeaways\n\n- \n- \n\n## Homework / Next Steps`,
  },
  {
    id: 'course-outline',
    contentType: 'course',
    name: 'Course Outline',
    description: 'Multi-module course structure with sections',
    icon: '🎓',
    starterContent: `## Course Description\n\n\n## Prerequisites\n\n- \n- \n\n## Module 1: Introduction\n\n### Topics Covered\n- \n- \n\n### Learning Outcomes\n- \n- \n\n## Module 2: Core Concepts\n\n### Topics Covered\n- \n- \n\n### Learning Outcomes\n- \n- \n\n## Module 3: Advanced Topics\n\n### Topics Covered\n- \n- \n\n### Learning Outcomes\n- \n- \n\n## Final Project\n\n\n## Assessment Criteria\n\n- \n- \n-`,
  },
  {
    id: 'tutorial-guide',
    contentType: 'guide',
    name: 'Tutorial / Guide',
    description: 'Step-by-step walkthrough with instructions',
    icon: '🗺️',
    starterContent: `# Tutorial: \n\n## Overview\n\nIn this tutorial, you'll learn how to \n\n## Prerequisites\n\n- \n- \n\n## Step 1: \n\n\n## Step 2: \n\n\n## Step 3: \n\n\n## Summary\n\nCongratulations! You've learned how to \n\n## Next Steps\n\n- \n-`,
  },
  {
    id: 'article-starter',
    contentType: 'article',
    name: 'Article Starter',
    description: 'Standard article with intro, body, and conclusion',
    icon: '📄',
    starterContent: `# \n\n## Introduction\n\n\n## Main Content\n\n\n## Key Points\n\n- \n- \n- \n\n## Conclusion\n\n\n## Further Reading\n\n- \n-`,
  },
  {
    id: 'resource-list',
    contentType: 'resource',
    name: 'Resource List',
    description: 'Curated list of links, tools, and references',
    icon: '📦',
    starterContent: `# Resource List: \n\n## Tools & Software\n\n- **[Tool Name]()** — \n- **[Tool Name]()** — \n\n## Reading & References\n\n- \n- \n\n## Templates & Examples\n\n- \n- \n\n## Community & Support\n\n- \n-`,
  },
  {
    id: 'quick-note',
    contentType: 'note',
    name: 'Quick Note',
    description: 'Brief note or observation',
    icon: '📝',
    starterContent: `## Note\n\n\n## Key Takeaways\n\n- \n- \n\n## Related\n\n- \n-`,
  },
]

export const CONTENT_TYPE_MAP: Record<string, string> = {
  article: '📄 Article',
  lesson: '📖 Lesson',
  note: '📝 Note',
  guide: '🗺️ Guide',
  course: '🎓 Course',
  resource: '📦 Resource',
  quiz: '❓ Quiz',
  video: '🎬 Video',
  tutorial: '🔧 Tutorial',
}

export function getTemplateForContentType(contentType: string): ContentTemplate[] {
  return CONTENT_TEMPLATES.filter(t => t.contentType === contentType)
}
