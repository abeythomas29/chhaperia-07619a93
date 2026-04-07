const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://zzbpgwivxvkhabhpxjqt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6YnBnd2l2eHZraGFiaHB4anF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTAzMTYsImV4cCI6MjA4NzU4NjMxNn0.cIAHZMeMdCN3tadOMwQcbH-tBXXSHaoAFwBGQ4bU7xI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase.from('production_entries').select('id, thickness').limit(1);
    console.log("Error:", error);
    console.log("Data:", data);
}
test();
