# Run from the didit checkout after npm ci && npm run build.
# The temporary demo is synthetic and has no external dependencies.
Output examples/demo/demo.gif
Set Shell "bash"
Set FontSize 18
Set Width 1280
Set Height 800
Set Padding 24
Set TypingSpeed 30ms
Hide
Type "CLI=\"$PWD/dist/cli.js\"; DEMO=$(bash examples/demo/setup.sh); cd \"$DEMO\""
Enter
Sleep 1s
Show
Type "npm test"
Enter
Sleep 2s
Type "node \"$CLI\" --run \"npm test\" --no-color"
Enter
Sleep 8s
