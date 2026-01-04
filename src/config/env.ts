interface EnvVars {
  PORT: number;
  FRONTEND_URL: string;
}

// Helper function to get environment variable or throw error if not found
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Environment variable ${name} is not defined`);
  }
  return value;
}

// Helper function to get optional environment variable
function getOptionalEnvVar(name: string, defaultValue?: string): string | undefined {
  return process.env[name] ?? defaultValue;
}

// Parse port from environment or use default
const PORT = parseInt(getOptionalEnvVar('PORT', '3000') || '3000', 10);
const FRONTEND_URL = getOptionalEnvVar('FRONTEND_URL', 'http://localhost:5173');

export const env: EnvVars = {
  PORT,
  FRONTEND_URL: FRONTEND_URL!,
};