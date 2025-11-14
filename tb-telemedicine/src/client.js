
import { createClient } from '@supabase/supabase-js'

// const supabaseUrl = 'https://xykneyuxskmgphobusdp.supabase.co'
// const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5a25leXV4c2ttZ3Bob2J1c2RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODIyMDgsImV4cCI6MjA3MjY1ODIwOH0.nZ0kcWWQpXkuaxBYvJfc1CphFfwfXuanuZkHj3svGcw'

//Nawa oo 😑😑 Try they hide your keys in env files
console.log(import.meta.env.VITE_SUPABASE_URL);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY
export const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime:{
        params:{
            eventsPerSecond:10
        }
    }
})

export const SUPABASE_URL = supabaseUrl