import {
  parseSchemaToAST,
  generateSchemaFromAST,
  findTypeByNodeId,
  addTypeToAST,
  renameTypeInAST,
  findOrphanedTypes,
  removeTypeFromAST
} from '../graphql-ast-utils';
import { BlockInfo } from '../types/schema';

describe('NodeId-Based Schema Synchronization', () => {
  const sampleSchemaWithDirectives = `
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

    type UserCreated @eventModelingBlock(
      nodeId: "block-456"
      blockType: "event"
    ) {
      id: ID!
      email: String!
      timestamp: String!
    }

    type Query {
      user(id: ID!): UserRegistration
    }
  `;

  const mockBlocks: BlockInfo[] = [
    { id: 'block-123', title: 'User Registration', type: 'command' },
    { id: 'block-456', title: 'User Created', type: 'event' },
    { id: 'block-789', title: 'User Profile', type: 'view' }
  ];

  describe('Enhanced Sync Logic Integration', () => {
    it('should handle block rename by updating type name while preserving nodeId', () => {
      const ast = parseSchemaToAST(sampleSchemaWithDirectives);
      
      // Find existing type by nodeId
      const existingType = findTypeByNodeId(ast, 'block-123');
      expect(existingType).toBeDefined();
      expect(existingType?.name).toBe('UserRegistration');
      
      // Rename the type
      const renamedAST = renameTypeInAST(ast, 'UserRegistration', 'CustomerRegistration');
      const updatedSchema = generateSchemaFromAST(renamedAST);
      
      // Verify the type was renamed but nodeId preserved
      const newAST = parseSchemaToAST(updatedSchema);
      const renamedType = findTypeByNodeId(newAST, 'block-123');
      expect(renamedType).toBeDefined();
      expect(renamedType?.name).toBe('CustomerRegistration');
    });

    it('should add new types with nodeId directives', () => {
      const ast = parseSchemaToAST(sampleSchemaWithDirectives);
      
      // Add new type with nodeId
      const updatedAST = addTypeToAST(ast, 'UserProfile', 'view', 'block-789');
      const updatedSchema = generateSchemaFromAST(updatedAST);
      
      // Verify new type exists with correct nodeId
      const newAST = parseSchemaToAST(updatedSchema);
      const newType = findTypeByNodeId(newAST, 'block-789');
      expect(newType).toBeDefined();
      expect(newType?.name).toBe('UserProfile');
    });

    it('should identify orphaned types correctly', () => {
      const activeBlocks: BlockInfo[] = [
        { id: 'block-123', title: 'User Registration', type: 'command' }
        // Note: block-456 is missing, so UserCreated should be orphaned
      ];
      
      const ast = parseSchemaToAST(sampleSchemaWithDirectives);
      const orphanedTypes = findOrphanedTypes(ast, activeBlocks);
      
      expect(orphanedTypes.length).toBeGreaterThan(0);
      expect(orphanedTypes.map(t => t.name)).toContain('UserCreated');
    });

    it('should remove orphaned types from schema', () => {
      const ast = parseSchemaToAST(sampleSchemaWithDirectives);
      
      // Remove UserCreated type
      const cleanedAST = removeTypeFromAST(ast, 'UserCreated');
      const cleanedSchema = generateSchemaFromAST(cleanedAST);
      
      // Verify type was removed
      const newAST = parseSchemaToAST(cleanedSchema);
      const removedType = findTypeByNodeId(newAST, 'block-456');
      expect(removedType).toBeNull();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed schema gracefully', () => {
      const malformedSchema = 'type User { invalid syntax }';
      
      expect(() => {
        parseSchemaToAST(malformedSchema);
      }).toThrow();
    });

    it('should handle empty schema', () => {
      const emptySchema = '';
      const ast = parseSchemaToAST(emptySchema);
      
      expect(ast).toBeDefined();
      expect(ast.nodes).toBeDefined();
    });

    it('should handle schema without directive definitions', () => {
      const schemaWithoutDirectives = `
        type User {
          id: ID!
          name: String!
        }
      `;
      
      const ast = parseSchemaToAST(schemaWithoutDirectives);
      const nonExistentType = findTypeByNodeId(ast, 'non-existent');
      
      expect(nonExistentType).toBeNull();
    });

    it('should handle blocks with duplicate nodeIds', () => {
      const duplicateBlocks: BlockInfo[] = [
        { id: 'block-123', title: 'User Registration', type: 'command' },
        { id: 'block-123', title: 'Duplicate Block', type: 'event' }
      ];
      
      const ast = parseSchemaToAST(sampleSchemaWithDirectives);
      const foundType = findTypeByNodeId(ast, 'block-123');
      
      // Should find the first matching type
      expect(foundType).toBeDefined();
      expect(foundType?.name).toBe('UserRegistration');
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle schemas without nodeId directives', () => {
      const legacySchema = `
        type User {
          id: ID!
          name: String!
        }
        
        type Post {
          id: ID!
          title: String!
          author: User!
        }
      `;
      
      const ast = parseSchemaToAST(legacySchema);
      const nonExistentType = findTypeByNodeId(ast, 'any-node-id');
      
      expect(nonExistentType).toBeNull();
    });

    it('should preserve existing types without directives when adding new ones', () => {
      const mixedSchema = `
        type LegacyUser {
          id: ID!
          name: String!
        }
        
        type UserRegistration @eventModelingBlock(
          nodeId: "block-123"
          blockType: "command"
        ) {
          id: ID!
          email: String!
        }
      `;
      
      const ast = parseSchemaToAST(mixedSchema);
      const updatedAST = addTypeToAST(ast, 'NewType', 'event', 'block-new');
      const updatedSchema = generateSchemaFromAST(updatedAST);
      
      // Verify both legacy and new types exist
      expect(updatedSchema).toContain('type LegacyUser');
      expect(updatedSchema).toContain('type NewType');
      expect(updatedSchema).toContain('@eventModelingBlock');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large schemas efficiently', () => {
      // Create a large schema with many types
      let largeSchema = sampleSchemaWithDirectives;
      
      for (let i = 0; i < 100; i++) {
        largeSchema += `
          type GeneratedType${i} @eventModelingBlock(
            nodeId: "generated-${i}"
            blockType: "command"
          ) {
            id: ID!
            field${i}: String!
          }
        `;
      }
      
      const startTime = Date.now();
      const ast = parseSchemaToAST(largeSchema);
      const foundType = findTypeByNodeId(ast, 'generated-50');
      const endTime = Date.now();
      
      expect(foundType).toBeDefined();
      expect(foundType?.name).toBe('GeneratedType50');
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle many blocks efficiently', () => {
      const manyBlocks: BlockInfo[] = [];
      for (let i = 0; i < 1000; i++) {
        manyBlocks.push({
          id: `block-${i}`,
          title: `Block ${i}`,
          type: i % 3 === 0 ? 'command' : i % 3 === 1 ? 'event' : 'view'
        });
      }
      
      const ast = parseSchemaToAST(sampleSchemaWithDirectives);
      const startTime = Date.now();
      const orphanedTypes = findOrphanedTypes(ast, manyBlocks);
      const endTime = Date.now();
      
      expect(Array.isArray(orphanedTypes)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
