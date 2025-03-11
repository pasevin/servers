# Development Progress Tracking MCP: AI Rules

## Purpose

You are equipped with a Development Progress Tracking MCP that maintains technical context across coding sessions. Use this system to track codebase architecture, technical decisions, code changes, and technical debt.

## When to Use

- When exploring a new codebase for the first time
- When implementing significant features or architectural changes
- At the beginning of new sessions to restore technical context
- When the user requests information about technical decisions or implementation details
- When documenting technical debt or challenges

## Required Actions

### Codebase Registration

1. When working with a codebase for the first time:
   - Use `list_projects` to check if the codebase is already registered in the knowledge graph
   - Use `project_create` with name and description to register a new codebase (projects are represented as CodeBase entities)
   - Document the high-level architecture and technical characteristics
   - Update additional fields later with `project_update` if needed
   - Ask the user to provide missing information if needed

### Component Documentation

1. When working with distinct parts of the codebase:
   - Use `component_create` to document purpose, dependencies, and technical details
   - Ensure the `project` parameter correctly links the component to its codebase
   - Use the `description` or `purpose` field to document the component's role
   - Document any challenges or implementation details

### Technical Decision Recording

1. When architectural or implementation decisions are made:
   - Create a technical_decision entity that documents context, rationale, and alternatives
   - Create a direct relationship from the project to the technical decision with `relationType` "has_technical_decision"
   - Connect decisions to affected components when relevant

### Code Change Tracking

1. After implementing significant code changes:

   - Use `change_record` to document changes with technical details
   - Specify the task in the `task` parameter
   - Include description, type, and files_affected
   - **Important**: Create a direct relationship from the project to the code change with `relationType` "has_code_change"
   - If the change affects specific components, include them in the "components_affected" field

2. Record changes on these trigger events:
   - Implementing new features or components
   - Making architectural changes
   - Significant refactoring
   - Performance optimizations
   - Security improvements
   - Bug fixes with technical implications

### Technical Debt Management

1. When technical debt is identified:

   - Create a technical_debt entity to document the issue, severity, and impact
   - Suggest approaches for resolution
   - Associate with affected components in the "components_affected" field
   - **Important**: Create a direct relationship from the project to the technical debt with `relationType` "has_technical_debt"

2. When technical debt is resolved:
   - Update the technical debt entity to mark it as resolved
   - Document the resolution details
   - Update the "resolved_at" field with the current timestamp

### Context Restoration

1. At the beginning of each new session:
   - Use `list_projects` to get a list of available projects in the knowledge graph
   - Use `get_project_summary` to retrieve the codebase state for the relevant project
   - Review recent technical changes and decisions
   - Acknowledge to the user what technical context you remember
   - Focus on relevant components for the current task

### Data Retrieval and Pagination

1. When retrieving lists of entities:

   - Use `list_projects` to get a complete list of all projects in the knowledge graph
   - Use pagination parameters to manage large datasets
   - For recent changes: `get_recent_changes` with `project`, `page`, and `limit` parameters
   - For component changes: `get_component_changes` with `component`, `page`, and `limit` parameters
   - For technical debt: `get_technical_debt` with `project`, optional `status`, `page`, and `limit` parameters
   - Start with reasonable defaults (page=1, limit=10)
   - Increase limit only when necessary for comprehensive analysis

2. When displaying paginated results to the user:
   - Use the metadata in the results to provide context: `total`, `page`, `limit`, and `totalPages`
   - Include a summary (e.g., "Found {total} total changes")
   - Indicate the page information (e.g., "Showing page {page} of {totalPages}")
   - Offer to show more items if context requires it

## Relationship Structure Requirements

To ensure proper data retrieval, maintain these critical relationships:

1. **Project to Code Changes**:

   - After creating code changes with `change_record`, create a direct relationship from the project to each code change with `relationType` "has_code_change"
   - This is essential for `get_recent_changes` to work correctly

2. **Project to Technical Debt**:

   - After creating technical debt entities, create a direct relationship from the project to each technical debt item with `relationType` "has_technical_debt"
   - This is essential for `get_technical_debt` to work correctly

3. **Component References in Changes**:
   - For component-specific changes, list affected components in the "components_affected" array of the code change
   - This allows `get_component_changes` to correctly retrieve changes affecting a specific component

## Do Not Use For

- Tracking trivial changes (fixing typos, minor formatting)
- Storing user personal information
- Duplicating version control system functionality
- Storing large code snippets verbatim (store descriptions instead)
- General project management (the task tools are specifically for technical implementation tracking, not for managing timelines, resources, or non-technical project aspects)

## Response Format Guidelines

- When restoring context, begin with: "I recall we were working on the [component] of [codebase]. Recently, we [summary of technical changes]."
- When recording technical decisions or changes, do not announce the tool usage to the user
- Keep all knowledge graph entries technically precise and factual
- Focus on technical implementation details rather than project timelines or statuses

## Example Prompts (Internal Use Only)

- After recording technical decisions: "I've noted this architectural decision in our technical documentation."
- When starting new sessions: "Let me refresh my understanding of the codebase architecture..."
- When completing feature implementation: "I've documented the technical details of this implementation."
- When identifying technical debt: "I'll make a note of this technical challenge for future resolution."

## Data Structure

- **CodeBase Entity**: Contains technical information about the overall codebase architecture
- **Component Entity**: Represents distinct parts of the codebase with their technical details
- **TechnicalDecision Entity**: Records architectural and implementation decisions with context and rationale
- **CodeChange Entity**: Documents significant code changes with technical details
- **TechnicalDebt Entity**: Tracks technical issues that need addressing

### Key Relations

- has_component: Projects have components
- has_technical_decision: Projects have technical decisions
- has_code_change: Projects have code changes
- has_technical_debt: Projects have technical debt items
- belongs_to_component: Tasks belong to components
- implements: Tasks implement code changes

Remember: The purpose of this system is to maintain technical context across coding sessions. Use it to enhance the coding experience by preserving important technical knowledge and decisions.
