# Knowledge Graph Memory Server

A basic implementation of persistent memory using a local knowledge graph. This lets Claude remember information about the user across chats.

## Core Concepts

### Entities

Entities are the primary nodes in the knowledge graph. Each entity has:

- A unique name (identifier)
- An entity type (e.g., "person", "organization", "event")
- A list of observations

Example:

```json
{
  "name": "John_Smith",
  "entityType": "person",
  "observations": ["Speaks fluent Spanish"]
}
```

### Relations

Relations define directed connections between entities. They are always stored in active voice and describe how entities interact or relate to each other.

Example:

```json
{
  "from": "John_Smith",
  "to": "Anthropic",
  "relationType": "works_at"
}
```

### Observations

Observations are discrete pieces of information about an entity. They are:

- Stored as strings
- Attached to specific entities
- Can be added or removed independently
- Should be atomic (one fact per observation)

Example:

```json
{
  "entityName": "John_Smith",
  "observations": [
    "Speaks fluent Spanish",
    "Graduated in 2019",
    "Prefers morning meetings"
  ]
}
```

## API

### Knowledge Graph Tools

- **create_entities**

  - Create multiple new entities in the knowledge graph
  - Input: `entities` (array of objects)
    - Each object contains:
      - `name` (string): Entity identifier
      - `entityType` (string): Type classification
      - `observations` (string[]): Associated observations
  - Ignores entities with existing names

- **create_relations**

  - Create multiple new relations between entities
  - Input: `relations` (array of objects)
    - Each object contains:
      - `from` (string): Source entity name
      - `to` (string): Target entity name
      - `relationType` (string): Relationship type in active voice
  - Skips duplicate relations

- **add_observations**

  - Add new observations to existing entities
  - Input: `observations` (array of objects)
    - Each object contains:
      - `entityName` (string): Target entity
      - `contents` (string[]): New observations to add
  - Returns added observations per entity
  - Fails if entity doesn't exist

- **delete_entities**

  - Remove entities and their relations
  - Input: `entityNames` (string[])
  - Cascading deletion of associated relations
  - Silent operation if entity doesn't exist

- **delete_observations**

  - Remove specific observations from entities
  - Input: `deletions` (array of objects)
    - Each object contains:
      - `entityName` (string): Target entity
      - `observations` (string[]): Observations to remove
  - Silent operation if observation doesn't exist

- **delete_relations**

  - Remove specific relations from the graph
  - Input: `relations` (array of objects)
    - Each object contains:
      - `from` (string): Source entity name
      - `to` (string): Target entity name
      - `relationType` (string): Relationship type
  - Silent operation if relation doesn't exist

- **read_graph**

  - Read the entire knowledge graph
  - No input required
  - Returns complete graph structure with all entities and relations

- **search_nodes**

  - Search for nodes based on query
  - Input: `query` (string)
  - Searches across:
    - Entity names
    - Entity types
    - Observation content
  - Returns matching entities and their relations

- **open_nodes**
  - Retrieve specific nodes by name
  - Input: `names` (string[])
  - Returns:
    - Requested entities
    - Relations between requested entities
  - Silently skips non-existent nodes

## Development Progress Tracking

The memory server has been extended with development progress tracking capabilities, allowing AI coding assistants to maintain technical context across different sessions, understand the codebase architecture, track technical decisions, and keep up with code changes.

### Development Tracking Concepts

#### CodeBase Entity

- Represents the overall architecture and technical characteristics of the codebase:
  - Name (identifier)
  - Technologies (frameworks, languages, libraries)
  - Architecture (patterns, data flow)
  - Conventions (naming, organization)
  - Repository URL
  - Observations

#### Component Entity

- Represents distinct parts of the codebase:
  - Name (identifier)
  - Purpose
  - Dependencies
  - Technical details
  - Challenges
  - Status
  - Observations

#### TechnicalDecision Entity

- Represents key architectural or implementation decisions:
  - Name (identifier)
  - Context (problem being solved)
  - Rationale
  - Alternatives considered
  - Implications
  - Date made
  - Observations

#### CodeChange Entity

