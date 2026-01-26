import { 
  Parser,
  ParserTree, 
  ParserField, 
  TypeDefinition, 
  Options,
  getTypeName,
  TreeToGraphQL,
  createRootField,
  createPlainField,
  createPlainDirectiveImplementation,
  Instances 
} from 'graphql-js-tree';
import { BlockInfo } from './types/schema';

// Re-export types for use in other modules
export type { ParserTree, ParserField, TypeDefinition };

// Constants for nodeId suffixes and directive names
export const NODEID_SUFFIXES = {
  INPUT: '-input',
  RESULT: '-result'
} as const;

export const DIRECTIVE_NAMES = {
  EVENT_MODELING_BLOCK: 'eventModelingBlock'
} as const;

export const DIRECTIVE_ARGS = {
  NODE_ID: 'nodeId'
} as const;

/**
 * Parse GraphQL schema string to AST using graphql-js-tree
 */
export const parseSchemaToAST = (schema: string): ParserTree => {
  try {
    return Parser.parse(schema);
  } catch (error) {
    console.error('Failed to parse schema:', error);
    throw new Error(`Schema parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Parse GraphQL schema string to AST with graceful error handling
 * Returns empty AST for invalid schemas instead of throwing
 */
export const parseSchemaToASTSafe = (schema: string): ParserTree => {
  try {
    // Handle empty schema
    if (!schema || schema.trim() === '') {
      return { nodes: [] };
    }
    return Parser.parse(schema);
  } catch (error) {
    // Suppress console.error for test environment
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to parse schema:', error);
    }
    return { nodes: [] };
  }
};

/**
 * Generate GraphQL schema string from AST using graphql-js-tree
 */
export const generateSchemaFromAST = (ast: ParserTree): string => {
  try {
    return TreeToGraphQL.parse(ast);
  } catch (error) {
    console.error('Failed to generate schema from AST:', error);
    throw new Error(`Schema generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Find a directive on a type by name
 */
export const findDirectiveOnType = (node: ParserField, directiveName: string): ParserField | null => {
  if (!node.directives) return null;
  
  return node.directives.find(directive => 
    directive.name === directiveName
  ) || null;
};

/**
 * Get directive argument value
 */
export const getDirectiveArgumentValue = (arg: ParserField): string => {
  if (!arg) return '';
  
  // Check if the argument has a value property (for directive arguments)
  if (arg.value?.value) {
    return arg.value.value;
  }
  
  // Fallback to type field name if no value property
  if (arg.type?.fieldType) {
    try {
      return getTypeName(arg.type.fieldType);
    } catch (error) {
      return '';
    }
  }
  
  return '';
};

/**
 * Extract base nodeId from composite nodeId (removes -input, -result suffixes)
 */
export const extractBaseNodeId = (nodeId: string): string => {
  return nodeId.replace(new RegExp(`(?:${NODEID_SUFFIXES.INPUT}|${NODEID_SUFFIXES.RESULT})$`), '');
};

/**
 * Find all types related to a base nodeId (including composite variants)
 */
export const findRelatedTypes = (ast: ParserTree, baseNodeId: string): ParserField[] => {
  if (!ast.nodes) return [];
  
  const relatedTypes: ParserField[] = [];
  const searchPatterns = [baseNodeId, `${baseNodeId}${NODEID_SUFFIXES.INPUT}`, `${baseNodeId}${NODEID_SUFFIXES.RESULT}`];
  
  for (const node of ast.nodes) {
    if (node.data?.type === TypeDefinition.ObjectTypeDefinition || 
        node.data?.type === TypeDefinition.InputObjectTypeDefinition) {
      
      if (node.directives) {
        const eventModelingDirective = node.directives.find(
          directive => directive.name === DIRECTIVE_NAMES.EVENT_MODELING_BLOCK
        );
        
        if (eventModelingDirective && eventModelingDirective.args) {
          const nodeIdArg = eventModelingDirective.args.find(
            arg => arg.name === DIRECTIVE_ARGS.NODE_ID
          );
          
          if (nodeIdArg) {
            const argValue = getDirectiveArgumentValue(nodeIdArg);
            const rawValue = nodeIdArg.value?.value || argValue;
            const nodeIdValue = rawValue || argValue;
            if (searchPatterns.includes(nodeIdValue)) {
              relatedTypes.push(node);
            }
          }
        }
      }
    }
  }
  
  return relatedTypes;
};

/**
 * Find a type definition by nodeId directive (supports composite nodeIds)
 * Uses safe traversal of the ParserTree structure
 */
export const findTypeByNodeId = (ast: ParserTree, nodeId: string): ParserField | null => {
  if (!ast?.nodes || !Array.isArray(ast.nodes) || !nodeId) {
    return null;
  }
  
  // Helper function to safely extract nodeId from directive
  const extractNodeIdFromDirective = (directive: any): string | null => {
    if (!directive?.args || !Array.isArray(directive.args)) {
      return null;
    }
    
    const nodeIdArg = directive.args.find(
      (arg: any) => arg?.name === DIRECTIVE_ARGS.NODE_ID
    );
    
    if (!nodeIdArg) {
      return null;
    }
    
    const argValue = getDirectiveArgumentValue(nodeIdArg);
    const rawValue = nodeIdArg.value?.value || argValue;
    return rawValue || argValue || null;
  };
  
  // Traverse nodes safely
  for (const node of ast.nodes) {
    // Check if this is a type definition we care about
    const isTargetType = node?.data?.type === TypeDefinition.ObjectTypeDefinition || 
                        node?.data?.type === TypeDefinition.InputObjectTypeDefinition;
    
    if (!isTargetType || !node.directives || !Array.isArray(node.directives)) {
      continue;
    }
    
    // Look for the eventModeling directive
    const eventModelingDirective = node.directives.find(
      (directive: any) => directive?.name === DIRECTIVE_NAMES.EVENT_MODELING_BLOCK
    );
    
    if (!eventModelingDirective) {
      continue;
    }
    
    const nodeIdValue = extractNodeIdFromDirective(eventModelingDirective);
    if (!nodeIdValue) {
      continue;
    }
    
    // Support both exact match and base nodeId match for composite nodeIds
    if (nodeIdValue === nodeId || extractBaseNodeId(nodeIdValue) === nodeId) {
      return node;
    }
  }
  
  return null;
};

/**
 * Create directive with arguments
 */
export const createDirective = (name: string, args: { name: string; value: string | number }[]): ParserField => {
  return createPlainDirectiveImplementation({
    name,
    args: args.map(arg => ({
      name: arg.name,
      id: `${name}-${arg.name}`,
      type: {
        fieldType: {
          name: String(arg.value),
          type: Options.name
        }
      },
      data: {
        type: Instances.Argument
      },
      args: [],
      interfaces: [],
      directives: []
    }))
  });
};

/**
 * Add or update directive on a type
 */
export const addDirectiveToType = (node: ParserField, directive: ParserField): ParserField => {
  const existingDirectives = node.directives || [];
  const directiveName = directive.name;
  
  // Remove existing directive with same name
  const filteredDirectives = existingDirectives.filter(d => 
    d.name !== directiveName
  );
  
  return {
    ...node,
    directives: [...filteredDirectives, directive]
  };
};

/**
 * Rename type in AST and update all references
 */
export const renameTypeInAST = (ast: ParserTree, oldName: string, newName: string): ParserTree => {
  if (!ast.nodes) return ast;

  const updatedNodes = ast.nodes.map(node => {
    // Update type definition name
    if (node.name === oldName) {
      return {
        ...node,
        name: newName
      };
    }

    // Update field type references
    if (node.args) {
      const updatedArgs = node.args.map(field => updateFieldTypeReferences(field, oldName, newName));
      return { ...node, args: updatedArgs };
    }

    return node;
  });

  return { ...ast, nodes: updatedNodes };
};

/**
 * Helper function to update field type references
 */
const updateFieldTypeReferences = (field: ParserField, oldName: string, newName: string): ParserField => {
  if (getTypeName(field.type.fieldType) === oldName) {
    return {
      ...field,
      type: {
        ...field.type,
        fieldType: {
          name: newName,
          type: Options.name
        }
      }
    };
  }
  return field;
};

/**
 * Add a new type to the AST
 */
export const addTypeToAST = (ast: ParserTree, typeName: string, blockType: string, nodeId: string): ParserTree => {
  if (!ast.nodes) {
    ast.nodes = [];
  }

  // Create the directive with proper argument structure
  const eventModelingDirective = createPlainDirectiveImplementation({
    name: 'eventModelingBlock',
    args: [
      createPlainField({
        name: 'nodeId',
        type: `"${nodeId}"`
      }),
      createPlainField({
        name: 'blockType', 
        type: `"${blockType}"`
      }),
      createPlainField({
        name: 'version',
        type: '1'
      })
    ]
  });

  // Create basic fields
  const fields = [
    createPlainField({
      name: 'id',
      type: 'ID!'
    })
  ];

  // Add timestamp field for event types
  if (blockType === 'event') {
    fields.push(
      createPlainField({
        name: 'timestamp',
        type: 'String!'
      })
    );
  }

  // Create type definition with directive
  const typeDefinition = createRootField({
    name: typeName,
    type: TypeDefinition.ObjectTypeDefinition,
    directives: [eventModelingDirective],
    args: fields
  });

  return {
    ...ast,
    nodes: [...ast.nodes, typeDefinition]
  };
};

/**
 * Remove a type from the AST
 */
export const removeTypeFromAST = (ast: ParserTree, typeName: string): ParserTree => {
  if (!ast.nodes) return ast;

  const filteredNodes = ast.nodes.filter(node => 
    node.name !== typeName
  );

  return { ...ast, nodes: filteredNodes };
};

/**
 * Find orphaned types (types with eventModelingBlock directive but no corresponding active block)
 */
export const findOrphanedTypes = (ast: ParserTree, activeBlocks: BlockInfo[]): ParserField[] => {
  if (!ast.nodes) return [];
  
  const activeNodeIds = new Set(activeBlocks.map(block => block.id));
  const orphanedTypes: ParserField[] = [];
  
  for (const node of ast.nodes) {
    if (node.data?.type === TypeDefinition.ObjectTypeDefinition || 
        node.data?.type === TypeDefinition.InputObjectTypeDefinition) {
      
      if (node.directives) {
        const eventModelingDirective = node.directives.find(
          directive => directive.name === DIRECTIVE_NAMES.EVENT_MODELING_BLOCK
        );
        
        if (eventModelingDirective && eventModelingDirective.args) {
          const nodeIdArg = eventModelingDirective.args.find(
            arg => arg.name === DIRECTIVE_ARGS.NODE_ID
          );
          
          if (nodeIdArg) {
            const argValue = getDirectiveArgumentValue(nodeIdArg);
            const rawValue = nodeIdArg.value?.value || argValue;
            const nodeIdValue = rawValue || argValue;
            if (nodeIdValue && !activeNodeIds.has(nodeIdValue)) {
              orphanedTypes.push(node);
            }
          }
        }
      }
    }
  }
  
  return orphanedTypes;
};

/**
 * Extract all type names from the AST
 */
export const extractTypeNames = (ast: ParserTree): string[] => {
  if (!ast.nodes) return [];

  return ast.nodes
    .filter(node => 
      node.data?.type === TypeDefinition.ObjectTypeDefinition ||
      node.data?.type === TypeDefinition.InputObjectTypeDefinition ||
      node.data?.type === TypeDefinition.InterfaceTypeDefinition ||
      node.data?.type === TypeDefinition.UnionTypeDefinition ||
      node.data?.type === TypeDefinition.EnumTypeDefinition ||
      node.data?.type === TypeDefinition.ScalarTypeDefinition
    )
    .map(node => node.name);
};

/**
 * Alias for extractTypeNames to match test expectations
 */
export const getTypeNamesFromAST = extractTypeNames;

/**
 * Create an event modeling directive with nodeId and blockType
 */
export const createEventModelingDirective = (nodeId: string, blockType: string, version: number = 1): ParserField => {
  return createPlainDirectiveImplementation({
    name: 'eventModelingBlock',
    args: [
      {
        name: 'nodeId',
        id: `eventModelingBlock-nodeId-${nodeId}`,
        type: {
          fieldType: {
            name: nodeId,
            type: Options.name
          }
        },
        data: { type: Instances.Argument },
        args: [],
        interfaces: [],
        directives: []
      },
      {
        name: 'blockType',
        id: `eventModelingBlock-blockType-${blockType}`,
        type: {
          fieldType: {
            name: blockType,
            type: Options.name
          }
        },
        data: { type: Instances.Argument },
        args: [],
        interfaces: [],
        directives: []
      },
      {
        name: 'version',
        id: `eventModelingBlock-version-${version}`,
        type: {
          fieldType: {
            name: String(version),
            type: Options.name
          }
        },
        data: { type: Instances.Argument },
        args: [],
        interfaces: [],
        directives: []
      }
    ]
  });
};

/**
 * Create a type definition with event modeling directive
 */
export const createTypeDefinitionWithDirective = (
  typeName: string, 
  blockType: string, 
  nodeId: string,
  customFields: { name: string; type: string }[] = []
): ParserField => {
  const eventModelingDirective = createPlainDirectiveImplementation({
    name: 'eventModelingBlock',
    args: [
      {
        name: 'nodeId',
        id: `eventModelingBlock-nodeId-${nodeId}`,
        type: {
          fieldType: {
            name: nodeId,
            type: Options.name
          }
        },
        data: { type: Instances.Argument },
        args: [],
        interfaces: [],
        directives: []
      },
      {
        name: 'blockType',
        id: `eventModelingBlock-blockType-${blockType}`,
        type: {
          fieldType: {
            name: blockType,
            type: Options.name
          }
        },
        data: { type: Instances.Argument },
        args: [],
        interfaces: [],
        directives: []
      },
      {
        name: 'version',
        id: `eventModelingBlock-version-1`,
        type: {
          fieldType: {
            name: '1',
            type: Options.name
          }
        },
        data: { type: Instances.Argument },
        args: [],
        interfaces: [],
        directives: []
      }
    ]
  });

  const baseFields = [
    createPlainField({
      name: 'id',
      type: 'ID!'
    })
  ];

  // Add timestamp for events
  if (blockType === 'event') {
    baseFields.push(
      createPlainField({
        name: 'timestamp',
        type: 'String!'
      })
    );
  }

  // Add custom fields
  const allFields = [...baseFields, ...customFields.map(field => 
    createPlainField({
      name: field.name,
      type: field.type
    })
  )];

  return createRootField({
    name: typeName,
    type: TypeDefinition.ObjectTypeDefinition,
    directives: [eventModelingDirective],
    args: allFields
  });
};  

/**
 * Update type directive with new values
 */
export const updateTypeDirective = (node: ParserField, nodeId: string, blockType: string, newTypeName?: string): ParserField => {
  const directive = createEventModelingDirective(nodeId, blockType);
  
  let updatedNode = addDirectiveToType(node, directive);
  
  if (newTypeName) {
    updatedNode = {
      ...updatedNode,
      name: newTypeName,
      type: {
        ...updatedNode.type,
        fieldType: updatedNode.type.fieldType
      }
    };
  }
  
  return updatedNode;
};

/**
 * Update type name in AST (alias for renameTypeInAST)
 */
export const updateTypeNameInAST = (ast: ParserTree, oldName: string, newName: string): ParserTree => {
  return renameTypeInAST(ast, oldName, newName);
};

/**
 * Find all event modeling types (used by tests)
 */
export const findAllEventModelingTypes = (ast: ParserTree): ParserField[] => {
  if (!ast.nodes) return [];
  
  return ast.nodes.filter(node => {
    if (node.data?.type === TypeDefinition.ObjectTypeDefinition || 
        node.data?.type === TypeDefinition.InputObjectTypeDefinition) {
      return node.directives?.some(directive => directive.name === 'eventModelingBlock');
    }
    return false;
  });
};
