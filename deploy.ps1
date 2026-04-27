# Script de deploy RendaControl -> Vercel
# Execute com: cd C:\rendacontrol; .\deploy.ps1

$SUPABASE_URL = "https://njpzxzzogetahljswviv.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qcHp4enpvZ2V0YWhsanN3dml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDU3OTcsImV4cCI6MjA5MjIyMTc5N30.xf5eF81GNxV1KFuRCabme1E3BwiNzdhTvtchPH_PDYY"

Write-Host "1. Fazendo login no Vercel..." -ForegroundColor Cyan
vercel login

Write-Host "2. Adicionando variaveis de ambiente..." -ForegroundColor Cyan
$SUPABASE_URL | vercel env add NEXT_PUBLIC_SUPABASE_URL production --yes
$SUPABASE_KEY | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --yes

Write-Host "3. Fazendo deploy para producao..." -ForegroundColor Cyan
vercel --prod --yes

Write-Host "Deploy concluido!" -ForegroundColor Green
