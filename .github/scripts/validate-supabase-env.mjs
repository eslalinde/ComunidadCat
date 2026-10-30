const required = ['SUPABASE_PROJECT_ID', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD'];
let invalid = false;
for (const name of required) {
  if (!process.env[name]?.trim()) {
    console.error('::error::Falta configurar ' + name + ' para el entorno de migraciones.');
    invalid = true;
  }
}
const token = process.env.SUPABASE_ACCESS_TOKEN;
const project = process.env.SUPABASE_PROJECT_ID;
const expectedProject = process.env.EXPECTED_SUPABASE_PROJECT_ID;
if (expectedProject !== undefined && (!/^[a-z]{20}$/.test(expectedProject) || project !== expectedProject)) {
  console.error('::error::SUPABASE_PROJECT_ID no coincide con el destino confirmado para este entorno. Actualiza el secreto antes de continuar.');
  invalid = true;
}
if (project?.trim() && !/^[a-z]{20}$/.test(project)) {
  console.error('::error::SUPABASE_PROJECT_ID debe ser el identificador del proyecto (20 letras minúsculas), no una URL ni el identificador de la organización.');
  invalid = true;
}
if (token?.trim() && (!/^sbp_[^\s]+$/.test(token))) {
  console.error('::error::SUPABASE_ACCESS_TOKEN debe ser un personal access token de Supabase (sbp_...). No uses una clave publishable ni una clave secreta del proyecto.');
  invalid = true;
}
if (invalid) process.exitCode = 1;
