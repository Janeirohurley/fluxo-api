export type AccessSession = {
  keyId: string;
  keyPrefix: string;
  label: string | null;
  expiresAt: string | null;
  company: {
    id: string;
    slug: string;
    name: string;
  } | null;
  plan: {
    id: string;
    code: string;
    name: string;
    description: string | null;
  };
  modules: string[];
};
