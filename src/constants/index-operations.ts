export const indexOperations = {
  add: 'add',
  update: 'update',
  delete: 'delete',
  syncAll: 'syncAll',
} as const;

export type IndexOperation = (typeof indexOperations)[keyof typeof indexOperations];

