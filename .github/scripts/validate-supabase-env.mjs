const required = ['SUPABASE_PROJECT_ID', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD'];
let invalid = false;
for (const name of required) {
  if (!process.env[name]?.trim()) {
    console.error('::error::Falta configurar ' + name + ' para el entorno de migraciones.');
    invalid = true;
  }
}
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (token?.trim() && (!/^sbp_[^\s]+$/.test(token))) {
  console.error('::error::SUPABASE_ACCESS_TOKEN debe ser un personal access token de Supabase (sbp_...). No uses una clave publishable ni una clave secreta del proyecto.');
  invalid = true;
}
if (invalid) process.exitCode = 1;
