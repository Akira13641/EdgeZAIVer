/**
 * ECS (Entity Component System) World container
 */

export type EntityId = number;

/**
 * Base component interface - all components must extend this
 */
export interface Component {
  readonly type: string;
}

/**
 * Entity interface
 */
export interface Entity {
  id: EntityId;
  components: Map<string, Component>;
}

/**
 * System interface
 */
export interface System {
  readonly name: string;
  update(world: World, deltaTime: number): void;
  fixedUpdate(world: World, fixedDeltaTime: number): void;
}

/**
 * ECS World - manages entities, components, and systems
 */
export class World {
  private entities: Map<EntityId, Entity> = new Map();
  private systems: System[] = [];
  private nextEntityId: EntityId = 1;

  /**
   * Create a new entity
   */
  public createEntity(): EntityId {
    const id = this.nextEntityId++;
    const entity: Entity = {
      id,
      components: new Map(),
    };
    
    this.entities.set(id, entity);
    return id;
  }

  /**
   * Remove an entity and all its components
   */
  public removeEntity(entityId: EntityId): void {
    this.entities.delete(entityId);
  }

  /**
   * Check if an entity exists
   */
  public hasEntity(entityId: EntityId): boolean {
    return this.entities.has(entityId);
  }

  /**
   * Add a component to an entity
   */
  public addComponent<T extends Component>(entityId: EntityId, component: T): void {
    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }
    
    entity.components.set(component.type, component);
  }

  /**
   * Remove a component from an entity
   */
  public removeComponent(entityId: EntityId, componentType: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }
    
    entity.components.delete(componentType);
  }

  /**
   * Get a component from an entity
   */
  public getComponent<T extends Component>(entityId: EntityId, componentType: string): T | undefined {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return undefined;
    }
    
    return entity.components.get(componentType) as T;
  }

  /**
   * Check if an entity has a component
   */
  public hasComponent(entityId: EntityId, componentType: string): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return false;
    }
    
    return entity.components.has(componentType);
  }

  /**
   * Get all components of an entity
   */
  public getEntityComponents(entityId: EntityId): Map<string, Component> | undefined {
    const entity = this.entities.get(entityId);
    return entity?.components;
  }

  /**
   * Find entities that have all specified component types
   */
  public findEntitiesWithComponents(...componentTypes: string[]): EntityId[] {
    const result: EntityId[] = [];
    
    for (const [entityId, entity] of this.entities) {
      const hasAllComponents = componentTypes.every(type => entity.components.has(type));
      if (hasAllComponents) {
        result.push(entityId);
      }
    }
    
    return result;
  }

  /**
   * Add a system to the world
   */
  public addSystem(system: System): void {
    this.systems.push(system);
  }

  /**
   * Remove a system from the world
   */
  public removeSystem(systemName: string): void {
    this.systems = this.systems.filter(system => system.name !== systemName);
  }

  /**
   * Get all systems
   */
  public getSystems(): System[] {
    return [...this.systems];
  }

  /**
   * Update all systems (variable timestep)
   */
  public update(deltaTime: number): void {
    for (const system of this.systems) {
      system.update(this, deltaTime);
    }
  }

  /**
   * Fixed update all systems (fixed timestep)
   */
  public fixedUpdate(fixedDeltaTime: number): void {
    for (const system of this.systems) {
      system.fixedUpdate(this, fixedDeltaTime);
    }
  }

  /**
   * Clear all entities and systems
   */
  public clear(): void {
    this.entities.clear();
    this.systems = [];
    this.nextEntityId = 1;
  }

  /**
   * Get all entities
   */
  public getAllEntities(): EntityId[] {
    return Array.from(this.entities.keys());
  }

  /**
   * Get entity count
   */
  public getEntityCount(): number {
    return this.entities.size;
  }
}