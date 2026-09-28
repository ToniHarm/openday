$ErrorActionPreference = "Stop"
$html = Get-Content -Raw "tamagotchi-speedrun.html"

function Assert-Match([string]$Pattern, [string]$Message) {
  if ($html -notmatch $Pattern) { throw $Message }
}

Assert-Match 'id="frame-picker"[^>]*role="radiogroup"' 'Start screen must expose an accessible frame picker.'
Assert-Match 'const FRAME_THEMES = \[(?s:(.*?))\r?\n  \];' 'Frame theme configuration must exist.'

$frameBlock = [regex]::Match($html, 'const FRAME_THEMES = \[(?s:(.*?))\r?\n  \];').Groups[1].Value
$frameCount = ([regex]::Matches($frameBlock, '\bid:\s*"')).Count
if ($frameCount -ne 12) { throw "Expected 12 frame themes, found $frameCount." }

Assert-Match 'function selectFrame\(frameId\)' 'Frame selection must have one reusable behavior.'
Assert-Match 'shell\.dataset\.frame = frame\.id' 'The selected frame must be applied to the whole device shell.'
Assert-Match 'aria-checked' 'Selection state must be exposed to assistive technology.'
Assert-Match 'selectFrame\(state\.frameId\)' 'The selected frame must be restored between runs.'
Assert-Match '#lcd-screen\s*\{(?s:.*?)width:\s*min\(78%,\s*360px\)' 'The LCD must stay inside the curved frame safe area.'
Assert-Match '#lcd-screen\s*\{(?s:.*?)flex:\s*0\s+1\s+570px' 'The LCD must cap its height but still shrink on shorter screens.'
Assert-Match '#screen-start #egg-canvas-start\s*\{(?s:.*?)width:\s*78px;(?s:.*?)height:\s*78px' 'The start egg must reserve the same compact space that it renders in.'
if ($html -match '#screen-start \.egg-canvas-wrap\s*\{[^}]*margin-block:\s*-') { throw 'The start egg must not use negative vertical margins.' }
Assert-Match '@media\s*\(min-width:\s*900px\)\s*and\s*\(min-height:\s*800px\)' 'Large screens must have a dedicated responsive breakpoint.'
Assert-Match '@media\s*\(min-width:\s*900px\)(?s:.*?)#shell\s*\{(?s:.*?)width:\s*min\(90vw,\s*560px\);(?s:.*?)height:\s*min\(92vh,\s*860px\)' 'The device must grow beyond its mobile cap on large screens.'
Assert-Match '@media\s*\(min-width:\s*900px\)(?s:.*?)#lcd-screen\s*\{(?s:.*?)width:\s*min\(80%,\s*420px\);(?s:.*?)flex-basis:\s*640px' 'The LCD must grow proportionally with the large device frame.'

Write-Output 'Frame picker checks passed.'
