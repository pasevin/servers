#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define memory file path using environment variable with fallback
const defaultMemoryPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'memory.json'
);

// If MEMORY_FILE_PATH is just a filename, put it in the same directory as the script
const MEMORY_FILE_PATH = process.env.MEMORY_FILE_PATH
  ? path.isAbsolute(process.env.MEMORY_FILE_PATH)
    ? process.env.MEMORY_FILE_PATH
    : path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        process.env.MEMORY_FILE_PATH
      )
  : defaultMemoryPath;

// We are storing our memory using entities, relations, and observations in a graph structure
interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
}

// Development Tracking - New Entity Types
interface CodeBase extends Entity {
  technologies: string[];
  architecture: string;
  conventions: string;
  repository_url?: string;
  created_at: string;
  updated_at: string;
  description: string;
  status: string;
}

interface Component extends Entity {
  purpose: string;
  dependencies: string[];
  technical_details: string;
  challenges: string[];
  status: string;
  created_at: string;
  updated_at: string;
  description: string;
}

interface TechnicalDecision extends Entity {
  context: string;
  rationale: string;
  alternatives_considered: string[];
  implications: string[];
  date_made: string;
}

interface CodeChange extends Entity {
  description: string;
  purpose: string;
  implementation_details: string;
  technical_notes: string;
  components_affected: string[];
  files_changed: string[];
  challenges_addressed: string[];
  challenges_introduced: string[];
  testing_approach: string;
  date: string;
  created_at: string;
}

interface TechnicalDebt extends Entity {
  description: string;
  severity: string;
  estimated_impact: string;
  suggested_approach: string;
  components_affected: string[];
  created_at: string;
  resolved_at?: string;
  resolution_details?: string;
  date: string;
}

interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

// Utility functions for the new entity types
const isCodeBase = (entity: Entity): entity is CodeBase => {
  return entity.entityType === 'codebase';
};

const isComponent = (entity: Entity): entity is Component => {
  return entity.entityType === 'component';
};

const isTechnicalDecision = (entity: Entity): entity is TechnicalDecision => {
  return entity.entityType === 'technical_decision';
};

const isCodeChange = (entity: Entity): entity is CodeChange => {
  return entity.entityType === 'code_change';
};

const isTechnicalDebt = (entity: Entity): entity is TechnicalDebt => {
  return entity.entityType === 'technical_debt';
};

// Helper function to get the current ISO timestamp
const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

