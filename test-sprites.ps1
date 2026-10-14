$ErrorActionPreference = "Stop"

# Pet-body sprites and their pure rendering functions now live in the shared
# js/pet-render.js module (lifted out of tamagotchi-speedrun.html so every
# Plaza location can render the same persistent pet) — checked there.
$render = Get-Content -Raw "js/pet-render.js"

# Food/HUD icons (meal, snack, sponge, heart pips) stay page-local to Home,
# since they're not reused anywhere else yet — checked in the game file.
$html = Get-Content -Raw "tamagotchi-speedrun.html"

function Assert-Match([string]$Text, [string]$Pattern, [string]$Message) {
  if ($Text -notmatch $Pattern) { throw $Message }
}

Assert-Match $render 'var BABY_BODY = \[' 'The pet needs a dedicated rounded baby sprite.'
Assert-Match $render 'var CHILD_BODY = \[' 'The pet needs a dedicated child sprite with ears and limbs.'
Assert-Match $render 'var GLIMMERLING_BODY = \[' 'The cared-for adult needs its own cute silhouette.'
Assert-Match $render 'function drawCuteFace\(' 'The pet renderer needs reusable eyes, blush, and mouth details.'
Assert-Match $render 'fillStyle = "#FF9FCB"' 'The pet sprite needs visible pink cheek pixels.'

Assert-Match $html 'meal:\s*\{(?s:.*?)#F7F1D0(?s:.*?)#65C466(?s:.*?)#FF8B4D' 'The meal icon must use rice and vegetable colors.'
Assert-Match $html 'snack:\s*\{(?s:.*?)#FF8FC7(?s:.*?)#D85A8B(?s:.*?)#E64B55' 'The snack icon must read as a frosted cherry cupcake.'
Assert-Match $html 'var cols = Math\.max\.apply\(' 'Icons with wider silhouettes must be centered using dynamic grid dimensions.'

foreach ($spriteName in @('BABY_BODY', 'CHILD_BODY', 'GLIMMERLING_BODY', 'WOBBLET_BODY', 'GRUMPLET_BODY')) {
  $block = [regex]::Match($render, "var $spriteName = \[(?<body>[\s\S]*?)\r?\n  \];").Groups['body'].Value
  $widths = @([regex]::Matches($block, '"([.OP]+)"') | ForEach-Object { $_.Groups[1].Value.Length } | Select-Object -Unique)
  if ($widths.Count -ne 1) { throw "$spriteName must use one consistent pixel-grid width; found $($widths -join ', ')." }
}

Write-Output 'Sprite checks passed.'
