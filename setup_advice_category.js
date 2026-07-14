const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://practology.infiplus.in';
const supabaseAnonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3ODk0NDAyMCwiZXhwIjo0OTM0NjE3NjIwLCJyb2xlIjoiYW5vbiJ9.EFQBrFe5h94IzGZ94UG_kj-3FvXFT1xkuwnVNNkoqTo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('aka_dropdown_categories')
      .select('id')
      .eq('id', 70)
      .maybeSingle();

    if (checkError) {
      console.log('Error checking category 70:', checkError);
    }

    if (existing) {
      console.log('Category 70 already exists:', existing);
      return;
    }

    const { data, error } = await supabase
      .from('aka_dropdown_categories')
      .insert({
        id: 70,
        code: 'advice_templates',
        display_name: 'Advice Templates',
        allow_custom: true
      })
      .select();

    if (error) {
      console.error('Failed to insert category 70:', error);
    } else {
      console.log('Successfully created category 70:', data);
    }
  } catch (err) {
    console.error('Unhandled exception:', err);
  }
}

run();
