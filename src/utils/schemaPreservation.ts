/**
 * Schema preservation utilities for AST-based schema manipulation
 * Preserves user-defined fields, directives, and comments when renaming types
 */
import {
  parse,
  print,
  visit,
  Kind,
} from 'graphql';
import type {
  DocumentNode,
  TypeNode,
} from 'graphql';
import type { TypeNameUpdate } from '../types/schema';

/**
 * Parses a GraphQL schema string into an AST
 * @param schema The GraphQL schema string
 * @returns The parsed AST or null if parsing fails
 */
export function parseSchema(schema: string): DocumentNode | null {
  try {
    return parse(schema);
  } catch (error) {
    console.error('Failed to parse GraphQL schema:', error);
    return null;
  }
}

/**
 * Prints a GraphQL AST back to a string
 * @param ast The GraphQL AST
 * @returns The printed schema string
 */
export function printSchema(ast: DocumentNode): string {
  return print(ast);
}

/**
 * Finds all type names in a GraphQL schema AST
 * @param ast The GraphQL AST
 * @returns Array of type names found in the schema
 */
export function findTypeNames(ast: DocumentNode): string[] {
  const typeNames: string[] = [];
  
  visit(ast, {
    ObjectTypeDefinition(node) {
      if (node.name && node.name.value) {
        typeNames.push(node.name.value);
      }
    },
    InputObjectTypeDefinition(node) {
      if (node.name && node.name.value) {
        typeNames.push(node.name.value);
      }
    },
    InterfaceTypeDefinition(node) {
      if (node.name && node.name.value) {
        typeNames.push(node.name.value);
      }
    },
    EnumTypeDefinition(node) {
      if (node.name && node.name.value) {
        typeNames.push(node.name.value);
      }
    },
    UnionTypeDefinition(node) {
      if (node.name && node.name.value) {
        typeNames.push(node.name.value);
      }
    },
    ScalarTypeDefinition(node) {
      if (node.name && node.name.value) {
        typeNames.push(node.name.value);
      }
    }
  });
  
  return typeNames;
}

/**
 * Updates type names in a GraphQL schema AST
 * @param ast The GraphQL AST
 * @param updates Array of type name updates
 * @returns The updated AST
 */
export function updateTypeNames(ast: DocumentNode, updates: TypeNameUpdate[]): DocumentNode {
  if (!updates.length) return ast;
  
  // Create a mapping of old names to new names for quick lookup
  const nameMap = new Map<string, string>();
  updates.forEach(update => nameMap.set(update.oldName, update.newName));
  
  // Helper function to update a type reference
  const updateTypeReference = (node: TypeNode): TypeNode => {
    if (node.kind === Kind.NAMED_TYPE && nameMap.has(node.name.value)) {
      return {
        ...node,
        name: {
          ...node.name,
          value: nameMap.get(node.name.value)!
        }
      };
    } else if (node.kind === Kind.LIST_TYPE) {
      return {
        ...node,
        type: updateTypeReference(node.type)
      };
    } else if (node.kind === Kind.NON_NULL_TYPE) {
      const updatedType = updateTypeReference(node.type);
      // Handle non-null types that wrap named types or list types
      if (updatedType.kind === Kind.NAMED_TYPE || updatedType.kind === Kind.LIST_TYPE) {
        return {
          ...node,
          type: updatedType
        };
      }
    }
    return node;
  };
  
  // Visit and transform the AST
  return visit(ast, {
    // Update object type definitions
    ObjectTypeDefinition(node) {
      if (node.name && nameMap.has(node.name.value)) {
        return {
          ...node,
          name: {
            ...node.name,
            value: nameMap.get(node.name.value)!
          }
        };
      }
      return undefined;
    },
    
    // Update input object type definitions
    InputObjectTypeDefinition(node) {
      if (node.name && nameMap.has(node.name.value)) {
        return {
          ...node,
          name: {
            ...node.name,
            value: nameMap.get(node.name.value)!
          }
        };
      }
      return undefined;
    },
    
    // Update field definitions to reference the new type names
    FieldDefinition(node) {
      return {
        ...node,
        type: updateTypeReference(node.type)
      };
    },
    
    // Update input value definitions (arguments) to reference the new type names
    InputValueDefinition(node) {
      return {
        ...node,
        type: updateTypeReference(node.type)
      };
    },
    
    // Update named type references
    NamedType(node) {
      if (nameMap.has(node.name.value)) {
        return {
          ...node,
          name: {
            ...node.name,
            value: nameMap.get(node.name.value)!
          }
        };
      }
      return undefined;
    }
  });
}

