$ErrorActionPreference = "Stop"
$html = Get-Content -Raw "tamagotchi-speedrun.html"

function Assert-Sprite([string]$Pattern, [string]$Message) {
  if ($html -notmatch $Pattern) { throw $Message }
}

Assert-Sprite 'const BABY_BODY = \[' 'The pet needs a dedicated rounded baby sprite.'
Assert-Sprite 'const CHILD_BODY = \[' 'The pet needs a dedicated child sprite with ears and limbs.'
Assert-Sprite 'const GLIMMERLING_BODY = \[' 'The cared-for adult needs its own cute silhouette.'
Assert-Sprite 'function drawCuteFace\(' 'The pet renderer needs reusable eyes, blush, and mouth details.'
Assert-Sprite 'fillStyle = "#FF9FCB"' 'The pet and poop sprites need visible pink cheek pixels.'

Assert-Sprite 'meal:\s*\{(?s:.*?)#F7F1D0(?s:.*?)#65C466(?s:.*?)#FF8B4D' 'The meal icon must use rice and vegetable colors.'
Assert-Sprite 'snack:\s*\{(?s:.*?)#FF8FC7(?s:.*?)#D85A8B(?s:.*?)#E64B55' 'The snack icon must read as a frosted cherry cupcake.'
Assert-Sprite 'poop:\s*\{(?s:.*?)#8B4A22(?s:.*?)#5A2B18(?s:.*?)#FF9FCB' 'The poop icon must use the reference brown swirl and pink cheeks.'
Assert-Sprite 'const cols = Math\.max\(' 'Icons with wider silhouettes must be centered using dynamic grid dimensions.'

foreach ($spriteName in @('BABY_BODY', 'CHILD_BODY', 'GLIMMERLING_BODY', 'WOBBLET_BODY', 'GRUMPLET_BODY')) {
  $block = [regex]::Match($html, "const $spriteName = \[(?<body>[\s\S]*?)\r?\n  \];").Groups['body'].Value
  $widths = @([regex]::Matches($block, '"([.OP]+)"') | ForEach-Object { $_.Groups[1].Value.Length } | Select-Object -Unique)
  if ($widths.Count -ne 1) { throw "$spriteName must use one consistent pixel-grid width; found $($widths -join ', ')." }
}

Write-Output 'Sprite checks passed.'
