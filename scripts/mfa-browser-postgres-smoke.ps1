param(
  [string]$Image = 'union-communications:mfa-recovery-check',
  [ValidateSet('fill', 'typed-enter')][string]$InputMode = 'typed-enter'
)

# Disposable local fixtures only. Run from the repo with pwsh -File; never
# reuse an operator's database, account, key, or Compose project.
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$compose = Join-Path $repo 'docker/docker-compose.yml'
$project = 'mfa_browser_' + [Guid]::NewGuid().ToString('N').Substring(0, 12)
$webName = $project + '-web'
function Assert-Exit([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed (exit $LASTEXITCODE)" }
}
$env:POSTGRES_USER = 'unionops'
$env:POSTGRES_DB = 'unionops'
$env:POSTGRES_PASSWORD = [Guid]::NewGuid().ToString('N')
$env:POSTGRES_APP_PASSWORD = [Guid]::NewGuid().ToString('N')
$env:POSTGRES_PORT = '0'
$env:AUTH_SECRET = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$env:AUTH_TOTP_ENCRYPTION_KEY = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$env:AUTH_MFA_ENABLED = 'true'
$env:AUTH_MFA_MODE = 'totp'
$env:AUTH_USERS_BACKEND = 'postgres'
$env:SEED_PLATFORM_ADMIN = 'false'
$env:SEED_DEMO_USERS = 'true'
$env:MFA_E2E_INPUT = $InputMode
$env:MFA_E2E_EMAIL = 'mfa-browser@unionops.test'
$env:MFA_E2E_REQUIRE_MFA = 'true'
Push-Location $repo
try {
  docker image inspect $Image --format '{{.Id}}'
  Assert-Exit 'Image lookup'
  docker compose -p $project -f $compose up -d db
  Assert-Exit 'Disposable database startup'
  for ($i = 0; $i -lt 30; $i++) {
    docker compose -p $project -f $compose exec -T db pg_isready -U unionops *> $null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 1
  }
  Assert-Exit 'Database readiness'
  $dbAddress = docker compose -p $project -f $compose port db 5432
  Assert-Exit 'Database port lookup'
  $dbPort = ($dbAddress | Select-Object -First 1).Split(':')[-1]
  $env:MIGRATE_DATABASE_URL = "postgres://unionops:$($env:POSTGRES_PASSWORD)@127.0.0.1:$dbPort/unionops"
  $env:DATABASE_URL = $env:MIGRATE_DATABASE_URL
  npm run db:deploy
  Assert-Exit 'Database deployment'
  npm run db:seed *> $null
  Assert-Exit 'Fixture seed'
  # Give the seeded officer a non-roster identity; login cannot use demo fallback.
  docker compose -p $project -f $compose exec -T db psql -U unionops -d unionops -v ON_ERROR_STOP=1 -c "UPDATE users SET email='mfa-browser@unionops.test', is_demo=false, totp_secret=NULL, mfa_enabled=true WHERE id='user-steward-7';"
  Assert-Exit 'Officer fixture preparation'
  $env:MIGRATE_DATABASE_URL = "postgres://unionops:$($env:POSTGRES_PASSWORD)@db:5432/unionops"
  $env:DATABASE_URL = "postgres://unionops_app:$($env:POSTGRES_APP_PASSWORD)@db:5432/unionops"
  docker run -d --rm --name $webName --network "${project}_default" -p 127.0.0.1::3000 -e AUTH_SECRET -e AUTH_TOTP_ENCRYPTION_KEY -e AUTH_MFA_ENABLED -e AUTH_MFA_MODE -e AUTH_USERS_BACKEND -e MIGRATE_DATABASE_URL -e DATABASE_URL -e POSTGRES_APP_PASSWORD -e AUTH_TRUST_HOST=true -e AUTH_ALLOW_DEMO_USERS=false -e UNIONOPS_HOSTED_CUSTOMER_MODE=true -e TASKS_DB_BACKEND=postgres -e AUDIT_DB_BACKEND=postgres -e SEED_ON_BOOT=false $Image
  Assert-Exit 'App startup'
  $webAddress = docker port $webName 3000/tcp
  Assert-Exit 'App port lookup'
  $env:PLAYWRIGHT_BASE_URL = 'http://' + ($webAddress | Select-Object -First 1)
  $ready = $false
  for ($i = 0; $i -lt 45; $i++) {
    try {
      $response = Invoke-WebRequest "$($env:PLAYWRIGHT_BASE_URL)/en/app/login/" -SkipHttpErrorCheck
      if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'App readiness timed out; inspect deployment configuration' }
  npx playwright test e2e/mfa.enroll-totp.spec.ts --project=chromium --reporter=line
  Assert-Exit 'Postgres-backed MFA browser journey'
  $proof = docker compose -p $project -f $compose exec -T db psql -U unionops -d unionops -tAc "SELECT (u.totp_secret LIKE 'uov1.%'), (g.consumed_at IS NOT NULL), (SELECT count(*) FROM mfa_recovery_codes r WHERE r.user_id=u.id AND r.used_at IS NULL), (SELECT NOT rolsuper AND NOT rolbypassrls FROM pg_roles WHERE rolname='unionops_app') FROM users u JOIN mfa_session_grants g ON g.user_id=u.id WHERE u.id='user-steward-7';"
  Assert-Exit 'Independent durable state assertion'
  if ($proof.Trim() -ne 't|t|10|t') { throw 'Encrypted enrollment, consumed grant, ten recovery codes, or limited role proof failed' }
  Write-Output 'PASS: encrypted enrollment, consumed grant, ten durable recovery codes, and limited runtime role.'
} finally {
  docker stop $webName *> $null
  docker compose -p $project -f $compose down -v *> $null
  Pop-Location
}
