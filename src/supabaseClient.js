import { createClient } from '@supabase/supabase-js';
import { Analytics } from "@vercel/analytics/next";

const supabaseUrl = 'https://hukgwplgzeqjdljatxmy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1a2d3cGxnemVxamRsamF0eG15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NTkzMzIsImV4cCI6MjA2NjQzNTMzMn0.ydgVf36nFRd2EuRF2YdrVQgBxzyNlZfRpj2Z_zmYylA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);