const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hmgsktcgjvohyesrucli.supabase.co';
const supabaseAnonKey = 'sb_publishable_CVGj7Li4dYegRx-BnDnzRA_QFWcpMh2';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTasks() {
  console.log("=== Lendo registros da tabela user_tasks ===");
  const { data, error } = await supabase.from('user_tasks').select('*');
  if (error) {
    console.error("Erro ao ler user_tasks:", error.message);
  } else {
    console.log(`Encontrados ${data.length} registros:`);
    data.forEach(row => {
      console.log(`- User ID: ${row.user_id} | Task Name: ${row.task_name} | Created At: ${row.created_at}`);
      console.log(`  Data: ${JSON.stringify(row.task_data)}`);
    });
  }
}

checkTasks();
