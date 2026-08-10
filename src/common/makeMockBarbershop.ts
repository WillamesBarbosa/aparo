export const makeMockBarbershop = (overrides = {}) => ({
  id: '1',
  userId: '1',
  name: 'Barbearia do Will',
  phone: null,
  address: null,
  logoUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