/**
 * Renames a type in a GraphQL schema while preserving all fields and definitions
 * @param schema The GraphQL schema string
 * @param oldName The old type name
 * @param newName The new type name
 * @returns Object with success flag and updated schema
 */
export function renameTypePreservingFields(
  schema: string,
  oldName: string,
  newName: string
): { success: boolean; schema: string; error?: Error } {
  try {
    // Parse the schema into an AST
    const ast = parseSchema(schema);
    if (!ast) {
      throw new Error('Failed to parse schema');
    }
    
    // Update the type name in the AST
    const updatedAst = updateTypeNames(ast, [{ oldName, newName, blockType: 'view' }]);
    
    // Print the updated AST back to a string
    const updatedSchema = printSchema(updatedAst);
    
    return { success: true, schema: updatedSchema };
  } catch (error) {
    console.error('Error renaming type:', error);
    return { 
      success: false, 
      schema, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

/**
 * Fallback method to rename a type using string replacement
 * Less reliable but used as a fallback if AST manipulation fails
 * @param schema The GraphQL schema string
 * @param oldName The old type name
 * @param newName The new type name
 * @returns The updated schema string
 */
export function renameTypeWithStringReplacement(
  schema: string,
  oldName: string,
  newName: string
): string {
  // Create a regex that matches the type name as a whole word
  const typeRegex = new RegExp(`\\b${oldName}\\b`, 'g');
  return schema.replace(typeRegex, newName);
}

/**
 * Performs a type rename operation with multiple fallback strategies
 * @param schema The GraphQL schema string
 * @param oldName The old type name
 * @param newName The new type name
 * @returns Object with success flag and updated schema
 */
export function renameTypeWithFallbacks(
  schema: string,
  oldName: string,
  newName: string
): { success: boolean; schema: string } {
  // Try AST-based renaming first (most reliable, preserves everything)
  const astResult = renameTypePreservingFields(schema, oldName, newName);
  if (astResult.success) {
    return astResult;
  }
  
  // If AST approach fails, try string replacement as fallback
  console.warn('AST-based schema update failed, falling back to string replacement');
  const stringReplacementResult = renameTypeWithStringReplacement(schema, oldName, newName);
  
  return { success: true, schema: stringReplacementResult };
}

/**
 * Generates a default type template based on block type
 * @param typeName The name of the type to create
 * @param blockType The type of block (command, event, view)
 * @returns A GraphQL type definition string
 */
function generateDefaultTypeTemplate(typeName: string, blockType: 'command' | 'event' | 'view'): string {
  switch (blockType) {
    case 'command':
      return `type ${typeName} {
  id: ID!
  timestamp: String
}

input ${typeName}Input {
  data: String
}

type ${typeName}Result {
  success: Boolean!
  message: String
}`;
    case 'event':
      return `type ${typeName} {
  id: ID!
  timestamp: String
  data: String
}`;
    case 'view':
      return `type ${typeName} {
  id: ID!
  data: String
}`;
    default:
      return `type ${typeName} {
  id: ID!
}`;
  }
}

/**
 * Updates multiple type names in a schema with preservation of fields
 * @param schema The GraphQL schema string
 * @param updates Array of type name updates
 * @returns Object with success flag and updated schema
 */
export function updateSchemaTypeNames(
  schema: string,
  updates: TypeNameUpdate[]
): { success: boolean; schema: string } {
  console.log('[DEBUG-SCHEMA] updateSchemaTypeNames called with updates:', updates);
  console.log('[DEBUG-SCHEMA] Current schema:', schema);
  
  if (!updates.length) {
    console.log('[DEBUG-SCHEMA] No updates to apply, returning original schema');
    return { success: true, schema };
  }
  
  try {
    // Parse the schema into an AST
    const ast = parseSchema(schema);
    if (!ast) {
      console.error('[DEBUG-SCHEMA] Failed to parse schema AST');
      throw new Error('Failed to parse schema');
    }
    console.log('[DEBUG-SCHEMA] Successfully parsed schema AST');
    
    // Get existing type names
    const existingTypeNames = findTypeNames(ast);
    console.log('[DEBUG-SCHEMA] Existing type names in schema:', existingTypeNames);
    
    // Check for types that need to be recreated
    const typesToRecreate = updates.filter(update => 
      update.recreateIfMissing && !existingTypeNames.includes(update.oldName)
    );
    console.log('[DEBUG-SCHEMA] Types that need recreation:', typesToRecreate);
    
    // Update all type names in the AST
    const updatedAst = updateTypeNames(ast, updates);
    console.log('[DEBUG-SCHEMA] Updated AST with new type names');
    
    // Print the updated AST back to a string
    let updatedSchema = printSchema(updatedAst);
    console.log('[DEBUG-SCHEMA] Printed updated schema from AST');
    
    // Add any missing types that need to be recreated
    if (typesToRecreate.length > 0) {
      console.log('[DEBUG-SCHEMA] Recreating missing types:', typesToRecreate.map(t => t.newName));
      
      const typeTemplates = typesToRecreate.map(update => {
        const template = generateDefaultTypeTemplate(update.newName, update.blockType);
        console.log(`[DEBUG-SCHEMA] Generated template for ${update.newName}:`, template);
        return template;
      });
      
      // Append the new type definitions to the schema
      updatedSchema = updatedSchema + '\n\n' + typeTemplates.join('\n\n');
      console.log('[DEBUG-SCHEMA] Final schema after appending new types:', updatedSchema);
    }
    
    return { success: true, schema: updatedSchema };
  } catch (error) {
    console.error('[DEBUG-SCHEMA] Error updating schema type names:', error);
    
    // Fall back to sequential string replacements if AST approach fails
    console.log('[DEBUG-SCHEMA] Falling back to string replacement approach');
    let currentSchema = schema;
    let success = true;
    
    for (const update of updates) {
      console.log(`[DEBUG-SCHEMA] Processing update for ${update.oldName} -> ${update.newName}`);
      
      // If we need to recreate a missing type and we're in fallback mode
      if (update.recreateIfMissing) {
        // Try to find if the type exists
        const typeExists = currentSchema.includes(`type ${update.oldName}`) || 
                          currentSchema.includes(`input ${update.oldName}`);
        
        console.log(`[DEBUG-SCHEMA] Type ${update.oldName} exists in schema: ${typeExists}`);
        
        if (!typeExists) {
          // Append the default template for this type
          const template = generateDefaultTypeTemplate(update.newName, update.blockType);
          console.log(`[DEBUG-SCHEMA] Creating new type ${update.newName} with template:`, template);
          currentSchema = currentSchema + '\n\n' + template;
          continue; // Skip the rename since we're creating a new type
        }
      }
      
      // Otherwise proceed with normal rename
      console.log(`[DEBUG-SCHEMA] Renaming type ${update.oldName} to ${update.newName}`);
      const result = renameTypeWithFallbacks(currentSchema, update.oldName, update.newName);
      if (!result.success) {
        console.error(`[DEBUG-SCHEMA] Failed to rename type ${update.oldName} to ${update.newName}`);
        success = false;
      } else {
        console.log(`[DEBUG-SCHEMA] Successfully renamed type ${update.oldName} to ${update.newName}`);
      }
      currentSchema = result.schema;
    }
    
    console.log('[DEBUG-SCHEMA] Final schema after fallback processing:', currentSchema);
    return { success, schema: currentSchema };
  }
}
