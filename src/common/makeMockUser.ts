export const makeMockUser = (overrides = {}) => ({
  id: '1',
  name: 'Will',
  email: 'will@email.com',
  passwordHash: 'hash123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
