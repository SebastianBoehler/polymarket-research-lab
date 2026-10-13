export class MarketStreamValidationError extends Error {}

type RecordValue = Record<string, unknown>;

export function record(value: unknown, field: string): RecordValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new MarketStreamValidationError(`${field} must be an object`);
  }
  return value as RecordValue;
}

export function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new MarketStreamValidationError(`${field} must be a nonempty string`);
  }
  return value;
}

export function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new MarketStreamValidationError(`${field} must be an array`);
  }
  return value;
}

export function decimalNumber(value: unknown, field: string): number {
  if (typeof value !== "number" &&
      (typeof value !== "string" || !/^-?\d+(?:\.\d+)?$/.test(value))) {
    throw new MarketStreamValidationError(`${field} must be a decimal number`);
  }
  const result = Number(value);
  if (!Number.isFinite(result)) {
    throw new MarketStreamValidationError(`${field} must be finite`);
  }
  return result;
}

export function price(value: unknown, allowZero = false): number {
  const result = decimalNumber(value, "price");
  if (result < 0 || (!allowZero && result === 0) || result > 1) {
    throw new MarketStreamValidationError("price must be in the permitted range up to 1");
  }
  return result;
}