// Add pagination interface after the existing interfaces
interface PaginationOptions {
  page?: number;
  limit?: number;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// The KnowledgeGraphManager class contains all operations to interact with the knowledge graph
class KnowledgeGraphManager {
  private async loadGraph(): Promise<KnowledgeGraph> {
    try {
      const data = await fs.readFile(MEMORY_FILE_PATH, 'utf-8');
      const lines = data.split('\n').filter((line) => line.trim() !== '');
      return lines.reduce(
        (graph: KnowledgeGraph, line) => {
          const item = JSON.parse(line);
          if (item.type === 'entity') graph.entities.push(item as Entity);
          if (item.type === 'relation') graph.relations.push(item as Relation);
          return graph;
        },
        { entities: [], relations: [] }
      );
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as any).code === 'ENOENT'
      ) {
        return { entities: [], relations: [] };
      }
      throw error;
    }
  }

  private async saveGraph(graph: KnowledgeGraph): Promise<void> {
    const lines = [
      ...graph.entities.map((e) => JSON.stringify({ type: 'entity', ...e })),
      ...graph.relations.map((r) => JSON.stringify({ type: 'relation', ...r })),
    ];
    await fs.writeFile(MEMORY_FILE_PATH, lines.join('\n'));
  }

  async createEntities(entities: Entity[]): Promise<Entity[]> {
    const graph = await this.loadGraph();
    const newEntities = entities.filter(
      (e) =>
        !graph.entities.some((existingEntity) => existingEntity.name === e.name)
    );
    graph.entities.push(...newEntities);
    await this.saveGraph(graph);
    return newEntities;
  }

  async createRelations(relations: Relation[]): Promise<Relation[]> {
    const graph = await this.loadGraph();
    const newRelations = relations.filter(
      (r) =>
        !graph.relations.some(
          (existingRelation) =>
            existingRelation.from === r.from &&
            existingRelation.to === r.to &&
            existingRelation.relationType === r.relationType
        )
    );
    graph.relations.push(...newRelations);
    await this.saveGraph(graph);
    return newRelations;
  }

  async addObservations(
    observations: { entityName: string; contents: string[] }[]
  ): Promise<{ entityName: string; addedObservations: string[] }[]> {
    const graph = await this.loadGraph();
    const results = observations.map((o) => {
      const entity = graph.entities.find((e) => e.name === o.entityName);
      if (!entity) {
        throw new Error(`Entity with name ${o.entityName} not found`);
      }
      const newObservations = o.contents.filter(
        (content) => !entity.observations.includes(content)
      );
      entity.observations.push(...newObservations);
      return { entityName: o.entityName, addedObservations: newObservations };
    });
    await this.saveGraph(graph);
    return results;
  }

  async deleteEntities(entityNames: string[]): Promise<void> {
    const graph = await this.loadGraph();
    graph.entities = graph.entities.filter(
      (e) => !entityNames.includes(e.name)
    );
    graph.relations = graph.relations.filter(
      (r) => !entityNames.includes(r.from) && !entityNames.includes(r.to)
    );
    await this.saveGraph(graph);
  }

  async deleteObservations(
    deletions: { entityName: string; observations: string[] }[]
  ): Promise<void> {
    const graph = await this.loadGraph();
    deletions.forEach((d) => {
      const entity = graph.entities.find((e) => e.name === d.entityName);
      if (entity) {
        entity.observations = entity.observations.filter(
          (o) => !d.observations.includes(o)
        );
      }
    });
    await this.saveGraph(graph);
  }

  async deleteRelations(relations: Relation[]): Promise<void> {
    const graph = await this.loadGraph();
    graph.relations = graph.relations.filter(
      (r) =>
        !relations.some(
          (delRelation) =>
            r.from === delRelation.from &&
            r.to === delRelation.to &&
            r.relationType === delRelation.relationType
        )
    );
    await this.saveGraph(graph);
  }

  async readGraph(): Promise<KnowledgeGraph> {
    return this.loadGraph();
  }

  // Very basic search function
  async searchNodes(query: string): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();

    // Filter entities
    const filteredEntities = graph.entities.filter(
      (e) =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.entityType.toLowerCase().includes(query.toLowerCase()) ||
        e.observations.some((o) =>
          o.toLowerCase().includes(query.toLowerCase())
        )
    );

    // Create a Set of filtered entity names for quick lookup
    const filteredEntityNames = new Set(filteredEntities.map((e) => e.name));

    // Filter relations to only include those between filtered entities
    const filteredRelations = graph.relations.filter(
      (r) => filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
    );

    const filteredGraph: KnowledgeGraph = {
      entities: filteredEntities,
      relations: filteredRelations,
    };

    return filteredGraph;
  }

  async openNodes(names: string[]): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();

    // Filter entities
    const filteredEntities = graph.entities.filter((e) =>
      names.includes(e.name)
    );

    // Create a Set of filtered entity names for quick lookup
    const filteredEntityNames = new Set(filteredEntities.map((e) => e.name));

    // Filter relations to only include those between filtered entities
    const filteredRelations = graph.relations.filter(
      (r) => filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
    );

    const filteredGraph: KnowledgeGraph = {
      entities: filteredEntities,
      relations: filteredRelations,
    };

    return filteredGraph;
  }

  // Find all related entities for a specific project
  async getProjectEntities(projectName: string): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    const project = graph.entities.find(
      (e) => e.name === projectName && isCodeBase(e)
    );

    if (!project) {
      throw new Error(`Project with name ${projectName} not found`);
    }

    // Get all relations where project is the 'from' entity
    const projectRelations = graph.relations.filter(
      (r) => r.from === projectName
    );

    // Get all entity names related to the project
    const relatedEntityNames = new Set<string>(
      projectRelations.map((r) => r.to)
    );
    relatedEntityNames.add(projectName);

    // Get all related entities
    const entities = graph.entities.filter((e) =>
      relatedEntityNames.has(e.name)
    );

    // Get all relations between these entities
    const relations = graph.relations.filter(
      (r) => relatedEntityNames.has(r.from) && relatedEntityNames.has(r.to)
    );

    return { entities, relations };
  }

  // Project Management Functions

  // Create a new project
  async projectCreate(name: string, description: string): Promise<Entity> {
    const graph = await this.loadGraph();

    // Check if a project with this name already exists
    if (graph.entities.some((e) => e.name === name)) {
      throw new Error(`Entity with name ${name} already exists`);
    }

    const timestamp = getCurrentTimestamp();

    // Create the project entity
    const project: CodeBase = {
      name,
      entityType: 'codebase',
      description,
      status: 'active',
      created_at: timestamp,
      updated_at: timestamp,
      observations: [`Project created at ${timestamp}`],
      technologies: [],
      architecture: '',
      conventions: '',
    };

    // Add the project to the graph
    graph.entities.push(project);
    await this.saveGraph(graph);

    return project;
  }

  // Update a project's properties
  async projectUpdate(
    name: string,
    properties: Partial<CodeBase>
  ): Promise<Entity> {
    const graph = await this.loadGraph();

    // Find the project
    const projectIndex = graph.entities.findIndex(
      (e) => e.name === name && isCodeBase(e)
    );

    if (projectIndex === -1) {
      throw new Error(`Project with name ${name} not found`);
    }

    const project = graph.entities[projectIndex] as CodeBase;

    // Update the properties
    const updatedProject: CodeBase = {
      ...project,
      ...properties,
      updated_at: getCurrentTimestamp(),
    };

    // Add an observation about the update
    updatedProject.observations.push(
      `Project updated at ${updatedProject.updated_at}`
    );

    // Update the entity in the graph
    graph.entities[projectIndex] = updatedProject;
    await this.saveGraph(graph);

    return updatedProject;
  }

  // Delete a project and all its related entities
  async projectDelete(name: string): Promise<void> {
    const graph = await this.loadGraph();

    // Find the project
    const projectIndex = graph.entities.findIndex(
      (e) => e.name === name && isCodeBase(e)
    );

    if (projectIndex === -1) {
      throw new Error(`Project with name ${name} not found`);
    }

    // Get all relations where project is the 'from' entity
    const projectRelations = graph.relations.filter((r) => r.from === name);

    // Get all entity names related to the project
    const relatedEntityNames = new Set<string>(
      projectRelations.map((r) => r.to)
    );

    // Remove the project and all related entities
    graph.entities = graph.entities.filter(
      (e) => !relatedEntityNames.has(e.name) && e.name !== name
    );

    // Remove all relations involving the project and related entities
    graph.relations = graph.relations.filter(
      (r) =>
        !(
          relatedEntityNames.has(r.from) ||
          relatedEntityNames.has(r.to) ||
          r.from === name ||
          r.to === name
        )
    );

    await this.saveGraph(graph);
  }

  // Get a summary of the project
  async getProjectSummary(name: string): Promise<{
    project: Entity;
    components: Entity[];
    technicalDecisions: Entity[];
    codeChanges: { total: number; recent: Entity[] };
    technicalDebts: { total: number; recent: Entity[] };
  }> {
    const { entities, relations } = await this.getProjectEntities(name);

    const project = entities.find((e) => e.name === name && isCodeBase(e));

    if (!project) {
      throw new Error(`Project with name ${name} not found`);
    }

    // Find component entities related to the project
    const componentNames = relations
      .filter((r) => r.from === name && r.relationType === 'has_component')
      .map((r) => r.to);

    const components = entities.filter(
      (e) => componentNames.includes(e.name) && isComponent(e)
    );

    // Find technical decision entities related to the project
    const technicalDecisionNames = relations
      .filter(
        (r) => r.from === name && r.relationType === 'has_technical_decision'
      )
      .map((r) => r.to);

    const technicalDecisions = entities.filter(
      (e) => technicalDecisionNames.includes(e.name) && isTechnicalDecision(e)
    );

    // Find code change entities related to the project
    const codeChangeNames = relations
      .filter((r) => r.from === name && r.relationType === 'has_code_change')
      .map((r) => r.to);

    const codeChanges = entities.filter(
      (e) => codeChangeNames.includes(e.name) && isCodeChange(e)
    ) as CodeChange[];

    // Sort code changes by date to get the most recent ones (limited to 5)
    const recentCodeChanges = [...codeChanges]
      .sort((a, b) => {
        // Safely handle date properties using type narrowing
        const getTime = (entity: Entity) => {
          if (isCodeChange(entity)) {
            return new Date(entity.created_at || entity.date).getTime();
          }
          return 0; // Fallback for other entity types
        };
        return getTime(b) - getTime(a);
      })
      .slice(0, 5);

    // Find technical debt entities related to the project
    const technicalDebtNames = relations
      .filter((r) => r.from === name && r.relationType === 'has_technical_debt')
      .map((r) => r.to);

    const technicalDebts = entities.filter(
      (e) => technicalDebtNames.includes(e.name) && isTechnicalDebt(e)
    );

    // Sort technical debts by date to get the most recent ones (limited to 5)
    const recentTechnicalDebts = [...technicalDebts]
      .sort((a, b) => {
        // Safely handle date properties using type narrowing
        const getTime = (entity: Entity) => {
          if (isTechnicalDebt(entity)) {
            return new Date(entity.created_at || entity.date).getTime();
          }
          return 0; // Fallback for other entity types
        };
        return getTime(b) - getTime(a);
      })
      .slice(0, 5);

    return {
      project,
      components,
      technicalDecisions,
      codeChanges: {
        total: codeChanges.length,
        recent: recentCodeChanges,
      },
      technicalDebts: {
        total: technicalDebts.length,
        recent: recentTechnicalDebts,
      },
    };
  }

  // Get recent changes for a project
  async getRecentChanges(
    projectName: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<Entity>> {
    const { page = 1, limit = 10 } = options;
    const { entities, relations } = await this.getProjectEntities(projectName);

    // Find code change entities related to the project
    const codeChangeNames = relations
      .filter(
        (r) => r.from === projectName && r.relationType === 'has_code_change'
      )
      .map((r) => r.to);

    // Find technical debt entities related to the project
    const technicalDebtNames = relations
      .filter(
        (r) => r.from === projectName && r.relationType === 'has_technical_debt'
      )
      .map((r) => r.to);

    const changes = entities.filter(
      (e) =>
        (codeChangeNames.includes(e.name) && isCodeChange(e)) ||
        (technicalDebtNames.includes(e.name) && isTechnicalDebt(e))
    );

    // Sort changes by date to get the most recent ones
    const sortedChanges = [...changes].sort((a, b) => {
      // Safely handle date properties using type narrowing
      const getTime = (entity: Entity) => {
        if (isCodeChange(entity)) {
          return new Date(entity.created_at || entity.date).getTime();
        }
        return 0; // Fallback for other entity types
      };
      return getTime(b) - getTime(a);
    });

    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedItems = sortedChanges.slice(startIndex, endIndex);
    const total = sortedChanges.length;
    const totalPages = Math.ceil(total / limit);

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Get the current status of the project
  async getCurrentStatus(projectName: string): Promise<{
    project: Entity;
    activeComponents: Entity[];
    upcomingComponents: Entity[];
    recentChanges: Entity[];
    summary: string;
  }> {
    const { entities, relations } = await this.getProjectEntities(projectName);

    const project = entities.find(
      (e) => e.name === projectName && isCodeBase(e)
    );

    if (!project) {
      throw new Error(`Project with name ${projectName} not found`);
    }

    // Find component entities related to the project
    const componentNames = relations
      .filter(
        (r) => r.from === projectName && r.relationType === 'has_component'
      )
      .map((r) => r.to);

    const components = entities.filter(
      (e) => componentNames.includes(e.name) && isComponent(e)
    ) as Component[];

    // Find upcoming components (not completed and status in the future or no status)
    const upcomingComponents = components.filter(
      (c) =>
        c.status !== 'completed' &&
        (!c.status || new Date(c.status) >= new Date())
    );

    // Find changes related to components
    const changeNames = new Set<string>();
    componentNames.forEach((componentName) => {
      relations
        .filter(
          (r) => r.from === componentName && r.relationType === 'implements'
        )
        .forEach((r) => changeNames.add(r.to));
    });

    const changes = entities.filter(
      (e) => changeNames.has(e.name) && (isCodeChange(e) || isTechnicalDebt(e))
    );

    // Sort changes by date to get the most recent ones (limited to 5)
    const recentChangesResult = await this.getRecentChanges(projectName, {
      limit: 5,
    });
    const recentChanges = recentChangesResult.items;

    // Create a summary
    const summary =
      `Project "${(project as CodeBase).description}" is ${
        (project as CodeBase).status
      }. ` +
      `It has ${components.length} components (${upcomingComponents.length} upcoming). ` +
      `There have been ${recentChangesResult.total} recent changes.`;

    return {
      project,
      activeComponents: components.filter((c) => c.status === 'active'),
      upcomingComponents,
      recentChanges,
      summary,
    };
  }

  // Task Management Functions

  // Create a new task for a project
  async taskCreate(
    projectName: string,
    taskName: string,
    description: string,
    priority = 'medium',
    componentName?: string
  ): Promise<Entity> {
    const graph = await this.loadGraph();

    // Check if the project exists
    const project = graph.entities.find(
      (e) => e.name === projectName && isCodeBase(e)
    );
    if (!project) {
      throw new Error(`Project with name ${projectName} not found`);
    }

    // Check if a task with this name already exists
    if (graph.entities.some((e) => e.name === taskName)) {
      throw new Error(`Entity with name ${taskName} already exists`);
    }

    const timestamp = getCurrentTimestamp();

    // Create the task entity
    const task: Component = {
      name: taskName,
      entityType: 'component',
      description,
      status: 'active',
      purpose: '',
      dependencies: [],
      technical_details: '',
      challenges: [],
      created_at: timestamp,
      updated_at: timestamp,
      observations: [`Task created at ${timestamp} for project ${projectName}`],
    };

    // Add the task to the graph
    graph.entities.push(task);

    // Create relation from project to task
    const projectTaskRelation: Relation = {
      from: projectName,
      to: taskName,
      relationType: 'has_component',
    };

    graph.relations.push(projectTaskRelation);

    // If component is specified, create relation from task to component
    if (componentName) {
      // Check if the component exists
      const component = graph.entities.find(
        (e) => e.name === componentName && isComponent(e)
      );
      if (!component) {
        throw new Error(`Component with name ${componentName} not found`);
      }

      const taskComponentRelation: Relation = {
        from: taskName,
        to: componentName,
        relationType: 'belongs_to_component',
      };

      graph.relations.push(taskComponentRelation);
    }

    await this.saveGraph(graph);

    return task;
  }

  // Update a task's properties
  async taskUpdate(
    taskName: string,
    properties: Partial<Component>
  ): Promise<Entity> {
    const graph = await this.loadGraph();

    // Find the task
    const taskIndex = graph.entities.findIndex(
      (e) => e.name === taskName && isComponent(e)
    );

    if (taskIndex === -1) {
      throw new Error(`Task with name ${taskName} not found`);
    }

    const task = graph.entities[taskIndex] as Component;

    // Update the properties
    const updatedTask: Component = {
      ...task,
      ...properties,
      updated_at: getCurrentTimestamp(),
    };

    // Add an observation about the update
    updatedTask.observations.push(`Task updated at ${updatedTask.updated_at}`);

    // Update the entity in the graph
    graph.entities[taskIndex] = updatedTask;
    await this.saveGraph(graph);

    return updatedTask;
  }

  // Mark a task as completed
  async taskComplete(taskName: string): Promise<Entity> {
    const graph = await this.loadGraph();

    // Find the task
    const taskIndex = graph.entities.findIndex(
      (e) => e.name === taskName && isComponent(e)
    );

    if (taskIndex === -1) {
      throw new Error(`Task with name ${taskName} not found`);
    }

    const task = graph.entities[taskIndex] as Component;

    // Update the task
    const timestamp = getCurrentTimestamp();
    const completedTask: Component = {
      ...task,
      status: 'completed',
      updated_at: timestamp,
    };

    // Add an observation about completion
    completedTask.observations.push(`Task marked as completed at ${timestamp}`);

    // Update the entity in the graph
    graph.entities[taskIndex] = completedTask;
    await this.saveGraph(graph);

    return completedTask;
  }

  // Delete a task and its associated changes
  async taskDelete(taskName: string): Promise<void> {
    const graph = await this.loadGraph();

    // Find the task
    const taskIndex = graph.entities.findIndex(
      (e) => e.name === taskName && isComponent(e)
    );

    if (taskIndex === -1) {
      throw new Error(`Task with name ${taskName} not found`);
    }

    // Get all relations where task is the 'from' entity
    const taskRelations = graph.relations.filter((r) => r.from === taskName);

    // Get all change entity names related to the task
    const changeNames = taskRelations
      .filter((r) => r.relationType === 'implements')
      .map((r) => r.to);

    // Remove the task and all related changes
    graph.entities = graph.entities.filter(
      (e) => !changeNames.includes(e.name) && e.name !== taskName
    );

    // Remove all relations involving the task and related changes
    graph.relations = graph.relations.filter(
      (r) =>
        !changeNames.includes(r.from) &&
        !changeNames.includes(r.to) &&
        r.from !== taskName &&
        r.to !== taskName
    );

    await this.saveGraph(graph);
  }

  // Change Management Functions

  // Record a new change for a task
  async changeRecord(
    taskName: string,
    description: string,
    type: 'code' | 'design' | 'documentation' | 'other',
    filesAffected: string[] = []
  ): Promise<Entity> {
    const graph = await this.loadGraph();

    // Check if the task exists
    const task = graph.entities.find(
      (e) => e.name === taskName && isComponent(e)
    );
    if (!task) {
      throw new Error(`Task with name ${taskName} not found`);
    }

    const timestamp = getCurrentTimestamp();

    // Generate a unique name for the change
    const changeName = `change_${taskName}_${Date.now()}`;

    // Create the change entity
    const change: CodeChange = {
      name: changeName,
      entityType: 'code_change',
      description,
      purpose: '',
      implementation_details: '',
      technical_notes: '',
      components_affected: filesAffected,
      files_changed: filesAffected,
      challenges_addressed: [],
      challenges_introduced: [],
      testing_approach: '',
      date: timestamp,
      created_at: timestamp,
      observations: [`Change recorded at ${timestamp} for task ${taskName}`],
    };

    // Add the change to the graph
    graph.entities.push(change);

    // Create relation from task to change
    const taskChangeRelation: Relation = {
      from: taskName,
      to: changeName,
      relationType: 'implements',
    };

    graph.relations.push(taskChangeRelation);

    // Update the task to reflect the change
    const taskIndex = graph.entities.findIndex((e) => e.name === taskName);
    const updatedTask = {
      ...task,
      updated_at: timestamp,
    };
    updatedTask.observations.push(
      `Change ${changeName} recorded at ${timestamp}`
    );
    graph.entities[taskIndex] = updatedTask;

    await this.saveGraph(graph);

    return change;
  }

  // Get all tasks for a project
  async getTaskList(projectName: string, status?: string): Promise<Entity[]> {
    const { entities, relations } = await this.getProjectEntities(projectName);

    // Find task entities related to the project
    const taskNames = relations
      .filter(
        (r) => r.from === projectName && r.relationType === 'has_component'
      )
      .map((r) => r.to);

    let tasks = entities.filter(
      (e) => taskNames.includes(e.name) && isComponent(e)
    ) as Component[];

    // Filter by status if provided
    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }

    return tasks;
  }

  // Create a new component for a project
  async componentCreate(
    projectName: string,
    componentName: string,
    purpose: string,
    dependencies: string[] = [],
    technicalDetails: string = '',
    challenges: string[] = [],
    status: string = 'active'
  ): Promise<Entity> {
    const graph = await this.loadGraph();

    // Check if the project exists
    const project = graph.entities.find(
      (e) => e.name === projectName && isCodeBase(e)
    );
    if (!project) {
      throw new Error(`Project with name ${projectName} not found`);
    }

    // Check if a component with this name already exists
    if (graph.entities.some((e) => e.name === componentName)) {
      throw new Error(`Entity with name ${componentName} already exists`);
    }

    const timestamp = getCurrentTimestamp();

    // Create the component entity
    const component: Component = {
      name: componentName,
      entityType: 'component',
      purpose,
      dependencies,
      technical_details: technicalDetails,
      challenges,
      status,
      description: purpose,
      created_at: timestamp,
      updated_at: timestamp,
      observations: [
        `Component created at ${timestamp} for project ${projectName}`,
      ],
    };

    // Add the component to the graph
    graph.entities.push(component);

    // Create relation from project to component
    const projectComponentRelation: Relation = {
      from: projectName,
      to: componentName,
      relationType: 'has_component',
    };

    graph.relations.push(projectComponentRelation);

    await this.saveGraph(graph);

    return component;
  }

  // Update a component's properties
  async componentUpdate(
    componentName: string,
    properties: Partial<Component>
  ): Promise<Entity> {
    const graph = await this.loadGraph();

    // Find the component
    const componentIndex = graph.entities.findIndex(
      (e) => e.name === componentName && isComponent(e)
    );

    if (componentIndex === -1) {
      throw new Error(`Component with name ${componentName} not found`);
    }

    const component = graph.entities[componentIndex] as Component;

    // Update the properties
    const updatedComponent: Component = {
      ...component,
      ...properties,
      updated_at: getCurrentTimestamp(),
    };

    // Add an observation about the update
    updatedComponent.observations.push(
      `Component updated at ${updatedComponent.updated_at}`
    );

    // Update the entity in the graph
    graph.entities[componentIndex] = updatedComponent;
    await this.saveGraph(graph);

    return updatedComponent;
  }

  // Complete a component
  async componentComplete(componentName: string): Promise<Entity> {
    const graph = await this.loadGraph();

    // Find the component
    const componentIndex = graph.entities.findIndex(
      (e) => e.name === componentName && isComponent(e)
    );

    if (componentIndex === -1) {
      throw new Error(`Component with name ${componentName} not found`);
    }

    const component = graph.entities[componentIndex] as Component;

    // Update the component
    const timestamp = getCurrentTimestamp();
    const completedComponent: Component = {
      ...component,
      status: 'completed',
      updated_at: timestamp,
    };

    // Add an observation about completion
    completedComponent.observations.push(
      `Component marked as completed at ${timestamp}`
    );

    // Update the entity in the graph
    graph.entities[componentIndex] = completedComponent;
    await this.saveGraph(graph);

    return completedComponent;
  }

  // Add a new method to get technical debt with pagination
  async getTechnicalDebt(
    projectName: string,
    options: { status?: string } & PaginationOptions = {}
  ): Promise<PaginatedResult<Entity>> {
    const { status, page = 1, limit = 10 } = options;
    const { entities, relations } = await this.getProjectEntities(projectName);

    // Find technical debt entities related to the project
    const technicalDebtNames = relations
      .filter(
        (r) => r.from === projectName && r.relationType === 'has_technical_debt'
      )
      .map((r) => r.to);

    // Filter technical debt entities by status if provided
    let technicalDebt = entities.filter(
      (e) => technicalDebtNames.includes(e.name) && isTechnicalDebt(e)
    );

    if (status) {
      technicalDebt = technicalDebt.filter((e) => {
        if (isTechnicalDebt(e)) {
          const isResolved = e.observations.some((o) =>
            o.startsWith('Resolved on:')
          );
          return status === 'resolved' ? isResolved : !isResolved;
        }
        return false;
      });
    }

    // Calculate pagination
    const total = technicalDebt.length;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedItems = technicalDebt.slice(startIndex, endIndex);
    const totalPages = Math.ceil(total / limit);

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Add a method to get component changes with pagination
  async getComponentChanges(
    componentName: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<Entity>> {
    const { page = 1, limit = 10 } = options;
    const { entities } = await this.loadGraph();

    // Find the component
    const component = entities.find(
      (e) => e.name === componentName && isComponent(e)
    );
    if (!component) {
      throw new Error(`Component ${componentName} not found`);
    }

    // Get all code changes that affect this component
    const codeChanges = entities.filter((e) => {
      if (isCodeChange(e)) {
        return e.components_affected.includes(componentName);
      }
      return false;
    });

    // Sort changes by date (newest first)
    const sortedChanges = [...codeChanges].sort((a, b) => {
      if (isCodeChange(a) && isCodeChange(b)) {
        const dateA = new Date(a.created_at || a.date).getTime();
        const dateB = new Date(b.created_at || b.date).getTime();
        return dateB - dateA;
      }
      return 0;
    });

    // Calculate pagination
    const total = sortedChanges.length;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedItems = sortedChanges.slice(startIndex, endIndex);
    const totalPages = Math.ceil(total / limit);

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages,
    };
  }

  // List all projects in the knowledge graph
  async listProjects(): Promise<Entity[]> {
    const graph = await this.loadGraph();

    // Filter entities to only include codebase entities (projects)
    const projects = graph.entities.filter((e) => isCodeBase(e));

    return projects;
  }
}

const knowledgeGraphManager = new KnowledgeGraphManager();

// The server instance and tools exposed to Claude
const server = new Server(
  {
    name: 'memory-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'create_entities',
        description: 'Create multiple new entities in the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            entities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'The name of the entity',
                  },
                  entityType: {
                    type: 'string',
                    description: 'The type of the entity',
                  },
                  observations: {
                    type: 'array',
                    items: { type: 'string' },
                    description:
                      'An array of observation contents associated with the entity',
                  },
                },
                required: ['name', 'entityType', 'observations'],
              },
            },
          },
          required: ['entities'],
        },
      },
      {
        name: 'create_relations',
        description:
          'Create multiple new relations between entities in the knowledge graph. Relations should be in active voice',
        inputSchema: {
          type: 'object',
          properties: {
            relations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  from: {
                    type: 'string',
                    description:
                      'The name of the entity where the relation starts',
                  },
                  to: {
                    type: 'string',
                    description:
                      'The name of the entity where the relation ends',
                  },
                  relationType: {
                    type: 'string',
                    description: 'The type of the relation',
                  },
                },
                required: ['from', 'to', 'relationType'],
              },
            },
          },
          required: ['relations'],
        },
      },
      {
        name: 'add_observations',
        description:
          'Add new observations to existing entities in the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            observations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  entityName: {
                    type: 'string',
                    description:
                      'The name of the entity to add the observations to',
                  },
                  contents: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'An array of observation contents to add',
                  },
                },
                required: ['entityName', 'contents'],
              },
            },
          },
          required: ['observations'],
        },
      },
      {
        name: 'delete_entities',
        description:
          'Delete multiple entities and their associated relations from the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            entityNames: {
              type: 'array',
              items: { type: 'string' },
              description: 'An array of entity names to delete',
            },
          },
          required: ['entityNames'],
        },
      },
      {
        name: 'delete_observations',
        description:
          'Delete specific observations from entities in the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            deletions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  entityName: {
                    type: 'string',
                    description:
                      'The name of the entity containing the observations',
                  },
                  observations: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'An array of observations to delete',
                  },
                },
                required: ['entityName', 'observations'],
              },
            },
          },
          required: ['deletions'],
        },
      },
      {
        name: 'delete_relations',
        description: 'Delete multiple relations from the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            relations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  from: {
                    type: 'string',
                    description:
                      'The name of the entity where the relation starts',
                  },
                  to: {
                    type: 'string',
                    description:
                      'The name of the entity where the relation ends',
                  },
                  relationType: {
                    type: 'string',
                    description: 'The type of the relation',
                  },
                },
                required: ['from', 'to', 'relationType'],
              },
              description: 'An array of relations to delete',
            },
          },
          required: ['relations'],
        },
      },
      {
        name: 'read_graph',
        description: 'Read the entire knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_nodes',
        description: 'Search for nodes in the knowledge graph based on a query',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'The search query to match against entity names, types, and observation content',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'open_nodes',
        description: 'Retrieve specific nodes by name from the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            names: {
              type: 'array',
              items: { type: 'string' },
              description:
                'An array of entity names to retrieve from the knowledge graph',
            },
          },
          required: ['names'],
        },
      },
      // Project Management Tools
      {
        name: 'project_create',
        description: 'Create a new project in the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name identifier for the project',
            },
            description: {
              type: 'string',
              description: 'A detailed description of the project',
            },
          },
          required: ['name', 'description'],
        },
      },
      {
        name: 'project_update',
        description: 'Update an existing project in the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name identifier of the project to update',
            },
            properties: {
              type: 'object',
              description: 'The properties to update on the project',
              properties: {
                description: {
                  type: 'string',
                  description: 'A detailed description of the project',
                },
                status: {
                  type: 'string',
                  description: 'The current status of the project',
                },
              },
            },
          },
          required: ['name', 'properties'],
        },
      },
      {
        name: 'project_delete',
        description:
          'Delete a project and all its related entities from the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name identifier of the project to delete',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_project_summary',
        description:
          'Get a summary of a project including its components, technical decisions, and changes',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name identifier of the project to summarize',
            },
          },
          required: ['name'],
        },
      },
      // Task Management Tools
      {
        name: 'task_create',
        description: 'Create a new task for a project in the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The name of the project this task belongs to',
            },
            name: {
              type: 'string',
              description: 'The name identifier for the task',
            },
            description: {
              type: 'string',
              description: 'A detailed description of the task',
            },
            priority: {
              type: 'string',
              description: 'The priority level of the task (low, medium, high)',
              enum: ['low', 'medium', 'high'],
            },
            component: {
              type: 'string',
              description:
                'The name of a component this task belongs to (optional)',
            },
          },
          required: ['project', 'name', 'description'],
        },
      },
      {
        name: 'task_update',
        description: 'Update an existing task in the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name identifier of the task to update',
            },
            properties: {
              type: 'object',
              description: 'The properties to update on the task',
              properties: {
                description: {
                  type: 'string',
                  description: 'A detailed description of the task',
                },
                status: {
                  type: 'string',
                  description: 'The current status of the task',
                },
                priority: {
                  type: 'string',
                  description:
                    'The priority level of the task (low, medium, high)',
                  enum: ['low', 'medium', 'high'],
                },
              },
            },
          },
          required: ['name', 'properties'],
        },
      },
      {
        name: 'task_complete',
        description: 'Mark a task as completed in the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'The name identifier of the task to mark as completed',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'task_delete',
        description:
          'Delete a task and its associated changes from the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name identifier of the task to delete',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_task_list',
        description:
          'Get a list of tasks for a project, optionally filtered by status',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The name of the project to get tasks for',
            },
            status: {
              type: 'string',
              description: 'Filter tasks by status (e.g., active, completed)',
              enum: ['active', 'completed'],
            },
          },
          required: ['project'],
        },
      },
      // Component Management Tools
      {
        name: 'component_create',
        description:
          'Create a new component for a project in the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The name of the project this component belongs to',
            },
            name: {
              type: 'string',
              description: 'The name identifier for the component',
            },
            purpose: {
              type: 'string',
              description: 'A detailed description of the component',
            },
            dependencies: {
              type: 'array',
              items: { type: 'string' },
              description: 'An array of dependencies for the component',
            },
            technical_details: {
              type: 'string',
              description: 'Technical details about the component',
            },
            challenges: {
              type: 'array',
              items: { type: 'string' },
              description:
                'An array of challenges associated with the component',
            },
            status: {
              type: 'string',
              description: 'The current status of the component',
            },
          },
          required: ['project', 'name', 'purpose'],
        },
      },
      {
        name: 'component_update',
        description: 'Update an existing component in the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name identifier of the component to update',
            },
            properties: {
              type: 'object',
              description: 'The properties to update on the component',
              properties: {
                purpose: {
                  type: 'string',
                  description: 'A detailed description of the component',
                },
                dependencies: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'An array of dependencies for the component',
                },
                technical_details: {
                  type: 'string',
                  description: 'Technical details about the component',
                },
                challenges: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'An array of challenges associated with the component',
                },
                status: {
                  type: 'string',
                  description: 'The current status of the component',
                },
              },
            },
          },
          required: ['name', 'properties'],
        },
      },
      {
        name: 'component_complete',
        description: 'Mark a component as completed in the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'The name identifier of the component to mark as completed',
            },
          },
          required: ['name'],
        },
      },
      // Change Management Tools
      {
        name: 'change_record',
        description: 'Record a new change for a task in the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description:
                'The name of the task this change is associated with',
            },
            description: {
              type: 'string',
              description: 'A detailed description of the change',
            },
            type: {
              type: 'string',
              description:
                'The type of change (code, design, documentation, other)',
              enum: ['code', 'design', 'documentation', 'other'],
            },
            files_affected: {
              type: 'array',
              items: { type: 'string' },
              description: 'An array of file paths affected by this change',
            },
          },
          required: ['task', 'description', 'type'],
        },
      },
      {
        name: 'get_recent_changes',
        description: 'Get recent changes for a project',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The name of the project to get recent changes for',
            },
            page: {
              type: 'integer',
              description: 'The page number of results to return',
            },
            limit: {
              type: 'integer',
              description: 'The number of results to return per page',
            },
          },
          required: ['project'],
        },
      },
      // Status and Summary Tools
      {
        name: 'get_current_status',
        description:
          'Get the current status of a project with active tasks and upcoming components',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The name of the project to get status for',
            },
          },
          required: ['project'],
        },
      },
      // Add a case for the new getTechnicalDebt method
      {
        name: 'get_technical_debt',
        description: 'Get technical debt for a project',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The name of the project to get technical debt for',
            },
            status: {
              type: 'string',
              description: 'Filter technical debt by status (e.g., unresolved)',
            },
            page: {
              type: 'integer',
              description: 'The page number of results to return',
            },
            limit: {
              type: 'integer',
              description: 'The number of results to return per page',
            },
          },
          required: ['project'],
        },
      },
      // Add a case for the new getComponentChanges method
      {
        name: 'get_component_changes',
        description: 'Get changes for a component',
        inputSchema: {
          type: 'object',
          properties: {
            component: {
              type: 'string',
              description: 'The name of the component to get changes for',
            },
            page: {
              type: 'integer',
              description: 'The page number of results to return',
            },
            limit: {
              type: 'integer',
              description: 'The number of results to return per page',
            },
          },
          required: ['component'],
        },
      },
      // Add this new tool definition
      {
        name: 'list_projects',
        description: 'Get a list of all projects in the knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error(`No arguments provided for tool: ${name}`);
  }

  switch (name) {
    case 'create_entities':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.createEntities(
                args.entities as Entity[]
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'create_relations':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.createRelations(
                args.relations as Relation[]
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'add_observations':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.addObservations(
                args.observations as {
                  entityName: string;
                  contents: string[];
                }[]
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'delete_entities':
      await knowledgeGraphManager.deleteEntities(args.entityNames as string[]);
      return {
        content: [{ type: 'text', text: 'Entities deleted successfully' }],
      };
    case 'delete_observations':
      await knowledgeGraphManager.deleteObservations(
        args.deletions as { entityName: string; observations: string[] }[]
      );
      return {
        content: [{ type: 'text', text: 'Observations deleted successfully' }],
      };
    case 'delete_relations':
      await knowledgeGraphManager.deleteRelations(args.relations as Relation[]);
      return {
        content: [{ type: 'text', text: 'Relations deleted successfully' }],
      };
    case 'read_graph':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.readGraph(),
              null,
              2
            ),
          },
        ],
      };
    case 'search_nodes':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.searchNodes(args.query as string),
              null,
              2
            ),
          },
        ],
      };
    case 'open_nodes':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.openNodes(args.names as string[]),
              null,
              2
            ),
          },
        ],
      };
    case 'project_create':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.projectCreate(
                args.name as string,
                args.description as string
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'project_update':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.projectUpdate(
                args.name as string,
                args.properties as Partial<CodeBase>
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'project_delete':
      await knowledgeGraphManager.projectDelete(args.name as string);
      return {
        content: [{ type: 'text', text: 'Project deleted successfully' }],
      };
    case 'get_project_summary':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.getProjectSummary(
                args.name as string
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'task_create':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.taskCreate(
                args.project as string,
                args.name as string,
                args.description as string,
                (args.priority as string) || 'medium',
                args.component as string
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'task_update':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.taskUpdate(
                args.name as string,
                args.properties as Partial<Component>
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'task_complete':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.taskComplete(args.name as string),
              null,
              2
            ),
          },
        ],
      };
    case 'task_delete':
      await knowledgeGraphManager.taskDelete(args.name as string);
      return {
        content: [{ type: 'text', text: 'Task deleted successfully' }],
      };
    case 'get_task_list':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.getTaskList(
                args.project as string,
                args.status as string
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'component_create':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.componentCreate(
                args.project as string,
                args.name as string,
                args.purpose as string,
                args.dependencies as string[],
                args.technical_details as string,
                args.challenges as string[],
                args.status as string
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'component_update':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.componentUpdate(
                args.name as string,
                args.properties as Partial<Component>
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'component_complete':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.componentComplete(
                args.name as string
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'change_record':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.changeRecord(
                args.task as string,
                args.description as string,
                args.type as 'code' | 'design' | 'documentation' | 'other',
                args.files_affected as string[]
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'get_recent_changes':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.getRecentChanges(
                args.project as string,
                {
                  page: args.page ? Number(args.page) : undefined,
                  limit: args.limit ? Number(args.limit) : undefined,
                }
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'get_current_status':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.getCurrentStatus(
                args.project as string
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'get_technical_debt':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.getTechnicalDebt(
                args.project as string,
                {
                  status: args.status as string | undefined,
                  page: args.page ? Number(args.page) : undefined,
                  limit: args.limit ? Number(args.limit) : undefined,
                }
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'get_component_changes':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.getComponentChanges(
                args.component as string,
                {
                  page: args.page ? Number(args.page) : undefined,
                  limit: args.limit ? Number(args.limit) : undefined,
                }
              ),
              null,
              2
            ),
          },
        ],
      };
    case 'list_projects':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await knowledgeGraphManager.listProjects(),
              null,
              2
            ),
          },
        ],
      };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Knowledge Graph MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
