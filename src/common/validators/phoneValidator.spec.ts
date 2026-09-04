import { phoneValidator } from './phoneValidator';

describe('phoneValidator', () => {
  test('Should return false if phone are invalid', () => {
    const response1 = phoneValidator('8195345578');
    const response2 = phoneValidator('number');
    const response3 = phoneValidator('(81)99534-5578');

    expect(response1).toBe(false);
    expect(response2).toBe(false);
    expect(response3).toBe(false);
  });

  test('Should return true if phone are valid', () => {
    const response = phoneValidator('81995345578');

    expect(response).toBe(true);
  });
});
