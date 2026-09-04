export function phoneValidator(phone: string) {
  const regex = /^[1-9]{2}9[0-9]{8}$/;

  return regex.test(phone) ? true : false;
}
