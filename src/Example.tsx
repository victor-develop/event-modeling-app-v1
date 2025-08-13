import { useState } from 'react';
import { GraphQLEditor, PassedSchema } from 'graphql-editor';

const defaultSchema = `
type Query {
  hello: String
}
`;

export const Example = () => {
  const [mySchema, setMySchema] = useState<PassedSchema>({ 
    code: defaultSchema,
    libraries: '',
    source: 'code',
  });

  return (
    <div style={{ flex: 1, height: '100vh', display: 'flex' }}>
      <GraphQLEditor
        path="example-schema"
        schema={mySchema}
        setSchema={setMySchema}
      />
    </div>
  );
};
