declare namespace NodeJS {
  interface ProcessEnv {
    OPENAI_API_KEY: string;
    PINECONE_API_KEY: string;
    PINECONE_INDEX: string;
    PINECONE_HOST: string;
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
    SUPABASE_DB: string;
  }
} 