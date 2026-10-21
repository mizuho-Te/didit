# Synthetic verification-weakening demo

This fixture uses real Node assertions in a tiny local harness. Its summary deliberately follows the supported Vitest text format; it is not a captured customer incident or the Vitest framework itself.

From the didit checkout:

```sh
npm ci
npm run build
CLI="$PWD/dist/cli.js"
DEMO=$(bash examples/demo/setup.sh)
cd "$DEMO"
npm test
node "$CLI" --run "npm test" --no-color
```

The demo starts with three passing checks, then changes the total from 900 to 1 while skipping one test and weakening another assertion. It also adds a type-suppression comment and a permissive test flag. The current test command reports two passed and one skipped, but didit reports the verification changes and exits 1.

The setup script uses shell-free Git invocations, synthetic commit identity, and a fresh temporary directory. An explicit destination must not exist. It does not install dependencies or contact the network.

`demo.tape` is a VHS recording recipe. The included GIF is a rendered animation of actual captured CLI output from this synthetic fixture; it is not a recording of a real incident. To re-record an interactive terminal with VHS, run `vhs examples/demo/demo.tape` from the checkout.
