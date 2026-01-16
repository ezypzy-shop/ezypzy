import { neon } from "@neondatabase/serverless";

// Hardcoded connection string to avoid .env file issues
const connectionString = "postgresql://neondb_owner:npg_Ii5aru8ozXDw@ep-green-darkness-aevz0vzi-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

const sql = neon(connectionString);

export default sql;