- Represents significant code modifications:
  - Description
  - Purpose (why the change was made)
  - Implementation details
  - Technical notes
  - Components affected
  - Files changed
  - Challenges addressed
  - Challenges introduced
  - Testing approach
  - Date
  - Observations

#### TechnicalDebt Entity

- Represents known technical debt items:
  - Description
  - Severity
  - Estimated impact
  - Suggested approach
  - Components affected
  - Created/resolved dates
  - Resolution details
  - Observations

### Development Tracking Tools

#### CodeBase Management Tools

- **codebase_register**

  - Registers or updates the codebase metadata
  - Input:
    - `name` (string): CodeBase identifier
    - `technologies` (string[]): List of technologies used
    - `architecture` (string): Description of architecture
    - `conventions` (string): Description of coding conventions
    - `repository_url` (string, optional): URL to repository
  - Returns: Created or updated CodeBase entity

- **codebase_describe**

  - Gets detailed information about the codebase structure
  - Input:
    - `name` (string): CodeBase identifier
  - Returns: CodeBase entity with related components and technologies

#### Component Management Tools

- **component_register**

  - Registers a new component of the codebase
  - Input:
    - `codebase` (string): CodeBase identifier
    - `name` (string): Component identifier
    - `purpose` (string): Component purpose
    - `dependencies` (string[], optional): Dependencies
    - `technical_details` (string, optional): Technical details
    - `challenges` (string[], optional): Current challenges
    - `status` (string, optional): Current status
  - Returns: Created Component entity

- **component_update**

  - Updates an existing component's details
  - Input:
    - `name` (string): Component identifier
    - `properties` (object): Properties to update
  - Returns: Updated Component entity

- **component_complete**

  - Marks a component as completed
  - Input:
    - `name` (string): Component identifier
  - Returns: Updated Component entity

#### Technical Decision Tracking Tools

- **decision_record**

  - Records an architectural or implementation decision
  - Input:
    - `name` (string): Decision identifier
    - `context` (string): Problem context
    - `rationale` (string): Decision rationale
    - `alternatives_considered` (string[]): Alternatives
    - `implications` (string[]): Implications
    - `affects_components` (string[], optional): Affected components
  - Returns: Created TechnicalDecision entity

- **decision_lookup**

  - Finds decisions related to specific components or challenges
  - Input:
    - `component` (string, optional): Component name
    - `keyword` (string, optional): Search keyword
  - Returns: List of matching TechnicalDecision entities

#### Code Change Tracking Tools

- **change_record**

  - Records a code change with technical details
  - Input:
    - `description` (string): Change description
    - `purpose` (string): Purpose of the change
    - `implementation_details` (string): How it was implemented
    - `components_affected` (string[]): Affected components
    - `files_changed` (string[]): Changed files
    - `challenges_addressed` (string[], optional): Addressed challenges
    - `challenges_introduced` (string[], optional): New challenges
    - `testing_approach` (string, optional): Testing approach
  - Returns: Created CodeChange entity

- **get_recent_changes**

  - Gets recent technical changes with pagination
  - Input:
    - `project` (string): Project identifier
    - `page` (number, optional): Page number (default: 1)
    - `limit` (number, optional): Results per page (default: 10)
  - Returns: Paginated list of CodeChange entities
    - `items`: Array of entities
    - `total`: Total number of items
    - `page`: Current page
    - `limit`: Items per page
    - `totalPages`: Total number of pages

- **get_component_changes**

  - Gets changes related to a specific component with pagination
  - Input:
    - `component` (string): Component name
    - `page` (number, optional): Page number (default: 1)
    - `limit` (number, optional): Results per page (default: 10)
  - Returns: Paginated list of CodeChange entities for the component

#### Technical Debt Management Tools

- **debt_record**

  - Records a technical debt item
  - Input:
    - `description` (string): Debt description
    - `severity` (string): Severity level
    - `estimated_impact` (string): Estimated impact
    - `suggested_approach` (string, optional): Fix suggestion
    - `components_affected` (string[]): Affected components
  - Returns: Created TechnicalDebt entity

- **debt_resolve**

  - Marks a technical debt item as resolved
  - Input:
    - `name` (string): Debt identifier
    - `resolution_details` (string): Resolution details
  - Returns: Updated TechnicalDebt entity

