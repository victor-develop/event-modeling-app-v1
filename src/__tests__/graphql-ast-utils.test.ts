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
  getDirectiveArgumentValue,
  renameTypeInAST
} from '../graphql-ast-utils';
import { BlockInfo } from '../types/schema';

describe('GraphQL AST Utils', () => {
  const sampleSchema = `
    directive @eventModelingBlock(
      nodeId: String!
      blockType: String!
      version: Int
    ) on OBJECT | INPUT_OBJECT

    type User @eventModelingBlock(nodeId: "block-123", blockType: "command") {
      id: ID!
      name: String!
      email: String!
    }

    type Query {
      getUser(id: ID!): User
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
      expect(foundType?.name).toBe('User');
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

  describe('renameTypeInAST', () => {
    it('should rename type definition', () => {
      const ast = parseSchemaToAST('type OldName { id: ID! }');
      const updatedAST = renameTypeInAST(ast, 'OldName', 'NewName');
      
      const typeNames = getTypeNamesFromAST(updatedAST);
      expect(typeNames).toContain('NewName');
      expect(typeNames).not.toContain('OldName');
    });

    it('should handle non-existent type gracefully', () => {
      const ast = parseSchemaToAST('type ExistingType { id: ID! }');
      const updatedAST = renameTypeInAST(ast, 'NonExistentType', 'NewName');
      
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
      expect(typeDef.directives?.length).toBeGreaterThan(0);
      
      const eventModelingDirective = typeDef.directives?.find(d => d.name === 'eventModelingBlock');
      expect(eventModelingDirective).toBeDefined();
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

  });

  describe('findOrphanedTypes', () => {
    it('should find types without corresponding active blocks', () => {
      const ast = parseSchemaToAST(sampleSchema);
      const activeBlocks: BlockInfo[] = []; // No active blocks
      
      const orphanedTypes = findOrphanedTypes(ast, activeBlocks);
      expect(orphanedTypes.length).toBeGreaterThan(0);
      
      const orphanedNames = orphanedTypes.map(type => type.name);
      expect(orphanedNames).toContain('User');
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
      const typeDef = createTypeDefinitionWithDirective('TestType', 'command', 'test-value');
      const directive = typeDef.directives?.[0];
      const nodeIdArg = directive?.args?.find(arg => arg.name === 'nodeId');
      
      if (nodeIdArg) {
        const value = getDirectiveArgumentValue(nodeIdArg);
        expect(typeof value).toBe('string');
        expect(value).toBe('test-value');
      }
    });

    it('should handle missing argument gracefully', () => {
      const typeDef = createTypeDefinitionWithDirective('TestType', 'command', 'test-id');
      const directive = typeDef.directives?.[0];
      const nonExistentArg = directive?.args?.find(arg => arg.name === 'nonExistent');
      
      expect(nonExistentArg).toBeUndefined();
    });
  });
});
