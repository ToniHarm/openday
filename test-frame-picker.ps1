$ErrorActionPreference = "Stop"
$html = Get-Content -Raw "tamagotchi-speedrun.html"

function Assert-Match([string]$Pattern, [string]$Message) {
  if ($html -notmatch $Pattern) { throw $Message }
}

# Home is now a repeatable Plaza location loaded from a persistent save
# (see js/pet-save.js) rather than a standalone run with its own start
# screen — hatching a new pet and picking its color now happens once, at
# the Plaza's identify screen (index.html). The interactive in-page frame
# picker this test used to check for was removed along with that start
# screen; the shell-theming system itself (FRAME_THEMES, selectFrame,
# restoring the saved frameId) is unchanged and still checked below.
Assert-Match 'var FRAME_THEMES = \[(?s:(.*?))\r?\n  \];' 'Frame theme configuration must exist.'

$frameBlock = [regex]::Match($html, 'var FRAME_THEMES = \[(?s:(.*?))\r?\n  \];').Groups[1].Value
$frameCount = ([regex]::Matches($frameBlock, '\bid:\s*"')).Count
if ($frameCount -ne 12) { throw "Expected 12 frame themes, found $frameCount." }

Assert-Match 'function applyFrame\(frameId\)' 'Frame selection must have one reusable behavior.'
Assert-Match 'shell\.dataset\.frame = frame\.id' 'The selected frame must be applied to the whole device shell.'
Assert-Match 'applyFrame\(state\.frameId\)' "The pet's saved frame must be restored on load."
Assert-Match '#lcd-screen\s*\{(?s:.*?)width:\s*min\(78%,\s*360px\)' 'The LCD must stay inside the curved frame safe area.'
Assert-Match '#lcd-screen\s*\{(?s:.*?)flex:\s*0\s+1\s+570px' 'The LCD must cap its height but still shrink on shorter screens.'
Assert-Match '@media\s*\(min-width:\s*900px\)\s*and\s*\(min-height:\s*800px\)' 'Large screens must have a dedicated responsive breakpoint.'
Assert-Match '@media\s*\(min-width:\s*900px\)(?s:.*?)#shell\s*\{(?s:.*?)width:\s*min\(90vw,\s*560px\);(?s:.*?)height:\s*min\(92vh,\s*860px\)' 'The device must grow beyond its mobile cap on large screens.'
Assert-Match '@media\s*\(min-width:\s*900px\)(?s:.*?)#lcd-screen\s*\{(?s:.*?)width:\s*min\(80%,\s*420px\);(?s:.*?)flex-basis:\s*640px' 'The LCD must grow proportionally with the large device frame.'

Write-Output 'Frame picker checks passed.'
