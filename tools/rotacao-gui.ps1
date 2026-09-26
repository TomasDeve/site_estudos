# ============================================================================
# Rotação de ângulos — GUI (Windows Forms)
# Front-end clicável para tools/anki-rotacao.mjs (o motor, que fala com o Anki).
# Caixinhas por caderno + "Marcar todos" + escopo (hoje / todos) + Prévia/Aplicar.
# Não usa IA. Custo de token = zero.
# ============================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$dir    = $PSScriptRoot
$script = Join-Path $dir 'anki-rotacao.mjs'

function Show-Erro($msg) {
  [System.Windows.Forms.MessageBox]::Show($msg, 'Rotação de ângulos',
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Warning) | Out-Null
}

# ---- roda o motor Node e devolve o texto ----
function Invoke-Node([string[]]$rest) {
  try {
    $out = & node $script @rest 2>&1 | Out-String
  } catch {
    return "ERRO: não consegui rodar o Node. Ele está instalado?`n$($_.Exception.Message)"
  }
  return $out
}

# ---- carrega a lista de cadernos (JSON) ----
function Get-Cadernos {
  $raw = & node $script '--list' '--json' 2>$null | Out-String
  try { return ,($raw | ConvertFrom-Json) } catch { return $null }
}

$cadernos = Get-Cadernos
if (-not $cadernos) {
  Show-Erro("Não consegui ler os cadernos do Anki.`n`nAbra o Anki (com o AnkiConnect) e tente de novo.")
  return
}

# ============================ Janela ============================
$form = New-Object System.Windows.Forms.Form
$form.Text = 'Rotação de ângulos — Anki (PCPE)'
$form.Size = New-Object System.Drawing.Size(560, 660)
$form.StartPosition = 'CenterScreen'
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9)

$lbl = New-Object System.Windows.Forms.Label
$lbl.Text = 'Marque os cadernos que quer atualizar (girar o ângulo das perguntas):'
$lbl.Location = New-Object System.Drawing.Point(12, 12)
$lbl.Size = New-Object System.Drawing.Size(520, 20)
$form.Controls.Add($lbl)

$chkTodos = New-Object System.Windows.Forms.CheckBox
$chkTodos.Text = 'Marcar todos'
$chkTodos.Location = New-Object System.Drawing.Point(12, 36)
$chkTodos.Size = New-Object System.Drawing.Size(150, 22)
$form.Controls.Add($chkTodos)

$clb = New-Object System.Windows.Forms.CheckedListBox
$clb.Location = New-Object System.Drawing.Point(12, 62)
$clb.Size = New-Object System.Drawing.Size(520, 300)
$clb.CheckOnClick = $true
$clb.IntegralHeight = $false
foreach ($c in $cadernos) {
  $extra = if ($c.cheios) { " · $($c.cheios) p/ enxugar" } else { "" }
  [void]$clb.Items.Add("$($c.nome)  ($($c.nucleos) núcleos · $($c.due) vencem hoje$extra)")
}
$form.Controls.Add($clb)

# "Marcar todos" liga/desliga todas
$syncing = $false
$chkTodos.Add_CheckedChanged({
  $script:syncing = $true
  for ($i = 0; $i -lt $clb.Items.Count; $i++) { $clb.SetItemChecked($i, $chkTodos.Checked) }
  $script:syncing = $false
})

# ---- escopo ----
$grp = New-Object System.Windows.Forms.GroupBox
$grp.Text = 'O que girar em cada caderno marcado'
$grp.Location = New-Object System.Drawing.Point(12, 372)
$grp.Size = New-Object System.Drawing.Size(520, 58)
$rbHoje = New-Object System.Windows.Forms.RadioButton
$rbHoje.Text = 'Só os que vencem hoje (recomendado)'
$rbHoje.Location = New-Object System.Drawing.Point(12, 24)
$rbHoje.Size = New-Object System.Drawing.Size(260, 22)
$rbHoje.Checked = $true
$rbTodos = New-Object System.Windows.Forms.RadioButton
$rbTodos.Text = 'Todos os núcleos'
$rbTodos.Location = New-Object System.Drawing.Point(290, 24)
$rbTodos.Size = New-Object System.Drawing.Size(200, 22)
$grp.Controls.Add($rbHoje); $grp.Controls.Add($rbTodos)
$form.Controls.Add($grp)

# ---- botões ----
$btnPrev = New-Object System.Windows.Forms.Button
$btnPrev.Text = 'Prévia (não altera)'
$btnPrev.Location = New-Object System.Drawing.Point(12, 440)
$btnPrev.Size = New-Object System.Drawing.Size(170, 34)
$form.Controls.Add($btnPrev)

$btnAplic = New-Object System.Windows.Forms.Button
$btnAplic.Text = 'Girar ângulos'
$btnAplic.Location = New-Object System.Drawing.Point(192, 440)
$btnAplic.Size = New-Object System.Drawing.Size(170, 34)
$btnAplic.BackColor = [System.Drawing.Color]::FromArgb(46, 125, 50)
$btnAplic.ForeColor = [System.Drawing.Color]::White
$form.Controls.Add($btnAplic)

$txt = New-Object System.Windows.Forms.TextBox
$txt.Location = New-Object System.Drawing.Point(12, 484)
$txt.Size = New-Object System.Drawing.Size(520, 130)
$txt.Multiline = $true
$txt.ScrollBars = 'Vertical'
$txt.ReadOnly = $true
$txt.Font = New-Object System.Drawing.Font('Consolas', 9)
$form.Controls.Add($txt)

# ---- seleção -> argumentos ----
function Get-Selecionados {
  $nums = @()
  for ($i = 0; $i -lt $clb.Items.Count; $i++) {
    if ($clb.GetItemChecked($i)) { $nums += ($i + 1) }
  }
  return $nums
}

function Rodar([bool]$aplicar) {
  $nums = Get-Selecionados
  if ($nums.Count -eq 0) { Show-Erro('Marque ao menos um caderno.'); return }
  $escopo = if ($rbHoje.Checked) { 'hoje' } else { 'todos' }
  $rest = @("--materias=$([string]::Join(',', $nums))", "--escopo=$escopo")
  if ($aplicar) {
    $r = [System.Windows.Forms.MessageBox]::Show(
      "Vou girar os ângulos de $($nums.Count) caderno(s) — escopo: $escopo.`nTudo é reversível (só suspende/reexibe). Continuar?",
      'Confirmar', [System.Windows.Forms.MessageBoxButtons]::YesNo,
      [System.Windows.Forms.MessageBoxIcon]::Question)
    if ($r -ne [System.Windows.Forms.DialogResult]::Yes) { return }
    $rest += '--aplicar'
  }
  $txt.Text = "Rodando..."
  $form.Refresh()
  $saida = Invoke-Node $rest
  $txt.Text = $saida
  if ($aplicar) {
    # recarrega contagens
    $novos = Get-Cadernos
    if ($novos) {
      $script:cadernos = $novos
      $clb.Items.Clear()
      foreach ($c in $novos) {
        $extra = if ($c.cheios) { " · $($c.cheios) p/ enxugar" } else { "" }
        [void]$clb.Items.Add("$($c.nome)  ($($c.nucleos) núcleos · $($c.due) vencem hoje$extra)")
      }
      $chkTodos.Checked = $false
    }
  }
}

$btnPrev.Add_Click({ Rodar $false })
$btnAplic.Add_Click({ Rodar $true })

[void]$form.ShowDialog()
