import {
  parseSchemaToAST,
  parseSchemaToASTSafe,
  generateSchemaFromAST,
  findTypeByNodeId,
  removeTypeFromAST,
  findOrphanedTypes,
  getTypeNamesFromAST,
  addTypeToAST,
  createTypeDefinitionWithDirective,
  getDirectiveArgumentValue
} from '../graphql-ast-utils';
import { BlockInfo } from '../types/schema';

describe('GraphQL AST Utils', () => {
  const sampleSchema = `
    directive @eventModelingBlock(
      nodeId: String!
      blockType: String!
      version: Int
    ) on OBJECT | INPUT_OBJECT

    type UserRegistration @eventModelingBlock(
      nodeId: "block-123"
      blockType: "command"
      version: 1
    ) {
      id: ID!
      email: String!
      password: String!
    }

    type Query {
      user(id: ID!): UserRegistration
    }
  `;

  describe('parseSchemaToAST', () => {
    it('should parse valid schema to AST', () => {
      const ast = parseSchemaToAST(sampleSchema);
      expect(ast).toBeDefined();
      expect(ast.nodes).toBeDefined();
      expect(Array.isArray(ast.nodes)).toBe(true);
    });

    it('should handle invalid schema gracefully', () => {
      const invalidSchema = 'invalid graphql schema {{{';
      const ast = parseSchemaToASTSafe(invalidSchema);
      expect(ast).toBeDefined();
      expect(ast.nodes).toEqual([]);
    });

    it('should handle empty schema', () => {
      const ast = parseSchemaToASTSafe('');
      expect(ast).toBeDefined();
      expect(ast.nodes).toEqual([]);
    });
  });

  describe('generateSchemaFromAST', () => {
    it('should generate schema string from valid AST', () => {
      const ast = parseSchemaToAST(sampleSchema);
      const generatedSchema = generateSchemaFromAST(ast);
      expect(typeof generatedSchema).toBe('string');
      expect(generatedSchema.length).toBeGreaterThan(0);
    });

    it('should handle empty AST gracefully', () => {
      const emptyAST = { nodes: [] };
      const schema = generateSchemaFromAST(emptyAST);
      expect(typeof schema).toBe('string');
    });

    it('should roundtrip parse and generate correctly', () => {
      const simpleSchema = 'type Query { hello: String }';
      const ast = parseSchemaToAST(simpleSchema);
      const regenerated = generateSchemaFromAST(ast);
      expect(regenerated).toContain('Query');
      expect(regenerated).toContain('hello');
    });
  });

  describe('findTypeByNodeId', () => {
    it('should find type by nodeId directive', () => {
      const ast = parseSchemaToAST(sampleSchema);
      const foundType = findTypeByNodeId(ast, 'block-123');
      expect(foundType).toBeDefined();
      expect(foundType?.name).toBe('UserRegistration');
    });

    it('should return null for non-existent nodeId', () => {
      const ast = parseSchemaToAST(sampleSchema);
      const foundType = findTypeByNodeId(ast, 'non-existent-id');
      expect(foundType).toBeNull();
    });

    it('should handle empty AST', () => {
      const emptyAST = { nodes: [] };
      const foundType = findTypeByNodeId(emptyAST, 'any-id');
      expect(foundType).toBeNull();
    });
  });

  describe('findDirectiveOnType', () => {
    it('should find directive on type', () => {
      const ast = parseSchemaToAST(sampleSchema);
      const userType = ast.nodes?.find(node => node.name === 'UserRegistration');
      expect(userType).toBeDefined();
      
      if (userType) {
        const directive = findDirectiveOnType(userType, 'eventModelingBlock');
        expect(directive).toBeDefined();
        expect(directive?.name).toBe('eventModelingBlock');
      }
    });

    it('should return null for non-existent directive', () => {
      const ast = parseSchemaToAST('type SimpleType { id: ID! }');
      const simpleType = ast.nodes?.find(node => node.name === 'SimpleType');
      
      if (simpleType) {
        const directive = findDirectiveOnType(simpleType, 'nonExistentDirective');
        expect(directive).toBeNull();
      }
    });
  });

  describe('createEventModelingDirective', () => {
    it('should create directive with required arguments', () => {
      const directive = createEventModelingDirective('test-id', 'command');
      expect(directive.name).toBe('eventModelingBlock');
      expect(directive.args).toBeDefined();
      expect(directive.args?.length).toBeGreaterThanOrEqual(2);
    });

    it('should create directive with version argument', () => {
      const directive = createEventModelingDirective('test-id', 'event', 2);
      expect(directive.name).toBe('eventModelingBlock');
      expect(directive.args).toBeDefined();
      expect(directive.args?.length).toBe(3);
    });

    it('should handle different block types', () => {
      const commandDirective = createEventModelingDirective('id1', 'command');
      const eventDirective = createEventModelingDirective('id2', 'event');
      const viewDirective = createEventModelingDirective('id3', 'view');

      expect(commandDirective.name).toBe('eventModelingBlock');
      expect(eventDirective.name).toBe('eventModelingBlock');
      expect(viewDirective.name).toBe('eventModelingBlock');
    });
  });

  describe('updateTypeNameInAST', () => {
    it('should update type definition name', () => {
      const ast = parseSchemaToAST('type OldName { id: ID! }');
      const updatedAST = updateTypeNameInAST(ast, 'OldName', 'NewName');
      
      const typeNames = getTypeNamesFromAST(updatedAST);
      expect(typeNames).toContain('NewName');
      expect(typeNames).not.toContain('OldName');
    });

    it('should update field type references', () => {
      const schemaWithReferences = `
        type User { id: ID! }
        type Query { user: User }
      `;
      const ast = parseSchemaToAST(schemaWithReferences);
      const updatedAST = updateTypeNameInAST(ast, 'User', 'Person');
      
      const schema = generateSchemaFromAST(updatedAST);
      expect(schema).toContain('Person');
      expect(schema).not.toContain('type User');
    });

    it('should handle non-existent type name gracefully', () => {
      const ast = parseSchemaToAST('type ExistingType { id: ID! }');
      const updatedAST = updateTypeNameInAST(ast, 'NonExistentType', 'NewName');
      
      // Should not change anything
      const typeNames = getTypeNamesFromAST(updatedAST);
      expect(typeNames).toContain('ExistingType');
      expect(typeNames).not.toContain('NewName');
    });
  });

  describe('addTypeToAST', () => {
    it('should add new type to AST', () => {
      const ast = parseSchemaToAST('type Query { hello: String }');
      const updatedAST = addTypeToAST(ast, 'NewType', 'command', 'new-id');
      
      const typeNames = getTypeNamesFromAST(updatedAST);
      expect(typeNames).toContain('NewType');
      expect(typeNames).toContain('Query');
    });

    it('should handle empty AST', () => {
      const emptyAST = { nodes: [] };
      const updatedAST = addTypeToAST(emptyAST, 'FirstType', 'event', 'first-id');
      
      expect(updatedAST.nodes).toHaveLength(1);
      expect(updatedAST.nodes?.[0].name).toBe('FirstType');
    });
  });

  describe('createTypeDefinitionWithDirective', () => {
    it('should create type with @eventModelingBlock directive', () => {
      const typeDef = createTypeDefinitionWithDirective('TestType', 'command', 'test-id');
      
      expect(typeDef.name).toBe('TestType');
      expect(typeDef.directives).toBeDefined();
      expect(typeDef.directives?.length).toBe(1);
      expect(typeDef.directives?.[0].name).toBe('eventModelingBlock');
    });

    it('should include default fields', () => {
      const typeDef = createTypeDefinitionWithDirective('TestType', 'command', 'test-id');
      
      expect(typeDef.args).toBeDefined();
      expect(typeDef.args?.length).toBeGreaterThan(0);
      
      const idField = typeDef.args?.find(field => field.name === 'id');
      expect(idField).toBeDefined();
    });

    it('should add timestamp field for event types', () => {
      const eventType = createTypeDefinitionWithDirective('TestEvent', 'event', 'event-id');
      
      const timestampField = eventType.args?.find(field => field.name === 'timestamp');
      expect(timestampField).toBeDefined();
    });

    it('should accept custom fields', () => {
      const customFields = [
        {
          name: 'customField',
          type: { fieldType: { type: 'String' as any } },
          data: { type: 'FieldDefinition' as any }
        }
      ];
      
      const typeDef = createTypeDefinitionWithDirective('CustomType', 'view', 'custom-id', customFields);
      
      const customField = typeDef.args?.find(field => field.name === 'customField');
      expect(customField).toBeDefined();
    });
  });

  describe('findAllEventModelingTypes', () => {
    it('should find all types with @eventModelingBlock directive', () => {
      const schemaWithMultipleTypes = `
        directive @eventModelingBlock(nodeId: String!, blockType: String!) on OBJECT

        type RegularType { id: ID! }
        
        type CommandType @eventModelingBlock(nodeId: "cmd-1", blockType: "command") {
          id: ID!
        }
        
        type EventType @eventModelingBlock(nodeId: "evt-1", blockType: "event") {
          id: ID!
        }
      `;
      
      const ast = parseSchemaToAST(schemaWithMultipleTypes);
      const eventModelingTypes = findAllEventModelingTypes(ast);
      
      expect(eventModelingTypes).toHaveLength(2);
      const typeNames = eventModelingTypes.map(type => type.name);
      expect(typeNames).toContain('CommandType');
      expect(typeNames).toContain('EventType');
      expect(typeNames).not.toContain('RegularType');
    });

    it('should return empty array for schema without event modeling types', () => {
      const ast = parseSchemaToAST('type Query { hello: String }');
      const eventModelingTypes = findAllEventModelingTypes(ast);
      expect(eventModelingTypes).toHaveLength(0);
    });
  });

  describe('findOrphanedTypes', () => {
    it('should find types without corresponding active blocks', () => {
      const ast = parseSchemaToAST(sampleSchema);
      const activeBlocks: BlockInfo[] = []; // No active blocks
      
      const orphanedTypes = findOrphanedTypes(ast, activeBlocks);
      expect(orphanedTypes.length).toBeGreaterThan(0);
      
      const orphanedNames = orphanedTypes.map(type => type.name);
      expect(orphanedNames).toContain('UserRegistration');
    });

    it('should not find orphaned types when blocks are active', () => {
      const ast = parseSchemaToAST(sampleSchema);
      const activeBlocks: BlockInfo[] = [
        { id: 'block-123', title: 'User Registration', type: 'command' }
      ];
      
      const orphanedTypes = findOrphanedTypes(ast, activeBlocks);
      expect(orphanedTypes).toHaveLength(0);
    });

    it('should handle mixed scenarios', () => {
      const schemaWithMultiple = `
        directive @eventModelingBlock(nodeId: String!, blockType: String!) on OBJECT

        type ActiveType @eventModelingBlock(nodeId: "active-1", blockType: "command") {
          id: ID!
        }
        
        type OrphanedType @eventModelingBlock(nodeId: "orphaned-1", blockType: "event") {
          id: ID!
        }
      `;
      
      const ast = parseSchemaToAST(schemaWithMultiple);
      const activeBlocks: BlockInfo[] = [
        { id: 'active-1', title: 'Active Type', type: 'command' }
      ];
      
      const orphanedTypes = findOrphanedTypes(ast, activeBlocks);
      expect(orphanedTypes).toHaveLength(1);
      expect(orphanedTypes[0].name).toBe('OrphanedType');
    });
  });

  describe('removeTypeFromAST', () => {
    it('should remove type by name', () => {
      const ast = parseSchemaToAST(`
        type TypeToRemove { id: ID! }
        type TypeToKeep { id: ID! }
      `);
      
      const updatedAST = removeTypeFromAST(ast, 'TypeToRemove');
      const typeNames = getTypeNamesFromAST(updatedAST);
      
      expect(typeNames).not.toContain('TypeToRemove');
      expect(typeNames).toContain('TypeToKeep');
    });

    it('should handle non-existent type gracefully', () => {
      const ast = parseSchemaToAST('type ExistingType { id: ID! }');
      const updatedAST = removeTypeFromAST(ast, 'NonExistentType');
      
      const typeNames = getTypeNamesFromAST(updatedAST);
      expect(typeNames).toContain('ExistingType');
    });

    it('should handle empty AST', () => {
      const emptyAST = { nodes: [] };
      const updatedAST = removeTypeFromAST(emptyAST, 'AnyType');
      expect(updatedAST.nodes).toHaveLength(0);
    });
  });

  describe('getTypeNamesFromAST', () => {
    it('should extract all type names', () => {
      const ast = parseSchemaToAST(`
        type User { id: ID! }
        type Post { id: ID! }
        input UserInput { email: String! }
        type Query { users: [User] }
      `);
      
      const typeNames = getTypeNamesFromAST(ast);
      expect(typeNames).toContain('User');
      expect(typeNames).toContain('Post');
      expect(typeNames).toContain('UserInput');
      expect(typeNames).toContain('Query');
    });

    it('should return empty array for empty AST', () => {
      const emptyAST = { nodes: [] };
      const typeNames = getTypeNamesFromAST(emptyAST);
      expect(typeNames).toHaveLength(0);
    });

    it('should filter out non-type definitions', () => {
      const schemaWithDirectives = `
        directive @test on FIELD_DEFINITION
        type User { id: ID! }
      `;
      
      const ast = parseSchemaToAST(schemaWithDirectives);
      const typeNames = getTypeNamesFromAST(ast);
      
      expect(typeNames).toContain('User');
      expect(typeNames).not.toContain('test');
    });
  });

  describe('getDirectiveArgumentValue', () => {
    it('should extract string value from directive argument', () => {
      const directive = createEventModelingDirective('test-value', 'command');
      const nodeIdArg = directive.args?.find(arg => arg.name === 'nodeId');
      
      if (nodeIdArg) {
        const value = getDirectiveArgumentValue(nodeIdArg);
        expect(typeof value).toBe('string');
      }
    });

    it('should return empty string for invalid argument', () => {
      const invalidArg = {
        name: 'test',
        type: { fieldType: { type: 'InvalidType' as any } }
      };
      
      const value = getDirectiveArgumentValue(invalidArg);
      expect(value).toBe('');
    });
  });

  describe('updateTypeDirective', () => {
    it('should update directive on existing type', () => {
      const originalType = createTypeDefinitionWithDirective('OriginalType', 'command', 'original-id');
      const updatedType = updateTypeDirective(originalType, 'new-id', 'event', 'UpdatedType');
      
      expect(updatedType.name).toBe('UpdatedType');
      expect(updatedType.directives).toBeDefined();
      expect(updatedType.directives?.length).toBe(1);
      
      const directive = updatedType.directives?.[0];
      expect(directive?.name).toBe('eventModelingBlock');
    });

    it('should preserve type name if not provided', () => {
      const originalType = createTypeDefinitionWithDirective('OriginalType', 'command', 'original-id');
      const updatedType = updateTypeDirective(originalType, 'new-id', 'event');
      
      expect(updatedType.name).toBe('OriginalType');
    });

    it('should add directive if none exists', () => {
      const typeWithoutDirective = {
        name: 'PlainType',
        type: { fieldType: { type: 'ObjectTypeDefinition' as any } },
        data: { type: 'ObjectTypeDefinition' as any },
        args: []
      };
      
      const updatedType = updateTypeDirective(typeWithoutDirective, 'new-id', 'command');
      
      expect(updatedType.directives).toBeDefined();
      expect(updatedType.directives?.length).toBe(1);
      expect(updatedType.directives?.[0].name).toBe('eventModelingBlock');
    });
  });
});