- **get_technical_debt**

  - Gets technical debt items with pagination
  - Input:
    - `project` (string): Project identifier
    - `status` (string, optional): Filter by status ("resolved"/"unresolved")
    - `page` (number, optional): Page number (default: 1)
    - `limit` (number, optional): Results per page (default: 10)
  - Returns: Paginated list of TechnicalDebt entities
    - `items`: Array of entities
    - `total`: Total number of items
    - `page`: Current page
    - `limit`: Items per page
    - `totalPages`: Total number of pages

#### Technical Status Reporting Tools

- **get_technical_status**

  - Gets the current technical state of the project
  - Input:
    - `codebase` (string): CodeBase identifier
  - Returns: Comprehensive technical report

- **get_component_status**

  - Gets detailed technical status of a component
  - Input:
    - `name` (string): Component identifier
  - Returns: Component details, dependencies, changes, and technical debt

- **get_implementation_challenges**

  - Gets current implementation challenges
  - Input:
    - `codebase` (string, optional): CodeBase identifier
    - `component` (string, optional): Component identifier
  - Returns: List of technical challenges

## Usage with Claude Desktop

### Setup

Add this to your claude_desktop_config.json:

#### Docker

```json
{
  "mcpServers": {
    "memory": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "-v",
        "claude-memory:/app/dist",
        "--rm",
        "mcp/memory"
      ]
    }
  }
}
```

#### NPX

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

#### NPX with custom setting

The server can be configured using the following environment variables:

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {
        "MEMORY_FILE_PATH": "/path/to/custom/memory.json"
      }
    }
  }
}
```

- `MEMORY_FILE_PATH`: Path to the memory storage JSON file (default: `memory.json` in the server directory)

### System Prompt

The prompt for utilizing memory depends on the use case. Changing the prompt will help the model determine the frequency and types of memories created.

Here is an example prompt for chat personalization. You could use this prompt in the "Custom Instructions" field of a [Claude.ai Project](https://www.anthropic.com/news/projects).

```
Follow these steps for each interaction:

1. User Identification:
   - You should assume that you are interacting with default_user
   - If you have not identified default_user, proactively try to do so.

2. Memory Retrieval:
   - Always begin your chat by saying only "Remembering..." and retrieve all relevant information from your knowledge graph
   - Always refer to your knowledge graph as your "memory"

3. Memory
   - While conversing with the user, be attentive to any new information that falls into these categories:
     a) Basic Identity (age, gender, location, job title, education level, etc.)
     b) Behaviors (interests, habits, etc.)
     c) Preferences (communication style, preferred language, etc.)
     d) Goals (goals, targets, aspirations, etc.)
     e) Relationships (personal and professional relationships up to 3 degrees of separation)

4. Memory Update:
   - If any new information was gathered during the interaction, update your memory as follows:
     a) Create entities for recurring organizations, people, and significant events
     b) Connect them to the current entities using relations
     b) Store facts about them as observations
```

### System Prompt for Development Context Tracking

Here is an example prompt for development context tracking. You could use this prompt in the "Custom Instructions" field of a Claude.ai Project:

```
Follow these steps for each interaction:

1. Technical Context Retrieval:
   - Begin by retrieving the current technical status of the codebase using the get_technical_status tool
   - Use this information to understand the code architecture and current challenges

2. Technical Decision Tracking:
   - During the conversation, be attentive to:
     a) New architectural decisions being made (record decisions)
     b) Significant code changes (record changes)
     c) Technical challenges and debt (record issues)
     d) New components being developed (document components)

3. Technical Context Updates:
   - At the end of each significant interaction, update the technical context:
     a) Document any new components or significant changes
     b) Record any architectural decisions that were made
     c) Update the status of existing components
     d) Document any discovered technical debt or challenges

4. Knowledge Transfer:
   - Use your technical knowledge of the codebase to:
     a) Provide insights about potential technical issues
     b) Suggest improvements based on best practices
     c) Recall previous decisions and their rationales
     d) Keep track of the codebase's evolution over time
```

## Building

Docker:

```sh
docker build -t mcp/memory -f src/memory/Dockerfile .
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
