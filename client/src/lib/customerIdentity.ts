export interface CustomerIdentityInput {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
}

export function hasCustomerIdentifier(input: CustomerIdentityInput) {
  return [input.clientName, input.clientEmail, input.clientPhone, input.clientAddress].some(value =>
    typeof value === "string" && value.trim().length > 0
  );
}

export function getCustomerIdentifierError(input: CustomerIdentityInput) {
  return hasCustomerIdentifier(input) ? undefined : "Enter at least one customer detail to identify this quote.";
}
