/**
 * Models for the guard address lookup functionality
 */

export interface VisitorInfo {
  name: string;
  accessCode: string;
}

export interface AddressInfo {
  address: string;
  allowedVisitors: VisitorInfo[];
}

export interface AddressSearchResult {
  addresses: string[];
  error?: string;
} 